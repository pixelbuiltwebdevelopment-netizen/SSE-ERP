const ExpenseClaim = require('../models/ExpenseClaim');
const AdvanceBalance = require('../models/AdvanceBalance');
const AdvanceLedger = require('../models/AdvanceLedger');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { logActivity } = require('../services/auditService');
const mongoose = require('mongoose');
const { getIO } = require('../services/socketService');

// @desc    Submit a new expense claim
// @route   POST /api/expenses/claims
exports.submitClaim = asyncHandler(async (req, res) => {
  const { items } = req.body;

  const totalClaimAmount = items.reduce((sum, item) => sum + Number(item.amount), 0);

  const claim = await ExpenseClaim.create({
    userId: req.user._id,
    items,
    totalClaimAmount,
    status: 'Pending',
    departmentId: req.user.departmentId,
    branchId: req.user.branchId,
    teamId: req.user.teamId,
  });

  await logActivity({
    userId: req.user._id,
    userName: req.user.name,
    userEmail: req.user.email,
    action: 'EXPENSE_CLAIM_SUBMITTED',
    module: 'expenses',
    resourceId: claim._id.toString(),
    description: `Submitted expense claim for ${totalClaimAmount}`,
    req,
  });

  const populatedClaim = await ExpenseClaim.findById(claim._id).populate('userId', 'name email');
  const io = getIO();
  io.emit('expense_updated', populatedClaim);

  res.status(201).json(new ApiResponse(201, claim, 'Expense claim submitted successfully'));
});

// @desc    Get claims based on data scope
// @route   GET /api/expenses/claims
exports.getClaims = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;

  const query = { ...req.dataScopeFilter };
  if (status) query.status = status;

  const skip = (page - 1) * limit;

  const claims = await ExpenseClaim.find(query)
    .populate('userId', 'name email employeeId')
    .populate('approvedBy', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await ExpenseClaim.countDocuments(query);

  res.status(200).json(new ApiResponse(200, {
    records: claims,
    pagination: {
      total,
      page: Number(page),
      pages: Math.ceil(total / limit)
    }
  }, 'Claims retrieved successfully'));
});

// @desc    Get ONLY the logged-in user's claims (ignores RBAC scoping)
// @route   GET /api/expenses/claims/my
exports.getMyClaims = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  
  const query = { userId: req.user._id };
  if (status) query.status = status;

  const skip = (page - 1) * limit;

  const claims = await ExpenseClaim.find(query)
    .populate('userId', 'name email employeeId')
    .populate('approvedBy', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await ExpenseClaim.countDocuments(query);
  res.status(200).json(new ApiResponse(200, {
    records: claims,
    pagination: {
      total,
      page: Number(page),
      pages: Math.ceil(total / limit)
    }
  }, 'My claims retrieved successfully'));
});

// @desc    Approve an expense claim
// @route   PATCH /api/expenses/claims/:id/approve
exports.approveClaim = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Use a MongoDB transaction to ensure data integrity between Claim, Balance, and Ledger
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const claim = await ExpenseClaim.findOne({ _id: id, ...req.dataScopeFilter }).session(session);
    
    if (!claim) {
      throw new ApiError(404, 'Claim not found or out of your data scope');
    }
    
    if (claim.status !== 'Pending') {
      throw new ApiError(400, `Claim cannot be approved because it is already ${claim.status}`);
    }

    // 1. Mark claim as approved
    claim.status = 'Approved';
    claim.approvedBy = req.user._id;
    claim.approvedAt = new Date();
    await claim.save({ session });

    // 2. Debit the user's Advance Ledger
    await AdvanceLedger.create([{
      userId: claim.userId,
      transactionType: 'DEBIT',
      amount: claim.totalClaimAmount,
      referenceId: claim._id,
      notes: 'Expense claim approved',
      processedBy: req.user._id
    }], { session });

    // 3. Update the Advance Balance
    let balance = await AdvanceBalance.findOne({ userId: claim.userId }).session(session);
    if (!balance) {
      // If they somehow have no balance record yet, create one
      balance = new AdvanceBalance({ userId: claim.userId });
    }
    
    balance.totalExpensesDeducted += claim.totalClaimAmount;
    balance.currentBalance -= claim.totalClaimAmount;
    await balance.save({ session });

    await session.commitTransaction();
    session.endSession();

    await logActivity({
      userId: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'EXPENSE_CLAIM_APPROVED',
      module: 'expenses',
      resourceId: claim._id.toString(),
      description: `Approved expense claim for ${claim.totalClaimAmount}`,
      req,
    });

    const populatedClaim = await ExpenseClaim.findById(claim._id).populate('userId', 'name email employeeId').populate('approvedBy', 'name');
    const io = getIO();
    io.emit('expense_updated', populatedClaim);

    res.status(200).json(new ApiResponse(200, claim, 'Expense claim approved and deducted from advance'));
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});

// @desc    Reject an expense claim
// @route   PATCH /api/expenses/claims/:id/reject
exports.rejectClaim = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rejectionReason } = req.body;

  const claim = await ExpenseClaim.findOne({ _id: id, ...req.dataScopeFilter });
    
  if (!claim) {
    throw new ApiError(404, 'Claim not found or out of your data scope');
  }
  
  if (claim.status !== 'Pending') {
    throw new ApiError(400, `Claim cannot be rejected because it is already ${claim.status}`);
  }

  claim.status = 'Rejected';
  claim.rejectionReason = rejectionReason;
  claim.approvedBy = req.user._id;
  await claim.save();

  await logActivity({
    userId: req.user._id,
    userName: req.user.name,
    userEmail: req.user.email,
    action: 'EXPENSE_CLAIM_REJECTED',
    module: 'expenses',
    resourceId: claim._id.toString(),
    description: `Rejected expense claim. Reason: ${rejectionReason}`,
    req,
  });

  const populatedClaim = await ExpenseClaim.findById(claim._id).populate('userId', 'name email employeeId').populate('approvedBy', 'name');
  const io = getIO();
  io.emit('expense_updated', populatedClaim);

  res.status(200).json(new ApiResponse(200, claim, 'Expense claim rejected'));
});
