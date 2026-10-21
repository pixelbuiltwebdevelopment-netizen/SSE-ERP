const Shift = require('../models/Shift');
const ApiError = require('../utils/ApiError');
const { logActivity } = require('../services/auditService');

/**
 * @desc Get all shifts
 * @route GET /api/attendance/shifts
 * @access Private
 */
const getShifts = async (req, res, next) => {
  try {
    const shifts = await Shift.find({ isActive: true })
      .populate('departmentIds', 'name code')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: shifts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Create a new shift
 * @route POST /api/attendance/shifts
 * @access Private (Admin)
 */
const createShift = async (req, res, next) => {
  try {
    const {
      name,
      code,
      startTime,
      endTime,
      requiredHours,
      gracePeriodMinutes,
      halfDayThresholdHours,
      fullDayThresholdHours,
      breakMinutes,
      unpaidBreakMinutes,
      isNightShift,
      isDefault,
      workDays,
      departmentIds,
      description,
    } = req.body;

    if (!name || !code || !startTime || !endTime) {
      return next(new ApiError(400, 'Shift name, code, start time, and end time are required.'));
    }

    // Check duplicate code
    const existing = await Shift.findOne({ code: code.toUpperCase() });
    if (existing) {
      return next(new ApiError(400, `Shift code '${code}' already exists.`));
    }

    if (isDefault) {
      await Shift.updateMany({}, { isDefault: false });
    }

    const shift = await Shift.create({
      name,
      code: code.toUpperCase(),
      startTime,
      endTime,
      requiredHours: requiredHours || 8.0,
      gracePeriodMinutes: gracePeriodMinutes !== undefined ? gracePeriodMinutes : 15,
      halfDayThresholdHours: halfDayThresholdHours || 4.5,
      fullDayThresholdHours: fullDayThresholdHours || 8.0,
      breakMinutes: breakMinutes !== undefined ? breakMinutes : 60,
      unpaidBreakMinutes: unpaidBreakMinutes !== undefined ? unpaidBreakMinutes : 60,
      isNightShift: !!isNightShift,
      isDefault: !!isDefault,
      workDays: workDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      departmentIds: departmentIds || [],
      description: description || '',
      createdBy: req.user._id,
    });

    await logActivity({
      userId: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'SHIFT_CREATE',
      module: 'attendance',
      resourceId: shift._id.toString(),
      description: `Created shift ${shift.name} (${shift.code}) [${startTime}-${endTime}]`,
      req,
    });

    res.status(201).json({
      success: true,
      data: shift,
      message: 'Shift created successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Update shift
 * @route PATCH /api/attendance/shifts/:shiftId
 * @access Private (Admin)
 */
const updateShift = async (req, res, next) => {
  try {
    const { shiftId } = req.params;
    const updateData = { ...req.body };

    if (updateData.code) {
      updateData.code = updateData.code.toUpperCase();
    }

    if (updateData.isDefault) {
      await Shift.updateMany({ _id: { $ne: shiftId } }, { isDefault: false });
    }

    const shift = await Shift.findByIdAndUpdate(shiftId, updateData, { new: true, runValidators: true });
    if (!shift) {
      return next(new ApiError(404, 'Shift not found.'));
    }

    await logActivity({
      userId: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'SHIFT_UPDATE',
      module: 'attendance',
      resourceId: shift._id.toString(),
      description: `Updated shift ${shift.name} (${shift.code})`,
      req,
    });

    res.status(200).json({
      success: true,
      data: shift,
      message: 'Shift updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Delete (deactivate) shift
 * @route DELETE /api/attendance/shifts/:shiftId
 * @access Private (Admin)
 */
const deleteShift = async (req, res, next) => {
  try {
    const { shiftId } = req.params;
    const shift = await Shift.findByIdAndUpdate(shiftId, { isActive: false }, { new: true });
    if (!shift) {
      return next(new ApiError(404, 'Shift not found.'));
    }

    res.status(200).json({
      success: true,
      message: 'Shift deactivated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getShifts,
  createShift,
  updateShift,
  deleteShift,
};
