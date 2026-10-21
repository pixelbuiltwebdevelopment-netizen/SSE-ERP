const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    lat: { type: Number },
    lng: { type: Number },
    address: { type: String },
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
      enum: ['Normal Ticket', 'Rewinding', 'Outdoor', 'AMC', 'Panel Board'],
      required: [true, 'Ticket type is required'],
      default: 'Normal Ticket',
    },
    subject: {
      type: String,
      required: [true, 'Ticket subject is required'],
      trim: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company is required'],
    },
    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
      default: 'Open',
    },
    startTime: {
      type: Date,
      default: null,
    },
    startLocation: {
      type: locationSchema,
      default: null,
    },
    stopTime: {
      type: Date,
      default: null,
    },
    stopLocation: {
      type: locationSchema,
      default: null,
    },
    resolutionNotes: {
      type: String,
      default: '',
    },
    resolutionImages: [
      {
        type: String,
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true, // Index is kept here
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

// Removed duplicate: ticketSchema.index({ createdBy: 1 });
ticketSchema.index({ departmentId: 1, branchId: 1, teamId: 1 });
ticketSchema.index({ companyId: 1 });

module.exports = mongoose.model('Ticket', ticketSchema);