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
  body('items.*.receiptUrl')
    .optional({ nullable: true, checkFalsy: true })
    .isString().trim(),
  body('items.*.receiptUrls')
    .optional()
    .isArray().withMessage('receiptUrls must be an array of URLs'),
  body('items.*.receiptUrls.*')
    .optional()
    .isString().trim(),
];

exports.validateApproveClaim = [
  body('status')
    .optional()
    .equals('Approved').withMessage('Status must be Approved'),
  body('approvedAmount')
    .optional()
    .isFloat({ min: 0.01 }).withMessage('Approved amount must be positive'),
  body('remarks')
    .optional()
    .isString().trim(),
];

exports.validateRejectClaim = [
  body('rejectionReason')
    .notEmpty().withMessage('Rejection reason is required')
    .isString().trim(),
];

exports.validateIssueAdvance = [
  body('userId')
    .isMongoId().withMessage('Valid User ID is required'),
  body('amount')
    .isFloat({ min: 1 }).withMessage('Advance amount must be a positive number greater than 0'),
  body('issueDate')
    .optional(),
  body('purpose')
    .optional()
    .isString().trim(),
  body('paymentMethod')
    .optional()
    .isString().trim(),
  body('transactionReference')
    .optional()
    .isString().trim(),
  body('notes')
    .optional()
    .isString().trim(),
  body('attachments')
    .optional()
    .isArray(),
];

exports.validateSettleClaim = [
  body('settlementType')
    .isIn(['ADVANCE_ADJUSTMENT', 'REIMBURSEMENT'])
    .withMessage('Settlement type must be either ADVANCE_ADJUSTMENT or REIMBURSEMENT'),
  body('settledAmount')
    .optional()
    .isFloat({ min: 0.01 }).withMessage('Settled amount must be a positive number'),
  body('paymentMethod')
    .optional()
    .isString().trim(),
  body('transactionReference')
    .optional()
    .isString().trim(),
  body('notes')
    .optional()
    .isString().trim(),
];

exports.validateRefundAdvance = [
  body('userId')
    .isMongoId().withMessage('Valid User ID is required'),
  body('amount')
    .isFloat({ min: 1 }).withMessage('Refund amount must be a positive number greater than 0'),
  body('refundDate')
    .optional(),
  body('paymentMethod')
    .optional()
    .isString().trim(),
  body('transactionReference')
    .optional()
    .isString().trim(),
  body('notes')
    .optional()
    .isString().trim(),
  body('attachments')
    .optional()
    .isArray(),
];
