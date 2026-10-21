const User = require('../models/User');
const Role = require('../models/Role');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { hashPassword } = require('../utils/security');
const { logActivity } = require('../services/auditService');
const { getIO } = require('../services/socketService');

const getUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || '';

  // Combine data scope filter with search criteria
  const filter = { ...req.dataScopeFilter };

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const total = await User.countDocuments(filter);
  const users = await User.find(filter)
    .populate('roleId', 'name key')
    .populate('departmentId', 'name code')
    .populate('branchId', 'name code')
    .populate('teamId', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        users,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      'Users retrieved successfully'
    )
  );
});

const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const filter = { _id: id, ...req.dataScopeFilter };

  const user = await User.findOne(filter)
    .populate('roleId')
    .populate('departmentId')
    .populate('branchId')
    .populate('teamId');

  if (!user) {
    throw new ApiError(404, 'User not found or access denied by scope filter');
  }

  res.status(200).json(new ApiResponse(200, user, 'User details retrieved'));
});

const createUser = asyncHandler(async (req, res) => {
  const { name, email, phone, password, roleId, departmentId, branchId, teamId, baseSalary } = req.body;

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new ApiError(400, 'User with this email already exists');
  }

  const role = await Role.findById(roleId);
  if (!role) {
    throw new ApiError(400, 'Selected role does not exist');
  }

  // Privilege escalation protection: Only Super Admin can assign Super Admin role
  if (role.key === 'super_admin' && req.user.roleId.key !== 'super_admin') {
    throw new ApiError(403, 'Only Super Admin can assign the Super Admin role');
  }

  const hashedPassword = await hashPassword(password);

  const newUser = await User.create({
    name,
    email: email.toLowerCase(),
    phone: phone || '',
    password: hashedPassword,
    roleId,
    departmentId: departmentId || req.user.departmentId,
    branchId: branchId || req.user.branchId,
    teamId: teamId || req.user.teamId,
    baseSalary: baseSalary !== undefined && baseSalary !== '' ? Number(baseSalary) : 0,
    createdBy: req.user._id,
  });

  const populatedUser = await User.findById(newUser._id)
    .populate('roleId', 'name key')
    .populate('departmentId', 'name code')
    .populate('branchId', 'name code')
    .populate('teamId', 'name');

  await logActivity({
    userId: req.user._id,
    userName: req.user.name,
    userEmail: req.user.email,
    action: 'USER_CREATED',
    module: 'users',
    resourceId: newUser._id.toString(),
    description: `Created user account ${newUser.email} with role ${role.name}`,
    req,
  });

  const io = getIO();
  io.emit('user_created', populatedUser);

  res.status(201).json(new ApiResponse(201, populatedUser, 'User created successfully'));
});

const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, departmentId, branchId, teamId, baseSalary } = req.body;

  const targetUser = await User.findById(id).populate('roleId');
  if (!targetUser) {
    throw new ApiError(404, 'User not found');
  }

  // Protection: Non-super admin cannot edit a Super Admin account
  if (targetUser.roleId && targetUser.roleId.key === 'super_admin' && req.user.roleId.key !== 'super_admin') {
    throw new ApiError(403, 'You do not have permission to modify a Super Admin account');
  }

  if (email && email.toLowerCase() !== targetUser.email) {
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      throw new ApiError(400, 'Email address is already in use');
    }
    targetUser.email = email.toLowerCase();
  }

  if (name) targetUser.name = name;
  if (phone !== undefined) targetUser.phone = phone;
  if (departmentId !== undefined) targetUser.departmentId = departmentId;
  if (branchId !== undefined) targetUser.branchId = branchId;
  if (teamId !== undefined) targetUser.teamId = teamId;
  if (baseSalary !== undefined && baseSalary !== '') targetUser.baseSalary = Number(baseSalary);

  await targetUser.save();

  const updatedUser = await User.findById(targetUser._id)
    .populate('roleId', 'name key')
    .populate('departmentId', 'name code')
    .populate('branchId', 'name code')
    .populate('teamId', 'name');

  await logActivity({
    userId: req.user._id,
    userName: req.user.name,
    userEmail: req.user.email,
    action: 'USER_UPDATED',
    module: 'users',
    resourceId: targetUser._id.toString(),
    description: `Updated user profile for ${targetUser.email}`,
    req,
  });

  const io = getIO();
  io.emit('user_updated', updatedUser);

  res.status(200).json(new ApiResponse(200, updatedUser, 'User updated successfully'));
});

const updateUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  const targetUser = await User.findById(id).populate('roleId');
  if (!targetUser) {
    throw new ApiError(404, 'User not found');
  }

  if (targetUser.roleId && targetUser.roleId.key === 'super_admin') {
    throw new ApiError(403, 'Super Admin accounts cannot be deactivated');
  }

  if (targetUser._id.toString() === req.user._id.toString()) {
    throw new ApiError(400, 'You cannot change your own active status');
  }

  targetUser.isActive = Boolean(isActive);
  await targetUser.save();

  await logActivity({
    userId: req.user._id,
    userName: req.user.name,
    userEmail: req.user.email,
    action: targetUser.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
    module: 'users',
    resourceId: targetUser._id.toString(),
    description: `Toggled user ${targetUser.email} active status to ${targetUser.isActive}`,
    req,
  });

  const populatedUser = await User.findById(targetUser._id).populate('roleId', 'name key').populate('departmentId', 'name code').populate('branchId', 'name code').populate('teamId', 'name');
  const io = getIO();
  io.emit('user_updated', populatedUser);

  res.status(200).json(new ApiResponse(200, targetUser, `User ${targetUser.isActive ? 'activated' : 'deactivated'} successfully`));
});

const updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { roleId } = req.body;

  const targetUser = await User.findById(id).populate('roleId');
  if (!targetUser) {
    throw new ApiError(404, 'User not found');
  }

  if (targetUser._id.toString() === req.user._id.toString()) {
    throw new ApiError(403, 'You cannot modify your own role');
  }

  const newRole = await Role.findById(roleId);
  if (!newRole) {
    throw new ApiError(400, 'Role does not exist');
  }

  if (newRole.key === 'super_admin' && req.user.roleId.key !== 'super_admin') {
    throw new ApiError(403, 'Only Super Admin can assign the Super Admin role');
  }

  targetUser.roleId = roleId;
  await targetUser.save();

  await logActivity({
    userId: req.user._id,
    userName: req.user.name,
    userEmail: req.user.email,
    action: 'ROLE_ASSIGNED',
    module: 'users',
    resourceId: targetUser._id.toString(),
    description: `Assigned role ${newRole.name} to user ${targetUser.email}`,
    req,
  });

  const populatedUser = await User.findById(targetUser._id).populate('roleId', 'name key').populate('departmentId', 'name code').populate('branchId', 'name code').populate('teamId', 'name');
  const io = getIO();
  io.emit('user_updated', populatedUser);

  res.status(200).json(new ApiResponse(200, targetUser, 'User role updated successfully'));
});

const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const targetUser = await User.findById(id).populate('roleId');
  if (!targetUser) {
    throw new ApiError(404, 'User not found');
  }

  if (targetUser.roleId && targetUser.roleId.key === 'super_admin') {
    throw new ApiError(403, 'Super Admin accounts cannot be deleted');
  }

  if (targetUser._id.toString() === req.user._id.toString()) {
    throw new ApiError(400, 'You cannot delete your own account');
  }

  await User.findByIdAndDelete(id);

  await logActivity({
    userId: req.user._id,
    userName: req.user.name,
    userEmail: req.user.email,
    action: 'USER_DELETED',
    module: 'users',
    resourceId: id,
    description: `Deleted user ${targetUser.email}`,
    req,
  });

  const io = getIO();
  io.emit('user_deleted', { _id: id });

  res.status(200).json(new ApiResponse(200, null, 'User deleted successfully'));
});

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserStatus,
  updateUserRole,
  deleteUser,
};

