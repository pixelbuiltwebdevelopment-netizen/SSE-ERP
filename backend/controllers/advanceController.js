const AdvanceBalance = require('../models/AdvanceBalance');
const AdvanceLedger = require('../models/AdvanceLedger');
const ExpenseClaim = require('../models/ExpenseClaim');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { logActivity } = require('../services/auditService');
const { getIO } = require('../services/socketService');
const mongoose = require('mongoose');

// Helper to generate unique transaction ID
const generateTransactionId = (prefix = 'ADV') => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${dateStr}-${randomStr}`;
};

// @desc    Get my advance balance and financial summary
// @route   GET /api/expenses/advance/my-balance
exports.getMyBalance = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  let balance = await AdvanceBalance.findOne({ userId });
  if (!balance) {
    balance = {
      totalAdvanceReceived: 0,
      totalExpensesDeducted: 0,
      totalRefundsReceived: 0,
      totalReimbursementsPaid: 0,
      currentBalance: 0,
    };
  }

  // Calculate live claim metrics for the employee
  const claims = await ExpenseClaim.find({ userId });
  const pendingClaims = claims.filter((c) => c.status === 'Pending');
  const pendingClaimsAmount = pendingClaims.reduce((sum, c) => sum + (c.totalClaimAmount || 0), 0);

  const approvedClaims = claims.filter((c) => c.status === 'Approved');
  const approvedUnsettled = approvedClaims.filter((c) => c.settlementStatus === 'UNSETTLED');
  const approvedUnsettledAmount = approvedUnsettled.reduce((sum, c) => sum + (c.approvedAmount || c.totalClaimAmount || 0), 0);

  const reimbursementsPending = approvedClaims.filter(
    (c) => c.settlementStatus === 'UNSETTLED' && c.settlementType === 'REIMBURSEMENT'
  );
  const reimbursementsPendingAmount = reimbursementsPending.reduce(
    (sum, c) => sum + (c.approvedAmount || c.totalClaimAmount || 0),
    0
  );

  const result = {
    totalAdvanceReceived: balance.totalAdvanceReceived || 0,
    totalExpensesDeducted: balance.totalExpensesDeducted || 0,
    totalRefundsReceived: balance.totalRefundsReceived || 0,
    totalReimbursementsPaid: balance.totalReimbursementsPaid || 0,
    currentBalance: balance.currentBalance || 0,
    pendingClaimsCount: pendingClaims.length,
    pendingClaimsAmount,
    approvedUnsettledAmount,
    reimbursementsPendingAmount,
  };

  res.status(200).json(new ApiResponse(200, result, 'Advance balance retrieved'));
});

// @desc    Issue advance to an employee
// @route   POST /api/expenses/advance/issue
exports.issueAdvance = asyncHandler(async (req, res) => {
  const {
    userId,
    amount,
    issueDate,
    purpose,
    paymentMethod,
    transactionReference,
    notes,
    attachments = [],
  } = req.body;

  const targetUser = await User.findById(userId).populate('roleId departmentId');
  if (!targetUser) {
    throw new ApiError(404, 'Employee record not found');
  }

  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0) {
    throw new ApiError(400, 'Advance amount must be greater than zero');
  }

  const transactionId = generateTransactionId('ADV');
  const formattedAttachments = attachments.map((att) => {
    if (typeof att === 'string') {
      return { url: att, name: 'Attachment', size: 0, type: 'file' };
    }
    return att;
  });
  const receiptUrls = formattedAttachments.map((a) => a.url).filter(Boolean);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Create Advance Ledger Entry
    const [ledger] = await AdvanceLedger.create(
      [
        {
          transactionId,
          userId,
          transactionType: 'ADVANCE_ISSUED',
          amount: numAmount,
          issueDate: issueDate ? new Date(issueDate) : new Date(),
          purpose: purpose || 'Corporate Expense Advance',
          paymentMethod: paymentMethod || 'Bank Transfer',
          transactionReference: transactionReference || '',
          notes: notes || 'Advance issued to employee',
          attachments: formattedAttachments,
          receiptUrls,
          processedBy: req.user._id,
        },
      ],
      { session }
    );

    // 2. Update Advance Balance
    let balance = await AdvanceBalance.findOne({ userId }).session(session);
    if (!balance) {
      balance = new AdvanceBalance({ userId });
    }

    balance.totalAdvanceReceived += numAmount;
    balance.currentBalance += numAmount;
    balance.lastAdvanceDate = issueDate ? new Date(issueDate) : new Date();
    await balance.save({ session });

    await session.commitTransaction();
    session.endSession();

    await logActivity({
      userId: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'ADVANCE_ISSUED',
      module: 'expenses',
      resourceId: ledger._id.toString(),
      description: `Issued advance of ₹${numAmount} to ${targetUser.name} (${targetUser.employeeId || targetUser.email}). Txn ID: ${transactionId}`,
      req,
    });

    try {
      const io = getIO();
      if (io) {
        io.emit('advance_updated', { userId, transactionId, balance });
      }
    } catch (e) {}

    res.status(200).json(new ApiResponse(200, { ledger, balance }, 'Advance issued successfully'));
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});

// @desc    Process advance refund returned by employee
// @route   POST /api/expenses/advance/refund
exports.refundAdvance = asyncHandler(async (req, res) => {
  const {
    userId,
    amount,
    refundDate,
    paymentMethod,
    transactionReference,
    notes,
    attachments = [],
  } = req.body;

  const targetUser = await User.findById(userId);
  if (!targetUser) {
    throw new ApiError(404, 'Employee record not found');
  }

  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0) {
    throw new ApiError(400, 'Refund amount must be greater than zero');
  }

  const transactionId = generateTransactionId('REF');
  const formattedAttachments = attachments.map((att) => {
    if (typeof att === 'string') {
      return { url: att, name: 'Refund Document', size: 0, type: 'file' };
    }
    return att;
  });
  const receiptUrls = formattedAttachments.map((a) => a.url).filter(Boolean);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const [ledger] = await AdvanceLedger.create(
      [
        {
          transactionId,
          userId,
          transactionType: 'ADVANCE_REFUND',
          amount: numAmount,
          issueDate: refundDate ? new Date(refundDate) : new Date(),
          purpose: 'Unused Advance Refund',
          paymentMethod: paymentMethod || 'Bank Transfer',
          transactionReference: transactionReference || '',
          notes: notes || 'Employee refunded unspent advance',
          attachments: formattedAttachments,
          receiptUrls,
          processedBy: req.user._id,
        },
      ],
      { session }
    );

    let balance = await AdvanceBalance.findOne({ userId }).session(session);
    if (!balance) {
      balance = new AdvanceBalance({ userId });
    }

    balance.totalRefundsReceived = (balance.totalRefundsReceived || 0) + numAmount;
    balance.currentBalance -= numAmount;
    await balance.save({ session });

    await session.commitTransaction();
    session.endSession();

    await logActivity({
      userId: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'ADVANCE_REFUND_RECORDED',
      module: 'expenses',
      resourceId: ledger._id.toString(),
      description: `Recorded advance refund of ₹${numAmount} from ${targetUser.name}. Txn ID: ${transactionId}`,
      req,
    });

    res.status(200).json(new ApiResponse(200, { ledger, balance }, 'Advance refund recorded successfully'));
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});

// @desc    Get complete DATE-FILTER-AWARE advance overview for all employees (Finance / Admin)
// @route   GET /api/expenses/advance/overview
exports.getAdvanceOverview = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const hasDateFilter = Boolean(startDate && endDate);

  const filterStart = hasDateFilter ? new Date(startDate) : null;
  const filterEnd = hasDateFilter ? new Date(endDate) : null;
  if (filterStart) filterStart.setHours(0, 0, 0, 0);
  if (filterEnd) filterEnd.setHours(23, 59, 59, 999);

  // 1. Fetch active users
  const users = await User.find({ isActive: true })
    .populate('roleId', 'name key')
    .populate('departmentId', 'name')
    .sort({ name: 1 })
    .lean();

  // 2. Fetch AdvanceLedger records
  // We query all transactions on or before filterEnd (checking issueDate OR fallback to createdAt)
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

  const userLedgerMap = new Map();
  users.forEach((u) => {
    userLedgerMap.set(u._id.toString(), {
      // Activity in selected period
      advancesIssuedCount: 0,
      totalAdvancesIssuedInPeriod: 0,
      adjustmentsCount: 0,
      totalExpensesAdjustedInPeriod: 0,
      refundsCount: 0,
      totalRefundsReceivedInPeriod: 0,
      reimbursementsPaidInPeriod: 0,
      // Cumulative balance as of filterEnd
      cumulativeAdvance: 0,
      cumulativeAdjusted: 0,
      cumulativeRefunds: 0,
      cumulativeCorrection: 0,
      closingBalanceAsOfEndDate: 0,
      // Lifetime totals
      lifetimeAdvance: 0,
      lifetimeAdjusted: 0,
      lifetimeRefunds: 0,
      lastTxnDate: null,
    });
  });

  // Calculate global summary counters for period
  let totalAdvancesIssuedDuringPeriod = 0;
  let totalAdvanceTransactionsCount = 0;
  const uniqueAdvanceRecipients = new Set();
  let totalExpensesAdjustedDuringPeriod = 0;
  let totalAdvanceRefundsDuringPeriod = 0;
  let totalReimbursementsPaidDuringPeriod = 0;
  let lifetimeAdvancesIssued = 0;

  ledgerRecords.forEach((txn) => {
    const uId = txn.userId.toString();
    const amt = txn.amount || 0;
    const rawDate = txn.issueDate || txn.createdAt;
    const txnDate = rawDate ? new Date(rawDate) : null;
    const isWithinPeriod = !hasDateFilter || (txnDate && txnDate >= filterStart && txnDate <= filterEnd);

    if (txn.transactionType === 'ADVANCE_ISSUED' || txn.transactionType === 'CREDIT' || txn.transactionType === 'OPENING_BALANCE') {
      lifetimeAdvancesIssued += amt;
    }

    let userStats = userLedgerMap.get(uId);
    if (!userStats) {
      userStats = {
        advancesIssuedCount: 0,
        totalAdvancesIssuedInPeriod: 0,
        adjustmentsCount: 0,
        totalExpensesAdjustedInPeriod: 0,
        refundsCount: 0,
        totalRefundsReceivedInPeriod: 0,
        reimbursementsPaidInPeriod: 0,
        cumulativeAdvance: 0,
        cumulativeAdjusted: 0,
        cumulativeRefunds: 0,
        cumulativeCorrection: 0,
        closingBalanceAsOfEndDate: 0,
        lifetimeAdvance: 0,
        lifetimeAdjusted: 0,
        lifetimeRefunds: 0,
        lastTxnDate: null,
      };
      userLedgerMap.set(uId, userStats);
    }

    if (rawDate) {
      if (!userStats.lastTxnDate || new Date(rawDate) > new Date(userStats.lastTxnDate)) {
        userStats.lastTxnDate = rawDate;
      }
    }

    // Lifetime tracking
    if (txn.transactionType === 'ADVANCE_ISSUED' || txn.transactionType === 'CREDIT' || txn.transactionType === 'OPENING_BALANCE') {
      userStats.lifetimeAdvance += amt;
    } else if (txn.transactionType === 'EXPENSE_ADJUSTMENT' || txn.transactionType === 'DEBIT') {
      userStats.lifetimeAdjusted += amt;
    } else if (txn.transactionType === 'ADVANCE_REFUND') {
      userStats.lifetimeRefunds += amt;
    }

    // A. Period metrics
    if (isWithinPeriod) {
      if (txn.transactionType === 'ADVANCE_ISSUED' || txn.transactionType === 'CREDIT' || txn.transactionType === 'OPENING_BALANCE') {
        userStats.advancesIssuedCount += 1;
        userStats.totalAdvancesIssuedInPeriod += amt;
        totalAdvancesIssuedDuringPeriod += amt;
        totalAdvanceTransactionsCount += 1;
        uniqueAdvanceRecipients.add(uId);
      } else if (txn.transactionType === 'EXPENSE_ADJUSTMENT' || txn.transactionType === 'DEBIT') {
        userStats.adjustmentsCount += 1;
        userStats.totalExpensesAdjustedInPeriod += amt;
        totalExpensesAdjustedDuringPeriod += amt;
      } else if (txn.transactionType === 'ADVANCE_REFUND') {
        userStats.refundsCount += 1;
        userStats.totalRefundsReceivedInPeriod += amt;
        totalAdvanceRefundsDuringPeriod += amt;
      } else if (txn.transactionType === 'REIMBURSEMENT_PAID') {
        userStats.reimbursementsPaidInPeriod += amt;
        totalReimbursementsPaidDuringPeriod += amt;
      }
    }

    // B. Cumulative as of filterEnd
    if (txn.transactionType === 'ADVANCE_ISSUED' || txn.transactionType === 'CREDIT' || txn.transactionType === 'OPENING_BALANCE') {
      userStats.cumulativeAdvance += amt;
    } else if (txn.transactionType === 'EXPENSE_ADJUSTMENT' || txn.transactionType === 'DEBIT') {
      userStats.cumulativeAdjusted += amt;
    } else if (txn.transactionType === 'ADVANCE_REFUND') {
      userStats.cumulativeRefunds += amt;
    } else if (txn.transactionType === 'ADVANCE_CORRECTION') {
      userStats.cumulativeCorrection += amt;
    }
  });

  // Compute closing balances
  let totalOutstandingAdvanceBalanceAsOfEndDate = 0;
  let totalEmployeesWithOutstandingAdvances = 0;

  users.forEach((u) => {
    const stats = userLedgerMap.get(u._id.toString());
    if (stats) {
      stats.closingBalanceAsOfEndDate =
        stats.cumulativeAdvance + stats.cumulativeCorrection - stats.cumulativeAdjusted - stats.cumulativeRefunds;

      if (stats.closingBalanceAsOfEndDate > 0) {
        totalOutstandingAdvanceBalanceAsOfEndDate += stats.closingBalanceAsOfEndDate;
        totalEmployeesWithOutstandingAdvances += 1;
      }
    }
  });

  // 3. Fetch Claims within period
  const claimQuery = hasDateFilter
    ? { createdAt: { $gte: filterStart, $lte: filterEnd } }
    : {};
  const claimsInPeriod = await ExpenseClaim.find(claimQuery).lean();

  const userClaimMap = new Map();
  claimsInPeriod.forEach((c) => {
    const uId = c.userId.toString();
    if (!userClaimMap.has(uId)) {
      userClaimMap.set(uId, {
        claimsSubmittedCount: 0,
        totalClaimedAmount: 0,
        pendingClaimsCount: 0,
        pendingClaimsAmount: 0,
        approvedClaimsCount: 0,
        approvedClaimsAmount: 0,
        rejectedClaimsCount: 0,
      });
    }
    const stat = userClaimMap.get(uId);
    stat.claimsSubmittedCount += 1;
    stat.totalClaimedAmount += c.totalClaimAmount || 0;

    if (c.status === 'Pending') {
      stat.pendingClaimsCount += 1;
      stat.pendingClaimsAmount += c.totalClaimAmount || 0;
    } else if (c.status === 'Approved') {
      stat.approvedClaimsCount += 1;
      stat.approvedClaimsAmount += c.approvedAmount || c.totalClaimAmount || 0;
    } else if (c.status === 'Rejected') {
      stat.rejectedClaimsCount += 1;
    }
  });

  // 4. Calculate total pending settlements (approved unsettled claims)
  const pendingSettlementClaimsCount = await ExpenseClaim.countDocuments({
    status: 'Approved',
    settlementStatus: 'UNSETTLED',
  });

  // 5. Construct employee table records (Section 3)
  const employeeRecords = users.map((u) => {
    const uId = u._id.toString();
    const lStats = userLedgerMap.get(uId) || {};
    const cStats = userClaimMap.get(uId) || {
      claimsSubmittedCount: 0,
      totalClaimedAmount: 0,
      pendingClaimsCount: 0,
      pendingClaimsAmount: 0,
      approvedClaimsCount: 0,
      approvedClaimsAmount: 0,
    };

    return {
      _id: u._id,
      name: u.name,
      email: u.email,
      employeeId: u.employeeId || '—',
      department: u.departmentId?.name || 'General',
      designation: u.roleId?.name || 'Staff Member',
      // Section 3 columns:
      advancesIssuedCount: lStats.advancesIssuedCount || 0,
      totalAdvancesIssued: hasDateFilter ? (lStats.totalAdvancesIssuedInPeriod || 0) : (lStats.lifetimeAdvance || 0),
      lifetimeAdvancesIssued: lStats.lifetimeAdvance || 0,
      adjustmentsCount: lStats.adjustmentsCount || 0,
      totalExpensesAdjusted: hasDateFilter ? (lStats.totalExpensesAdjustedInPeriod || 0) : (lStats.lifetimeAdjusted || 0),
      lifetimeExpensesAdjusted: lStats.lifetimeAdjusted || 0,
      totalExpenseClaimsSubmitted: cStats.claimsSubmittedCount || 0,
      totalClaimedAmount: cStats.totalClaimedAmount || 0,
      pendingClaimsAmount: cStats.pendingClaimsAmount || 0,
      pendingClaimsCount: cStats.pendingClaimsCount || 0,
      approvedClaimsAmount: cStats.approvedClaimsAmount || 0,
      reimbursementsPaid: lStats.reimbursementsPaidInPeriod || 0,
      currentAdvanceBalance: lStats.closingBalanceAsOfEndDate || 0,
      lastTransactionDate: lStats.lastTxnDate,
    };
  });

  // 6. Summary cards (Section 2)
  const summaryCards = {
    totalAdvancesIssued: totalAdvancesIssuedDuringPeriod,
    totalAdvanceTransactionsCount,
    uniqueAdvanceRecipientsCount: uniqueAdvanceRecipients.size,
    totalExpensesAdjusted: totalExpensesAdjustedDuringPeriod,
    totalAdvanceRefundsReceived: totalAdvanceRefundsDuringPeriod,
    totalEmployeesWithOutstandingAdvances,
    totalOutstandingAdvanceBalance: totalOutstandingAdvanceBalanceAsOfEndDate,
    totalPendingAdvanceSettlements: pendingSettlementClaimsCount,
    totalReimbursementsPaid: totalReimbursementsPaidDuringPeriod,
    lifetimeAdvancesIssued,
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
        records: employeeRecords,
      },
      'Global advance management overview retrieved successfully'
    )
  );
});

// @desc    Get legacy all advance balances
// @route   GET /api/expenses/advance/all-balances
exports.getAllBalances = asyncHandler(async (req, res) => {
  const balances = await AdvanceBalance.find()
    .populate('userId', 'name email employeeId isActive departmentId roleId')
    .sort({ currentBalance: -1 });

  res.status(200).json(new ApiResponse(200, balances, 'All advance balances retrieved'));
});

// @desc    Get chronological financial statement and full transaction ledger for an employee
// @route   GET /api/expenses/employee/:userId/statement
exports.getEmployeeStatement = asyncHandler(async (req, res) => {
  const targetUserId = req.params.userId || req.user._id;

  // Authorization check: Employees can only view their own statement unless they have manage_advance / view rights
  const isSelf = req.user._id.toString() === targetUserId.toString();
  const isSuperAdmin = req.user.roleId?.key === 'super_admin';
  const canManage = req.user.permissions?.some(
    (p) => p.module === 'expenses' && ['manage_advance', 'approve', 'view'].includes(p.action)
  );

  if (!isSelf && !isSuperAdmin && !canManage) {
    throw new ApiError(403, 'You are not authorized to view this employee statement');
  }

  const employee = await User.findById(targetUserId)
    .populate('roleId', 'name key')
    .populate('departmentId', 'name')
    .populate('branchId', 'name')
    .lean();

  if (!employee) {
    throw new ApiError(404, 'Employee not found');
  }

  // 1. Fetch chronological ledger entries
  const rawLedger = await AdvanceLedger.find({ userId: targetUserId })
    .populate('referenceId')
    .populate('processedBy', 'name email')
    .sort({ issueDate: 1, createdAt: 1 })
    .lean();

  // 2. Fetch all expense claims submitted by this employee
  const rawClaims = await ExpenseClaim.find({ userId: targetUserId })
    .populate('approvedBy', 'name email')
    .sort({ createdAt: -1 })
    .lean();

  const claims = rawClaims.map((c) => {
    const allUrls = [];
    if (Array.isArray(c.receiptUrls)) allUrls.push(...c.receiptUrls);
    if (Array.isArray(c.items)) {
      c.items = c.items.map((item) => {
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
    c.receiptUrls = Array.from(new Set(allUrls.filter(Boolean)));
    return c;
  });

  // 3. Compute running balance chronologically
  let runningBalance = 0;
  let totalAdvancesIssued = 0;
  let totalExpensesAdjusted = 0;
  let totalRefundsReceived = 0;
  let totalReimbursementsPaid = 0;

  const transactionStatement = rawLedger.map((txn) => {
    let advanceIssued = 0;
    let expenseAdjusted = 0;
    let refundReceived = 0;
    let reimbursementPaid = 0;

    const type = txn.transactionType;

    if (type === 'CREDIT' || type === 'ADVANCE_ISSUED' || type === 'OPENING_BALANCE') {
      advanceIssued = txn.amount || 0;
      runningBalance += advanceIssued;
      totalAdvancesIssued += advanceIssued;
    } else if (type === 'DEBIT' || type === 'EXPENSE_ADJUSTMENT') {
      expenseAdjusted = txn.amount || 0;
      runningBalance -= expenseAdjusted;
      totalExpensesAdjusted += expenseAdjusted;
    } else if (type === 'ADVANCE_REFUND') {
      refundReceived = txn.amount || 0;
      runningBalance -= refundReceived;
      totalRefundsReceived += refundReceived;
    } else if (type === 'ADVANCE_CORRECTION') {
      if (txn.amount >= 0) {
        advanceIssued = txn.amount;
        runningBalance += txn.amount;
        totalAdvancesIssued += txn.amount;
      } else {
        expenseAdjusted = Math.abs(txn.amount);
        runningBalance -= expenseAdjusted;
        totalExpensesAdjusted += expenseAdjusted;
      }
    } else if (type === 'REIMBURSEMENT_PAID') {
      reimbursementPaid = txn.amount || 0;
      totalReimbursementsPaid += reimbursementPaid;
    }

    const attachments = (txn.attachments && txn.attachments.length > 0)
      ? txn.attachments
      : (txn.receiptUrls || []).map((url) => ({ url, name: 'Attachment', size: 0, type: 'file' }));

    return {
      _id: txn._id,
      transactionId: txn.transactionId || `TXN-LEGACY-${txn._id.toString().slice(-6).toUpperCase()}`,
      date: txn.issueDate || txn.createdAt,
      transactionType: txn.transactionType,
      purpose: txn.purpose || txn.notes || 'Transaction',
      notes: txn.notes || '',
      paymentMethod: txn.paymentMethod || 'Bank Transfer',
      transactionReference: txn.transactionReference || '',
      claimId: txn.referenceId?._id || txn.referenceId || null,
      claimRef: txn.referenceId?._id ? `#${txn.referenceId._id.toString().slice(-6).toUpperCase()}` : null,
      advanceIssued,
      expenseAdjusted,
      refundReceived,
      reimbursementPaid,
      runningBalance,
      attachments,
      processedBy: txn.processedBy?.name || 'Finance Admin',
    };
  });

  // 4. Calculate claim statistics
  const pendingClaims = claims.filter((c) => c.status === 'Pending');
  const pendingClaimsAmount = pendingClaims.reduce((sum, c) => sum + (c.totalClaimAmount || 0), 0);

  const approvedClaims = claims.filter((c) => c.status === 'Approved');
  const approvedClaimsAmount = approvedClaims.reduce((sum, c) => sum + (c.approvedAmount || c.totalClaimAmount || 0), 0);

  const rejectedClaims = claims.filter((c) => c.status === 'Rejected');
  const rejectedClaimsAmount = rejectedClaims.reduce((sum, c) => sum + (c.totalClaimAmount || 0), 0);

  const approvedUnsettled = approvedClaims.filter((c) => c.settlementStatus === 'UNSETTLED');
  const approvedUnsettledAmount = approvedUnsettled.reduce(
    (sum, c) => sum + (c.approvedAmount || c.totalClaimAmount || 0),
    0
  );

  const reimbursementsPending = approvedClaims.filter(
    (c) => c.settlementStatus === 'UNSETTLED' && c.settlementType === 'REIMBURSEMENT'
  );
  const reimbursementsPendingAmount = reimbursementsPending.reduce(
    (sum, c) => sum + (c.approvedAmount || c.totalClaimAmount || 0),
    0
  );

  const summary = {
    openingBalance: 0,
    totalAdvancesIssued,
    totalExpensesAdjusted,
    totalRefundsReceived,
    totalOutstandingAdvanceBalance: runningBalance,
    totalReimbursementsPaid,
    pendingClaimsCount: pendingClaims.length,
    pendingClaimsAmount,
    approvedClaimsAmount,
    rejectedClaimsAmount,
    approvedUnsettledAmount,
    reimbursementsPendingAmount,
  };

  // Reconcile and save in AdvanceBalance record
  let balanceDoc = await AdvanceBalance.findOne({ userId: targetUserId });
  if (!balanceDoc) {
    balanceDoc = new AdvanceBalance({ userId: targetUserId });
  }
  balanceDoc.totalAdvanceReceived = totalAdvancesIssued;
  balanceDoc.totalExpensesDeducted = totalExpensesAdjusted;
  balanceDoc.totalRefundsReceived = totalRefundsReceived;
  balanceDoc.totalReimbursementsPaid = totalReimbursementsPaid;
  balanceDoc.currentBalance = runningBalance;
  await balanceDoc.save();

  res.status(200).json(
    new ApiResponse(
      200,
      {
        employee: {
          _id: employee._id,
          name: employee.name,
          email: employee.email,
          employeeId: employee.employeeId || '—',
          department: employee.departmentId?.name || 'General',
          designation: employee.roleId?.name || 'Staff Member',
          phone: employee.phone || '—',
        },
        summary,
        statement: transactionStatement.reverse(),
        claims,
      },
      'Employee statement generated successfully'
    )
  );
});
