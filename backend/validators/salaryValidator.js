const { body, param, query } = require('express-validator');

exports.issueAdvanceValidator = [
  body('userId').isMongoId().withMessage('Valid Employee ID is required'),
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be greater than 0'),
  body('reason').optional().isString(),
  body('issuedDate').optional().isISO8601().withMessage('Date must be a valid ISO8601 date'),
];

exports.generateSalaryValidator = [
  body('userId').isMongoId().withMessage('Invalid User ID'),
  body('month').isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
  body('year').isInt({ min: 2000, max: 2100 }).withMessage('Valid year is required'),
  body('totalWorkingDays').optional().isInt({ min: 1, max: 31 }),
  body('baseSalary').optional().isNumeric(),
  body('presentDays').optional().isNumeric(),
  body('grossSalary').optional().isNumeric(),
  body('advanceDeductions').optional().isNumeric(),
  body('netSalary').optional().isNumeric(),
  body('slipUrl').optional().isString(),
];

exports.updateSalaryStatusValidator = [
  param('id').isMongoId().withMessage('Invalid salary record ID'),
  body('status').isIn(['Paid']).withMessage('Invalid status'),
];

exports.getSalaryValidator = [
  query('month').optional().isInt({ min: 1, max: 12 }),
  query('year').optional().isInt({ min: 2000, max: 2100 }),
];
