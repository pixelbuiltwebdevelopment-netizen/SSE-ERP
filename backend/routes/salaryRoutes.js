const express = require('express');
const router = express.Router();
const salaryController = require('../controllers/salaryController');
const { authenticate } = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorizeMiddleware');
const applyDataScope = require('../middleware/dataScopeMiddleware');
const validate = require('../middleware/validationMiddleware');
const {
  issueAdvanceValidator,
  generateSalaryValidator,
  getSalaryValidator,
  updateSalaryStatusValidator,
} = require('../validators/salaryValidator');

router.use(authenticate);

// ─────────────────────────────────────────────────────────────
// EMPLOYEE-FACING: View own salary slips & own advances
// ─────────────────────────────────────────────────────────────
// Any authenticated user with salary:view can see their own records
router.get('/my-advances', authorize('salary', 'view'), salaryController.getMyAdvances);
router.get('/my-salaries', authorize('salary', 'view'), salaryController.getMySalaries);

// ─────────────────────────────────────────────────────────────
// ADMIN-FACING: Full salary management
// ─────────────────────────────────────────────────────────────

// Issue salary advance to an employee (admin only)
router.post(
  '/advance',
  authorize('salary', 'issue_advance'),
  issueAdvanceValidator,
  validate,
  salaryController.issueAdvance
);

// Get all advances across all employees (admin only)
router.get(
  '/advance',
  authorize('salary', 'view_all'),
  applyDataScope('salary', 'view_all'),
  salaryController.getAllAdvances
);

// Employee salary overview table — all employees with baseSalary + pending advances
router.get(
  '/employees-overview',
  authorize('salary', 'view_all'),
  applyDataScope('salary', 'view_all'),
  salaryController.getEmployeeSalaryOverview
);

// Salary calculation preview
router.get(
  '/preview',
  authorize('salary', 'generate_salary'),
  salaryController.previewSalary
);

// Generate / process salary for an employee
router.post(
  '/generate',
  authorize('salary', 'generate_salary'),
  generateSalaryValidator,
  validate,
  salaryController.generateSalary
);

// Get all salary records (admin)
router.get(
  '/',
  authorize('salary', 'view_all'),
  applyDataScope('salary', 'view_all'),
  getSalaryValidator,
  validate,
  salaryController.getSalaries
);

// Update salary status (Draft → Paid)
router.put(
  '/:id',
  authorize('salary', 'generate_salary'),
  updateSalaryStatusValidator,
  validate,
  salaryController.updateSalaryStatus
);

module.exports = router;
