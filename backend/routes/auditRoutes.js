const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { authenticate } = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorizeMiddleware');

router.use(authenticate);

router.get('/', authorize('audit-logs', 'view'), auditController.getAuditLogs);

module.exports = router;
