const express = require('express');
const router = express.Router();

const {
  createEvent,
  getEvents,
  deleteEvent
} = require('../controllers/calendarController');

const { authenticate } = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorizeMiddleware');
const applyDataScope = require('../middleware/dataScopeMiddleware');
const validate = require('../middleware/validationMiddleware');

const { validateCreateEvent } = require('../validators/calendarValidator');

router.use(authenticate);

// Create event
router.post(
  '/events',
  authorize('calendar', 'create'),
  validateCreateEvent,
  validate,
  createEvent
);

// Get events
router.get(
  '/events',
  authorize('calendar', 'view'),
  applyDataScope('calendar', 'view'),
  getEvents
);

// Delete event
router.delete(
  '/events/:id',
  authorize('calendar', 'delete'),
  applyDataScope('calendar', 'delete'),
  deleteEvent
);

module.exports = router;
