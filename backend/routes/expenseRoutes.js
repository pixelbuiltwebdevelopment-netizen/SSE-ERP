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
  approveClaim,
  rejectClaim,
} = require('../controllers/expenseController');

const {
  getMyBalance,
  issueAdvance,
  getAllBalances
} = require('../controllers/advanceController');

const { authenticate } = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorizeMiddleware');
const applyDataScope = require('../middleware/dataScopeMiddleware');
const validate = require('../middleware/validationMiddleware');
const {
  validateSubmitClaim,
  validateApproveClaim,
  validateRejectClaim,
  validateIssueAdvance
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
      new ApiResponse(200, { url: uploaded.secure_url }, 'Receipt uploaded to Cloudinary successfully')
    );
  })
);

// 2. Expense Claims Endpoints
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

// 3. Advances Endpoints
router.get(
  '/advance/my-balance',
  getMyBalance
);

router.post(
  '/advance/issue',
  authorize('expenses', 'manage_advance'),
  validateIssueAdvance,
  validate,
  issueAdvance
);

router.get(
  '/advance/all-balances',
  authorize('expenses', 'manage_advance'),
  getAllBalances
);

// THIS IS CRUCIAL: Export the router
module.exports = router;