const { body } = require('express-validator');

exports.validateSubmitClaim = [
  body('items')
    .isArray({ min: 1 }).withMessage('At least one expense item is required'),
  body('items.*.amount')
    .isFloat({ min: 0.01 }).withMessage('Expense amount must be a positive number'),
  body('items.*.category')
    .notEmpty().withMessage('Expense category is required')
    .isString().trim(),
  body('items.*.date')
    .notEmpty().withMessage('Valid expense date is required'),
  body('items.*.description')
    .notEmpty().withMessage('Expense description is required')
    .isString().trim(),
  // ADD THIS LINE TO ALLOW RECEIPT URL FROM CLOUDINARY:
  body('items.*.receiptUrl')
    .optional({ nullable: true, checkFalsy: true })
    .isString().trim()
];

exports.validateApproveClaim = [
  body('status')
    .equals('Approved').withMessage('Status must be Approved')
];

exports.validateRejectClaim = [
  body('rejectionReason')
    .notEmpty().withMessage('Rejection reason is required')
    .isString().trim()
];

exports.validateIssueAdvance = [
  body('userId')
    .isMongoId().withMessage('Valid User ID is required'),
  body('amount')
    .isFloat({ min: 1 }).withMessage('Advance amount must be a positive number greater than 0'),
  body('notes')
    .optional()
    .isString().trim()
];