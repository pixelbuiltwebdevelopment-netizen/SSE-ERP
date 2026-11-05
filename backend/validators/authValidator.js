const { body } = require('express-validator');

const loginValidation = [
  body('email').trim().notEmpty().withMessage('Please provide your corporate email or employee ID'),
  body('password').notEmpty().withMessage('Password is required'),
];

const changePasswordValidation = [
  body('oldPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long'),
];

module.exports = {
  loginValidation,
  changePasswordValidation,
};
