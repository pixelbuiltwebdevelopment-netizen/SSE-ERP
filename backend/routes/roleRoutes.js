const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { authenticate } = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorizeMiddleware');
const validate = require('../middleware/validationMiddleware');
const { createRoleValidation, updateRoleValidation } = require('../validators/roleValidator');

router.use(authenticate);

router.get('/', authorize('roles', 'view'), roleController.getRoles);
router.get('/:id', authorize('roles', 'view'), roleController.getRoleById);
router.post('/', authorize('roles', 'create'), createRoleValidation, validate, roleController.createRole);
router.put('/:id', authorize('roles', 'edit'), updateRoleValidation, validate, roleController.updateRole);
router.delete('/:id', authorize('roles', 'delete'), roleController.deleteRole);

module.exports = router;
