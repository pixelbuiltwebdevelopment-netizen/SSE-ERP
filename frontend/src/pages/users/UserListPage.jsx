import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Users,
  UserCheck,
  UserX,
  Shield,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Filter,
} from 'lucide-react';
import { fetchUsers, userCreated, userUpdated, userDeleted } from '../../store/slices/userSlice';
import { fetchRoles } from '../../store/slices/roleSlice';
import { userApi } from '../../api/userApi';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/Skeleton';
import PermissionGate from '../../components/permissions/PermissionGate';
import { useSocket } from '../../components/providers/SocketProvider';

const UserListPage = () => {
  const dispatch = useDispatch();
  const socket = useSocket();
  const { users = [], pagination = {}, loading } = useSelector((state) => state.users || {});
  const { roles = [] } = useSelector((state) => state.roles || {});

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [page, setPage] = useState(1);

  // Modals & Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    roleId: '',
    baseSalary: '',
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editFormData, setEditFormData] = useState({
    id: '',
    name: '',
    email: '',
    phone: '',
    roleId: '',
    baseSalary: '',
    password: '',
    confirmPassword: '',
  });
  const [submitError, setSubmitError] = useState('');

  // Fetch users & roles
  useEffect(() => {
    dispatch(fetchUsers({ page, limit: 10, search }));
    dispatch(fetchRoles());
  }, [dispatch, page, search]);

  // Real-time socket updates
  useEffect(() => {
    if (!socket) return;

    const handleUserCreated = (newUser) => dispatch(userCreated(newUser));
    const handleUserUpdated = (updatedUser) => dispatch(userUpdated(updatedUser));
    const handleUserDeleted = (deletedUser) => dispatch(userDeleted(deletedUser));

    socket.on('user_created', handleUserCreated);
    socket.on('user_updated', handleUserUpdated);
    socket.on('user_deleted', handleUserDeleted);

    return () => {
      socket.off('user_created', handleUserCreated);
      socket.off('user_updated', handleUserUpdated);
      socket.off('user_deleted', handleUserDeleted);
    };
  }, [socket, dispatch]);

  // KPI Calculations
  const metrics = useMemo(() => {
    const total = pagination.total || users.length;
    const active = users.filter((u) => u.isActive).length;
    const inactive = users.filter((u) => !u.isActive).length;
    return { total, active, inactive, rolesCount: roles.length };
  }, [users, pagination, roles]);

  // Client-side quick filter
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        !search ||
        user.name?.toLowerCase().includes(search.toLowerCase()) ||
        user.email?.toLowerCase().includes(search.toLowerCase()) ||
        user.phone?.includes(search);

      const matchesRole = selectedRole === 'ALL' || user.roleId?._id === selectedRole;
      const matchesStatus =
        selectedStatus === 'ALL' ||
        (selectedStatus === 'ACTIVE' && user.isActive) ||
        (selectedStatus === 'INACTIVE' && !user.isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, selectedRole, selectedStatus]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setSubmitError('');
    try {
      await userApi.createUser({
        ...formData,
        baseSalary: formData.baseSalary !== '' ? Number(formData.baseSalary) : 0,
      });
      setShowCreateModal(false);
      setFormData({ name: '', email: '', phone: '', password: '', roleId: '', baseSalary: '' });
      dispatch(fetchUsers({ page: 1, limit: 10, search: '' }));
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to create user');
    }
  };

  const openEditModal = (u) => {
    setSubmitError('');
    setShowEditPassword(false);
    setEditFormData({
      id: u._id,
      name: u.name,
      email: u.email,
      phone: u.phone || '',
      roleId: u.roleId?._id || '',
      baseSalary: u.baseSalary !== undefined && u.baseSalary !== null ? u.baseSalary : '',
      password: '',
      confirmPassword: '',
    });
    setShowEditModal(true);
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    setSubmitError('');

    const newPassword = editFormData.password ? editFormData.password.trim() : '';
    const confirmPassword = editFormData.confirmPassword ? editFormData.confirmPassword.trim() : '';

    if (newPassword || confirmPassword) {
      if (newPassword.length < 6) {
        setSubmitError('New password must be at least 6 characters long.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setSubmitError('Passwords do not match. Please verify your entries.');
        return;
      }
    }

    try {
      const payload = {
        name: editFormData.name,
        email: editFormData.email,
        phone: editFormData.phone,
        roleId: editFormData.roleId,
        baseSalary: editFormData.baseSalary !== '' ? Number(editFormData.baseSalary) : 0,
      };

      if (newPassword) {
        payload.password = newPassword;
      }

      await userApi.updateUser(editFormData.id, payload);
      setShowEditModal(false);
      dispatch(fetchUsers({ page, limit: 10, search }));
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to update user');
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      await userApi.updateUserStatus(user._id, !user.isActive);
      dispatch(fetchUsers({ page, limit: 10, search }));
    } catch (err) {
      alert(err.response?.data?.message || 'Status update failed');
    }
  };

  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete user '${name}'? This action is irreversible.`)) return;
    try {
      await userApi.deleteUser(id);
      dispatch(fetchUsers({ page, limit: 10, search }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user');
    }
  };

  return (
    <div className="erp-fade-in pb-4">
      {/* ── Page Header ── */}
      <PageHeader
        title="Workforce & User Directory"
        subtitle="Manage corporate staff profiles, role privileges, and active statuses across all branches"
        breadcrumbs={[{ label: 'Organization' }, { label: 'Users' }]}
        actions={
          <PermissionGate module="users" action="create">
            <button
              type="button"
              className="erp-btn erp-btn-primary"
              onClick={() => {
                setSubmitError('');
                setShowCreateModal(true);
              }}
            >
              <Plus size={16} /> Add Employee
            </button>
          </PermissionGate>
        }
      />

      {/* ── KPI Summary Cards ── */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Total Workforce"
            value={metrics.total}
            subtitle="Registered employees"
            icon={Users}
            variant="primary"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Active Accounts"
            value={metrics.active}
            subtitle="Operational access enabled"
            icon={UserCheck}
            variant="success"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Inactive Accounts"
            value={metrics.inactive}
            subtitle="Access suspended"
            icon={UserX}
            variant="danger"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="System Roles"
            value={metrics.rolesCount}
            subtitle="Security configurations"
            icon={Shield}
            variant="purple"
          />
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="erp-card p-3 mb-4">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-5">
            <div className="erp-search-group">
              <span className="erp-search-icon">
                <Search size={16} />
              </span>
              <input
                type="text"
                className="erp-input erp-search-input"
                placeholder="Search staff by name, email, or phone..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          <div className="col-6 col-md-3">
            <select
              className="erp-select"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <option value="ALL">All Roles ({roles.length})</option>
              {roles.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-6 col-md-2">
            <select
              className="erp-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>

          <div className="col-12 col-md-2 text-md-end text-muted small">
            <span>Showing {filteredUsers.length} of {pagination.total || users.length}</span>
          </div>
        </div>
      </div>

      {/* ── User Table ── */}
      {loading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : filteredUsers.length === 0 ? (
        <div className="erp-card p-4">
          <EmptyState
            icon={Users}
            title="No matching staff found"
            description="No employees match your search query or filter parameters. Try clearing your filters."
            actionLabel="Reset Search"
            onAction={() => {
              setSearch('');
              setSelectedRole('ALL');
              setSelectedStatus('ALL');
            }}
          />
        </div>
      ) : (
        <div className="erp-table-container">
          <div className="table-responsive">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Assigned Role</th>
                  <th>Department & Branch</th>
                  <th>Contact Info</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <div className="d-flex align-items-center gap-2.5">
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-xs flex-shrink-0"
                          style={{
                            width: '36px',
                            height: '36px',
                            backgroundColor: 'var(--erp-primary)',
                            fontSize: '0.8rem',
                          }}
                        >
                          {u.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                          <div className="fw-semibold text-truncate" style={{ color: 'var(--erp-text-main)' }}>
                            {u.name}
                          </div>
                          <small className="text-muted d-block text-truncate" style={{ fontSize: '0.74rem' }}>
                            {u.email}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <StatusBadge status={u.roleId?.name || 'Unassigned'} />
                    </td>

                    <td>
                      <div className="small fw-medium" style={{ color: 'var(--erp-text-main)' }}>
                        {u.departmentId?.name || 'Sales Department'}
                      </div>
                      <small className="text-muted d-block" style={{ fontSize: '0.72rem' }}>
                        {u.branchId?.name || 'Hyderabad HQ'} • {u.teamId?.name || 'Inside Sales'}
                      </small>
                    </td>

                    <td>
                      <div className="small font-monospace">{u.phone || '—'}</div>
                      <small className="text-muted">
                        Salary: {u.baseSalary ? `₹${u.baseSalary.toLocaleString()}` : '—'}
                      </small>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="btn btn-sm border-0 p-0"
                        onClick={() => handleToggleStatus(u)}
                        title="Click to toggle account status"
                      >
                        <StatusBadge status={u.isActive ? 'Active' : 'Inactive'} size="sm" />
                      </button>
                    </td>

                    <td className="text-end">
                      <div className="d-inline-flex align-items-center gap-1">
                        <PermissionGate module="users" action="edit">
                          <button
                            type="button"
                            className="erp-btn erp-btn-secondary erp-btn-sm p-1.5"
                            onClick={() => openEditModal(u)}
                            title="Edit User"
                          >
                            <Edit2 size={14} />
                          </button>
                        </PermissionGate>

                        <PermissionGate module="users" action="delete">
                          <button
                            type="button"
                            className="erp-btn erp-btn-danger-outline erp-btn-sm p-1.5"
                            onClick={() => handleDeleteUser(u._id, u.name)}
                            title="Delete User"
                          >
                            <Trash2 size={14} />
                          </button>
                        </PermissionGate>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 border-top">
            <Pagination pagination={pagination} onPageChange={(p) => setPage(p)} />
          </div>
        </div>
      )}

      {/* ── Create User Modal ── */}
      <Modal
        show={showCreateModal}
        title="Register New Employee"
        onClose={() => setShowCreateModal(false)}
        size="lg"
        icon={Users}
      >
        <form onSubmit={handleCreateUser}>
          {submitError && (
            <div className="alert alert-danger small py-2 px-3 mb-3 border-0">
              {submitError}
            </div>
          )}

          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="erp-label">Full Name *</label>
              <input
                type="text"
                className="erp-input"
                placeholder="e.g. Anand Kumar"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="col-12 col-md-6">
              <label className="erp-label">Corporate Email *</label>
              <input
                type="email"
                className="erp-input"
                placeholder="e.g. anand@erp.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="col-12 col-md-6">
              <label className="erp-label">Phone Number</label>
              <input
                type="text"
                className="erp-input"
                placeholder="e.g. 9876543210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="col-12 col-md-6">
              <label className="erp-label">Initial Password *</label>
              <input
                type="password"
                className="erp-input"
                placeholder="Min 6 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
              />
            </div>

            <div className="col-12 col-md-6">
              <label className="erp-label">System Role *</label>
              <select
                className="erp-select"
                value={formData.roleId}
                onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                required
              >
                <option value="">Select Role...</option>
                {roles.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-md-6">
              <label className="erp-label">Base Monthly Salary (₹)</label>
              <input
                type="number"
                className="erp-input"
                placeholder="e.g. 45000"
                value={formData.baseSalary}
                onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
              />
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
            <button
              type="button"
              className="erp-btn erp-btn-secondary"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </button>
            <button type="submit" className="erp-btn erp-btn-primary">
              Create Employee Profile
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Edit User Modal ── */}
      <Modal
        show={showEditModal}
        title={`Edit Profile: ${editFormData.name}`}
        onClose={() => setShowEditModal(false)}
        size="lg"
        icon={Edit2}
      >
        <form onSubmit={handleEditUser}>
          {submitError && (
            <div className="alert alert-danger small py-2 px-3 mb-3 border-0">
              {submitError}
            </div>
          )}

          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="erp-label">Full Name *</label>
              <input
                type="text"
                className="erp-input"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                required
              />
            </div>

            <div className="col-12 col-md-6">
              <label className="erp-label">Email Address *</label>
              <input
                type="email"
                className="erp-input"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                required
              />
            </div>

            <div className="col-12 col-md-6">
              <label className="erp-label">Phone Number</label>
              <input
                type="text"
                className="erp-input"
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
              />
            </div>

            <div className="col-12 col-md-6">
              <label className="erp-label">Assigned Role *</label>
              <select
                className="erp-select"
                value={editFormData.roleId}
                onChange={(e) => setEditFormData({ ...editFormData, roleId: e.target.value })}
                required
              >
                <option value="">Select Role...</option>
                {roles.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-md-6">
              <label className="erp-label">Base Monthly Salary (₹)</label>
              <input
                type="number"
                className="erp-input"
                value={editFormData.baseSalary}
                onChange={(e) => setEditFormData({ ...editFormData, baseSalary: e.target.value })}
              />
            </div>

            {/* Optional Password Reset section */}
            <div className="col-12 border-top pt-3 mt-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-semibold small" style={{ color: 'var(--erp-text-main)' }}>
                  Reset Account Password (Optional)
                </span>
                <button
                  type="button"
                  className="btn btn-link p-0 small text-decoration-none"
                  onClick={() => setShowEditPassword(!showEditPassword)}
                >
                  {showEditPassword ? 'Cancel Password Change' : '+ Change Password'}
                </button>
              </div>

              {showEditPassword && (
                <div className="row g-2">
                  <div className="col-12 col-sm-6">
                    <input
                      type="password"
                      className="erp-input"
                      placeholder="New password (min 6 chars)"
                      value={editFormData.password}
                      onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                    />
                  </div>
                  <div className="col-12 col-sm-6">
                    <input
                      type="password"
                      className="erp-input"
                      placeholder="Confirm new password"
                      value={editFormData.confirmPassword}
                      onChange={(e) => setEditFormData({ ...editFormData, confirmPassword: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
            <button
              type="button"
              className="erp-btn erp-btn-secondary"
              onClick={() => setShowEditModal(false)}
            >
              Cancel
            </button>
            <button type="submit" className="erp-btn erp-btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UserListPage;
