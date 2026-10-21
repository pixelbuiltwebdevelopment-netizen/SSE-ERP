const AdvanceBalance = require('../models/AdvanceBalance');
const AdvanceLedger = require('../models/AdvanceLedger');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { logActivity } = require('../services/auditService');
const mongoose = require('mongoose');

// @desc    Get my advance balance
// @route   GET /api/expenses/advance/my-balance
exports.getMyBalance = asyncHandler(async (req, res) => {
  let balance = await AdvanceBalance.findOne({ userId: req.user._id });
  
  // Return an empty/zero format if none exists yet
  if (!balance) {
    balance = {
      totalAdvanceReceived: 0,
      totalExpensesDeducted: 0,
      currentBalance: 0
    };
  }

  res.status(200).json(new ApiResponse(200, balance, 'Advance balance retrieved'));
});

// @desc    Issue advance to an employee
// @route   POST /api/expenses/advance/issue
exports.issueAdvance = asyncHandler(async (req, res) => {
  const { userId, amount, notes } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Credit the Advance Ledger
    const ledger = await AdvanceLedger.create([{
      userId,
      transactionType: 'CREDIT',
      amount: Number(amount),
      notes: notes || 'Manual advance issued',
      processedBy: req.user._id
    }], { session });

    // 2. Update the Advance Balance
    let balance = await AdvanceBalance.findOne({ userId }).session(session);
    if (!balance) {
      balance = new AdvanceBalance({ userId });
    }
    
    balance.totalAdvanceReceived += Number(amount);
    balance.currentBalance += Number(amount);
    await balance.save({ session });

    await session.commitTransaction();
    session.endSession();

    await logActivity({
      userId: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'ADVANCE_ISSUED',
      module: 'expenses',
      resourceId: ledger[0]._id.toString(),
      description: `Issued advance of ${amount} to user ${userId}`,
      req,
    });

    res.status(200).json(new ApiResponse(200, balance, 'Advance issued successfully'));
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});

// @desc    Get all advance balances (for Finance/HR)
// @route   GET /api/expenses/advance/all-balances
exports.getAllBalances = asyncHandler(async (req, res) => {
  const balances = await AdvanceBalance.find()
    .populate('userId', 'name email employeeId isActive')
    .sort({ currentBalance: -1 });

  res.status(200).json(new ApiResponse(200, balances, 'All advance balances retrieved'));
});
