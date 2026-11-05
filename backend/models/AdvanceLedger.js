const mongoose = require('mongoose');

const advanceAttachmentSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    default: '',
  },
  size: {
    type: Number,
    default: 0,
  },
  type: {
    type: String,
    default: '',
  },
}, { _id: false });

const advanceLedgerSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  transactionType: {
    type: String,
    enum: [
      'CREDIT',             // Legacy Advance Issued
      'DEBIT',              // Legacy Expense Adjusted
      'ADVANCE_ISSUED',     // Confirmed advance issued to employee
      'EXPENSE_ADJUSTMENT', // Approved expense adjusted against advance
      'ADVANCE_REFUND',     // Employee refunding unspent advance back to company
      'ADVANCE_CORRECTION', // Admin balance correction / reconciliation
      'REIMBURSEMENT_PAID', // Employee personal expense reimbursement paid out
      'OPENING_BALANCE',    // Opening ledger balance
    ],
    required: true,
    index: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  issueDate: {
    type: Date,
    default: Date.now,
    index: true,
  },
  purpose: {
    type: String,
    trim: true,
    default: '',
  },
  paymentMethod: {
    type: String,
    trim: true,
    default: 'Bank Transfer',
  },
  transactionReference: {
    type: String,
    trim: true,
    default: '',
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExpenseClaim',
    default: null,
    index: true,
  },
  attachments: [advanceAttachmentSchema],
  receiptUrls: {
    type: [String],
    default: [],
  },
  runningBalance: {
    type: Number,
    default: null,
  },
  notes: {
    type: String,
    default: '',
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

advanceLedgerSchema.index({ userId: 1, issueDate: -1 });
advanceLedgerSchema.index({ userId: 1, transactionType: 1 });

module.exports = mongoose.model('AdvanceLedger', advanceLedgerSchema);
