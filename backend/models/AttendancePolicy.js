const mongoose = require('mongoose');

const attendancePolicySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      default: 'Standard Company Attendance Policy',
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
    defaultShiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shift',
      default: null,
    },
    standardStartTime: {
      type: String,
      default: '09:00',
    },
    standardEndTime: {
      type: String,
      default: '18:00',
    },
    requiredWorkHours: {
      type: Number,
      default: 8.0,
      min: 1,
    },
    gracePeriodMinutes: {
      type: Number,
      default: 15,
      min: 0,
    },
    halfDayThresholdHours: {
      type: Number,
      default: 4.0,
      min: 1,
    },
    fullDayThresholdHours: {
      type: Number,
      default: 8.0,
      min: 1,
    },
    unpaidBreakMinutes: {
      type: Number,
      default: 60,
      min: 0,
    },
    paidBreakMinutes: {
      type: Number,
      default: 15,
      min: 0,
    },
    earlyDepartureThresholdMinutes: {
      type: Number,
      default: 30,
      min: 0,
    },
    // Overtime Rules
    overtimeEnabled: {
      type: Boolean,
      default: true,
    },
    overtimeRequiresApproval: {
      type: Boolean,
      default: true,
    },
    overtimeMinMinutes: {
      type: Number,
      default: 30,
    },
    overtimeMaxHoursDaily: {
      type: Number,
      default: 4.0,
    },
    // Missing Punch Out Automation
    autoPunchOutMode: {
      type: String,
      enum: ['SHIFT_END', 'MAX_HOURS', 'DISABLED'],
      default: 'SHIFT_END',
    },
    autoPunchOutMaxHours: {
      type: Number,
      default: 9.0,
    },
    autoPunchOutNotifyEmployee: {
      type: Boolean,
      default: true,
    },
    autoPunchOutRequireReview: {
      type: Boolean,
      default: true,
    },
    weeklyHolidays: {
      type: [String],
      default: ['Sunday'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.AttendancePolicy || mongoose.model('AttendancePolicy', attendancePolicySchema);
