const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: [
        'PUNCH_IN',
        'PUNCH_OUT',
        'LATE_ARRIVAL',
        'MISSING_PUNCH_OUT',
        'AUTO_PUNCH_OUT',
        'CORRECTION_REQUEST',
        'CORRECTION_APPROVED',
        'CORRECTION_REJECTED',
        'OVERTIME_REQUEST',
        'OVERTIME_APPROVED',
        'OVERTIME_REJECTED',
        'SYSTEM',
      ],
      default: 'SYSTEM',
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
