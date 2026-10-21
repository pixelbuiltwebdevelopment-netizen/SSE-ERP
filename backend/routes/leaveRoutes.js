const express = require('express');
const router = express.Router();

const {
  submitLeave,
  getMyLeaves,
  getLeaves,
  approveLeave,
  rejectLeave,
} = require('../controllers/leaveController');

// ✅ FIXED: Folder is "middleware" (singular)
const authModule = require('../middleware/authMiddleware');
// Supports protect, authenticate, verifyToken, or default export
const protect = authModule.protect || authModule.authenticate || authModule.verifyToken || authModule;

// Safety check for dataScopeFilter to prevent crashes
const ensureDataScope = (req, res, next) => {
  if (!req.dataScopeFilter) {
    req.dataScopeFilter = {};
  }
  next();
};

// -------------------------------------------------------------
// ALL LEAVE ROUTES REQUIRE AUTHENTICATION
// -------------------------------------------------------------
router.use(protect);

// -------------------------------------------------------------
// 1. SUBMIT LEAVE REQUEST
// Handles both POST /api/leaves/request and POST /api/leaves/requests
// -------------------------------------------------------------
router.post('/request', submitLeave);
router.post('/requests', submitLeave);
router.post('/', submitLeave);

// -------------------------------------------------------------
// 2. GET MY LEAVES (MUST BE PLACED BEFORE /:id ROUTES)
// -------------------------------------------------------------
router.get('/requests/my', getMyLeaves);
router.get('/my', getMyLeaves);

// -------------------------------------------------------------
// 3. GET TEAM / SCOPED LEAVES
// -------------------------------------------------------------
router.get('/requests', ensureDataScope, getLeaves);
router.get('/', ensureDataScope, getLeaves);

// -------------------------------------------------------------
// 4. APPROVE LEAVE REQUEST
// -------------------------------------------------------------
router.patch('/requests/:id/approve', ensureDataScope, approveLeave);
router.put('/requests/:id/approve', ensureDataScope, approveLeave);

// -------------------------------------------------------------
// 5. REJECT LEAVE REQUEST
// -------------------------------------------------------------
router.patch('/requests/:id/reject', ensureDataScope, rejectLeave);
router.put('/requests/:id/reject', ensureDataScope, rejectLeave);

module.exports = router;