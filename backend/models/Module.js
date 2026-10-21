const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Module name is required'],
      trim: true,
    },
    key: {
      type: String,
      required: [true, 'Module key is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: '',
    },
    availableActions: [
      {
        name: { type: String, required: true }, // e.g., "View Attendance"
        key: { type: String, required: true },  // e.g., "view"
        requiresScope: { type: Boolean, default: false } // e.g., true for "view" (Own/All), false for "punch_in"
      }
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Module', moduleSchema);
