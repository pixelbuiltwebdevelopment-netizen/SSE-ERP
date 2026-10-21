const { body } = require('express-validator');

const createUserValidation = [
  body('name').trim().notEmpty().withMessage('User name is required'),
  body('email').isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('roleId').isMongoId().withMessage('Valid Role ID is required'),
  body('departmentId')
    .optional({ nullable: true })
    .isMongoId()
    .withMessage('Invalid Department ID'),
  body('branchId').optional({ nullable: true }).isMongoId().withMessage('Invalid Branch ID'),
  body('teamId').optional({ nullable: true }).isMongoId().withMessage('Invalid Team ID'),
  body('baseSalary')
    .optional({ nullable: true })
    .isNumeric()
    .withMessage('Base salary must be a valid number'),
];

const updateUserValidation = [
  body('name').optional().trim().notEmpty().withMessage('User name cannot be empty'),
  body('email').optional().isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
  body('roleId').optional().isMongoId().withMessage('Invalid Role ID'),
  body('departmentId')
    .optional({ nullable: true })
    .isMongoId()
    .withMessage('Invalid Department ID'),
  body('branchId').optional({ nullable: true }).isMongoId().withMessage('Invalid Branch ID'),
  body('teamId').optional({ nullable: true }).isMongoId().withMessage('Invalid Team ID'),
  body('baseSalary')
    .optional({ nullable: true })
    .isNumeric()
    .withMessage('Base salary must be a valid number'),
];

module.exports = {
  createUserValidation,
  updateUserValidation,
};
