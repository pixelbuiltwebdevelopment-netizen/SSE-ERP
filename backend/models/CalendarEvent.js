const mongoose = require('mongoose');

const calendarEventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
  },
  description: {
    type: String,
    default: '',
    trim: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  eventType: {
    type: String,
    enum: ['Meeting', 'Holiday', 'Task', 'Reminder', 'Other'],
    default: 'Holiday',
    index: true,
  },
  customClassification: {
    type: String,
    default: '',
    trim: true,
  },
  daySpan: {
    type: String,
    enum: ['single', 'multiple'],
    default: 'single',
  },
  dayType: {
    type: String,
    enum: ['full', 'half'],
    default: 'full',
  },
  halfDaySession: {
    type: String,
    default: '',
  },
  holidayCategory: {
    type: String,
    default: 'Mandatory Public Holiday',
  },
  meetingLocation: {
    type: String,
    default: '',
    trim: true,
  },
  isFullDay: {
    type: Boolean,
    default: true,
  },
  dayCoverage: {
    type: String,
    enum: ['FullDay', 'FirstHalf', 'SecondHalf'],
    default: 'FullDay',
  },
  isPublic: {
    type: Boolean,
    default: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  // Data Scoping
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
}, { timestamps: true });

module.exports = mongoose.model('CalendarEvent', calendarEventSchema);