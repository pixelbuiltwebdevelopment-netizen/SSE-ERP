const { body } = require('express-validator');

exports.createTicketValidator = [
  body('ticketType').isIn(['Normal Ticket', 'Rewinding', 'Outdoor', 'AMC', 'Panel Board']).withMessage('Invalid Ticket Type'),
  body('subject').notEmpty().withMessage('Subject is required').isString(),
  body('companyId').isMongoId().withMessage('Valid Company ID is required')
];

exports.updateTicketValidator = [
  body('status').optional().isIn(['Open', 'In Progress', 'Resolved', 'Closed']),
  body('startTime').optional().isISO8601(),
  body('stopTime').optional().isISO8601(),
  body('startLocation').optional().isObject(),
  body('stopLocation').optional().isObject()
];
