const Company = require('../models/Company');
const ApiError = require('../utils/ApiError');
const { logActivity } = require('../services/auditService');
const { uploadFile, deleteFile } = require('../services/cloudinaryService');
const { getCountries, getStates, getDistricts, getLocationMeta } = require('../services/locationService');

/**
 * @desc Get all companies with search, filtering, pagination, and dynamic data scoping
 * @route GET /api/companies
 * @access Private (Authorize: companies.view)
 */
const getCompanies = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const { search, status, country, state, area, businessType, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Start with security dataScopeFilter (NEVER allow user query to bypass this)
    const filter = { ...req.dataScopeFilter };

    if (status) {
      filter.status = status;
    }

    if (country) {
      filter.country = country;
    }

    if (state) {
      filter.state = state;
    }

    if (area) {
      filter.area = area;
    }

    if (businessType) {
      filter.businessType = businessType;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { company: searchRegex },
        { contactPerson: searchRegex },
        { contactEmail: searchRegex },
        { contactNumber: searchRegex },
        { profileCode: searchRegex },
        { 'machines.serialNumber': searchRegex },
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [companies, total] = await Promise.all([
      Company.find(filter)
        .populate('createdBy', 'name email')
        .populate('assignedTo', 'name email')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      Company.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        companies,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get single company by ID with data scope enforcement
 * @route GET /api/companies/:id
 * @access Private (Authorize: companies.view)
 */
const getCompanyById = async (req, res, next) => {
  try {
    const filter = { _id: req.params.id, ...req.dataScopeFilter };
    const company = await Company.findOne(filter)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!company) {
      return next(new ApiError(404, 'Company profile not found or access denied.'));
    }

    res.status(200).json({
      success: true,
      data: company,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Create a new company profile
 * @route POST /api/companies
 * @access Private (Authorize: companies.create)
 */
const createCompany = async (req, res, next) => {
  try {
    const companyData = {
      ...req.body,
      createdBy: req.user._id,
      assignedTo: req.body.assignedTo || req.user._id,
      departmentId: req.user.departmentId,
      branchId: req.user.branchId,
      teamId: req.user.teamId,
    };

    const newCompany = await Company.create(companyData);

    // Audit Log
    await logActivity({
      userId: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'COMPANY_CREATED',
      module: 'companies',
      resourceId: newCompany._id.toString(),
      description: `Created company profile '${newCompany.company}' (${newCompany.profileCode})`,
      req,
    });

    res.status(201).json({
      success: true,
      data: newCompany,
      message: 'Company profile created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Update company profile with data scope enforcement
 * @route PUT /api/companies/:id
 * @access Private (Authorize: companies.edit)
 */
const updateCompany = async (req, res, next) => {
  try {
    const filter = { _id: req.params.id, ...req.dataScopeFilter };
    const existingCompany = await Company.findOne(filter);

    if (!existingCompany) {
      return next(new ApiError(404, 'Company profile not found or access denied for edit.'));
    }

    // Do not allow client to overwrite system fields
    delete req.body.createdBy;
    delete req.body._id;
    delete req.body.profileCode;

    req.body.updatedBy = req.user._id;

    const updatedCompany = await Company.findByIdAndUpdate(existingCompany._id, req.body, {
      new: true,
      runValidators: true,
    });

    // Audit Log
    await logActivity({
      userId: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'COMPANY_UPDATED',
      module: 'companies',
      resourceId: updatedCompany._id.toString(),
      description: `Updated company profile '${updatedCompany.company}' (${updatedCompany.profileCode})`,
      req,
    });

    res.status(200).json({
      success: true,
      data: updatedCompany,
      message: 'Company profile updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Update status (Activate/Deactivate) of company profile
 * @route PATCH /api/companies/:id/status
 * @access Private (Authorize: companies.activate / deactivate / edit)
 */
const updateCompanyStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status || !['Active', 'Disabled', 'Customer'].includes(status)) {
      return next(new ApiError(400, 'Invalid status provided'));
    }

    const filter = { _id: req.params.id, ...req.dataScopeFilter };
    const company = await Company.findOne(filter);

    if (!company) {
      return next(new ApiError(404, 'Company profile not found or access denied.'));
    }

    company.status = status;
    company.updatedBy = req.user._id;
    await company.save();

    await logActivity({
      userId: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: status === 'Disabled' ? 'COMPANY_DEACTIVATED' : 'COMPANY_ACTIVATED',
      module: 'companies',
      resourceId: company._id.toString(),
      description: `Changed company profile '${company.company}' status to '${status}'`,
      req,
    });

    res.status(200).json({
      success: true,
      data: company,
      message: `Company status changed to ${status}`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Delete company profile with data scope enforcement
 * @route DELETE /api/companies/:id
 * @access Private (Authorize: companies.delete)
 */
const deleteCompany = async (req, res, next) => {
  try {
    const filter = { _id: req.params.id, ...req.dataScopeFilter };
    const company = await Company.findOne(filter);

    if (!company) {
      return next(new ApiError(404, 'Company profile not found or access denied for delete.'));
    }

    await Company.findByIdAndDelete(company._id);

    await logActivity({
      userId: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'COMPANY_DELETED',
      module: 'companies',
      resourceId: company._id.toString(),
      description: `Deleted company profile '${company.company}' (${company.profileCode})`,
      req,
    });

    res.status(200).json({
      success: true,
      message: 'Company profile deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Upload file (Logo/Document/Image) to Cloudinary
 * @route POST /api/companies/upload
 * @access Private (Authorize: companies.create / edit)
 */
const uploadCompanyFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new ApiError(400, 'No file uploaded'));
    }

    const companyId = req.body.companyId || 'temp';
    const subfolder = req.body.subfolder || 'documents';

    const uploaded = await uploadFile(req.file, companyId, subfolder);

    res.status(200).json({
      success: true,
      data: uploaded,
      message: 'File uploaded successfully to Cloudinary',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Delete file from Cloudinary
 * @route DELETE /api/companies/files
 * @access Private (Authorize: companies.edit)
 */
const removeCompanyFile = async (req, res, next) => {
  try {
    const { publicId, resourceType } = req.body;
    if (!publicId) {
      return next(new ApiError(400, 'publicId is required'));
    }

    await deleteFile(publicId, resourceType || 'image');

    res.status(200).json({
      success: true,
      message: 'File removed from Cloudinary',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Location lookup API
 * @route GET /api/companies/locations/data
 * @access Private
 */
const getLocationData = async (req, res, next) => {
  try {
    const { country = 'India', state = '' } = req.query;

    const countries = getCountries();
    const states = getStates(country);
    const districts = getDistricts(country, state);
    const meta = getLocationMeta(country);

    res.status(200).json({
      success: true,
      data: {
        countries,
        states,
        districts,
        meta,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  updateCompanyStatus,
  deleteCompany,
  uploadCompanyFile,
  removeCompanyFile,
  getLocationData,
};
