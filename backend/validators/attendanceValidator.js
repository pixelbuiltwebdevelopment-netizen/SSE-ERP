const { body } = require('express-validator');

const validatePunch = [
  body().custom((value, { req }) => {
    // Unnest location if passed as nested object
    if (req.body && req.body.location && typeof req.body.location === 'object') {
      if (req.body.lat === undefined && req.body.location.lat !== undefined) {
        req.body.lat = req.body.location.lat;
      }
      if (req.body.lng === undefined && req.body.location.lng !== undefined) {
        req.body.lng = req.body.location.lng;
      }
      if (req.body.address === undefined && req.body.location.address !== undefined) {
        req.body.address = req.body.location.address;
      }
    }
    return true;
  }),

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
