const { body } = require('express-validator');

const validateCompanyCreate = [
  body('company')
    .trim()
    .notEmpty()
    .withMessage('Company name is required'),
  body('contactPerson')
    .trim()
    .notEmpty()
    .withMessage('Contact person is required'),
  body('contactNumber')
    .trim()
    .notEmpty()
    .withMessage('Contact number is required'),
  body('contactEmail')
    .trim()
    .isEmail()
    .withMessage('Valid contact email is required'),
  body('country')
    .optional()
    .trim(),
  body('state')
    .optional()
    .trim(),
  body('area')
    .optional()
    .trim(),
  body('businessType')
    .optional()
    .trim(),
];

const validateCompanyUpdate = [
  body('company')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Company name cannot be empty'),
  body('contactPerson')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Contact person cannot be empty'),
  body('contactNumber')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Contact number cannot be empty'),
  body('contactEmail')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Valid contact email is required'),
];

module.exports = {
  validateCompanyCreate,
  validateCompanyUpdate,
};
