const { body } = require('express-validator');

const createModuleValidation = [
  body('name').trim().notEmpty().withMessage('Module name is required'),
  body('key')
    .trim()
    .notEmpty()
    .withMessage('Module key is required')
    .matches(/^[a-z0-9_]+$/)
    .withMessage('Module key can only contain lowercase letters, numbers, and underscores'),
  body('description').optional().trim(),
];

module.exports = {
  createModuleValidation,
};
