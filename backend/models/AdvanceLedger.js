const mongoose = require('mongoose');

const advanceLedgerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  transactionType: {
    type: String,
    enum: ['CREDIT', 'DEBIT'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExpenseClaim',
    default: null // Will be null for CREDITS (manual advance), populated for DEBITS (approved claims)
  },
  notes: {
    type: String,
    default: ''
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AdvanceLedger', advanceLedgerSchema);
