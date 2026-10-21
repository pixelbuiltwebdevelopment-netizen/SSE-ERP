const Module = require('../models/Module');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { logActivity } = require('../services/auditService');

const getModules = asyncHandler(async (req, res) => {
  const modules = await Module.find().sort({ name: 1 });
  res.status(200).json(new ApiResponse(200, modules, 'Modules retrieved successfully'));
});

const createModule = asyncHandler(async (req, res) => {
  const { name, key, description } = req.body;

  const existingModule = await Module.findOne({ key: key.toLowerCase() });
  if (existingModule) {
    throw new ApiError(400, 'Module key already exists');
  }

  const newModule = await Module.create({
    name,
    key: key.toLowerCase(),
    description: description || '',
    isActive: true,
    createdBy: req.user._id,
  });

  await logActivity({
    userId: req.user._id,
    userName: req.user.name,
    userEmail: req.user.email,
    action: 'MODULE_CREATED',
    module: 'modules',
    resourceId: newModule._id.toString(),
    description: `Created system module '${newModule.name}' (${newModule.key})`,
    req,
  });

  res.status(201).json(new ApiResponse(201, newModule, 'Module created successfully'));
});

const updateModule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  const moduleItem = await Module.findById(id);
  if (!moduleItem) {
    throw new ApiError(404, 'Module not found');
  }

  if (name) moduleItem.name = name;
  if (description !== undefined) moduleItem.description = description;

  await moduleItem.save();

  res.status(200).json(new ApiResponse(200, moduleItem, 'Module updated successfully'));
});

const updateModuleStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  const moduleItem = await Module.findById(id);
  if (!moduleItem) {
    throw new ApiError(404, 'Module not found');
  }

  moduleItem.isActive = Boolean(isActive);
  await moduleItem.save();

  await logActivity({
    userId: req.user._id,
    userName: req.user.name,
    userEmail: req.user.email,
    action: moduleItem.isActive ? 'MODULE_ACTIVATED' : 'MODULE_DEACTIVATED',
    module: 'modules',
    resourceId: moduleItem._id.toString(),
    description: `Toggled module '${moduleItem.name}' status to ${moduleItem.isActive}`,
    req,
  });

  res.status(200).json(new ApiResponse(200, moduleItem, `Module ${moduleItem.isActive ? 'activated' : 'deactivated'} successfully`));
});

module.exports = {
  getModules,
  createModule,
  updateModule,
  updateModuleStatus,
};
