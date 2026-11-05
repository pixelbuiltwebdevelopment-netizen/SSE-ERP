const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    lat: { type: Number },
    lng: { type: Number },
    address: { type: String, default: '' },
    accuracy: { type: Number, default: null },
  },
  { _id: false }
);

const workingDurationSchema = new mongoose.Schema(
  {
    totalHours: { type: Number, default: 0 },
    totalMinutes: { type: Number, default: 0 },
    totalSeconds: { type: Number, default: 0 },
    durationMs: { type: Number, default: 0 },
    formatted: { type: String, default: '' },
  },
  { _id: false }
);

const ticketSchema = new mongoose.Schema(
  {
    ticketNo: {
      type: String,
      required: true,
      unique: true,
    },
    ticketType: {
      type: String,
      enum: [
        'Normal Ticket',
        'Rewinding Ticket',
        'Out Door Ticket',
        'AMC Ticket',
        'Panel Board Ticket',
        // Backward compatibility
        'Rewinding',
        'Outdoor',
        'AMC',
        'Panel Board',
      ],
      required: [true, 'Ticket type is required'],
      default: 'Normal Ticket',
    },
    subject: {
      type: String,
      trim: true,
      default: '',
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company is required'],
    },
    contactPerson: {
      type: String,
      trim: true,
      default: '',
    },
    phoneNumber: {
      type: String,
      trim: true,
      default: '',
    },
    unit: {
      type: String,
      trim: true,
      default: 'Plant',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    millName: {
      type: String,
      trim: true,
      default: '',
    },
    hp: {
      type: String,
      trim: true,
      default: '',
    },
    rpm: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['Pending', 'Open', 'In Progress', 'Completed', 'Resolved', 'Closed'],
      default: 'Pending',
    },
    // Assignment & Responsible Technician
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    // Tracking - Start
    startedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    startedByName: {
      type: String,
      default: '',
    },
    startTime: {
      type: Date,
      default: null,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    startLocation: {
      type: locationSchema,
      default: null,
    },
    // Tracking - Stop
    stoppedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    stoppedByName: {
      type: String,
      default: '',
    },
    stopTime: {
      type: Date,
      default: null,
    },
    stoppedAt: {
      type: Date,
      default: null,
    },
    stopLocation: {
      type: locationSchema,
      default: null,
    },
    // Calculated duration
    workingDuration: {
      type: workingDurationSchema,
      default: () => ({
        totalHours: 0,
        totalMinutes: 0,
        totalSeconds: 0,
        durationMs: 0,
        formatted: '',
      }),
    },
    totalWorkingSeconds: {
      type: Number,
      default: 0,
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium',
    },
    // Images
    beforeServiceImages: [
      {
        type: String,
      },
    ],
    afterServiceImages: [
      {
        type: String,
      },
    ],
    // Legacy support for existing tickets
    resolutionImages: [
      {
        type: String,
      },
    ],
    serviceCompletionRemarks: {
      type: String,
      default: '',
    },
    // Legacy support for existing tickets
    resolutionNotes: {
      type: String,
      default: '',
    },
    // Scoping & Audit
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    createdByName: {
      type: String,
      default: '',
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Automatic synchronization and duration calculation
function syncTimestampsAndDuration(next) {
  // Sync startedAt and startTime
  if (this.startTime && !this.startedAt) {
    this.startedAt = this.startTime;
  } else if (this.startedAt && !this.startTime) {
    this.startTime = this.startedAt;
  }

  // Sync stoppedAt and stopTime
  if (this.stopTime && !this.stoppedAt) {
    this.stoppedAt = this.stopTime;
  } else if (this.stoppedAt && !this.stopTime) {
    this.stopTime = this.stoppedAt;
  }

  // Sync totalWorkingSeconds if not set but duration exists
  if ((!this.totalWorkingSeconds || this.totalWorkingSeconds === 0) && this.workingDuration) {
    if (this.workingDuration.durationMs) {
      this.totalWorkingSeconds = Math.floor(this.workingDuration.durationMs / 1000);
    } else if (this.startTime && this.stopTime) {
      const diffMs = Math.max(0, new Date(this.stopTime).getTime() - new Date(this.startTime).getTime());
      this.totalWorkingSeconds = Math.floor(diffMs / 1000);
    }
  }

  if (typeof next === 'function') next();
}

ticketSchema.pre('validate', syncTimestampsAndDuration);
ticketSchema.pre('save', syncTimestampsAndDuration);

// Indexes
ticketSchema.index({ departmentId: 1, branchId: 1, teamId: 1 });
ticketSchema.index({ companyId: 1 });
ticketSchema.index({ status: 1 });
ticketSchema.index({ ticketType: 1 });

module.exports = mongoose.model('Ticket', ticketSchema);
