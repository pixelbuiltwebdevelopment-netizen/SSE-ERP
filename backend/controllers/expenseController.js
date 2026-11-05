const ExpenseClaim = require('../models/ExpenseClaim');
const AdvanceBalance = require('../models/AdvanceBalance');
const AdvanceLedger = require('../models/AdvanceLedger');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { logActivity } = require('../services/auditService');
const mongoose = require('mongoose');
const { getIO } = require('../services/socketService');

// Helper to generate unique transaction ID
const generateTransactionId = (prefix = 'TXN') => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${dateStr}-${randomStr}`;
};

// Helper to normalize receipt URLs across legacy and multi-receipt formats
const normalizeClaim = (c) => {
  if (!c) return c;
  const doc = c.toObject ? c.toObject() : { ...c };
  const allUrls = [];
  if (Array.isArray(doc.receiptUrls)) allUrls.push(...doc.receiptUrls);
  if (Array.isArray(doc.items)) {
    doc.items = doc.items.map((item) => {
      const urls = [];
      if (Array.isArray(item.receiptUrls)) urls.push(...item.receiptUrls);
      if (item.receiptUrl && !urls.includes(item.receiptUrl)) urls.push(item.receiptUrl);
      allUrls.push(...urls);
      return {
        ...item,
        receiptUrls: urls,
        receiptUrl: urls[0] || item.receiptUrl || null,
      };
    });
  }
  doc.receiptUrls = Array.from(new Set(allUrls.filter(Boolean)));
  return doc;
};

// @desc    Submit a new expense claim
// @route   POST /api/expenses/claims
exports.submitClaim = asyncHandler(async (req, res) => {
  const { items, attachments = [] } = req.body;

  const sanitizedItems = items.map((item) => {
    let urls = [];
    if (Array.isArray(item.receiptUrls) && item.receiptUrls.length > 0) {
      urls = item.receiptUrls.filter(Boolean);
    }
    if (item.receiptUrl && !urls.includes(item.receiptUrl)) {
      urls.unshift(item.receiptUrl);
    }
    return {
      ...item,
      receiptUrls: urls,
      receiptUrl: urls[0] || null,
    };
  });

  const totalClaimAmount = sanitizedItems.reduce((sum, item) => sum + Number(item.amount), 0);
  const allReceiptUrls = Array.from(new Set(sanitizedItems.flatMap((it) => it.receiptUrls || [])));

  const claim = await ExpenseClaim.create({
    userId: req.user._id,
    items: sanitizedItems,
    receiptUrls: allReceiptUrls,
    attachments: Array.isArray(attachments) ? attachments : [],
    totalClaimAmount,
    status: 'Pending',
    settlementStatus: 'UNSETTLED',
    approvedAmount: null,
    settledAmount: 0,
    history: [
      {
        action: 'SUBMITTED',
        performedBy: req.user._id,
        timestamp: new Date(),
        amount: totalClaimAmount,
        notes: `Submitted ${sanitizedItems.length} expense item(s)`,
      },
    ],
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
    description: `Submitted expense claim for ₹${totalClaimAmount}`,
    req,
  });

  const populatedClaim = await ExpenseClaim.findById(claim._id)
    .populate('userId', 'name email employeeId')
    .populate('approvedBy', 'name');

  try {
    const io = getIO();
    if (io) io.emit('expense_updated', populatedClaim);
  } catch (e) {}

  res.status(201).json(new ApiResponse(201, claim, 'Expense claim submitted successfully'));
});

// @desc    Get claims based on data scope
// @route   GET /api/expenses/claims
exports.getClaims = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, settlementStatus, search, employeeId, startDate, endDate } = req.query;

  const query = { ...req.dataScopeFilter };
  if (status) query.status = status;
  if (settlementStatus) query.settlementStatus = settlementStatus;
  if (employeeId) query.userId = employeeId;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  const skip = (page - 1) * limit;

  const claims = await ExpenseClaim.find(query)
    .populate('userId', 'name email employeeId departmentId roleId')
    .populate('approvedBy', 'name email')
    .populate('settlementDetails.settledBy', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await ExpenseClaim.countDocuments(query);
  const normalizedClaims = claims.map(normalizeClaim);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        records: normalizedClaims,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / limit),
        },
      },
      'Claims retrieved successfully'
    )
  );
});

// @desc    Get single claim by ID with full details
// @route   GET /api/expenses/claims/:id
exports.getClaimById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const claim = await ExpenseClaim.findById(id)
    .populate('userId', 'name email employeeId phone departmentId roleId')
    .populate('approvedBy', 'name email')
    .populate('settlementDetails.settledBy', 'name email')
    .populate('history.performedBy', 'name email');

  if (!claim) {
    throw new ApiError(404, 'Expense claim not found');
  }

  // Permission check: owner or users with view permission
  const isOwner = claim.userId._id.toString() === req.user._id.toString();
  const isSuperAdmin = req.user.roleId?.key === 'super_admin';
  const hasViewPermission = req.user.permissions?.some(
    (p) => p.module === 'expenses' && ['view', 'approve'].includes(p.action)
  );

  if (!isOwner && !isSuperAdmin && !hasViewPermission) {
    throw new ApiError(403, 'You do not have permission to view this claim');
  }

  res.status(200).json(new ApiResponse(200, normalizeClaim(claim), 'Expense claim retrieved successfully'));
});

// @desc    Get ONLY the logged-in user's claims
// @route   GET /api/expenses/claims/my
exports.getMyClaims = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, settlementStatus } = req.query;

  const query = { userId: req.user._id };
  if (status) query.status = status;
  if (settlementStatus) query.settlementStatus = settlementStatus;

  const skip = (page - 1) * limit;

  const claims = await ExpenseClaim.find(query)
    .populate('userId', 'name email employeeId')
    .populate('approvedBy', 'name')
    .populate('settlementDetails.settledBy', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await ExpenseClaim.countDocuments(query);
  const normalizedClaims = claims.map(normalizeClaim);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        records: normalizedClaims,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / limit),
        },
      },
      'My claims retrieved successfully'
    )
  );
});

// @desc    Approve an expense claim (APPROVAL ALONE DOES NOT DEDUCT ADVANCE)
// @route   PATCH /api/expenses/claims/:id/approve
exports.approveClaim = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { approvedAmount, remarks, settlementAction, paymentMethod, transactionReference } = req.body;

  const claim = await ExpenseClaim.findOne({ _id: id, ...req.dataScopeFilter });

  if (!claim) {
    throw new ApiError(404, 'Claim not found or out of your data scope');
  }

  if (claim.status !== 'Pending') {
    throw new ApiError(400, `Claim cannot be approved because it is already ${claim.status}`);
  }

  const finalApprovedAmount = Number(approvedAmount || claim.totalClaimAmount);
  claim.status = 'Approved';
  claim.approvedAmount = finalApprovedAmount;
  claim.approvedBy = req.user._id;
  claim.approvedAt = new Date();
  claim.settlementStatus = 'UNSETTLED';

  claim.history.push({
    action: 'APPROVED',
    performedBy: req.user._id,
    timestamp: new Date(),
    amount: finalApprovedAmount,
    notes: remarks || 'Expense claim approved by reviewer',
  });

  // If reviewer explicitly chose an immediate settlement action during approval
  if (settlementAction === 'ADJUST_ADVANCE') {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const transactionId = generateTransactionId('ADJ');
      const allUrls = claim.items?.flatMap((it) => it.receiptUrls?.length ? it.receiptUrls : (it.receiptUrl ? [it.receiptUrl] : [])) || [];

      await AdvanceLedger.create(
        [
          {
            transactionId,
            userId: claim.userId,
            transactionType: 'EXPENSE_ADJUSTMENT',
            amount: finalApprovedAmount,
            referenceId: claim._id,
            purpose: `Expense claim #${claim._id.toString().slice(-6).toUpperCase()} adjusted against advance`,
            notes: remarks || 'Expense claim approved and adjusted against corporate advance',
            paymentMethod: paymentMethod || 'Corporate Advance',
            transactionReference: transactionReference || '',
            receiptUrls: allUrls,
            processedBy: req.user._id,
          },
        ],
        { session }
      );

      let balance = await AdvanceBalance.findOne({ userId: claim.userId }).session(session);
      if (!balance) balance = new AdvanceBalance({ userId: claim.userId });

      balance.totalExpensesDeducted += finalApprovedAmount;
      balance.currentBalance -= finalApprovedAmount;
      await balance.save({ session });

      claim.settlementStatus = 'SETTLED_ADVANCE';
      claim.settlementType = 'ADVANCE_ADJUSTMENT';
      claim.settledAmount = finalApprovedAmount;
      claim.settlementDate = new Date();
      claim.settlementDetails = {
        paymentMethod: paymentMethod || 'Corporate Advance',
        transactionReference: transactionReference || '',
        notes: remarks || '',
        settledBy: req.user._id,
        settledAt: new Date(),
      };
      claim.history.push({
        action: 'SETTLED_ADVANCE',
        performedBy: req.user._id,
        timestamp: new Date(),
        amount: finalApprovedAmount,
        notes: `Adjusted against available advance. Txn ID: ${transactionId}`,
      });

      await claim.save({ session });
      await session.commitTransaction();
      session.endSession();
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  } else if (settlementAction === 'REIMBURSE') {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const transactionId = generateTransactionId('REIMB');
      const allUrls = claim.items?.flatMap((it) => it.receiptUrls?.length ? it.receiptUrls : (it.receiptUrl ? [it.receiptUrl] : [])) || [];

      await AdvanceLedger.create(
        [
          {
            transactionId,
            userId: claim.userId,
            transactionType: 'REIMBURSEMENT_PAID',
            amount: finalApprovedAmount,
            referenceId: claim._id,
            purpose: `Reimbursement paid for claim #${claim._id.toString().slice(-6).toUpperCase()}`,
            notes: remarks || 'Expense claim approved and reimbursed via personal funds settlement',
            paymentMethod: paymentMethod || 'Bank Transfer',
            transactionReference: transactionReference || '',
            receiptUrls: allUrls,
            processedBy: req.user._id,
          },
        ],
        { session }
      );

      let balance = await AdvanceBalance.findOne({ userId: claim.userId }).session(session);
      if (!balance) balance = new AdvanceBalance({ userId: claim.userId });

      balance.totalReimbursementsPaid = (balance.totalReimbursementsPaid || 0) + finalApprovedAmount;
      await balance.save({ session });

      claim.settlementStatus = 'REIMBURSED';
      claim.settlementType = 'REIMBURSEMENT';
      claim.settledAmount = finalApprovedAmount;
      claim.settlementDate = new Date();
      claim.settlementDetails = {
        paymentMethod: paymentMethod || 'Bank Transfer',
        transactionReference: transactionReference || '',
        notes: remarks || '',
        settledBy: req.user._id,
        settledAt: new Date(),
      };
      claim.history.push({
        action: 'REIMBURSED',
        performedBy: req.user._id,
        timestamp: new Date(),
        amount: finalApprovedAmount,
        notes: `Reimbursement processed. Txn ID: ${transactionId}`,
      });

      await claim.save({ session });
      await session.commitTransaction();
      session.endSession();
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  } else {
    // Pure Approval alone: save claim with UNSETTLED status
    await claim.save();
  }

  await logActivity({
    userId: req.user._id,
    userName: req.user.name,
    userEmail: req.user.email,
    action: 'EXPENSE_CLAIM_APPROVED',
    module: 'expenses',
    resourceId: claim._id.toString(),
    description: `Approved expense claim #${claim._id.toString().slice(-6).toUpperCase()} for ₹${finalApprovedAmount}${settlementAction ? ` (Settled: ${settlementAction})` : ' (Pending Settlement)'}`,
    req,
  });

  const populatedClaim = await ExpenseClaim.findById(claim._id)
    .populate('userId', 'name email employeeId')
    .populate('approvedBy', 'name');

  try {
    const io = getIO();
    if (io) io.emit('expense_updated', populatedClaim);
  } catch (e) {}

  res.status(200).json(
    new ApiResponse(
      200,
      claim,
      settlementAction
        ? `Expense claim approved and settled (${settlementAction})`
        : 'Expense claim approved. Settlement pending.'
    )
  );
});

// @desc    Settle an approved expense claim (Adjust against advance OR Reimburse)
// @route   POST /api/expenses/claims/:id/settle
exports.settleClaim = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { settlementType, settledAmount, paymentMethod, transactionReference, notes } = req.body;

  const claim = await ExpenseClaim.findById(id).populate('userId', 'name email employeeId');
  if (!claim) {
    throw new ApiError(404, 'Claim not found');
  }

  if (claim.status !== 'Approved') {
    throw new ApiError(400, 'Only approved claims can be settled');
  }

  if (claim.settlementStatus === 'SETTLED_ADVANCE' || claim.settlementStatus === 'REIMBURSED') {
    throw new ApiError(400, `Claim is already settled as ${claim.settlementStatus}`);
  }

  const finalAmount = Number(settledAmount || claim.approvedAmount || claim.totalClaimAmount);
  if (!finalAmount || finalAmount <= 0) {
    throw new ApiError(400, 'Settlement amount must be greater than zero');
  }

  const allUrls = claim.items?.flatMap((it) => it.receiptUrls?.length ? it.receiptUrls : (it.receiptUrl ? [it.receiptUrl] : [])) || [];

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (settlementType === 'ADVANCE_ADJUSTMENT') {
      const transactionId = generateTransactionId('ADJ');

      // 1. Create adjustment ledger entry
      await AdvanceLedger.create(
        [
          {
            transactionId,
            userId: claim.userId._id,
            transactionType: 'EXPENSE_ADJUSTMENT',
            amount: finalAmount,
            referenceId: claim._id,
            purpose: `Expense claim #${claim._id.toString().slice(-6).toUpperCase()} adjusted against advance`,
            notes: notes || 'Adjusted against employee advance balance',
            paymentMethod: paymentMethod || 'Corporate Advance',
            transactionReference: transactionReference || '',
            receiptUrls: allUrls,
            processedBy: req.user._id,
          },
        ],
        { session }
      );

      // 2. Deduct from employee's advance balance
      let balance = await AdvanceBalance.findOne({ userId: claim.userId._id }).session(session);
      if (!balance) balance = new AdvanceBalance({ userId: claim.userId._id });

      balance.totalExpensesDeducted += finalAmount;
      balance.currentBalance -= finalAmount;
      await balance.save({ session });

      claim.settlementStatus = 'SETTLED_ADVANCE';
      claim.settlementType = 'ADVANCE_ADJUSTMENT';
      claim.settledAmount = finalAmount;
      claim.settlementDate = new Date();
      claim.settlementDetails = {
        paymentMethod: paymentMethod || 'Corporate Advance',
        transactionReference: transactionReference || '',
        notes: notes || '',
        settledBy: req.user._id,
        settledAt: new Date(),
      };
      claim.history.push({
        action: 'SETTLED_ADVANCE',
        performedBy: req.user._id,
        timestamp: new Date(),
        amount: finalAmount,
        notes: `Settled against advance. Txn ID: ${transactionId}`,
      });

      await claim.save({ session });
    } else if (settlementType === 'REIMBURSEMENT') {
      const transactionId = generateTransactionId('REIMB');

      // 1. Record reimbursement in ledger
      await AdvanceLedger.create(
        [
          {
            transactionId,
            userId: claim.userId._id,
            transactionType: 'REIMBURSEMENT_PAID',
            amount: finalAmount,
            referenceId: claim._id,
            purpose: `Reimbursement paid for claim #${claim._id.toString().slice(-6).toUpperCase()}`,
            notes: notes || 'Personal expense reimbursement paid to employee',
            paymentMethod: paymentMethod || 'Bank Transfer',
            transactionReference: transactionReference || '',
            receiptUrls: allUrls,
            processedBy: req.user._id,
          },
        ],
        { session }
      );

      // 2. Track in balance without deducting advance
      let balance = await AdvanceBalance.findOne({ userId: claim.userId._id }).session(session);
      if (!balance) balance = new AdvanceBalance({ userId: claim.userId._id });

      balance.totalReimbursementsPaid = (balance.totalReimbursementsPaid || 0) + finalAmount;
      await balance.save({ session });

      claim.settlementStatus = 'REIMBURSED';
      claim.settlementType = 'REIMBURSEMENT';
      claim.settledAmount = finalAmount;
      claim.settlementDate = new Date();
      claim.settlementDetails = {
        paymentMethod: paymentMethod || 'Bank Transfer',
        transactionReference: transactionReference || '',
        notes: notes || '',
        settledBy: req.user._id,
        settledAt: new Date(),
      };
      claim.history.push({
        action: 'REIMBURSED',
        performedBy: req.user._id,
        timestamp: new Date(),
        amount: finalAmount,
        notes: `Personal reimbursement paid. Txn ID: ${transactionId}`,
      });

      await claim.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    await logActivity({
      userId: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'EXPENSE_CLAIM_SETTLED',
      module: 'expenses',
      resourceId: claim._id.toString(),
      description: `Settled claim #${claim._id.toString().slice(-6).toUpperCase()} for ₹${finalAmount} via ${settlementType}`,
      req,
    });

    const populatedClaim = await ExpenseClaim.findById(claim._id)
      .populate('userId', 'name email employeeId')
      .populate('approvedBy', 'name');

    try {
      const io = getIO();
      if (io) io.emit('expense_updated', populatedClaim);
    } catch (e) {}

    res.status(200).json(new ApiResponse(200, claim, `Claim successfully settled via ${settlementType}`));
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
  claim.history.push({
    action: 'REJECTED',
    performedBy: req.user._id,
    timestamp: new Date(),
    notes: rejectionReason,
  });

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

  const populatedClaim = await ExpenseClaim.findById(claim._id)
    .populate('userId', 'name email employeeId')
    .populate('approvedBy', 'name');

  try {
    const io = getIO();
    if (io) io.emit('expense_updated', populatedClaim);
  } catch (e) {}

  res.status(200).json(new ApiResponse(200, claim, 'Expense claim rejected'));
});

// @desc    Employee-wise financial overview for Team Approvals tab (Phase 2B + Global Date Filtering)
// @route   GET /api/expenses/overview/employee-summary
exports.getEmployeeFinancialOverview = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const hasDateFilter = Boolean(startDate && endDate);

  const filterStart = hasDateFilter ? new Date(startDate) : null;
  const filterEnd = hasDateFilter ? new Date(endDate) : null;
  if (filterStart) filterStart.setHours(0, 0, 0, 0);
  if (filterEnd) filterEnd.setHours(23, 59, 59, 999);

  // 1. Query all active employees within requester's data scope
  const users = await User.find({ isActive: true })
    .populate('roleId', 'name key')
    .populate('departmentId', 'name')
    .sort({ name: 1 })
    .lean();

  // 2. Fetch Claims: activity within [filterStart, filterEnd] (or all-time if no date filter)
  const claimFilter = hasDateFilter
    ? { createdAt: { $gte: filterStart, $lte: filterEnd } }
    : {};
  const periodClaims = await ExpenseClaim.find(claimFilter).lean();

  // 3. Fetch Ledger: all transactions with issueDate <= filterEnd (or all if no date filter)
  const ledgerQuery = filterEnd
    ? {
        $or: [
          { issueDate: { $lte: filterEnd } },
          { issueDate: null, createdAt: { $lte: filterEnd } },
          { issueDate: { $exists: false }, createdAt: { $lte: filterEnd } },
        ],
      }
    : {};
  const ledgerRecords = await AdvanceLedger.find(ledgerQuery).sort({ issueDate: 1, createdAt: 1 }).lean();

  // Aggregate user ledger metrics
  const userLedgerMap = new Map();
  users.forEach((u) => {
    userLedgerMap.set(u._id.toString(), {
      advancesIssuedInPeriod: 0,
      expensesAdjustedInPeriod: 0,
      cumulativeAdvance: 0,
      cumulativeAdjusted: 0,
      cumulativeRefunds: 0,
      cumulativeCorrection: 0,
      closingBalanceAsOfEndDate: 0,
      lifetimeAdvance: 0,
      lifetimeAdjusted: 0,
    });
  });

  ledgerRecords.forEach((txn) => {
    const uId = txn.userId.toString();
    const amt = txn.amount || 0;
    const rawDate = txn.issueDate || txn.createdAt;
    const txnDate = rawDate ? new Date(rawDate) : null;
    const isWithinPeriod = !hasDateFilter || (txnDate && txnDate >= filterStart && txnDate <= filterEnd);

    let stats = userLedgerMap.get(uId);
    if (!stats) {
      stats = {
        advancesIssuedInPeriod: 0,
        expensesAdjustedInPeriod: 0,
        cumulativeAdvance: 0,
        cumulativeAdjusted: 0,
        cumulativeRefunds: 0,
        cumulativeCorrection: 0,
        closingBalanceAsOfEndDate: 0,
        lifetimeAdvance: 0,
        lifetimeAdjusted: 0,
      };
      userLedgerMap.set(uId, stats);
    }

    if (txn.transactionType === 'ADVANCE_ISSUED' || txn.transactionType === 'CREDIT' || txn.transactionType === 'OPENING_BALANCE') {
      stats.lifetimeAdvance += amt;
    } else if (txn.transactionType === 'EXPENSE_ADJUSTMENT' || txn.transactionType === 'DEBIT') {
      stats.lifetimeAdjusted += amt;
    }

    if (isWithinPeriod) {
      if (txn.transactionType === 'ADVANCE_ISSUED' || txn.transactionType === 'CREDIT' || txn.transactionType === 'OPENING_BALANCE') {
        stats.advancesIssuedInPeriod += amt;
      } else if (txn.transactionType === 'EXPENSE_ADJUSTMENT' || txn.transactionType === 'DEBIT') {
        stats.expensesAdjustedInPeriod += amt;
      }
    }

    if (txn.transactionType === 'ADVANCE_ISSUED' || txn.transactionType === 'CREDIT' || txn.transactionType === 'OPENING_BALANCE') {
      stats.cumulativeAdvance += amt;
    } else if (txn.transactionType === 'EXPENSE_ADJUSTMENT' || txn.transactionType === 'DEBIT') {
      stats.cumulativeAdjusted += amt;
    } else if (txn.transactionType === 'ADVANCE_REFUND') {
      stats.cumulativeRefunds += amt;
    } else if (txn.transactionType === 'ADVANCE_CORRECTION') {
      stats.cumulativeCorrection += amt;
    }
  });

  // Calculate closing balance for all employees as of filterEnd
  let totalOutstandingEmployeeAdvances = 0;
  users.forEach((u) => {
    const stats = userLedgerMap.get(u._id.toString());
    if (stats) {
      stats.closingBalanceAsOfEndDate =
        stats.cumulativeAdvance + stats.cumulativeCorrection - stats.cumulativeAdjusted - stats.cumulativeRefunds;
      if (stats.closingBalanceAsOfEndDate > 0) {
        totalOutstandingEmployeeAdvances += stats.closingBalanceAsOfEndDate;
      }
    }
  });

  // Aggregate claims by employee
  const employeeClaimMap = new Map();
  const employeesWhoSubmittedClaimsSet = new Set();
  let totalClaimsSubmitted = 0;
  let totalClaimedAmount = 0;
  let totalPendingClaims = 0;
  let totalPendingClaimAmount = 0;
  let totalApprovedClaims = 0;
  let totalApprovedClaimAmount = 0;
  let totalRejectedClaims = 0;
  let totalRejectedClaimAmount = 0;

  periodClaims.forEach((c) => {
    const uId = c.userId.toString();
    employeesWhoSubmittedClaimsSet.add(uId);

    if (!employeeClaimMap.has(uId)) {
      employeeClaimMap.set(uId, {
        totalSubmitted: 0,
        totalClaimedAmount: 0,
        pendingCount: 0,
        pendingAmount: 0,
        approvedCount: 0,
        approvedAmount: 0,
        rejectedCount: 0,
        rejectedAmount: 0,
      });
    }

    const stat = employeeClaimMap.get(uId);
    stat.totalSubmitted += 1;
    const cAmount = c.totalClaimAmount || 0;
    stat.totalClaimedAmount += cAmount;

    totalClaimsSubmitted += 1;
    totalClaimedAmount += cAmount;

    if (c.status === 'Pending') {
      stat.pendingCount += 1;
      stat.pendingAmount += cAmount;
      totalPendingClaims += 1;
      totalPendingClaimAmount += cAmount;
    } else if (c.status === 'Approved') {
      stat.approvedCount += 1;
      const appAmt = c.approvedAmount || cAmount;
      stat.approvedAmount += appAmt;
      totalApprovedClaims += 1;
      totalApprovedClaimAmount += appAmt;
    } else if (c.status === 'Rejected') {
      stat.rejectedCount += 1;
      stat.rejectedAmount += cAmount;
      totalRejectedClaims += 1;
      totalRejectedClaimAmount += cAmount;
    }
  });

  const employeeSummaries = users.map((u) => {
    const uId = u._id.toString();
    const lStats = userLedgerMap.get(uId) || {};
    const cStats = employeeClaimMap.get(uId) || {
      totalSubmitted: 0,
      totalClaimedAmount: 0,
      pendingCount: 0,
      pendingAmount: 0,
      approvedCount: 0,
      approvedAmount: 0,
      rejectedCount: 0,
      rejectedAmount: 0,
    };

    return {
      _id: u._id,
      name: u.name,
      email: u.email,
      employeeId: u.employeeId || '—',
      department: u.departmentId?.name || 'General',
      designation: u.roleId?.name || 'Staff Member',
      // Section 4 table columns:
      totalClaimsSubmitted: cStats.totalSubmitted,
      pendingClaimsCount: cStats.pendingCount,
      pendingClaimAmount: cStats.pendingAmount,
      pendingAmount: cStats.pendingAmount,
      approvedClaimsCount: cStats.approvedCount,
      approvedClaimsAmount: cStats.approvedAmount,
      approvedAmount: cStats.approvedAmount,
      rejectedClaimsCount: cStats.rejectedCount,
      rejectedClaimsAmount: cStats.rejectedAmount,
      rejectedAmount: cStats.rejectedAmount,
      totalClaimedAmount: cStats.totalClaimedAmount,
      totalAdvancesIssued: hasDateFilter ? (lStats.advancesIssuedInPeriod || 0) : (lStats.lifetimeAdvance || 0),
      lifetimeAdvancesIssued: lStats.lifetimeAdvance || 0,
      totalExpensesAdjusted: hasDateFilter ? (lStats.expensesAdjustedInPeriod || 0) : (lStats.lifetimeAdjusted || 0),
      lifetimeExpensesAdjusted: lStats.lifetimeAdjusted || 0,
      currentAdvanceBalance: lStats.closingBalanceAsOfEndDate || 0,
      outstandingAdvanceBalance: lStats.closingBalanceAsOfEndDate || 0,
    };
  });

  const summaryCards = {
    employeesWhoSubmittedClaims: employeesWhoSubmittedClaimsSet.size,
    totalClaimsSubmitted,
    totalClaimedAmount,
    totalPendingClaims,
    pendingClaimsCount: totalPendingClaims,
    totalPendingClaimAmount,
    pendingClaimAmount: totalPendingClaimAmount,
    totalApprovedClaims,
    approvedClaimsCount: totalApprovedClaims,
    totalApprovedClaimAmount,
    approvedClaimAmount: totalApprovedClaimAmount,
    totalRejectedClaims,
    rejectedClaimsCount: totalRejectedClaims,
    totalRejectedClaimAmount,
    rejectedClaimAmount: totalRejectedClaimAmount,
    totalOutstandingEmployeeAdvances,
  };

  res.status(200).json(
    new ApiResponse(
      200,
      {
        reportingPeriod: {
          startDate: filterStart ? filterStart.toISOString().split('T')[0] : null,
          endDate: filterEnd ? filterEnd.toISOString().split('T')[0] : null,
          isFiltered: hasDateFilter,
        },
        summaryCards,
        employeeSummaries,
      },
      'Employee financial overview retrieved successfully'
    )
  );
});

// @desc    Company-wide Periodic Breakdown (Daily, Weekly, Monthly, Quarterly, Yearly) (Phase 5 & 9)
// @route   GET /api/expenses/reports/periodic
exports.getCompanyPeriodicReports = asyncHandler(async (req, res) => {
  const { groupBy = 'monthly', startDate, endDate } = req.query;

  const now = new Date();
  const filterEnd = endDate ? new Date(endDate) : new Date();
  filterEnd.setHours(23, 59, 59, 999);

  const filterStart = startDate
    ? new Date(startDate)
    : new Date(now.getFullYear(), now.getMonth() - 11, 1);
  filterStart.setHours(0, 0, 0, 0);

  const claims = await ExpenseClaim.find({
    createdAt: { $gte: filterStart, $lte: filterEnd },
  }).lean();

  const ledger = await AdvanceLedger.find({
    $or: [
      { issueDate: { $gte: filterStart, $lte: filterEnd } },
      { issueDate: null, createdAt: { $gte: filterStart, $lte: filterEnd } },
      { issueDate: { $exists: false }, createdAt: { $gte: filterStart, $lte: filterEnd } },
    ],
  }).lean();

  const getBucketInfo = (dateObj) => {
    const d = new Date(dateObj);
    const y = d.getFullYear();
    const m = d.getMonth();

    if (groupBy === 'daily') {
      const key = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      return { key, label, sortKey: key };
    }
    if (groupBy === 'weekly') {
      const temp = new Date(d.getTime());
      temp.setHours(0, 0, 0, 0);
      temp.setDate(temp.getDate() + 3 - (temp.getDay() + 6) % 7);
      const week1 = new Date(temp.getFullYear(), 0, 4);
      const weekNum = 1 + Math.round(((temp.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);

      const dayOfWeek = d.getDay();
      const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const mon = new Date(d);
      mon.setDate(d.getDate() + diffToMon);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);

      const key = `${y}-W${String(weekNum).padStart(2, '0')}`;
      const label = `Week ${weekNum} (${mon.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} - ${sun.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })})`;
      return { key, label, sortKey: key };
    }
    if (groupBy === 'quarterly') {
      const q = Math.floor(m / 3) + 1;
      const key = `${y}-Q${q}`;
      const label = `Q${q} ${y}`;
      return { key, label, sortKey: key };
    }
    if (groupBy === 'yearly') {
      const key = `${y}`;
      const label = `Year ${y}`;
      return { key, label, sortKey: key };
    }
    // Default 'monthly'
    const key = `${y}-${String(m + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    return { key, label, sortKey: key };
  };

  const bucketMap = new Map();

  const getOrCreateBucket = (key, label, sortKey) => {
    if (!bucketMap.has(key)) {
      bucketMap.set(key, {
        periodKey: key,
        periodLabel: label,
        sortKey,
        uniqueEmployees: new Set(),
        totalClaims: 0,
        pendingClaims: 0,
        approvedClaims: 0,
        rejectedClaims: 0,
        totalClaimedAmount: 0,
        totalApprovedAmount: 0,
        advancesIssued: 0,
        expensesAdjusted: 0,
        refundsReceived: 0,
        reimbursementsPaid: 0,
        categoryDistribution: {},
      });
    }
    return bucketMap.get(key);
  };

  claims.forEach((c) => {
    const { key, label, sortKey } = getBucketInfo(c.createdAt);
    const b = getOrCreateBucket(key, label, sortKey);

    b.uniqueEmployees.add(c.userId.toString());
    b.totalClaims += 1;
    const amt = c.totalClaimAmount || 0;
    b.totalClaimedAmount += amt;

    if (c.status === 'Pending') {
      b.pendingClaims += 1;
    } else if (c.status === 'Approved') {
      b.approvedClaims += 1;
      b.totalApprovedAmount += c.approvedAmount || amt;
    } else if (c.status === 'Rejected') {
      b.rejectedClaims += 1;
    }

    c.items?.forEach((it) => {
      const cat = it.category || 'General';
      b.categoryDistribution[cat] = (b.categoryDistribution[cat] || 0) + (it.amount || 0);
    });
  });

  ledger.forEach((txn) => {
    const { key, label, sortKey } = getBucketInfo(txn.issueDate || txn.createdAt);
    const b = getOrCreateBucket(key, label, sortKey);

    const amt = txn.amount || 0;
    if (txn.transactionType === 'ADVANCE_ISSUED' || txn.transactionType === 'CREDIT' || txn.transactionType === 'OPENING_BALANCE') {
      b.advancesIssued += amt;
    } else if (txn.transactionType === 'EXPENSE_ADJUSTMENT' || txn.transactionType === 'DEBIT') {
      b.expensesAdjusted += amt;
    } else if (txn.transactionType === 'ADVANCE_REFUND') {
      b.refundsReceived += amt;
    } else if (txn.transactionType === 'REIMBURSEMENT_PAID') {
      b.reimbursementsPaid += amt;
    }
  });

  const reportList = Array.from(bucketMap.values())
    .sort((a, b) => b.sortKey.localeCompare(a.sortKey))
    .map((b) => ({
      periodKey: b.periodKey,
      periodLabel: b.periodLabel,
      employeesCount: b.uniqueEmployees.size,
      totalClaims: b.totalClaims,
      pendingClaims: b.pendingClaims,
      approvedClaims: b.approvedClaims,
      rejectedClaims: b.rejectedClaims,
      totalClaimedAmount: b.totalClaimedAmount,
      totalApprovedAmount: b.totalApprovedAmount,
      advancesIssued: b.advancesIssued,
      expensesAdjusted: b.expensesAdjusted,
      refundsReceived: b.refundsReceived,
      reimbursementsPaid: b.reimbursementsPaid,
      netAdvance: b.advancesIssued - b.expensesAdjusted - b.refundsReceived,
      categoryDistribution: b.categoryDistribution,
    }));

  res.status(200).json(
    new ApiResponse(
      200,
      {
        groupBy,
        reportingPeriod: {
          startDate: filterStart.toISOString().split('T')[0],
          endDate: filterEnd.toISOString().split('T')[0],
        },
        reports: reportList,
      },
      'Company periodic reports generated successfully'
    )
  );
});
