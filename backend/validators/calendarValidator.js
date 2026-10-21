const { body } = require('express-validator');

exports.validateCreateEvent = [
  body('title')
    .notEmpty().withMessage('Event title is required')
    .isString().trim(),
  body('startDate')
    .isISO8601().withMessage('Valid start date is required'),
  body('endDate')
    .isISO8601().withMessage('Valid end date is required')
    .custom((value, { req }) => {
      if (new Date(value) < new Date(req.body.startDate)) {
        throw new Error('End date must be after or equal to start date');
      }
      return true;
    }),
  body('eventType')
    .isIn(['Meeting', 'Holiday', 'Task', 'Reminder'])
    .withMessage('Invalid event type'),
  body('description')
    .optional()
    .isString().trim()
];
