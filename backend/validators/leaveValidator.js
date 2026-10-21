const { body } = require('express-validator');

exports.validateSubmitLeave = [
  body('leaveType')
    .notEmpty().withMessage('Leave type is required')
    .isIn(['Sick', 'Casual', 'Earned', 'Unpaid', 'Maternity', 'Paternity'])
    .withMessage('Invalid leave type selected'),

  body('durationMode')
    .optional()
    .isIn(['single', 'multiple', 'half'])
    .withMessage('Invalid duration mode'),

  body('halfDaySession')
    .optional()
    .isIn(['First Half', 'Second Half', 'None'])
    .withMessage('Invalid half-day session'),

  body('startDate')
    .notEmpty().withMessage('Start date is required')
    .isISO8601().withMessage('Valid start date is required'),

  body('endDate')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601().withMessage('Valid end date is required')
    .custom((value, { req }) => {
      if (value && req.body.startDate && new Date(value) < new Date(req.body.startDate)) {
        throw new Error('End date must be after or equal to start date');
      }
      return true;
    }),

  body('totalDays')
    .notEmpty().withMessage('Total days is required')
    .isFloat({ min: 0.5 }).withMessage('Total days must be at least 0.5'),

  body('reason')
    .notEmpty().withMessage('Reason for leave is required')
    .isString().trim()
];

exports.validateApproveLeave = [
  body('status')
    .optional()
    .isIn(['Approved', 'approved'])
];

exports.validateRejectLeave = [
  body('rejectionReason')
    .notEmpty().withMessage('Rejection reason is required')
    .isString().trim()
];