const OvertimeRequest = require('../models/OvertimeRequest');
const Attendance = require('../models/Attendance');
const ApiError = require('../utils/ApiError');
const { logActivity } = require('../services/auditService');
const { sendNotification } = require('../services/notificationService');

/**
 * @desc Get overtime requests (Admin/HR scoped or own)
 * @route GET /api/attendance/overtime/requests
 * @access Private
 */
const getOvertimeRequests = async (req, res, next) => {
  try {
    const { status, date, page = 1, limit = 20 } = req.query;
    const filter = { ...req.dataScopeFilter };

    if (status) filter.status = status;
    if (date) filter.date = date;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [requests, total] = await Promise.all([
      OvertimeRequest.find(filter)
        .populate('userId', 'name email employeeId avatar')
        .populate('approvedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      OvertimeRequest.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        requests,
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
 * @desc Submit overtime request (Employee)
 * @route POST /api/attendance/overtime/requests
 * @access Private
 */
const requestOvertime = async (req, res, next) => {
  try {
    const { attendanceId, requestedMinutes, reason } = req.body;

    if (!attendanceId || !requestedMinutes || !reason) {
      return next(new ApiError(400, 'Attendance ID, requested minutes, and reason are required.'));
    }

    const attendance = await Attendance.findOne({ _id: attendanceId, userId: req.user._id });
    if (!attendance) {
      return next(new ApiError(404, 'Attendance record not found or does not belong to you.'));
    }

    const existing = await OvertimeRequest.findOne({ attendanceId, status: 'Pending' });
    if (existing) {
      return next(new ApiError(400, 'An overtime request is already pending for this day.'));
    }

    const otRequest = await OvertimeRequest.create({
      userId: req.user._id,
      attendanceId,
      date: attendance.date,
      calculatedOvertimeMinutes: attendance.overtimeMinutes || 0,
      requestedMinutes: parseInt(requestedMinutes, 10),
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
      action: 'OVERTIME_REQUEST',
      module: 'attendance',
      resourceId: otRequest._id.toString(),
      description: `Requested ${requestedMinutes}m overtime for ${attendance.date}`,
      req,
    });

    res.status(201).json({
      success: true,
      data: otRequest,
      message: 'Overtime request submitted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Approve overtime request (Admin)
 * @route PATCH /api/attendance/overtime/:requestId/approve
 * @access Private (Admin)
 */
const approveOvertime = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { approvedMinutes } = req.body;

    const request = await OvertimeRequest.findById(requestId).populate('userId', 'name email');
    if (!request) {
      return next(new ApiError(404, 'Overtime request not found.'));
    }

    const minutesToApprove = approvedMinutes !== undefined ? parseInt(approvedMinutes, 10) : request.requestedMinutes;

    request.status = 'Approved';
    request.approvedMinutes = minutesToApprove;
    request.approvedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();

    // Update Attendance record with approved overtime
    if (request.attendanceId) {
      await Attendance.findByIdAndUpdate(request.attendanceId, {
        approvedOvertimeMinutes: minutesToApprove,
      });
    }

    await sendNotification({
      userId: request.userId._id,
      title: 'Overtime Request Approved',
      message: `Your overtime request for ${request.date} was approved for ${minutesToApprove} minutes (${(minutesToApprove / 60).toFixed(1)} hrs).`,
      type: 'OVERTIME_APPROVED',
      referenceId: request._id,
    });

    await logActivity({
      userId: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'OVERTIME_APPROVE',
      module: 'attendance',
      resourceId: request._id.toString(),
      description: `Approved ${minutesToApprove}m overtime for ${request.userId.name} on ${request.date}`,
      req,
    });

    res.status(200).json({
      success: true,
      data: request,
      message: 'Overtime request approved.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Reject overtime request (Admin)
 * @route PATCH /api/attendance/overtime/:requestId/reject
 * @access Private (Admin)
 */
const rejectOvertime = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason || !rejectionReason.trim()) {
      return next(new ApiError(400, 'Rejection reason is required.'));
    }

    const request = await OvertimeRequest.findById(requestId).populate('userId', 'name email');
    if (!request) {
      return next(new ApiError(404, 'Overtime request not found.'));
    }

    request.status = 'Rejected';
    request.rejectionReason = rejectionReason;
    request.approvedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();

    await sendNotification({
      userId: request.userId._id,
      title: 'Overtime Request Rejected',
      message: `Your overtime request for ${request.date} was rejected. Reason: ${rejectionReason}`,
      type: 'OVERTIME_REJECTED',
      referenceId: request._id,
    });

    await logActivity({
      userId: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'OVERTIME_REJECT',
      module: 'attendance',
      resourceId: request._id.toString(),
      description: `Rejected overtime for ${request.userId.name}. Reason: ${rejectionReason}`,
      req,
    });

    res.status(200).json({
      success: true,
      data: request,
      message: 'Overtime request rejected.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOvertimeRequests,
  requestOvertime,
  approveOvertime,
  rejectOvertime,
};
