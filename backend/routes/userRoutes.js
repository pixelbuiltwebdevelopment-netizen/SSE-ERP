const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorizeMiddleware');
const applyDataScope = require('../middleware/dataScopeMiddleware');
const validate = require('../middleware/validationMiddleware');
const { createUserValidation, updateUserValidation } = require('../validators/userValidator');

router.use(authenticate);

router.get('/', authorize('users', 'view'), applyDataScope('users', 'view'), userController.getUsers);
router.get('/:id', authorize('users', 'view'), applyDataScope('users', 'view'), userController.getUserById);
router.post('/', authorize('users', 'create'), createUserValidation, validate, userController.createUser);
router.put('/:id', authorize('users', 'edit'), updateUserValidation, validate, userController.updateUser);
router.patch('/:id/status', authorize('users', 'edit'), userController.updateUserStatus);
router.patch('/:id/role', authorize('users', 'assign'), userController.updateUserRole);
router.delete('/:id', authorize('users', 'delete'), userController.deleteUser);

module.exports = router;
