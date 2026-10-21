const AttendanceCorrection = require('../models/AttendanceCorrection');
const Attendance = require('../models/Attendance');
const ApiError = require('../utils/ApiError');
const { logActivity } = require('../services/auditService');
const { sendNotification } = require('../services/notificationService');
const { calculateAttendanceSummary, getActivePolicy, resolveShift } = require('../services/attendanceCalculationService');
const { getIO } = require('../services/socketService');

/**
 * @desc Get all correction requests (Admin/HR scoped or employee own)
 * @route GET /api/attendance/corrections
 * @access Private
 */
const getCorrections = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { ...req.dataScopeFilter };

    if (status) filter.status = status;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [corrections, total] = await Promise.all([
      AttendanceCorrection.find(filter)
        .populate('userId', 'name email employeeId avatar')
        .populate('reviewedBy', 'name email')
        .populate('attendanceId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      AttendanceCorrection.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        corrections,
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          pages: Math.ceil(total / parseInt(limit, 10)) || 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Request attendance correction (Employee)
 * @route POST /api/attendance/corrections
 * @access Private
 */
const requestCorrection = async (req, res, next) => {
  try {
    const {
      date,
      correctionType,
      requestedPunchIn,
      requestedPunchOut,
      reason,
      attendanceId,
    } = req.body;

    if (!date || !reason) {
      return next(new ApiError(400, 'Attendance date and reason are required.'));
    }

    let existingAttendance = null;
    if (attendanceId) {
      existingAttendance = await Attendance.findOne({ _id: attendanceId, userId: req.user._id });
    } else {
      existingAttendance = await Attendance.findOne({ date, userId: req.user._id });
    }

    const correction = await AttendanceCorrection.create({
      userId: req.user._id,
      attendanceId: existingAttendance?._id || null,
      date,
      correctionType: correctionType || 'MISSED_PUNCH_OUT',
      requestedPunchIn: requestedPunchIn ? new Date(requestedPunchIn) : null,
      requestedPunchOut: requestedPunchOut ? new Date(requestedPunchOut) : null,
      originalPunchIn: existingAttendance?.punchIn?.time || null,
      originalPunchOut: existingAttendance?.punchOut?.time || null,
      reason,
      status: 'Pending',
      departmentId: req.user.departmentId,
      branchId: req.user.branchId,
      teamId: req.user.teamId,
    });

    await logActivity({
      userId: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'ATTENDANCE_CORRECTION_REQUEST',
      module: 'attendance',
      resourceId: correction._id.toString(),
      description: `Submitted attendance correction request for ${date}. Reason: ${reason}`,
      req,
    });

    res.status(201).json({
      success: true,
      data: correction,
      message: 'Correction request submitted for manager review.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Approve correction request (Admin)
 * @route PATCH /api/attendance/corrections/:id/approve
 * @access Private (Admin)
 */
const approveCorrection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reviewNotes } = req.body || {};

    const correction = await AttendanceCorrection.findById(id).populate('userId');
    if (!correction) {
      return next(new ApiError(404, 'Correction request not found.'));
    }

    if (correction.status !== 'Pending') {
      return next(new ApiError(400, `Request is already ${correction.status}.`));
    }

    const policy = await getActivePolicy();
    const shift = await resolveShift(correction.userId);

    // Find or create attendance record
    let attendance = correction.attendanceId ? await Attendance.findById(correction.attendanceId) : null;
    if (!attendance) {
      attendance = await Attendance.findOne({ userId: correction.userId._id, date: correction.date });
    }

    const finalPunchIn = correction.requestedPunchIn || attendance?.punchIn?.time || new Date();
    const finalPunchOut = correction.requestedPunchOut || attendance?.punchOut?.time || new Date();

    const metrics = calculateAttendanceSummary({
      punchInTime: finalPunchIn,
      punchOutTime: finalPunchOut,
      scheduledStartTime: attendance?.scheduledStartAt,
      scheduledEndTime: attendance?.scheduledEndAt,
      policy,
      shift,
    });

    if (attendance) {
      attendance.correctionHistory.push({
        previousPunchIn: attendance.punchIn?.time,
        previousPunchOut: attendance.punchOut?.time,
        changedBy: req.user._id,
        reason: `Correction Approved: ${correction.reason}`,
        changedAt: new Date(),
      });

      attendance.punchIn = {
        ...(attendance.punchIn || {}),
        time: finalPunchIn,
      };
      attendance.punchOut = {
        ...(attendance.punchOut || {}),
        time: finalPunchOut,
        method: 'Admin-Correction',
      };
      attendance.actualWorkedMinutes = metrics.actualWorkedMinutes;
      attendance.effectiveWorkedMinutes = metrics.effectiveWorkedMinutes;
      attendance.workingHours = metrics.workingHours;
      attendance.lateMinutes = metrics.lateMinutes;
      attendance.earlyDepartureMinutes = metrics.earlyDepartureMinutes;
      attendance.overtimeMinutes = metrics.overtimeMinutes;
      attendance.status = metrics.status;
      attendance.flags = [...new Set([...(attendance.flags || []), ...metrics.flags, 'Corrected'])];
      attendance.needsReview = false;
      attendance.reviewStatus = 'Corrected';
      await attendance.save();
    } else {
      attendance = await Attendance.create({
        userId: correction.userId._id,
        date: correction.date,
        shiftId: shift._id || null,
        punchIn: {
          time: finalPunchIn,
          status: metrics.lateMinutes > 0 ? 'Late' : 'On-Time',
        },
        punchOut: {
          time: finalPunchOut,
          method: 'Admin-Correction',
        },
        actualWorkedMinutes: metrics.actualWorkedMinutes,
        effectiveWorkedMinutes: metrics.effectiveWorkedMinutes,
        workingHours: metrics.workingHours,
        lateMinutes: metrics.lateMinutes,
        earlyDepartureMinutes: metrics.earlyDepartureMinutes,
        overtimeMinutes: metrics.overtimeMinutes,
        status: metrics.status,
        flags: [...metrics.flags, 'Corrected'],
        departmentId: correction.userId.departmentId,
        branchId: correction.userId.branchId,
        teamId: correction.userId.teamId,
      });
    }

    correction.status = 'Approved';
    correction.reviewedBy = req.user._id;
    correction.reviewNotes = reviewNotes || 'Correction approved by administrator.';
    correction.reviewedAt = new Date();
    correction.attendanceId = attendance._id;
    await correction.save();

    await sendNotification({
      userId: correction.userId._id,
      title: 'Attendance Correction Approved',
      message: `Your correction for ${correction.date} was approved. Your working hours are updated to ${metrics.workingHours} hrs.`,
      type: 'CORRECTION_APPROVED',
      referenceId: correction._id,
    });

    await logActivity({
      userId: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'ATTENDANCE_CORRECTION_APPROVE',
      module: 'attendance',
      resourceId: correction._id.toString(),
      description: `Approved correction for ${correction.userId.name} on ${correction.date}`,
      req,
    });

    const io = getIO();
    if (io) {
      io.emit('attendance_updated', attendance);
    }

    res.status(200).json({
      success: true,
      data: correction,
      message: 'Correction approved and attendance record updated.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Reject correction request (Admin)
 * @route PATCH /api/attendance/corrections/:id/reject
 * @access Private (Admin)
 */
const rejectCorrection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reviewNotes } = req.body || {};

    const correction = await AttendanceCorrection.findById(id).populate('userId');
    if (!correction) {
      return next(new ApiError(404, 'Correction request not found.'));
    }

    correction.status = 'Rejected';
    correction.reviewedBy = req.user._id;
    correction.reviewNotes = reviewNotes || 'Correction rejected by administrator.';
    correction.reviewedAt = new Date();
    await correction.save();

    await sendNotification({
      userId: correction.userId._id,
      title: 'Attendance Correction Rejected',
      message: `Your correction request for ${correction.date} was rejected. Note: ${correction.reviewNotes}`,
      type: 'CORRECTION_REJECTED',
      referenceId: correction._id,
    });

    await logActivity({
      userId: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'ATTENDANCE_CORRECTION_REJECT',
      module: 'attendance',
      resourceId: correction._id.toString(),
      description: `Rejected correction for ${correction.userId.name}. Notes: ${correction.reviewNotes}`,
      req,
    });

    res.status(200).json({
      success: true,
      data: correction,
      message: 'Correction rejected.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCorrections,
  requestCorrection,
  approveCorrection,
  rejectCorrection,
};
