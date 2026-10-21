const { body } = require('express-validator');

const createRoleValidation = [
  body('name').trim().notEmpty().withMessage('Role name is required'),
  body('key')
    .trim()
    .notEmpty()
    .withMessage('Role key is required')
    .matches(/^[a-z0-9_]+$/)
    .withMessage('Role key can only contain lowercase letters, numbers, and underscores'),
  body('description').optional().trim(),
  body('permissions').isArray().withMessage('Permissions must be an array of module permissions'),
];

const updateRoleValidation = [
  body('name').optional().trim().notEmpty().withMessage('Role name cannot be empty'),
  body('description').optional().trim(),
  body('permissions').optional().isArray().withMessage('Permissions must be an array'),
];

module.exports = {
  createRoleValidation,
  updateRoleValidation,
};
