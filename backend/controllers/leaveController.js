const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

// Safe model retrieval to prevent circular dependency warnings
const LeaveRequest = require('../models/LeaveRequest');

// Safe Socket emitter
const emitLeaveUpdate = (leaveData) => {
  try {
    const socketService = require('../services/socketService');
    const io = socketService.getIO ? socketService.getIO() : null;
    if (io) {
      io.emit('leave_updated', leaveData);
    }
  } catch (err) {
    // Socket emit failed silently without breaking API response
  }
};

// Safe Audit Logger
const safeLogActivity = async (payload) => {
  try {
    const { logActivity } = require('../services/auditService');
    if (typeof logActivity === 'function') {
      await logActivity(payload);
    }
  } catch (err) {
    // Audit log error shouldn't crash the leave creation
  }
};

// @desc    Submit a new leave request
// @route   POST /api/leaves/request
exports.submitLeave = asyncHandler(async (req, res) => {
  const { leaveType, durationMode, halfDaySession, startDate, endDate, totalDays, reason } = req.body;

  let computedStart = new Date(startDate);
  let computedEnd = new Date(endDate || startDate);
  let computedDays = Number(totalDays) || 1;

  if (durationMode === 'half') {
    computedEnd = new Date(startDate);
    computedDays = 0.5;
  } else if (durationMode === 'single') {
    computedEnd = new Date(startDate);
    computedDays = 1;
  }

  const leave = await LeaveRequest.create({
    userId: req.user._id,
    leaveType,
    durationMode: durationMode || 'single',
    halfDaySession: durationMode === 'half' ? halfDaySession : 'None',
    startDate: computedStart,
    endDate: computedEnd,
    totalDays: computedDays,
    reason,
    status: 'Pending',
    departmentId: req.user.departmentId || null,
    branchId: req.user.branchId || null,
    teamId: req.user.teamId || null,
  });

  await safeLogActivity({
    userId: req.user._id,
    userName: req.user.name,
    userEmail: req.user.email,
    action: 'LEAVE_REQUEST_SUBMITTED',
    module: 'leaves',
    resourceId: leave._id.toString(),
    description: `Submitted ${computedDays} day(s) of ${leaveType} leave`,
    req,
  });

  const populatedLeave = await LeaveRequest.findById(leave._id)
    .populate('userId', 'name email employeeId');

  emitLeaveUpdate(populatedLeave);

  res.status(201).json(new ApiResponse(201, leave, 'Leave request submitted successfully'));
});

// @desc    Get ONLY the logged-in user's leave requests
// @route   GET /api/leaves/requests/my
exports.getMyLeaves = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, status } = req.query;

  const query = { userId: req.user._id };
  if (status) query.status = status;

  const skip = (page - 1) * limit;

  const leaves = await LeaveRequest.find(query)
    .populate('userId', 'name email employeeId')
    .populate('approvedBy', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await LeaveRequest.countDocuments(query);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        records: leaves,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / limit) || 1,
        },
      },
      'My leaves retrieved successfully'
    )
  );
});

// @desc    Get leave requests based on data scope (For Managers/Admins)
// @route   GET /api/leaves/requests
exports.getLeaves = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, status } = req.query;

  const query = { ...(req.dataScopeFilter || {}) };
  if (status) query.status = status;

  const skip = (page - 1) * limit;

  const leaves = await LeaveRequest.find(query)
    .populate('userId', 'name email employeeId')
    .populate('approvedBy', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await LeaveRequest.countDocuments(query);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        records: leaves,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / limit) || 1,
        },
      },
      'Leave requests retrieved successfully'
    )
  );
});

// @desc    Approve a leave request
// @route   PATCH /api/leaves/requests/:id/approve
exports.approveLeave = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const leave = await LeaveRequest.findOne({ _id: id, ...(req.dataScopeFilter || {}) });

  if (!leave) {
    throw new ApiError(404, 'Leave request not found or out of your data scope');
  }

  if (leave.status !== 'Pending') {
    throw new ApiError(400, `Leave cannot be approved because it is already ${leave.status}`);
  }

  leave.status = 'Approved';
  leave.approvedBy = req.user._id;
  leave.approvedAt = new Date();
  await leave.save();

  await safeLogActivity({
    userId: req.user._id,
    userName: req.user.name,
    userEmail: req.user.email,
    action: 'LEAVE_REQUEST_APPROVED',
    module: 'leaves',
    resourceId: leave._id.toString(),
    description: `Approved ${leave.totalDays} day(s) leave`,
    req,
  });

  const populatedLeave = await LeaveRequest.findById(leave._id)
    .populate('userId', 'name email employeeId')
    .populate('approvedBy', 'name');

  emitLeaveUpdate(populatedLeave);

  res.status(200).json(new ApiResponse(200, leave, 'Leave request approved successfully'));
});

// @desc    Reject a leave request
// @route   PATCH /api/leaves/requests/:id/reject
exports.rejectLeave = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rejectionReason } = req.body;

  const leave = await LeaveRequest.findOne({ _id: id, ...(req.dataScopeFilter || {}) });

  if (!leave) {
    throw new ApiError(404, 'Leave request not found or out of your data scope');
  }

  if (leave.status !== 'Pending') {
    throw new ApiError(400, `Leave cannot be rejected because it is already ${leave.status}`);
  }

  leave.status = 'Rejected';
  leave.rejectionReason = rejectionReason;
  leave.approvedBy = req.user._id;
  await leave.save();

  await safeLogActivity({
    userId: req.user._id,
    userName: req.user.name,
    userEmail: req.user.email,
    action: 'LEAVE_REQUEST_REJECTED',
    module: 'leaves',
    resourceId: leave._id.toString(),
    description: `Rejected leave request. Reason: ${rejectionReason}`,
    req,
  });

  const populatedLeave = await LeaveRequest.findById(leave._id)
    .populate('userId', 'name email employeeId')
    .populate('approvedBy', 'name');

  emitLeaveUpdate(populatedLeave);

  res.status(200).json(new ApiResponse(200, leave, 'Leave request rejected'));
});