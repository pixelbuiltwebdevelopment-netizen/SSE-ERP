const express = require('express');
const multer = require('multer');
const { authenticate } = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorizeMiddleware');
const applyDataScope = require('../middleware/dataScopeMiddleware');
const validateResult = require('../middleware/validationMiddleware');
const {
  validateCompanyCreate,
  validateCompanyUpdate,
} = require('../validators/companyValidator');
const {
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  updateCompanyStatus,
  deleteCompany,
  uploadCompanyFile,
  removeCompanyFile,
  getLocationData,
} = require('../controllers/companyController');

const router = express.Router();

// Setup Multer memory storage for Cloudinary stream upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpe?g|png|webp|gif|pdf|doc|docx|xls|xlsx|csv|txt)$/i;
    if (file.originalname.match(allowed) || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('File format not supported. Only images and standard document formats are allowed.'), false);
    }
  },
});

// All company endpoints require authentication
router.use(authenticate);

// Location lookup route
router.get('/locations/data', getLocationData);

// Company File Management
router.post('/upload', authorize('companies', 'create'), upload.single('file'), uploadCompanyFile);
router.delete('/files', authorize('companies', 'edit'), removeCompanyFile);

// Company Profile CRUD & Status
router.get('/', authorize('companies', 'view'), applyDataScope('companies', 'view'), getCompanies);
router.get('/:id', authorize('companies', 'view'), applyDataScope('companies', 'view'), getCompanyById);
router.post('/', authorize('companies', 'create'), validateCompanyCreate, validateResult, createCompany);
router.put('/:id', authorize('companies', 'edit'), applyDataScope('companies', 'edit'), validateCompanyUpdate, validateResult, updateCompany);
router.patch('/:id/status', authorize('companies', 'edit'), applyDataScope('companies', 'edit'), updateCompanyStatus);
router.delete('/:id', authorize('companies', 'delete'), applyDataScope('companies', 'delete'), deleteCompany);

module.exports = router;
