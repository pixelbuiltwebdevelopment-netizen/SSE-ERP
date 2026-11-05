const express = require('express');
const router = express.Router();
const cloudinary = require('../config/cloudinary');
const { uploadReceipt } = require('../middleware/uploadMiddleware');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const {
  submitClaim,
  getClaims,
  getMyClaims,
  getClaimById,
  approveClaim,
  rejectClaim,
  settleClaim,
  getEmployeeFinancialOverview,
  getCompanyPeriodicReports,
} = require('../controllers/expenseController');

const {
  getMyBalance,
  issueAdvance,
  refundAdvance,
  getAdvanceOverview,
  getAllBalances,
  getEmployeeStatement,
} = require('../controllers/advanceController');

const { authenticate } = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorizeMiddleware');
const applyDataScope = require('../middleware/dataScopeMiddleware');
const validate = require('../middleware/validationMiddleware');
const {
  validateSubmitClaim,
  validateApproveClaim,
  validateRejectClaim,
  validateIssueAdvance,
  validateSettleClaim,
  validateRefundAdvance,
} = require('../validators/expenseValidator');

// Apply authentication to all expense routes
router.use(authenticate);

// 1. Cloudinary Upload Endpoint
router.post(
  '/upload-receipt',
  (req, res, next) => {
    uploadReceipt.single('receipt')(req, res, (err) => {
      if (err) {
        return res.status(400).json(new ApiResponse(400, null, err.message || 'File upload failed'));
      }
      next();
    });
  },
  asyncHandler(async (req, res) => {
    if (!req.file || !req.file.buffer) {
      throw new ApiError(400, 'No file uploaded or file field name was not "receipt"');
    }

    // Stream memory buffer directly to Cloudinary
    const uploadStream = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'expense_receipts',
            resource_type: 'auto',
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary Upload Stream Error:', error);
              return reject(error);
            }
            resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });
    };

    const uploaded = await uploadStream();

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          url: uploaded.secure_url,
          name: req.file.originalname,
          size: req.file.size,
          format: uploaded.format,
        },
        'Receipt uploaded to Cloudinary successfully'
      )
    );
  })
);

// 2. Overview & Periodic Reports Endpoints
// Employee-wise financial overview for Team Approvals review
router.get(
  '/overview/employee-summary',
  authorize('expenses', 'view'),
  applyDataScope('expenses', 'view'),
  getEmployeeFinancialOverview
);

// Company-wide periodic reports (Monthly, Weekly, Quarterly, Daily)
router.get(
  '/reports/periodic',
  authorize('expenses', 'view'),
  getCompanyPeriodicReports
);

// 3. Expense Claims Endpoints
// Any logged-in employee can submit their own claims
router.post(
  '/claims',
  validateSubmitClaim,
  validate,
  submitClaim
);

// Get my own submitted claims
router.get(
  '/claims/my',
  getMyClaims
);

// Get team claims (governed by RBAC data scope)
router.get(
  '/claims',
  authorize('expenses', 'view'),
  applyDataScope('expenses', 'view'),
  getClaims
);

// Get single claim details
router.get(
  '/claims/:id',
  getClaimById
);

// Approve claim
router.patch(
  '/claims/:id/approve',
  authorize('expenses', 'approve'),
  applyDataScope('expenses', 'approve'),
  validateApproveClaim,
  validate,
  approveClaim
);

// Reject claim
router.patch(
  '/claims/:id/reject',
  authorize('expenses', 'reject'),
  applyDataScope('expenses', 'reject'),
  validateRejectClaim,
  validate,
  rejectClaim
);

// Settle claim (Adjust against advance OR Reimbursement)
router.post(
  '/claims/:id/settle',
  authorize('expenses', 'approve'),
  applyDataScope('expenses', 'approve'),
  validateSettleClaim,
  validate,
  settleClaim
);

// 4. Advances & Ledger Endpoints
router.get(
  '/advance/my-balance',
  getMyBalance
);

// Employee statement for self
router.get(
  '/my/statement',
  (req, res, next) => {
    req.params.userId = req.user._id;
    return getEmployeeStatement(req, res, next);
  }
);

// Employee statement for any employee (Finance / Admin / Authorised)
router.get(
  '/employee/:userId/statement',
  getEmployeeStatement
);

// Issue advance to employee
router.post(
  '/advance/issue',
  authorize('expenses', 'manage_advance'),
  validateIssueAdvance,
  validate,
  issueAdvance
);

// Refund advance from employee
router.post(
  '/advance/refund',
  authorize('expenses', 'manage_advance'),
  validateRefundAdvance,
  validate,
  refundAdvance
);

// Complete advance overview (Summary cards + Employee Advance Ledger Table)
router.get(
  '/advance/overview',
  authorize('expenses', 'manage_advance'),
  getAdvanceOverview
);

// Legacy all advance balances
router.get(
  '/advance/all-balances',
  authorize('expenses', 'manage_advance'),
  getAllBalances
);

module.exports = router;
