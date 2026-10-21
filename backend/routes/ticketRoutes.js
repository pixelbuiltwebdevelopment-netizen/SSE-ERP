const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { authenticate } = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorizeMiddleware');
const applyDataScope = require('../middleware/dataScopeMiddleware');
const validate = require('../middleware/validationMiddleware');
const { createTicketValidator, updateTicketValidator } = require('../validators/ticketValidator');

router.use(authenticate);

// Fetch companies for ticket booking — uses 'tickets' permission, not 'companies'
router.get('/companies', authorize('tickets', 'fetch_companies'), ticketController.getCompaniesForTicket);

router.get('/', authorize('tickets', 'view'), applyDataScope('tickets', 'view'), ticketController.getTickets);
router.post('/', authorize('tickets', 'create'), createTicketValidator, validate, ticketController.createTicket);
router.put('/:id', authorize('tickets', 'edit'), applyDataScope('tickets', 'edit'), updateTicketValidator, validate, ticketController.updateTicket);
router.post('/:id/start', authorize('tickets', 'edit'), applyDataScope('tickets', 'edit'), ticketController.startTicket);
router.post('/:id/stop', authorize('tickets', 'edit'), applyDataScope('tickets', 'edit'), ticketController.stopTicket);
router.delete('/:id', authorize('tickets', 'delete'), applyDataScope('tickets', 'delete'), ticketController.deleteTicket);

module.exports = router;
