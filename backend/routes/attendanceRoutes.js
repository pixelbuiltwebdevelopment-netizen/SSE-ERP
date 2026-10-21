const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorizeMiddleware');
const applyDataScope = require('../middleware/dataScopeMiddleware');
const validateResult = require('../middleware/validationMiddleware');
const { validatePunch } = require('../validators/attendanceValidator');

const {
  punchIn,
  punchOut,
  getMyToday,
  getMyAttendanceHistory,
  getMyCalendar,
  getAttendanceSummaryKPIs,
  getAllAttendance,
  getMissingPunchOuts,
  runAutoPunchOutNow,
  correctAttendanceRecord,
  getDailyReport,
  getAttendanceAnalytics,
} = require('../controllers/attendanceController');

const {
  getShifts,
  createShift,
  updateShift,
  deleteShift,
} = require('../controllers/shiftController');

const {
  getPolicy,
  updatePolicy,
} = require('../controllers/attendancePolicyController');

const {
  getOvertimeRequests,
  requestOvertime,
  approveOvertime,
  rejectOvertime,
} = require('../controllers/overtimeController');

const {
  getCorrections,
  requestCorrection,
  approveCorrection,
  rejectCorrection,
} = require('../controllers/attendanceCorrectionController');

const router = express.Router();

// All attendance endpoints require authentication
router.use(authenticate);

// ================= EMPLOYEE SELF ACTIONS =================
router.post('/punch-in', validatePunch, validateResult, punchIn);
router.post('/punch-out', validatePunch, validateResult, punchOut);
router.get('/me/today', getMyToday);
router.get('/me/history', getMyAttendanceHistory);
router.get('/me/calendar', getMyCalendar);
router.get('/my-records', getMyAttendanceHistory); // Legacy alias

// Employee self correction & overtime submission
router.post('/corrections', requestCorrection);
router.post('/overtime/requests', requestOvertime);

// Overtime requests list (auto-data scoped)
router.get('/overtime/requests', applyDataScope('attendance', 'view'), getOvertimeRequests);
router.patch('/overtime/:requestId/approve', authorize('attendance', 'approve'), approveOvertime);
router.patch('/overtime/:requestId/reject', authorize('attendance', 'approve'), rejectOvertime);

// Correction requests list (auto-data scoped)
router.get('/corrections', applyDataScope('attendance', 'view'), getCorrections);
router.patch('/corrections/:id/approve', authorize('attendance', 'approve'), approveCorrection);
router.patch('/corrections/:id/reject', authorize('attendance', 'approve'), rejectCorrection);

// ================= SHIFTS & POLICIES =================
router.get('/shifts', getShifts);
router.post('/shifts', authorize('attendance', 'edit'), createShift);
router.patch('/shifts/:shiftId', authorize('attendance', 'edit'), updateShift);
router.delete('/shifts/:shiftId', authorize('attendance', 'edit'), deleteShift);

router.get('/policies', getPolicy);
router.post('/policies', authorize('attendance', 'edit'), updatePolicy);
router.patch('/policies', authorize('attendance', 'edit'), updatePolicy);
router.patch('/policies/:policyId', authorize('attendance', 'edit'), updatePolicy);

// ================= MANAGEMENT / HR REPORTING & AUDIT =================
router.get('/today', applyDataScope('attendance', 'view'), getAttendanceSummaryKPIs);
router.get('/summary', applyDataScope('attendance', 'view'), getAttendanceSummaryKPIs);
router.get('/analytics', applyDataScope('attendance', 'view'), getAttendanceAnalytics);
router.get('/reports/daily', applyDataScope('attendance', 'view'), getDailyReport);
router.get('/missing-punch-outs', applyDataScope('attendance', 'view'), getMissingPunchOuts);
router.post('/auto-punch-out/run', authorize('attendance', 'edit'), runAutoPunchOutNow);
router.patch('/:attendanceId/correction', authorize('attendance', 'edit'), correctAttendanceRecord);

// Master attendance table query with server-side pagination and scoping
router.get('/', authorize('attendance', 'view'), applyDataScope('attendance', 'view'), getAllAttendance);

module.exports = router;
