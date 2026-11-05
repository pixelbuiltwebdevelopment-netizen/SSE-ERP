const express = require('express');
const router = express.Router();
const multer = require('multer');
const ticketController = require('../controllers/ticketController');
const { authenticate } = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorizeMiddleware');
const applyDataScope = require('../middleware/dataScopeMiddleware');
const validate = require('../middleware/validationMiddleware');
const {
  createTicketValidator,
  updateTicketValidator,
  startTicketValidator,
  stopTicketValidator,
} = require('../validators/ticketValidator');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

router.use(authenticate);

// Fetch companies for ticket booking — uses 'tickets' permission, not 'companies'
router.get('/companies', authorize('tickets', 'fetch_companies'), ticketController.getCompaniesForTicket);

// Image Upload Endpoint (JPG, JPEG, PNG, WEBP)
router.post(
  '/upload',
  authorize('tickets', 'edit'),
  upload.single('image'),
  ticketController.uploadTicketImage
);

// Ticket CRUD & Actions
router.get('/', authorize('tickets', 'view'), applyDataScope('tickets', 'view'), ticketController.getTickets);
router.get('/:id', authorize('tickets', 'view'), applyDataScope('tickets', 'view'), ticketController.getTicketById);
router.post('/', authorize('tickets', 'create'), createTicketValidator, validate, ticketController.createTicket);
router.put('/:id', authorize('tickets', 'edit'), applyDataScope('tickets', 'edit'), updateTicketValidator, validate, ticketController.updateTicket);
router.post('/:id/start', authorize('tickets', 'edit'), applyDataScope('tickets', 'edit'), startTicketValidator, validate, ticketController.startTicket);
router.post('/:id/stop', authorize('tickets', 'edit'), applyDataScope('tickets', 'edit'), stopTicketValidator, validate, ticketController.stopTicket);
router.delete('/:id', authorize('tickets', 'delete'), applyDataScope('tickets', 'delete'), ticketController.deleteTicket);

module.exports = router;
