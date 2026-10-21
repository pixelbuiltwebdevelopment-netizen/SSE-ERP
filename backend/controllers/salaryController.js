const asyncHandler = require('../utils/asyncHandler');
const SalaryAdvance = require('../models/SalaryAdvance');
const SalaryRecord = require('../models/SalaryRecord');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { logActivity } = require('../services/auditService');

// ────────────────────────────────────────────────────────
// ADMIN: Issue salary advance to an employee
// POST /api/salary/advance
// ────────────────────────────────────────────────────────
const issueAdvance = asyncHandler(async (req, res) => {
  const { userId, amount, reason, issuedDate } = req.body;

  const employee = await User.findById(userId);
  if (!employee) throw new ApiError(404, 'Employee not found');

  const advance = await SalaryAdvance.create({
    userId: employee._id,
    amount: Number(amount),
    reason: reason || '',
    issuedDate: issuedDate ? new Date(issuedDate) : new Date(),
    issuedBy: req.user._id,
    status: 'Issued',
    departmentId: employee.departmentId || null,
    branchId: employee.branchId || null,
    teamId: employee.teamId || null,
  });

  await logActivity({
    userId: req.user._id,
    userName: req.user.name,
    userEmail: req.user.email,
    action: 'SALARY_ADVANCE_ISSUED',
    module: 'salary',
    resourceId: advance._id.toString(),
    description: `Issued salary advance of ₹${amount} to ${employee.name}`,
    req,
  });

  const populated = await SalaryAdvance.findById(advance._id)
    .populate('userId', 'name email employeeId')
    .populate('issuedBy', 'name');

  res.status(201).json(new ApiResponse(201, populated, 'Salary advance issued successfully'));
});

// ────────────────────────────────────────────────────────
// ADMIN: Get all advances (all employees)
// GET /api/salary/advance
// ────────────────────────────────────────────────────────
const getAllAdvances = asyncHandler(async (req, res) => {
  const filter = { ...(req.dataScopeFilter || {}) };
  if (req.query.userId) filter.userId = req.query.userId;
  if (req.query.status) {
    // Map legacy 'Pending' to 'Issued' if sent
    filter.status = req.query.status === 'Pending' ? 'Issued' : req.query.status;
  }

  const advances = await SalaryAdvance.find(filter)
    .populate('userId', 'name email employeeId baseSalary departmentId branchId')
    .populate('issuedBy', 'name email')
    .sort('-createdAt');

  res.status(200).json(new ApiResponse(200, advances, 'Advances retrieved successfully'));
});

// ────────────────────────────────────────────────────────
// EMPLOYEE: Get own advances
// GET /api/salary/my-advances
// ────────────────────────────────────────────────────────
const getMyAdvances = asyncHandler(async (req, res) => {
  const advances = await SalaryAdvance.find({ userId: req.user._id })
    .populate('userId', 'name email employeeId')
    .populate('issuedBy', 'name')
    .sort('-createdAt');

  res.status(200).json(new ApiResponse(200, advances, 'Your advances retrieved successfully'));
});

// ────────────────────────────────────────────────────────
// EMPLOYEE: Get own salary records
// GET /api/salary/my-salaries
// ────────────────────────────────────────────────────────
const getMySalaries = asyncHandler(async (req, res) => {
  const salaries = await SalaryRecord.find({ userId: req.user._id })
    .populate('userId', 'name email employeeId baseSalary')
    .populate('processedBy', 'name')
    .sort({ year: -1, month: -1 });

  res.status(200).json(new ApiResponse(200, salaries, 'Your salary records retrieved successfully'));
});

// ────────────────────────────────────────────────────────
// ADMIN: Preview salary calculation for an employee
// GET /api/salary/preview
// ────────────────────────────────────────────────────────
const previewSalary = asyncHandler(async (req, res) => {
  const { userId, month, year, totalWorkingDays = 30 } = req.query;
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  const monthStr = month.toString().padStart(2, '0');
  const regexPattern = new RegExp('^' + year + '-' + monthStr);
  const attendances = await Attendance.find({ userId: user._id, date: { $regex: regexPattern } });

  let presentDays = 0;
  attendances.forEach(att => {
    if (att.status === 'Present') presentDays += 1;
    if (att.status === 'Half-Day') presentDays += 0.5;
  });

  const baseSalary = user.baseSalary || 0;
  const grossSalary = Number(totalWorkingDays) > 0 ? (baseSalary / Number(totalWorkingDays)) * presentDays : 0;

  // Outstanding advances
  const issuedAdvances = await SalaryAdvance.find({ userId: user._id, status: { $in: ['Issued', 'Partial'] } });
  let advanceDeductions = 0;
  issuedAdvances.forEach(adv => {
    advanceDeductions += ((adv.amount || 0) - (adv.deductedAmount || 0));
  });

  const netSalary = grossSalary - advanceDeductions;

  res.status(200).json(new ApiResponse(200, {
    baseSalary,
    presentDays,
    totalWorkingDays: Number(totalWorkingDays),
    grossSalary,
    advanceDeductions,
    netSalary,
    pendingAdvances: issuedAdvances.length,
  }, 'Salary preview calculated'));
});

// ────────────────────────────────────────────────────────
// ADMIN: Generate / Process monthly salary
// POST /api/salary/generate
// ────────────────────────────────────────────────────────
const generateSalary = asyncHandler(async (req, res) => {
  const {
    userId, month, year, totalWorkingDays = 30, slipUrl,
    baseSalary, presentDays, grossSalary, advanceDeductions, netSalary
  } = req.body;

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  // Deduct from advances
  const issuedAdvances = await SalaryAdvance.find({ userId: user._id, status: { $in: ['Issued', 'Partial'] } });
  let remainingDeduction = Number(advanceDeductions);
  for (const adv of issuedAdvances) {
    const outstanding = adv.amount - adv.deductedAmount;
    if (remainingDeduction <= 0) break;
    if (remainingDeduction >= outstanding) {
      adv.deductedAmount += outstanding;
      adv.status = 'Deducted';
      remainingDeduction -= outstanding;
    } else {
      adv.deductedAmount += remainingDeduction;
      adv.status = 'Partial';
      remainingDeduction = 0;
    }
    await adv.save();
  }

  let salaryRecord = await SalaryRecord.findOne({ userId: user._id, month: Number(month), year: Number(year) });
  if (salaryRecord) {
    if (salaryRecord.status === 'Paid') {
      throw new ApiError(400, 'Salary already generated and paid for this month');
    }
    salaryRecord.baseSalary = Number(baseSalary);
    salaryRecord.presentDays = Number(presentDays);
    salaryRecord.totalWorkingDays = Number(totalWorkingDays);
    salaryRecord.grossSalary = Number(grossSalary);
    salaryRecord.advanceDeductions = Number(advanceDeductions);
    salaryRecord.netSalary = Number(netSalary);
    salaryRecord.departmentId = user.departmentId || salaryRecord.departmentId;
    salaryRecord.branchId = user.branchId || salaryRecord.branchId;
    salaryRecord.teamId = user.teamId || salaryRecord.teamId;
    if (slipUrl) salaryRecord.slipUrl = slipUrl;
    salaryRecord.processedBy = req.user._id;
  } else {
    salaryRecord = new SalaryRecord({
      userId: user._id,
      month: Number(month),
      year: Number(year),
      baseSalary: Number(baseSalary),
      presentDays: Number(presentDays),
      totalWorkingDays: Number(totalWorkingDays),
      grossSalary: Number(grossSalary),
      advanceDeductions: Number(advanceDeductions),
      netSalary: Number(netSalary),
      slipUrl: slipUrl || null,
      processedBy: req.user._id,
      departmentId: user.departmentId || null,
      branchId: user.branchId || null,
      teamId: user.teamId || null,
    });
  }

  await salaryRecord.save();

  await logActivity({
    userId: req.user._id,
    userName: req.user.name,
    userEmail: req.user.email,
    action: 'SALARY_GENERATED',
    module: 'salary',
    resourceId: salaryRecord._id.toString(),
    description: `Generated salary for ${user.name} (${month}/${year}) — Net: ₹${netSalary}`,
    req,
  });

  const populated = await SalaryRecord.findById(salaryRecord._id)
    .populate('userId', 'name email employeeId baseSalary')
    .populate('processedBy', 'name');

  res.status(201).json(new ApiResponse(201, populated, 'Salary generated successfully'));
});

// ────────────────────────────────────────────────────────
// ADMIN: Get all salary records
// GET /api/salary
// ────────────────────────────────────────────────────────
const getSalaries = asyncHandler(async (req, res) => {
  const filter = { ...(req.dataScopeFilter || {}) };
  if (req.query.month) filter.month = Number(req.query.month);
  if (req.query.year) filter.year = Number(req.query.year);
  if (req.query.userId) filter.userId = req.query.userId;
  if (req.query.status) filter.status = req.query.status;

  const salaries = await SalaryRecord.find(filter)
    .populate('userId', 'name email employeeId baseSalary departmentId branchId')
    .populate('processedBy', 'name email')
    .sort({ year: -1, month: -1 });

  res.status(200).json(new ApiResponse(200, salaries, 'Salary records retrieved successfully'));
});

// ────────────────────────────────────────────────────────
// ADMIN: Update salary status (Draft → Paid)
// PUT /api/salary/:id
// ────────────────────────────────────────────────────────
const updateSalaryStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const salary = await SalaryRecord.findById(req.params.id);
  if (!salary) throw new ApiError(404, 'Salary record not found');

  salary.status = status;
  await salary.save();

  res.status(200).json(new ApiResponse(200, salary, 'Salary status updated'));
});

// ────────────────────────────────────────────────────────
// ADMIN: Get employee overview
// GET /api/salary/employees-overview
// ────────────────────────────────────────────────────────
const getEmployeeSalaryOverview = asyncHandler(async (req, res) => {
  const filter = { ...(req.dataScopeFilter || {}), isActive: true };

  const users = await User.find(filter)
    .select('name email employeeId baseSalary departmentId branchId roleId')
    .populate('roleId', 'name key')
    .populate('departmentId', 'name')
    .populate('branchId', 'name')
    .sort({ name: 1 });

  const advanceSummary = await SalaryAdvance.aggregate([
    { $match: { status: { $in: ['Issued', 'Partial'] } } },
    {
      $group: {
        _id: '$userId',
        totalPendingAdvance: { $sum: { $subtract: ['$amount', '$deductedAmount'] } },
        advanceCount: { $sum: 1 }
      }
    }
  ]);

  const advanceMap = {};
  advanceSummary.forEach(a => {
    advanceMap[a._id.toString()] = {
      totalPendingAdvance: a.totalPendingAdvance,
      advanceCount: a.advanceCount
    };
  });

  const overview = users.map(u => ({
    _id: u._id,
    name: u.name,
    email: u.email,
    employeeId: u.employeeId || '',
    roleId: u.roleId,
    departmentId: u.departmentId,
    branchId: u.branchId,
    baseSalary: u.baseSalary || 0,
    pendingAdvance: advanceMap[u._id.toString()]?.totalPendingAdvance || 0,
    advanceCount: advanceMap[u._id.toString()]?.advanceCount || 0,
  }));

  res.status(200).json(new ApiResponse(200, overview, 'Employee salary overview retrieved'));
});

module.exports = {
  issueAdvance,
  getAllAdvances,
  getMyAdvances,
  getMySalaries,
  previewSalary,
  generateSalary,
  getSalaries,
  updateSalaryStatus,
  getEmployeeSalaryOverview,
};