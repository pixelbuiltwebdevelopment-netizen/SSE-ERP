const mongoose = require('mongoose');

const advanceBalanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  totalAdvanceReceived: {
    type: Number,
    default: 0,
    min: 0
  },
  totalExpensesDeducted: {
    type: Number,
    default: 0,
    min: 0
  },
  currentBalance: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AdvanceBalance', advanceBalanceSchema);
