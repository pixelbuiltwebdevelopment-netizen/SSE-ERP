const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const { loginRateLimiter } = require('../middleware/rateLimitMiddleware');
const validate = require('../middleware/validationMiddleware');
const { loginValidation, changePasswordValidation } = require('../validators/authValidator');

router.post('/login', loginRateLimiter, loginValidation, validate, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.getMe);
router.post('/change-password', authenticate, changePasswordValidation, validate, authController.changePassword);
router.put('/profile', authenticate, authController.updateProfile);

module.exports = router;
