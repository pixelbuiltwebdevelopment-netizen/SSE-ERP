const mongoose = require('mongoose');

const salaryAdvanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  reason: {
    type: String,
    default: '',
    trim: true
  },
  issuedDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  // 'Issued' = admin has given advance; 'Deducted' = deducted from salary
  status: {
    type: String,
    enum: ['Issued', 'Deducted', 'Partial'],
    default: 'Issued',
    index: true
  },
  deductedAmount: {
    type: Number,
    default: 0
  },
  issuedBy: {
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

module.exports = mongoose.model('SalaryAdvance', salaryAdvanceSchema);
