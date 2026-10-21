import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUsers, userCreated, userUpdated, userDeleted } from '../../store/slices/userSlice';
import { fetchRoles } from '../../store/slices/roleSlice';
import { userApi } from '../../api/userApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';
import PermissionGate from '../../components/permissions/PermissionGate';
import { useSocket } from '../../components/providers/SocketProvider';

const UserListPage = () => {
  const dispatch = useDispatch();
  const socket = useSocket();
  const { users = [], pagination = {}, loading, error } = useSelector((state) => state.users || {});
  const { roles = [] } = useSelector((state) => state.roles || {});

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [page, setPage] = useState(1);

  // Employee Dropdown Controller
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const employeeDropdownRef = useRef(null);

  // Modals & Forms State
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
  const [editFormData, setEditFormData] = useState({
    id: '',
    name: '',
    email: '',
    phone: '',
    roleId: '',
    baseSalary: '',
  });
  const [submitError, setSubmitError] = useState('');

  // Fetch users & roles
  useEffect(() => {
    dispatch(fetchUsers({ page, limit: 10, search }));
    dispatch(fetchRoles());
  }, [dispatch, page, search]);

  // Click outside to close Employee Search Dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(e.target)) {
        setShowEmployeeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Dynamic dropdown list
  const dropdownEmployeeList = useMemo(() => {
    if (!search || search.trim() === '') return users;
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.phone?.includes(search)
    );
  }, [users, search]);

  // Helpers
  const getInitials = (name = '') => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const getAvatarGradient = (name = '') => {
    const colors = [
      'linear-gradient(135deg, #1E5385 0%, #0F3153 100%)',
      'linear-gradient(135deg, #059669 0%, #047857 100%)',
      'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
      'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
      'linear-gradient(135deg, #DB2777 0%, #BE185D 100%)',
      'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const handleSelectEmployee = (user) => {
    setSearch(user.name);
    setShowEmployeeDropdown(false);
  };

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

  const openEditModal = (user) => {
    setSubmitError('');
    setEditFormData({
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      roleId: user.roleId?._id || '',
      baseSalary: user.baseSalary !== undefined && user.baseSalary !== null ? user.baseSalary : '',
    });
    setShowEditModal(true);
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    setSubmitError('');
    try {
      await userApi.updateUser(editFormData.id, {
        name: editFormData.name,
        email: editFormData.email,
        phone: editFormData.phone,
        roleId: editFormData.roleId,
        baseSalary: editFormData.baseSalary !== '' ? Number(editFormData.baseSalary) : 0,
      });
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
      alert(err.response?.data?.message || 'Status toggle failed');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await userApi.deleteUser(id);
      dispatch(fetchUsers({ page, limit: 10, search }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user');
    }
  };

  return (
    <div className="erp-page-wrapper">
      <style>{`
        @import url("https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css");

        html, body {
          overflow-x: hidden !important;
          max-width: 100vw !important;
          margin: 0;
          padding: 0;
        }

        /* ── SECTION: Page Canvas Container ── */
        .erp-page-wrapper {
          background-color: #F8FAFC;
          min-height: 100vh;
          width: 100%;
          padding: 12px 10px 40px;
          box-sizing: border-box;
        }
        @media (min-width: 576px) {
          .erp-page-wrapper {
            padding: 18px 16px 48px;
          }
        }
        @media (min-width: 768px) {
          .erp-page-wrapper {
            padding: 28px 32px 64px;
          }
        }

        .erp-container-inner {
          max-width: 1440px;
          margin: 0 auto;
        }

        /* ── SECTION 1: Banner Header Box ── */
        .erp-header-banner {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 14px 16px;
          margin-bottom: 16px;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
        }
        @media (min-width: 768px) {
          .erp-header-banner {
            border-radius: 14px;
            padding: 22px 26px;
            margin-bottom: 24px;
          }
        }

        /* ── SECTION 2: KPI Metrics Grid ── */
        .erp-metrics-grid {
          margin-bottom: 16px;
        }
        @media (min-width: 768px) {
          .erp-metrics-grid {
            margin-bottom: 24px;
          }
        }

        .kpi-card-box {
          border-radius: 10px;
          border: 1px solid #E2E8F0;
          background: #FFFFFF;
          padding: 12px 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          height: 100%;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        @media (min-width: 768px) {
          .kpi-card-box {
            border-radius: 12px;
            padding: 18px 20px;
            gap: 16px;
          }
        }
        .kpi-card-box:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
        }

        .kpi-icon-square {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        @media (min-width: 768px) {
          .kpi-icon-square {
            width: 48px;
            height: 48px;
            border-radius: 10px;
          }
        }

        /* ── SECTION 3: Filter Console Bar ── */
        .erp-filter-panel {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 14px 14px;
          margin-bottom: 16px;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
          position: relative;
        }
        @media (min-width: 768px) {
          .erp-filter-panel {
            padding: 18px 22px;
            margin-bottom: 24px;
          }
        }

        /* 16px on mobile prevents unwanted auto-zoom in mobile Safari */
        .erp-input-field {
          border-radius: 8px;
          border: 1px solid #CBD5E1;
          font-size: 16px;
          min-height: 44px;
          padding: 8px 12px;
          width: 100%;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        @media (min-width: 768px) {
          .erp-input-field {
            font-size: 0.88rem;
            min-height: 40px;
          }
        }
        .erp-input-field:focus {
          border-color: #0284C7;
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
          outline: none;
        }

        /* ── Dropdown Select Menu ── */
        .employee-dropdown-menu {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          background: #FFFFFF;
          border: 1px solid #CBD5E1;
          border-radius: 10px;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14);
          z-index: 1050;
          max-height: 260px;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }
        .dropdown-item-hover {
          padding: 12px 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #F1F5F9;
          transition: background-color 0.15s ease;
        }
        .dropdown-item-hover:hover {
          background-color: #F8FAFC;
        }
        .dropdown-item-hover:last-child {
          border-bottom: none;
        }

        /* ── SECTION 4: Table Container ── */
        .erp-table-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          box-shadow: 0 1px 4px rgba(15, 23, 42, 0.04);
          overflow: hidden;
          margin-bottom: 24px;
        }
        @media (min-width: 768px) {
          .erp-table-card {
            border-radius: 14px;
            margin-bottom: 32px;
          }
        }

        .erp-data-table thead th {
          background-color: #0F172A;
          color: #FFFFFF;
          font-size: 0.74rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 16px 20px;
          vertical-align: middle;
          white-space: nowrap;
          border: none;
        }

        .erp-data-table tbody td {
          padding: 16px 20px;
          vertical-align: middle;
          border-bottom: 1px solid #F1F5F9;
        }

        .btn-erp-brand {
          background: #1E5385;
          border: 1px solid #1E5385;
          color: #FFFFFF !important;
          font-weight: 600;
          font-size: 0.88rem;
          border-radius: 8px;
          min-height: 44px;
          padding: 8px 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .btn-erp-brand:hover {
          background: #164069;
        }

        .badge-soft-primary { background-color: #E0F2FE; color: #0369A1; font-weight: 600; padding: 4px 8px; }
        .badge-soft-danger { background-color: #FEE2E2; color: #B91C1C; font-weight: 600; padding: 4px 8px; }
        .badge-soft-success { background-color: #DCFCE7; color: #15803D; font-weight: 600; padding: 4px 8px; }
        .badge-soft-muted { background-color: #F1F5F9; color: #475569; font-weight: 600; padding: 4px 8px; }

        .status-pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
          margin-right: 6px;
        }
        .pulse-active {
          background-color: #10B981;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.25);
        }
        .pulse-inactive {
          background-color: #94A3B8;
        }

        /* ── SECTION 5: Mobile User Card (< 768px) ── */
        .erp-user-mobile-card {
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 14px;
          background: #FFFFFF;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
          margin-bottom: 12px;
        }
        .mobile-action-btn {
          min-height: 42px;
          font-size: 0.84rem;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>

      <div className="erp-container-inner">

        {/* ── SECTION 1: Top Header Banner ── */}
        <div className="erp-header-banner d-flex flex-column flex-md-row justify-content-between align-items-stretch align-items-md-center gap-3">
          <div>
            <div className="d-flex align-items-center flex-wrap gap-2 mb-1">
              <h3 className="fw-bold mb-0 text-dark fs-5">
                Staff Directory &amp; Users
              </h3>
              <span className="badge badge-soft-primary rounded-pill small">
                {metrics.total} Registered
              </span>
            </div>
            <p className="text-muted small mb-0">
              Manage enterprise privileges, departmental structures, and operational credentials.
            </p>
          </div>

          <div className="flex-shrink-0">
            <PermissionGate module="users" action="create">
              <button
                type="button"
                className="btn btn-erp-brand w-100"
                onClick={() => setShowCreateModal(true)}
              >
                <i className="bi bi-person-plus-fill me-2 fs-6"></i>
                <span>Add New User</span>
              </button>
            </PermissionGate>
          </div>
        </div>

        {/* ── SECTION 2: KPI Metrics Cards Grid (2x2 on Mobile, 4 across on Desktop) ── */}
        <div className="row g-2 g-md-3 erp-metrics-grid">
          <div className="col-6 col-lg-3">
            <div className="kpi-card-box">
              <div className="kpi-icon-square bg-primary bg-opacity-10 text-primary">
                <i className="bi bi-people-fill fs-5"></i>
              </div>
              <div className="text-truncate">
                <span className="text-muted small fw-bold d-block text-uppercase mb-0.5 text-truncate" style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}>
                  Total Staff
                </span>
                <h4 className="fw-bold text-dark mb-0 fs-6 fs-md-5">{metrics.total}</h4>
              </div>
            </div>
          </div>

          <div className="col-6 col-lg-3">
            <div className="kpi-card-box">
              <div className="kpi-icon-square bg-success bg-opacity-10 text-success">
                <i className="bi bi-check-circle-fill fs-5"></i>
              </div>
              <div className="text-truncate">
                <span className="text-muted small fw-bold d-block text-uppercase mb-0.5 text-truncate" style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}>
                  Active
                </span>
                <h4 className="fw-bold text-success mb-0 fs-6 fs-md-5">{metrics.active}</h4>
              </div>
            </div>
          </div>

          <div className="col-6 col-lg-3">
            <div className="kpi-card-box">
              <div className="kpi-icon-square bg-secondary bg-opacity-10 text-secondary">
                <i className="bi bi-slash-circle-fill fs-5"></i>
              </div>
              <div className="text-truncate">
                <span className="text-muted small fw-bold d-block text-uppercase mb-0.5 text-truncate" style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}>
                  Suspended
                </span>
                <h4 className="fw-bold text-secondary mb-0 fs-6 fs-md-5">{metrics.inactive}</h4>
              </div>
            </div>
          </div>

          <div className="col-6 col-lg-3">
            <div className="kpi-card-box">
              <div className="kpi-icon-square bg-info bg-opacity-10 text-info">
                <i className="bi bi-shield-lock-fill fs-5"></i>
              </div>
              <div className="text-truncate">
                <span className="text-muted small fw-bold d-block text-uppercase mb-0.5 text-truncate" style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}>
                  Roles
                </span>
                <h4 className="fw-bold text-dark mb-0 fs-6 fs-md-5">{metrics.rolesCount}</h4>
              </div>
            </div>
          </div>
        </div>

        {/* ── SECTION 3: Filter Console Bar ── */}
        <div className="erp-filter-panel">
          <div className="row g-2 g-md-3 align-items-center">
            
            {/* 1. Employee Search & Selection Dropdown */}
            <div className="col-12 col-md-5 col-lg-4" ref={employeeDropdownRef}>
              <div className="position-relative">
                <div className="input-group">
                  <span className="input-group-text bg-white border-end-0 text-muted ps-3 pe-2">
                    <i className="bi bi-search"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control erp-input-field border-start-0 border-end-0 ps-1"
                    placeholder={search ? search : `Search / Select (${users.length})...`}
                    value={search}
                    onFocus={() => setShowEmployeeDropdown(true)}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setShowEmployeeDropdown(true);
                      setPage(1);
                    }}
                  />
                  {search ? (
                    <button
                      className="btn btn-outline-secondary border-start-0 bg-white border-top border-bottom border-end px-3 d-flex align-items-center"
                      type="button"
                      onClick={() => {
                        setSearch('');
                        setShowEmployeeDropdown(false);
                      }}
                    >
                      <i className="bi bi-x-circle-fill text-muted"></i>
                    </button>
                  ) : (
                    <span 
                      className="input-group-text bg-white border-start-0 text-muted px-3 d-flex align-items-center"
                      onClick={() => setShowEmployeeDropdown(!showEmployeeDropdown)}
                      style={{ cursor: 'pointer' }}
                    >
                      <i className="bi bi-chevron-down small"></i>
                    </span>
                  )}
                </div>

                {/* Dropdown Menu Popup */}
                {showEmployeeDropdown && (
                  <div className="employee-dropdown-menu">
                    <div
                      className="dropdown-item-hover fw-semibold text-primary border-bottom"
                      onClick={() => {
                        setSearch('');
                        setShowEmployeeDropdown(false);
                      }}
                    >
                      <div className="d-flex align-items-center gap-2">
                        <i className="bi bi-people-fill"></i>
                        <span>All Employees ({users.length})</span>
                      </div>
                    </div>

                    {dropdownEmployeeList.length > 0 ? (
                      dropdownEmployeeList.map((u) => (
                        <div
                          key={u._id}
                          className="dropdown-item-hover"
                          onClick={() => handleSelectEmployee(u)}
                        >
                          <div className="d-flex align-items-center gap-2 text-truncate">
                            <div
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 6,
                                background: getAvatarGradient(u.name),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#FFF',
                                fontWeight: 700,
                                fontSize: '0.78rem',
                                flexShrink: 0,
                              }}
                            >
                              {getInitials(u.name)}
                            </div>
                            <div className="text-truncate">
                              <div className="fw-semibold text-dark small text-truncate">{u.name}</div>
                              <div className="text-muted small text-truncate" style={{ fontSize: '0.72rem' }}>
                                {u.email}
                              </div>
                            </div>
                          </div>
                          <span className="badge badge-soft-primary small flex-shrink-0 ms-2">
                            {u.roleId?.name || 'Staff'}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-center text-muted small">
                        No employees match "{search}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 2. Role Filter */}
            <div className="col-6 col-md-3 col-lg-3">
              <select
                className="form-select erp-input-field"
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

            {/* 3. Status Filter */}
            <div className="col-6 col-md-2 col-lg-3">
              <select
                className="form-select erp-input-field"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            {/* 4. Reset Trigger */}
            <div className="col-12 col-md-2 text-md-end text-center">
              {(search || selectedRole !== 'ALL' || selectedStatus !== 'ALL') ? (
                <button
                  type="button"
                  className="btn btn-sm btn-link text-decoration-none text-danger fw-semibold px-2 py-1 w-100 w-md-auto"
                  onClick={() => {
                    setSearch('');
                    setSelectedRole('ALL');
                    setSelectedStatus('ALL');
                    setPage(1);
                  }}
                >
                  <i className="bi bi-arrow-counterclockwise me-1"></i>Reset
                </button>
              ) : null}
            </div>

          </div>
        </div>

        {/* ── SECTION 4: Data Table & Mobile Cards ── */}
        <div className="erp-table-card">
          {loading ? (
            <div className="py-5 text-center my-4">
              <LoadingSpinner text="LOADING" subtext="Retrieving staff database..." />
            </div>
          ) : error ? (
            <div className="p-3 p-md-4">
              <div className="alert alert-danger mb-0 rounded-3 d-flex align-items-center gap-2 p-3">
                <i className="bi bi-exclamation-triangle-fill fs-5"></i>
                <div className="small">{error}</div>
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-5 px-3">
              <i className="bi bi-person-x fs-1 text-muted d-block mb-2"></i>
              <h6 className="fw-bold text-dark mb-1">No matching staff accounts found</h6>
              <p className="text-muted small mb-0">Try clearing your filters or checking the search spelling.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View (>= 768px) */}
              <div className="d-none d-md-block table-responsive">
                <table className="table erp-data-table align-middle mb-0">
                  <thead>
                    <tr>
                      <th style={{ width: '28%' }}>Staff Details</th>
                      <th style={{ width: '16%' }}>Role Assigned</th>
                      <th style={{ width: '16%' }}>Dept &amp; Location</th>
                      <th style={{ width: '12%' }}>Base Salary</th>
                      <th style={{ width: '12%' }}>Status</th>
                      <th style={{ width: '8%' }}>Joined</th>
                      <th style={{ width: '8%', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => {
                      const isSuper = u.roleId?.key === 'super_admin';
                      return (
                        <tr key={u._id}>
                          <td>
                            <div className="d-flex align-items-center gap-3">
                              <div
                                style={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: 10,
                                  background: getAvatarGradient(u.name),
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#FFF',
                                  fontWeight: 700,
                                  fontSize: '0.88rem',
                                  flexShrink: 0,
                                }}
                              >
                                {getInitials(u.name)}
                              </div>
                              <div>
                                <div className="fw-bold text-dark text-truncate mb-0.5" style={{ maxWidth: 200 }}>{u.name}</div>
                                <div className="text-muted small text-truncate" style={{ maxWidth: 230, fontSize: '0.78rem' }}>
                                  {u.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span className={`badge rounded-pill ${isSuper ? 'badge-soft-danger' : 'badge-soft-primary'}`}>
                              {u.roleId?.name || 'Unassigned'}
                            </span>
                          </td>

                          <td>
                            <div className="small fw-semibold text-dark mb-0.5">{u.departmentId?.name || 'General'}</div>
                            <div className="text-muted small" style={{ fontSize: '0.76rem' }}>{u.branchId?.name || 'HQ'}</div>
                          </td>

                          <td>
                            <span className="fw-bold text-dark font-monospace" style={{ fontSize: '0.90rem' }}>
                              ₹{Number(u.baseSalary || 0).toLocaleString('en-IN')}
                            </span>
                          </td>

                          <td>
                            <span className={`badge rounded-pill ${u.isActive ? 'badge-soft-success' : 'badge-soft-muted'}`}>
                              <span className={`status-pulse-dot ${u.isActive ? 'pulse-active' : 'pulse-inactive'}`}></span>
                              {u.isActive ? 'Active' : 'Suspended'}
                            </span>
                          </td>

                          <td className="small text-muted text-nowrap">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>

                          <td style={{ textAlign: 'right' }}>
                            <div className="d-inline-flex gap-2">
                              <PermissionGate module="users" action="edit">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-primary p-2"
                                  style={{ width: '34px', height: '34px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                  onClick={() => openEditModal(u)}
                                  disabled={isSuper}
                                  title="Edit"
                                >
                                  <i className="bi bi-pencil"></i>
                                </button>
                                <button
                                  type="button"
                                  className={`btn btn-sm ${u.isActive ? 'btn-outline-warning' : 'btn-outline-success'} p-2`}
                                  style={{ width: '34px', height: '34px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                  onClick={() => handleToggleStatus(u)}
                                  disabled={isSuper}
                                  title={u.isActive ? 'Suspend' : 'Activate'}
                                >
                                  <i className={`bi ${u.isActive ? 'bi-pause-fill' : 'bi-play-fill'}`}></i>
                                </button>
                              </PermissionGate>
                              <PermissionGate module="users" action="delete">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger p-2"
                                  style={{ width: '34px', height: '34px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                  onClick={() => handleDeleteUser(u._id)}
                                  disabled={isSuper}
                                  title="Delete"
                                >
                                  <i className="bi bi-trash"></i>
                                </button>
                              </PermissionGate>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile View Cards (< 768px) */}
              <div className="d-block d-md-none p-2 p-sm-3">
                {filteredUsers.map((u) => {
                  const isSuper = u.roleId?.key === 'super_admin';
                  return (
                    <div className="erp-user-mobile-card" key={u._id}>
                      <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                        <div className="d-flex align-items-center gap-2">
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 8,
                              background: getAvatarGradient(u.name),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#FFF',
                              fontWeight: 700,
                              fontSize: '0.80rem',
                              flexShrink: 0,
                            }}
                          >
                            {getInitials(u.name)}
                          </div>
                          <div className="text-truncate">
                            <div className="fw-bold text-dark lh-sm mb-0.5 text-truncate" style={{ maxWidth: '170px' }}>{u.name}</div>
                            <span className="text-muted small d-block text-truncate" style={{ fontSize: '0.74rem', maxWidth: '170px' }}>{u.email}</span>
                          </div>
                        </div>

                        <span className={`badge rounded-pill ${u.isActive ? 'badge-soft-success' : 'badge-soft-muted'} flex-shrink-0`}>
                          <span className={`status-pulse-dot ${u.isActive ? 'pulse-active' : 'pulse-inactive'}`}></span>
                          {u.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </div>

                      <div className="bg-light p-2.5 rounded-3 my-2.5 small">
                        <div className="row g-2">
                          <div className="col-6">
                            <span className="text-muted d-block small mb-0.5" style={{ fontSize: '0.68rem' }}>ROLE</span>
                            <span className={`badge ${isSuper ? 'badge-soft-danger' : 'badge-soft-primary'}`}>
                              {u.roleId?.name || 'Unassigned'}
                            </span>
                          </div>
                          <div className="col-6">
                            <span className="text-muted d-block small mb-0.5" style={{ fontSize: '0.68rem' }}>BASE SALARY</span>
                            <span className="fw-bold text-dark font-monospace" style={{ fontSize: '0.84rem' }}>
                              ₹{Number(u.baseSalary || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="col-6 pt-1">
                            <span className="text-muted d-block small mb-0.5" style={{ fontSize: '0.68rem' }}>DEPARTMENT</span>
                            <span className="text-dark fw-medium text-truncate d-block small">{u.departmentId?.name || 'General'}</span>
                          </div>
                          <div className="col-6 pt-1">
                            <span className="text-muted d-block small mb-0.5" style={{ fontSize: '0.68rem' }}>PHONE</span>
                            <span className="text-dark fw-medium text-truncate d-block small">{u.phone || '—'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="d-flex gap-2 pt-2 border-top">
                        <PermissionGate module="users" action="edit">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary flex-grow-1 mobile-action-btn"
                            onClick={() => openEditModal(u)}
                            disabled={isSuper}
                          >
                            <i className="bi bi-pencil me-1"></i>Edit
                          </button>
                          <button
                            type="button"
                            className={`btn btn-sm ${u.isActive ? 'btn-outline-warning' : 'btn-outline-success'} flex-grow-1 mobile-action-btn`}
                            onClick={() => handleToggleStatus(u)}
                            disabled={isSuper}
                          >
                            <i className={`bi ${u.isActive ? 'bi-pause-fill' : 'bi-play-fill'} me-1`}></i>
                            {u.isActive ? 'Suspend' : 'Activate'}
                          </button>
                        </PermissionGate>
                        <PermissionGate module="users" action="delete">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger px-3 mobile-action-btn flex-shrink-0"
                            onClick={() => handleDeleteUser(u._id)}
                            disabled={isSuper}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </PermissionGate>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ── SECTION 5: Pagination Bar ── */}
          <div className="p-3 border-top bg-white d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2">
            <div className="text-muted small text-center text-sm-start">
              Showing <span className="fw-semibold text-dark">{filteredUsers.length}</span> staff entries
            </div>
            <Pagination pagination={pagination} onPageChange={(p) => setPage(p)} />
          </div>
        </div>

      </div>

      {/* ── SECTION 6: Modal - Create User ── */}
      <Modal show={showCreateModal} title="Create New User Account" onClose={() => setShowCreateModal(false)}>
        {submitError && <div className="alert alert-danger py-2 px-3 small mb-3">{submitError}</div>}
        <form onSubmit={handleCreateUser} className="row g-2.5 p-2 p-sm-3">
          <div className="col-12">
            <label className="form-label small fw-bold text-muted text-uppercase mb-1" style={{ fontSize: '0.72rem' }}>Full Name *</label>
            <input
              type="text"
              className="form-control erp-input-field"
              placeholder="e.g. Alexander Pierce"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label small fw-bold text-muted text-uppercase mb-1" style={{ fontSize: '0.72rem' }}>Work Email *</label>
            <input
              type="email"
              className="form-control erp-input-field"
              placeholder="user@enterprise.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              autoCapitalize="none"
            />
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label small fw-bold text-muted text-uppercase mb-1" style={{ fontSize: '0.72rem' }}>Phone Number</label>
            <input
              type="tel"
              className="form-control erp-input-field"
              placeholder="+91 98765 43210"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label small fw-bold text-muted text-uppercase mb-1" style={{ fontSize: '0.72rem' }}>Base Salary (₹)</label>
            <input
              type="number"
              className="form-control erp-input-field font-monospace"
              placeholder="e.g. 40000"
              value={formData.baseSalary}
              onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
              min="0"
            />
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label small fw-bold text-muted text-uppercase mb-1" style={{ fontSize: '0.72rem' }}>Temporary Password *</label>
            <input
              type="password"
              className="form-control erp-input-field"
              placeholder="Min 6 characters"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={6}
            />
          </div>

          <div className="col-12">
            <label className="form-label small fw-bold text-muted text-uppercase mb-1" style={{ fontSize: '0.72rem' }}>Assigned System Role *</label>
            <select
              className="form-select erp-input-field"
              value={formData.roleId}
              onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
              required
            >
              <option value="">-- Choose Role --</option>
              {roles.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12 d-flex flex-column-reverse flex-sm-row justify-content-end gap-2 pt-3 mt-2 border-top">
            <button 
              type="button" 
              className="btn btn-light px-4 py-2 w-100 w-sm-auto"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-erp-brand px-4 py-2 w-100 w-sm-auto">
              Create User
            </button>
          </div>
        </form>
      </Modal>

      {/* ── SECTION 7: Modal - Edit User ── */}
      <Modal show={showEditModal} title="Edit User Profile" onClose={() => setShowEditModal(false)}>
        {submitError && <div className="alert alert-danger py-2 px-3 small mb-3">{submitError}</div>}
        <form onSubmit={handleEditUser} className="row g-2.5 p-2 p-sm-3">
          <div className="col-12">
            <label className="form-label small fw-bold text-muted text-uppercase mb-1" style={{ fontSize: '0.72rem' }}>Full Name *</label>
            <input
              type="text"
              className="form-control erp-input-field"
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              required
            />
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label small fw-bold text-muted text-uppercase mb-1" style={{ fontSize: '0.72rem' }}>Work Email *</label>
            <input
              type="email"
              className="form-control erp-input-field"
              value={editFormData.email}
              onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
              required
              autoCapitalize="none"
            />
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label small fw-bold text-muted text-uppercase mb-1" style={{ fontSize: '0.72rem' }}>Phone Number</label>
            <input
              type="tel"
              className="form-control erp-input-field"
              value={editFormData.phone}
              onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
            />
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label small fw-bold text-muted text-uppercase mb-1" style={{ fontSize: '0.72rem' }}>Base Salary (₹)</label>
            <input
              type="number"
              className="form-control erp-input-field font-monospace"
              value={editFormData.baseSalary}
              onChange={(e) => setEditFormData({ ...editFormData, baseSalary: e.target.value })}
              min="0"
            />
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label small fw-bold text-muted text-uppercase mb-1" style={{ fontSize: '0.72rem' }}>Assigned System Role *</label>
            <select
              className="form-select erp-input-field"
              value={editFormData.roleId}
              onChange={(e) => setEditFormData({ ...editFormData, roleId: e.target.value })}
              required
            >
              <option value="">-- Choose Role --</option>
              {roles.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12 d-flex flex-column-reverse flex-sm-row justify-content-end gap-2 pt-3 mt-2 border-top">
            <button 
              type="button" 
              className="btn btn-light px-4 py-2 w-100 w-sm-auto"
              onClick={() => setShowEditModal(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-erp-brand px-4 py-2 w-100 w-sm-auto">
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default UserListPage;