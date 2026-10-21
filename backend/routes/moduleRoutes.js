const express = require('express');
const router = express.Router();
const moduleController = require('../controllers/moduleController');
const { authenticate } = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorizeMiddleware');
const validate = require('../middleware/validationMiddleware');
const { createModuleValidation } = require('../validators/moduleValidator');

router.use(authenticate);

router.get('/', authorize('modules', 'view'), moduleController.getModules);
router.post('/', authorize('modules', 'create'), createModuleValidation, validate, moduleController.createModule);
router.put('/:id', authorize('modules', 'edit'), moduleController.updateModule);
router.patch('/:id/status', authorize('modules', 'edit'), moduleController.updateModuleStatus);

module.exports = router;
