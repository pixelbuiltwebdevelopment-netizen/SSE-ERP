const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Shift name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Shift code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    startTime: {
      type: String, // HH:mm format, e.g., '09:00'
      required: [true, 'Shift start time is required'],
      default: '09:00',
    },
    endTime: {
      type: String, // HH:mm format, e.g., '18:00'
      required: [true, 'Shift end time is required'],
      default: '18:00',
    },
    requiredHours: {
      type: Number,
      default: 8.0,
      min: 1,
      max: 24,
    },
    gracePeriodMinutes: {
      type: Number,
      default: 15,
      min: 0,
    },
    halfDayThresholdHours: {
      type: Number,
      default: 4.5,
      min: 1,
    },
    fullDayThresholdHours: {
      type: Number,
      default: 8.0,
      min: 1,
    },
    breakMinutes: {
      type: Number,
      default: 60,
      min: 0,
    },
    unpaidBreakMinutes: {
      type: Number,
      default: 60,
      min: 0,
    },
    isNightShift: {
      type: Boolean,
      default: false,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    workDays: {
      type: [String],
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    },
    departmentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
      },
    ],
    description: {
      type: String,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Shift || mongoose.model('Shift', shiftSchema);
