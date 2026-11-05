const { getActivePolicy } = require('../services/attendanceCalculationService');
const ApiError = require('../utils/ApiError');

/**
 * @desc Get standard company shift (single company-wide shift)
 * @route GET /api/attendance/shifts
 * @access Private
 */
const getShifts = async (req, res, next) => {
  try {
    const policy = await getActivePolicy();
    const standardShift = {
      _id: 'standard-company-shift',
      name: 'Standard Company Shift',
      code: 'STD',
      startTime: policy.standardStartTime || '09:00',
      endTime: policy.standardEndTime || '18:00',
      requiredHours: policy.requiredWorkHours || 8.0,
      gracePeriodMinutes: policy.gracePeriodMinutes ?? 15,
      earlyDepartureThresholdMinutes: policy.earlyDepartureThresholdMinutes ?? 30,
      halfDayThresholdHours: policy.halfDayThresholdHours || 4.0,
      fullDayThresholdHours: policy.fullDayThresholdHours || 8.0,
      breakMinutes: 0,
      unpaidBreakMinutes: 0,
      isNightShift: false,
      isDefault: true,
      isActive: true,
      workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      description: 'Single standard company-wide shift applied to all employees.',
    };

    res.status(200).json({
      success: true,
      data: [standardShift],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Create a new shift (disabled - single shift only)
 * @route POST /api/attendance/shifts
 * @access Private (Admin)
 */
const createShift = async (req, res, next) => {
  return next(new ApiError(400, 'Multiple shifts are disabled. Company uses a single standard shift configured in Shift Policies.'));
};

/**
 * @desc Update shift (redirect to shift policy settings)
 * @route PATCH /api/attendance/shifts/:shiftId
 * @access Private (Admin)
 */
const updateShift = async (req, res, next) => {
  return next(new ApiError(400, 'Individual shifts cannot be modified. Please update the company-wide Shift Policies.'));
};

/**
 * @desc Delete shift (disabled)
 * @route DELETE /api/attendance/shifts/:shiftId
 * @access Private (Admin)
 */
const deleteShift = async (req, res, next) => {
  return next(new ApiError(400, 'Standard company shift cannot be deleted.'));
};

module.exports = {
  getShifts,
  createShift,
  updateShift,
  deleteShift,
};
