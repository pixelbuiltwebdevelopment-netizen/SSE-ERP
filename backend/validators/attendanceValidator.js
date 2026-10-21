const { body } = require('express-validator');

const validatePunch = [
  body('lat')
    .notEmpty()
    .withMessage('Latitude (lat) is required')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be a valid coordinate between -90 and 90'),
  
  body('lng')
    .notEmpty()
    .withMessage('Longitude (lng) is required')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be a valid coordinate between -180 and 180'),

  body('address')
    .optional()
    .isString()
    .trim()
];

module.exports = {
  validatePunch,
};
