const mongoose = require('mongoose');

const expenseItemSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  category: {
    type: String,
    required: true,
    trim: true,
  },
  date: {
    type: Date,
    required: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  receiptUrl: {
    type: String,
    default: null,
  },
  receiptUrls: {
    type: [String],
    default: [],
  },
});

const expenseClaimHistorySchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  amount: {
    type: Number,
    default: null,
  },
  notes: {
    type: String,
    default: '',
  },
}, { _id: false });

const expenseClaimSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  items: [expenseItemSchema],
  receiptUrls: {
    type: [String],
    default: [],
  },
  attachments: {
    type: [mongoose.Schema.Types.Mixed],
    default: [],
  },
  totalClaimAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  approvedAmount: {
    type: Number,
    default: null,
  },
  settledAmount: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
    index: true,
  },
  settlementStatus: {
    type: String,
    enum: ['UNSETTLED', 'SETTLED_ADVANCE', 'REIMBURSED', 'PARTIALLY_SETTLED'],
    default: 'UNSETTLED',
    index: true,
  },
  settlementType: {
    type: String,
    enum: ['ADVANCE_ADJUSTMENT', 'REIMBURSEMENT', null],
    default: null,
  },
  settlementDate: {
    type: Date,
    default: null,
  },
  settlementDetails: {
    paymentMethod: { type: String, default: '' },
    transactionReference: { type: String, default: '' },
    notes: { type: String, default: '' },
    settledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    settledAt: { type: Date, default: null },
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  rejectionReason: {
    type: String,
    default: null,
  },
  approvedAt: {
    type: Date,
    default: null,
  },
  history: [expenseClaimHistorySchema],
  // Data Scoping Fields (copied from user at time of creation)
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
}, {
  timestamps: true,
});

expenseClaimSchema.index({ status: 1, settlementStatus: 1 });
expenseClaimSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('ExpenseClaim', expenseClaimSchema);
