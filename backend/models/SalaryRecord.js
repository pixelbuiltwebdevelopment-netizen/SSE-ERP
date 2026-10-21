const mongoose = require('mongoose');

const salaryRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  month: {
    type: Number, // 1-12
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  baseSalary: {
    type: Number,
    required: true,
    min: 0
  },
  presentDays: {
    type: Number,
    default: 0
  },
  totalWorkingDays: {
    type: Number,
    default: 30
  },
  grossSalary: {
    type: Number,
    required: true
  },
  advanceDeductions: {
    type: Number,
    default: 0
  },
  netSalary: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['Draft', 'Paid'],
    default: 'Draft',
    index: true
  },
  slipUrl: {
    type: String, // For generated or uploaded slip
    default: null
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // Scoping fields
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null,
    index: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    default: null,
    index: true
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null,
    index: true
  }
}, {
  timestamps: true
});

// Ensure only one record per user per month/year
salaryRecordSchema.index({ userId: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('SalaryRecord', salaryRecordSchema);
