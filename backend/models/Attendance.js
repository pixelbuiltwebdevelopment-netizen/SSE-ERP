const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String },
  },
  { _id: false }
);

const AttendanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: String, // Format: YYYY-MM-DD
      required: true,
      index: true,
    },
    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shift',
      default: null,
    },
    scheduledStartAt: {
      type: Date,
      default: null,
    },
    scheduledEndAt: {
      type: Date,
      default: null,
    },
    punchIn: {
      time: { type: Date, required: true },
      location: { type: LocationSchema },
      ipAddress: { type: String },
      status: {
        type: String,
        enum: ['On-Time', 'Late'],
        default: 'On-Time',
      },
    },
    punchOut: {
      time: { type: Date },
      location: { type: LocationSchema },
      ipAddress: { type: String },
      isAutoPunched: { type: Boolean, default: false },
      method: {
        type: String,
        enum: ['Manual', 'Auto-ShiftEnd', 'Auto-MaxHours', 'Admin-Correction', 'None'],
        default: 'None',
      },
    },
    actualWorkedMinutes: {
      type: Number,
      default: 0,
    },
    effectiveWorkedMinutes: {
      type: Number,
      default: 0,
    },
    workingHours: {
      type: Number, // Stored in hours (e.g., 8.5)
      default: 0,
    },
    unpaidBreakMinutes: {
      type: Number,
      default: 0,
    },
    lateMinutes: {
      type: Number,
      default: 0,
    },
    earlyDepartureMinutes: {
      type: Number,
      default: 0,
    },
    overtimeMinutes: {
      type: Number,
      default: 0,
    },
    approvedOvertimeMinutes: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Present', 'Absent', 'Half-Day', 'Leave', 'Holiday', 'Weekly-Off', 'Incomplete'],
      default: 'Present',
    },
    flags: {
      type: [String],
      default: ['Present'],
    },
    isAutoPunchOut: {
      type: Boolean,
      default: false,
    },
    autoPunchOutReason: {
      type: String,
      default: '',
    },
    needsReview: {
      type: Boolean,
      default: false,
      index: true,
    },
    reviewStatus: {
      type: String,
      enum: ['Normal', 'Pending-Review', 'Reviewed', 'Corrected'],
      default: 'Normal',
    },
    correctionHistory: [
      {
        previousPunchIn: { type: Date },
        previousPunchOut: { type: Date },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reason: { type: String },
        changedAt: { type: Date, default: Date.now },
      },
    ],
    // Data Scoping Fields (inherited from User at punch-in)
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      index: true,
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one attendance record per user per day
AttendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

// Index for data scoping, reporting, and HR querying
AttendanceSchema.index({ date: 1, departmentId: 1, branchId: 1, teamId: 1 });
AttendanceSchema.index({ status: 1, date: 1 });
AttendanceSchema.index({ needsReview: 1, date: 1 });

module.exports = mongoose.models.Attendance || mongoose.model('Attendance', AttendanceSchema);
