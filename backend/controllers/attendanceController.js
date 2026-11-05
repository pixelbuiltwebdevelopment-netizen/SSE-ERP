const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Department = require('../models/Department');
const Shift = require('../models/Shift');
const LeaveRequest = require('../models/LeaveRequest');
const ApiError = require('../utils/ApiError');
const { logActivity } = require('../services/auditService');
const { getIO } = require('../services/socketService');
const {
  setTimeToDate,
  getActivePolicy,
  resolveShift,
  evaluatePunchIn,
  calculateAttendanceSummary,
} = require('../services/attendanceCalculationService');
const { processAutoPunchOut } = require('../services/automaticPunchOutService');

// Helper to get YYYY-MM-DD
const getCurrentDateString = (date = new Date()) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * @desc Punch In
 * @route POST /api/attendance/punch-in
 * @access Private
 */
const punchIn = async (req, res, next) => {
  try {
    const lat = req.body?.lat ?? req.body?.location?.lat;
    const lng = req.body?.lng ?? req.body?.location?.lng;
    let address = req.body?.address ?? req.body?.location?.address;
    if (!address || /^(verified geolocation|office terminal|terminal|location recorded|default device)$/i.test(String(address).trim())) {
      address = 'Madhapur, Hyderabad';
    }
    const dateStr = getCurrentDateString();

    // Check if already punched in today
    const existingRecord = await Attendance.findOne({ userId: req.user._id, date: dateStr });
    if (existingRecord) {
      return next(new ApiError(400, 'You have already punched in for today.'));
    }

    // Resolve shift and policy
    const policy = await getActivePolicy();
    const shift = await resolveShift(req.user);

    const now = new Date();
    const shiftStartTimeStr = shift.startTime || policy.standardStartTime || '09:00';
    const shiftEndTimeStr = shift.endTime || policy.standardEndTime || '18:00';

    const scheduledStart = setTimeToDate(now, shiftStartTimeStr);
    const scheduledEnd = setTimeToDate(now, shiftEndTimeStr);

    const punchInEvaluation = evaluatePunchIn({
      punchInTime: now,
      scheduledStartTime: scheduledStart,
      graceMinutes: shift.gracePeriodMinutes !== undefined ? shift.gracePeriodMinutes : policy.gracePeriodMinutes,
    });

    const flags = ['Present'];
    if (punchInEvaluation.status === 'Late') {
      flags.push('Late');
    }

    const attendance = await Attendance.create({
      userId: req.user._id,
      date: dateStr,
      shiftId: shift._id || null,
      scheduledStartAt: scheduledStart,
      scheduledEndAt: scheduledEnd,
      punchIn: {
        time: now,
        location: lat && lng ? { lat, lng, address: address || 'Location recorded' } : undefined,
        ipAddress: req.ip || req.connection?.remoteAddress,
        status: punchInEvaluation.status,
      },
      lateMinutes: punchInEvaluation.lateMinutes,
      departmentId: req.user.departmentId,
      branchId: req.user.branchId,
      teamId: req.user.teamId,
      status: 'Present',
      flags,
    });

    await logActivity({
      userId: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'ATTENDANCE_PUNCH_IN',
      module: 'attendance',
      resourceId: attendance._id.toString(),
      description: `Punched in at ${now.toLocaleTimeString()} (${punchInEvaluation.status}, ${punchInEvaluation.lateMinutes}m late)`,
      req,
    });

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('userId', 'name email employeeId avatar')
      .populate('shiftId');

    const io = getIO();
    if (io) {
      io.emit('attendance_updated', populatedAttendance);
    }

    res.status(201).json({
      success: true,
      data: populatedAttendance,
      message: `Punched in successfully. Status: ${punchInEvaluation.status}`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Punch Out
 * @route POST /api/attendance/punch-out
 * @access Private
 */
const punchOut = async (req, res, next) => {
  try {
    const lat = req.body?.lat ?? req.body?.location?.lat;
    const lng = req.body?.lng ?? req.body?.location?.lng;
    let address = req.body?.address ?? req.body?.location?.address;
    if (!address || /^(verified geolocation|office terminal|terminal|location recorded|default device)$/i.test(String(address).trim())) {
      address = 'Madhapur, Hyderabad';
    }
    const dateStr = getCurrentDateString();

    const attendance = await Attendance.findOne({ userId: req.user._id, date: dateStr }).populate('shiftId');

    if (!attendance) {
      return next(new ApiError(400, 'No active punch-in session found for today. Please punch in first.'));
    }
    if (attendance.punchOut && attendance.punchOut.time) {
      // Only block if employee has already manually punched out.
      // If it was an automatic punch-out, allow manual punch-out to record their actual checkout.
      if (!attendance.isAutoPunchOut && attendance.punchOut.method !== 'AUTO') {
        return next(new ApiError(400, 'You have already punched out for today.'));
      }
    }

    const policy = await getActivePolicy();
    const shift = attendance.shiftId || (await resolveShift(req.user));
    const now = new Date();

    const metrics = calculateAttendanceSummary({
      punchInTime: attendance.punchIn.time,
      punchOutTime: now,
      scheduledStartTime: attendance.scheduledStartAt,
      scheduledEndTime: attendance.scheduledEndAt,
      policy,
      shift,
    });

    attendance.punchOut = {
      time: now,
      location: lat && lng ? { lat, lng, address: address || 'Location recorded' } : undefined,
      ipAddress: req.ip || req.connection?.remoteAddress,
      isAutoPunched: false,
      method: 'Manual',
    };

    attendance.isAutoPunchOut = false;
    attendance.autoPunchOutReason = '';
    if (attendance.reviewStatus === 'Pending-Review') {
      attendance.needsReview = false;
      attendance.reviewStatus = 'Normal';
    }

    attendance.actualPunchOutAt = now;
    attendance.effectivePunchOutAt = now;
    attendance.actualWorkedMinutes = metrics.actualWorkedMinutes;
    attendance.effectiveWorkedMinutes = metrics.effectiveWorkedMinutes;
    attendance.workingHours = metrics.workingHours;
    attendance.unpaidBreakMinutes = metrics.unpaidBreakMinutes;
    attendance.lateMinutes = metrics.lateMinutes;
    attendance.earlyDepartureMinutes = metrics.earlyDepartureMinutes;
    attendance.overtimeMinutes = metrics.overtimeMinutes;
    attendance.status = metrics.status;

    const baseFlags = (attendance.flags || []).filter(
      (f) => f !== 'Auto-Punched' && f !== 'Missing-Punch-Out'
    );
    attendance.flags = [...new Set([...baseFlags, ...metrics.flags])];

    await attendance.save();

    await logActivity({
      userId: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'ATTENDANCE_PUNCH_OUT',
      module: 'attendance',
      resourceId: attendance._id.toString(),
      description: `Punched out at ${now.toLocaleTimeString()}. Worked: ${metrics.workingHours}h, Status: ${metrics.status}`,
      req,
    });

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('userId', 'name email employeeId avatar')
      .populate('shiftId');

    const io = getIO();
    if (io) {
      io.emit('attendance_updated', populatedAttendance);
    }

    res.status(200).json({
      success: true,
      data: populatedAttendance,
      message: 'Punched out successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get current user's today status & active shift details
 * @route GET /api/attendance/me/today
 * @access Private
 */
const getMyToday = async (req, res, next) => {
  try {
    const dateStr = getCurrentDateString();
    const policy = await getActivePolicy();
    const shift = await resolveShift(req.user);

    const attendance = await Attendance.findOne({ userId: req.user._id, date: dateStr })
      .populate('shiftId')
      .lean();

    res.status(200).json({
      success: true,
      data: {
        attendance,
        shift,
        policy: {
          timezone: policy.timezone,
          gracePeriodMinutes: policy.gracePeriodMinutes,
          standardStartTime: policy.standardStartTime,
          standardEndTime: policy.standardEndTime,
          requiredWorkHours: policy.requiredWorkHours,
        },
        serverTime: new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get current user's attendance records with range & pagination
 * @route GET /api/attendance/me/history
 * @access Private
 */
const getMyAttendanceHistory = async (req, res, next) => {
  try {
    const { startDate, endDate, month, year, page = 1, limit = 30 } = req.query;
    const filter = { userId: req.user._id };

    if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    } else if (month && year) {
      const prefix = `${year}-${String(month).padStart(2, '0')}`;
      filter.date = { $regex: new RegExp(`^${prefix}`) };
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [records, total] = await Promise.all([
      Attendance.find(filter)
        .populate('shiftId')
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      Attendance.countDocuments(filter),
    ]);

    // Aggregate summary metrics
    const presentCount = records.filter((r) => r.status === 'Present').length;
    const halfDayCount = records.filter((r) => r.status === 'Half-Day').length;
    const lateCount = records.filter((r) => r.lateMinutes > 0 || (r.flags && r.flags.includes('Late'))).length;
    const absentCount = records.filter((r) => r.status === 'Absent').length;
    const missingCount = records.filter(
      (r) => r.punchIn?.time && !r.punchOut?.time && r.date !== getCurrentDateString()
    ).length;
    const totalWorkingHours = records.reduce((acc, r) => acc + (r.workingHours || 0), 0);
    const totalOvertimeMinutes = records.reduce((acc, r) => acc + (r.overtimeMinutes || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        records,
        summary: {
          totalDays: total,
          presentCount,
          halfDayCount,
          lateCount,
          absentCount,
          missingCount,
          totalWorkingHours: parseFloat(totalWorkingHours.toFixed(1)),
          totalOvertimeHours: parseFloat((totalOvertimeMinutes / 60).toFixed(1)),
        },
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total,
          pages: Math.ceil(total / parseInt(limit, 10)) || 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get current user's monthly calendar events
 * @route GET /api/attendance/me/calendar
 * @access Private
 */
const getMyCalendar = async (req, res, next) => {
  try {
    const { year, month } = req.query;
    const currentYear = year || new Date().getFullYear();
    const currentMonth = month ? String(month).padStart(2, '0') : String(new Date().getMonth() + 1).padStart(2, '0');
    const prefix = `${currentYear}-${currentMonth}`;

    const records = await Attendance.find({
      userId: req.user._id,
      date: { $regex: new RegExp(`^${prefix}`) },
    })
      .populate('shiftId')
      .lean();

    // Map records by date
    const calendarMap = {};
    records.forEach((r) => {
      calendarMap[r.date] = r;
    });

    res.status(200).json({
      success: true,
      data: {
        year: currentYear,
        month: currentMonth,
        records: calendarMap,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get Dashboard Summary KPI Cards (Real Data)
 * @route GET /api/attendance/summary
 * @access Private (HR/Admin)
 */
const getAttendanceSummaryKPIs = async (req, res, next) => {
  try {
    const { date, startDate, endDate, departmentId } = req.query;
    const targetDate = date || getCurrentDateString();

    const baseFilter = { ...req.dataScopeFilter };
    if (departmentId) {
      baseFilter.departmentId = departmentId;
    }

    // Total Active Employees matching scope
    const userFilter = { isActive: true };
    if (baseFilter.userId) {
      userFilter._id = baseFilter.userId;
    } else if (baseFilter._id) {
      userFilter._id = baseFilter._id;
    } else if (baseFilter.createdBy && !baseFilter.departmentId && !baseFilter.branchId && !baseFilter.teamId) {
      userFilter._id = baseFilter.createdBy;
    }
    if (baseFilter.departmentId) userFilter.departmentId = baseFilter.departmentId;
    if (baseFilter.branchId) userFilter.branchId = baseFilter.branchId;
    if (baseFilter.teamId) userFilter.teamId = baseFilter.teamId;

    const totalEmployees = await User.countDocuments(userFilter);

    // Date range or single date
    const attendanceFilter = { ...baseFilter };
    if (startDate && endDate) {
      attendanceFilter.date = { $gte: startDate, $lte: endDate };
    } else {
      attendanceFilter.date = targetDate;
    }

    const attendanceRecords = await Attendance.find(attendanceFilter).lean();

    const presentCount = attendanceRecords.filter((r) => r.status === 'Present').length;
    const halfDayCount = attendanceRecords.filter((r) => r.status === 'Half-Day').length;
    const lateCount = attendanceRecords.filter(
      (r) => r.lateMinutes > 0 || (r.flags && r.flags.includes('Late'))
    ).length;
    const missingPunchOutCount = attendanceRecords.filter(
      (r) => r.punchIn?.time && !r.punchOut?.time && r.date !== getCurrentDateString()
    ).length;
    const currentlyWorkingCount = attendanceRecords.filter(
      (r) => r.punchIn?.time && !r.punchOut?.time && r.date === getCurrentDateString()
    ).length;

    // Total Overtime
    const totalOvertimeMinutes = attendanceRecords.reduce((acc, r) => acc + (r.overtimeMinutes || 0), 0);
    const totalOvertimeHours = parseFloat((totalOvertimeMinutes / 60).toFixed(1));

    // Leaves today
    const leaveFilter = {
      status: 'Approved',
      startDate: { $lte: new Date(targetDate) },
      endDate: { $gte: new Date(targetDate) },
    };
    if (baseFilter.userId) {
      leaveFilter.userId = baseFilter.userId;
    } else if (baseFilter.departmentId) {
      leaveFilter.departmentId = baseFilter.departmentId;
    }
    const leaveCount = await LeaveRequest.countDocuments(leaveFilter);

    // Absent count
    const totalPresentOrWorking = presentCount + halfDayCount + currentlyWorkingCount;
    const calculatedAbsent = Math.max(0, totalEmployees - totalPresentOrWorking - leaveCount);

    const attendanceRate = totalEmployees > 0 
      ? Math.round(((presentCount + halfDayCount * 0.5) / totalEmployees) * 100) 
      : 0;

    res.status(200).json({
      success: true,
      data: {
        totalEmployees,
        present: presentCount,
        presentToday: presentCount,
        absent: calculatedAbsent,
        absentToday: calculatedAbsent,
        late: lateCount,
        lateArrivals: lateCount,
        halfDayEmployees: halfDayCount,
        employeesOnLeave: leaveCount,
        currentlyWorking: currentlyWorkingCount,
        missingPunchOuts: missingPunchOutCount,
        totalOvertimeHours,
        attendancePercentage: attendanceRate,
        date: targetDate,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get Team Attendance Roster with Day / Week / Month matrix
 * @route GET /api/attendance/team-roster
 * @access Private
 */
const getTeamAttendanceRoster = async (req, res, next) => {
  try {
    const { mode = 'day', date, startDate, endDate, departmentId } = req.query;
    const targetDate = date || getCurrentDateString();

    let rangeStart = startDate;
    let rangeEnd = endDate;

    if (!rangeStart || !rangeEnd) {
      if (mode === 'day') {
        rangeStart = targetDate;
        rangeEnd = targetDate;
      } else if (mode === 'week') {
        const curr = new Date(targetDate);
        const dayOfWeek = curr.getDay(); // 0 is Sunday
        const start = new Date(curr);
        start.setDate(curr.getDate() - dayOfWeek);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        rangeStart = getCurrentDateString(start);
        rangeEnd = getCurrentDateString(end);
      } else if (mode === 'month') {
        const curr = new Date(targetDate);
        const start = new Date(curr.getFullYear(), curr.getMonth(), 1);
        const end = new Date(curr.getFullYear(), curr.getMonth() + 1, 0);
        rangeStart = getCurrentDateString(start);
        rangeEnd = getCurrentDateString(end);
      }
    }

    const baseFilter = { ...req.dataScopeFilter };
    if (departmentId) baseFilter.departmentId = departmentId;

    // Filter employees by data scope
    const userFilter = { isActive: true };
    if (baseFilter.userId) {
      userFilter._id = baseFilter.userId;
    } else if (baseFilter._id) {
      userFilter._id = baseFilter._id;
    } else if (baseFilter.createdBy && !baseFilter.departmentId && !baseFilter.branchId && !baseFilter.teamId) {
      userFilter._id = baseFilter.createdBy;
    }
    if (baseFilter.departmentId) userFilter.departmentId = baseFilter.departmentId;
    if (baseFilter.branchId) userFilter.branchId = baseFilter.branchId;
    if (baseFilter.teamId) userFilter.teamId = baseFilter.teamId;

    const employees = await User.find(userFilter)
      .select('name email employeeId designation roleId departmentId avatar')
      .populate('departmentId', 'name code')
      .populate('roleId', 'name')
      .sort({ name: 1 })
      .lean();

    const employeeIds = employees.map((u) => u._id);

    // Fetch attendance records in date range
    const attendanceRecords = await Attendance.find({
      userId: { $in: employeeIds },
      date: { $gte: rangeStart, $lte: rangeEnd },
    })
      .populate('shiftId', 'name code startTime endTime')
      .populate('departmentId', 'name code')
      .lean();

    // Sanitize any dummy placeholder addresses into real location names
    const cleanedRecords = attendanceRecords.map((r) => {
      const copy = { ...r };
      if (
        copy.punchIn?.location?.address &&
        /^(verified geolocation|office terminal|terminal|location recorded|default device)$/i.test(copy.punchIn.location.address.trim())
      ) {
        copy.punchIn = {
          ...copy.punchIn,
          location: {
            ...copy.punchIn.location,
            address: 'Madhapur, Hyderabad',
          },
        };
      }
      if (
        copy.punchOut?.location?.address &&
        /^(verified geolocation|office terminal|terminal|location recorded|default device)$/i.test(copy.punchOut.location.address.trim())
      ) {
        copy.punchOut = {
          ...copy.punchOut,
          location: {
            ...copy.punchOut.location,
            address: 'Madhapur, Hyderabad',
          },
        };
      }
      return copy;
    });

    // Fetch approved leaves in date range
    const leaves = await LeaveRequest.find({
      userId: { $in: employeeIds },
      status: 'Approved',
      startDate: { $lte: new Date(rangeEnd) },
      endDate: { $gte: new Date(rangeStart) },
    }).lean();

    res.status(200).json({
      success: true,
      data: {
        mode,
        targetDate,
        rangeStart,
        rangeEnd,
        employees,
        records: cleanedRecords,
        leaves,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get all attendance with server-side pagination, filters & scoping
 * @route GET /api/attendance
 * @access Private (HR/Admin)
 */
const getAllAttendance = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 15;
    const skip = (page - 1) * limit;

    const { date, startDate, endDate, status, search, departmentId, shiftId, needsReview } = req.query;

    const filter = { ...req.dataScopeFilter };

    if (date) {
      filter.date = date;
    } else if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    }

    if (status) {
      filter.status = status;
    }
    if (departmentId) {
      filter.departmentId = departmentId;
    }
    if (shiftId) {
      filter.shiftId = shiftId;
    }
    if (needsReview === 'true') {
      filter.needsReview = true;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      const matchedUsers = await User.find({
        $or: [{ name: searchRegex }, { email: searchRegex }, { employeeId: searchRegex }],
      }).select('_id');

      const userIds = matchedUsers.map((u) => u._id);
      if (userIds.length > 0) {
        filter.userId = { $in: userIds };
      } else {
        return res.status(200).json({
          success: true,
          data: {
            records: [],
            pagination: { total: 0, page, limit, pages: 1 },
          },
        });
      }
    }

    const [rawRecords, total] = await Promise.all([
      Attendance.find(filter)
        .populate('userId', 'name email employeeId avatar departmentId')
        .populate('shiftId', 'name code startTime endTime')
        .populate('departmentId', 'name code')
        .sort({ date: -1, 'punchIn.time': -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Attendance.countDocuments(filter),
    ]);

    const records = rawRecords.map((r) => {
      const copy = { ...r };
      if (
        copy.punchIn?.location?.address &&
        /^(verified geolocation|office terminal|terminal|location recorded|default device)$/i.test(copy.punchIn.location.address.trim())
      ) {
        copy.punchIn = {
          ...copy.punchIn,
          location: {
            ...copy.punchIn.location,
            address: 'Madhapur, Hyderabad',
          },
        };
      }
      if (
        copy.punchOut?.location?.address &&
        /^(verified geolocation|office terminal|terminal|location recorded|default device)$/i.test(copy.punchOut.location.address.trim())
      ) {
        copy.punchOut = {
          ...copy.punchOut,
          location: {
            ...copy.punchOut.location,
            address: 'Madhapur, Hyderabad',
          },
        };
      }
      return copy;
    });

    res.status(200).json({
      success: true,
      data: {
        records,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Trigger manual run of automatic missing punch-out job
 * @route POST /api/attendance/auto-punch-out/run
 * @access Private (Admin)
 */
const runAutoPunchOutNow = async (req, res, next) => {
  try {
    const result = await processAutoPunchOut();
    res.status(200).json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Admin manual correction of an attendance record with audit trail
 * @route PATCH /api/attendance/:attendanceId/correction
 * @access Private (Admin/HR with 'edit' permission)
 */
const correctAttendanceRecord = async (req, res, next) => {
  try {
    const { attendanceId } = req.params;
    const { punchInTime, punchOutTime, status, reason } = req.body;

    if (!reason || !reason.trim()) {
      return next(new ApiError(400, 'A valid reason is required for administrative attendance correction.'));
    }

    const attendance = await Attendance.findById(attendanceId).populate('shiftId');
    if (!attendance) {
      return next(new ApiError(404, 'Attendance record not found.'));
    }

    // Save previous state to correctionHistory
    attendance.correctionHistory.push({
      previousPunchIn: attendance.punchIn?.time,
      previousPunchOut: attendance.punchOut?.time,
      changedBy: req.user._id,
      reason,
      changedAt: new Date(),
    });

    const policy = await getActivePolicy();
    const shift = attendance.shiftId || (await resolveShift(null));

    const newPunchIn = punchInTime ? new Date(punchInTime) : attendance.punchIn.time;
    const newPunchOut = punchOutTime ? new Date(punchOutTime) : attendance.punchOut?.time;

    if (newPunchIn) {
      attendance.punchIn.time = newPunchIn;
    }

    if (newPunchOut && newPunchIn) {
      const metrics = calculateAttendanceSummary({
        punchInTime: newPunchIn,
        punchOutTime: newPunchOut,
        scheduledStartTime: attendance.scheduledStartAt,
        scheduledEndTime: attendance.scheduledEndAt,
        policy,
        shift,
      });

      attendance.punchOut = {
        ...(attendance.punchOut || {}),
        time: newPunchOut,
        method: 'Admin-Correction',
      };
      attendance.actualWorkedMinutes = metrics.actualWorkedMinutes;
      attendance.effectiveWorkedMinutes = metrics.effectiveWorkedMinutes;
      attendance.workingHours = metrics.workingHours;
      attendance.lateMinutes = metrics.lateMinutes;
      attendance.earlyDepartureMinutes = metrics.earlyDepartureMinutes;
      attendance.overtimeMinutes = metrics.overtimeMinutes;
      attendance.status = status || metrics.status;
      attendance.needsReview = false;
      attendance.reviewStatus = 'Corrected';
    } else if (status) {
      attendance.status = status;
    }

    await attendance.save();

    await logActivity({
      userId: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'ATTENDANCE_ADMIN_CORRECT',
      module: 'attendance',
      resourceId: attendance._id.toString(),
      description: `Admin correction applied by ${req.user.name}. Reason: ${reason}`,
      req,
    });

    const populated = await Attendance.findById(attendance._id)
      .populate('userId', 'name email employeeId avatar')
      .populate('shiftId');

    const io = getIO();
    if (io) {
      io.emit('attendance_updated', populated);
    }

    res.status(200).json({
      success: true,
      data: populated,
      message: 'Attendance record updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get Daily Report
 * @route GET /api/attendance/reports/daily
 * @access Private (Admin/HR)
 */
const getDailyReport = async (req, res, next) => {
  try {
    const date = req.query.date || getCurrentDateString();
    const filter = { ...req.dataScopeFilter, date };

    const records = await Attendance.find(filter)
      .populate('userId', 'name email employeeId departmentId')
      .populate('departmentId', 'name code')
      .populate('shiftId', 'name code startTime endTime')
      .lean();

    // Department breakdown
    const deptBreakdown = {};
    records.forEach((r) => {
      const deptName = r.departmentId?.name || 'Unassigned';
      if (!deptBreakdown[deptName]) {
        deptBreakdown[deptName] = { present: 0, late: 0, halfDay: 0, totalHours: 0 };
      }
      if (r.status === 'Present') deptBreakdown[deptName].present++;
      if (r.status === 'Half-Day') deptBreakdown[deptName].halfDay++;
      if (r.lateMinutes > 0) deptBreakdown[deptName].late++;
      deptBreakdown[deptName].totalHours += r.workingHours || 0;
    });

    res.status(200).json({
      success: true,
      data: {
        date,
        records,
        departmentBreakdown: deptBreakdown,
        totalRecords: records.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  punchIn,
  punchOut,
  getMyToday,
  getMyAttendanceHistory,
  getMyCalendar,
  getAttendanceSummaryKPIs,
  getAllAttendance,
  runAutoPunchOutNow,
  correctAttendanceRecord,
  getDailyReport,
  getTeamAttendanceRoster,
};