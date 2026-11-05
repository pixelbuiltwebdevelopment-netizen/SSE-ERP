const { body } = require('express-validator');

const VALID_TICKET_TYPES = [
  'Normal Ticket',
  'Rewinding Ticket',
  'Out Door Ticket',
  'AMC Ticket',
  'Panel Board Ticket',
  // Backward compatibility
  'Rewinding',
  'Outdoor',
  'AMC',
  'Panel Board',
];

const VALID_UNITS = [
  'Round Silo',
  'Mill',
  'Plant',
  'Boiler',
  // Backward compatibility
  'Silo Section',
  'Turbine Floor',
  'Control Room',
  'Substation',
  'Other',
];

const VALID_HP = [
  '1', '1.5', '2', '3', '5', '7.5', '10', '12.5', '15', '20',
  '25', '30', '40', '50', '60', '75', '100', '120', '150', '180', '200'
];

const VALID_RPM = ['720', '960', '1440', '2800'];

exports.createTicketValidator = [
  body('ticketType')
    .isIn(VALID_TICKET_TYPES)
    .withMessage('Valid Ticket Type is required'),

  body('companyId')
    .isMongoId()
    .withMessage('Valid Company ID is required'),

  body('contactPerson')
    .optional({ checkFalsy: false })
    .trim(),

  body('phoneNumber')
    .optional({ checkFalsy: false })
    .trim(),

  body('unit')
    .notEmpty()
    .withMessage('Unit selection is mandatory')
    .custom((val) => {
      if (!VALID_UNITS.includes(val)) {
        throw new Error('Invalid Unit selection');
      }
      return true;
    }),

  body('description')
    .optional()
    .isString(),

  // Dynamic HP validation (Mandatory for Rewinding and AMC)
  body('hp')
    .custom((value, { req }) => {
      const type = req.body.ticketType;
      if (type === 'Rewinding Ticket' || type === 'Rewinding' || type === 'AMC Ticket' || type === 'AMC') {
        if (!value || String(value).trim() === '') {
          throw new Error(`HP is mandatory for ${type}`);
        }
        if (!VALID_HP.includes(String(value).trim())) {
          throw new Error('Invalid HP value selected');
        }
      }
      return true;
    }),

  // Dynamic RPM validation (Mandatory for Rewinding and AMC)
  body('rpm')
    .custom((value, { req }) => {
      const type = req.body.ticketType;
      if (type === 'Rewinding Ticket' || type === 'Rewinding' || type === 'AMC Ticket' || type === 'AMC') {
        if (!value || String(value).trim() === '') {
          throw new Error(`RPM is mandatory for ${type}`);
        }
        if (!VALID_RPM.includes(String(value).trim())) {
          throw new Error('Invalid RPM value selected');
        }
      }
      return true;
    }),

  // Dynamic Mill Name validation (Mandatory for Out Door and Panel Board)
  body('millName')
    .custom((value, { req }) => {
      const type = req.body.ticketType;
      if (
        type === 'Out Door Ticket' ||
        type === 'Outdoor' ||
        type === 'Panel Board Ticket' ||
        type === 'Panel Board'
      ) {
        if (!value || String(value).trim() === '') {
          throw new Error(`Mill Name is mandatory for ${type}`);
        }
      }
      return true;
    }),

  body('priority')
    .optional()
    .isIn(['Low', 'Medium', 'High', 'Urgent'])
    .withMessage('Invalid Priority level selected'),
];

exports.startTicketValidator = [
  body('location')
    .isObject()
    .withMessage('Location object with coordinates is required'),
  body('location.lat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid latitude is required to start ticket'),
  body('location.lng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid longitude is required to start ticket'),
];

exports.stopTicketValidator = [
  body('location')
    .isObject()
    .withMessage('Location object with coordinates is required'),
  body('location.lat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid latitude is required to stop ticket'),
  body('location.lng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid longitude is required to stop ticket'),
  body('afterServiceImages')
    .optional()
    .isArray()
    .withMessage('afterServiceImages must be an array of image URLs'),
  body('serviceCompletionRemarks')
    .optional()
    .isString(),
];

exports.updateTicketValidator = [
  body('status')
    .optional()
    .isIn(['Pending', 'Open', 'In Progress', 'Completed', 'Resolved', 'Closed']),
  body('priority')
    .optional()
    .isIn(['Low', 'Medium', 'High', 'Urgent']),
  body('startTime').optional().isISO8601(),
  body('startedAt').optional().isISO8601(),
  body('stopTime').optional().isISO8601(),
  body('stoppedAt').optional().isISO8601(),
  body('totalWorkingSeconds').optional().isNumeric(),
  body('startLocation').optional().isObject(),
  body('stopLocation').optional().isObject(),
  body('serviceCompletionRemarks').optional().isString(),
  body('afterServiceImages').optional().isArray(),
  body('beforeServiceImages').optional().isArray(),
];
