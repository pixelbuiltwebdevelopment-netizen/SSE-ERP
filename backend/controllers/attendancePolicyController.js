const AttendancePolicy = require('../models/AttendancePolicy');
const { logActivity } = require('../services/auditService');

/**
 * @desc Get attendance policy configuration
 * @route GET /api/attendance/policies
 * @access Private
 */
const getPolicy = async (req, res, next) => {
  try {
    let policy = await AttendancePolicy.findOne({ isActive: true }).populate('defaultShiftId');
    if (!policy) {
      // Create initial policy
      policy = await AttendancePolicy.create({
        name: 'Standard Company Attendance Policy',
        timezone: 'Asia/Kolkata',
        standardStartTime: '09:00',
        standardEndTime: '18:00',
        requiredWorkHours: 8.0,
        gracePeriodMinutes: 15,
        halfDayThresholdHours: 4.0,
        fullDayThresholdHours: 8.0,
        unpaidBreakMinutes: 60,
        paidBreakMinutes: 15,
        earlyDepartureThresholdMinutes: 30,
        overtimeEnabled: true,
        overtimeRequiresApproval: true,
        overtimeMinMinutes: 30,
        overtimeMaxHoursDaily: 4.0,
        autoPunchOutMode: 'SHIFT_END',
        autoPunchOutMaxHours: 9.0,
        autoPunchOutNotifyEmployee: true,
        autoPunchOutRequireReview: true,
        weeklyHolidays: ['Sunday'],
        isActive: true,
      });
    }

    res.status(200).json({
      success: true,
      data: policy,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Update attendance policy configuration
 * @route PATCH /api/attendance/policies
 * @route PATCH /api/attendance/policies/:policyId
 * @access Private (Super Admin / Admin)
 */
const updatePolicy = async (req, res, next) => {
  try {
    const policyId = req.params.policyId;
    const updateData = { ...req.body, updatedBy: req.user._id };

    let policy;
    if (policyId) {
      policy = await AttendancePolicy.findByIdAndUpdate(policyId, updateData, { new: true, runValidators: true });
    } else {
      policy = await AttendancePolicy.findOneAndUpdate({ isActive: true }, updateData, {
        new: true,
        upsert: true,
        runValidators: true,
      });
    }

    await logActivity({
      userId: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'ATTENDANCE_POLICY_UPDATE',
      module: 'attendance',
      resourceId: policy._id.toString(),
      description: `Updated attendance policy: Start=${policy.standardStartTime}, End=${policy.standardEndTime}, Grace=${policy.gracePeriodMinutes}m, AutoPunch=${policy.autoPunchOutMode}`,
      req,
    });

    res.status(200).json({
      success: true,
      data: policy,
      message: 'Attendance policy updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPolicy,
  updatePolicy,
};
