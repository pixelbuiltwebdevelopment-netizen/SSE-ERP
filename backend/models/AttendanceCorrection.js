const mongoose = require('mongoose');

const attendanceCorrectionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    attendanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attendance',
      default: null,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    correctionType: {
      type: String,
      enum: ['MISSED_PUNCH_IN', 'MISSED_PUNCH_OUT', 'INCORRECT_HOURS', 'STATUS_DISPUTE', 'OTHER'],
      default: 'MISSED_PUNCH_OUT',
    },
    requestedPunchIn: {
      type: Date,
      default: null,
    },
    requestedPunchOut: {
      type: Date,
      default: null,
    },
    originalPunchIn: {
      type: Date,
      default: null,
    },
    originalPunchOut: {
      type: Date,
      default: null,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewNotes: {
      type: String,
      default: '',
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    // Scoping fields
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
    },
  },
  { timestamps: true }
);

attendanceCorrectionSchema.index({ userId: 1, date: 1 });
attendanceCorrectionSchema.index({ status: 1, departmentId: 1 });

module.exports = mongoose.models.AttendanceCorrection || mongoose.model('AttendanceCorrection', attendanceCorrectionSchema);
