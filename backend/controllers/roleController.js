const Role = require('../models/Role');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { logActivity } = require('../services/auditService');
const { getIO } = require('../services/socketService');

const getRoles = asyncHandler(async (req, res) => {
  const roles = await Role.find().sort({ isSystemRole: -1, createdAt: 1 });
  res.status(200).json(new ApiResponse(200, roles, 'Roles retrieved successfully'));
});

const getRoleById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const role = await Role.findById(id);

  if (!role) {
    throw new ApiError(404, 'Role not found');
  }

  res.status(200).json(new ApiResponse(200, role, 'Role details retrieved'));
});

const createRole = asyncHandler(async (req, res) => {
  const { name, key, description, permissions } = req.body;

  const existingRoleKey = await Role.findOne({ key: key.toLowerCase() });
  if (existingRoleKey) {
    throw new ApiError(400, 'Role key must be unique');
  }

  const existingRoleName = await Role.findOne({ name });
  if (existingRoleName) {
    throw new ApiError(400, 'Role name must be unique');
  }

  const newRole = await Role.create({
    name,
    key: key.toLowerCase(),
    description: description || '',
    permissions: permissions || [],
    isSystemRole: false,
    createdBy: req.user._id,
  });

  await logActivity({
    userId: req.user._id,
    userName: req.user.name,
    userEmail: req.user.email,
    action: 'ROLE_CREATED',
    module: 'roles',
    resourceId: newRole._id.toString(),
    description: `Created role '${newRole.name}' (${newRole.key})`,
    req,
  });

  res.status(201).json(new ApiResponse(201, newRole, 'Role created successfully'));
});

const updateRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, permissions, isActive } = req.body;

  const role = await Role.findById(id);
  if (!role) {
    throw new ApiError(404, 'Role not found');
  }

  // Protection: Protect Super Admin system role from modification by non-Super Admin
  if (role.isSystemRole && role.key === 'super_admin') {
    if (req.user.roleId.key !== 'super_admin') {
      throw new ApiError(403, 'Only Super Admin can modify system roles');
    }
  }

  if (name && name !== role.name) {
    const existingName = await Role.findOne({ name });
    if (existingName) {
      throw new ApiError(400, 'Role name already in use');
    }
    role.name = name;
  }

  if (description !== undefined) role.description = description;
  if (permissions !== undefined) role.permissions = permissions;
  if (isActive !== undefined && !role.isSystemRole) role.isActive = Boolean(isActive);

  await role.save();

  await logActivity({
    userId: req.user._id,
    userName: req.user.name,
    userEmail: req.user.email,
    action: 'PERMISSION_CHANGED',
    module: 'roles',
    resourceId: role._id.toString(),
    description: `Updated permissions/details for role '${role.name}'`,
    req,
  });

  const io = getIO();
  io.emit('role_updated', role);

  res.status(200).json(new ApiResponse(200, role, 'Role updated successfully'));
});

const deleteRole = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const role = await Role.findById(id);
  if (!role) {
    throw new ApiError(404, 'Role not found');
  }

  if (role.isSystemRole) {
    throw new ApiError(403, 'System roles cannot be deleted');
  }

  const assignedUsersCount = await User.countDocuments({ roleId: id });
  if (assignedUsersCount > 0) {
    throw new ApiError(400, `Cannot delete role. It is currently assigned to ${assignedUsersCount} active users.`);
  }

  await Role.findByIdAndDelete(id);

  await logActivity({
    userId: req.user._id,
    userName: req.user.name,
    userEmail: req.user.email,
    action: 'ROLE_DELETED',
    module: 'roles',
    resourceId: id,
    description: `Deleted role '${role.name}'`,
    req,
  });

  const io = getIO();
  io.emit('role_deleted', { _id: id });

  res.status(200).json(new ApiResponse(200, null, 'Role deleted successfully'));
});

module.exports = {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
};

