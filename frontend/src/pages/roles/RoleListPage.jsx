import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { fetchRoles, roleCreated, roleUpdated, roleDeleted } from '../../store/slices/roleSlice';
import { roleApi } from '../../api/roleApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PermissionGate from '../../components/permissions/PermissionGate';
import { useSocket } from '../../components/providers/SocketProvider';

const RoleListPage = () => {
  const dispatch = useDispatch();
  const socket = useSocket();
  const navigate = useNavigate();
  const { roles = [], loading, error } = useSelector((state) => state.roles || {});

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('ALL'); // ALL | SYSTEM | CUSTOM
  const [selectedModule, setSelectedModule] = useState('ALL'); // ALL | moduleName

  // Dropdown Controller
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const roleDropdownRef = useRef(null);

  useEffect(() => {
    dispatch(fetchRoles());
  }, [dispatch]);

  // Click outside to close Role Dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target)) {
        setShowRoleDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Real-time socket updates
  useEffect(() => {
    if (!socket) return;

    const handleRoleCreated = (role) => dispatch(roleCreated(role));
    const handleRoleUpdated = (role) => dispatch(roleUpdated(role));
    const handleRoleDeleted = (role) => dispatch(roleDeleted(role));

    socket.on('role_created', handleRoleCreated);
    socket.on('role_updated', handleRoleUpdated);
    socket.on('role_deleted', handleRoleDeleted);

    return () => {
      socket.off('role_created', handleRoleCreated);
      socket.off('role_updated', handleRoleUpdated);
      socket.off('role_deleted', handleRoleDeleted);
    };
  }, [socket, dispatch]);

  const handleDeleteRole = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete role '${name}'?`)) return;
    try {
      await roleApi.deleteRole(id);
      dispatch(fetchRoles());
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete role');
    }
  };

  // Live KPI Summary
  const metrics = useMemo(() => {
    const total = roles.length;
    const systemCount = roles.filter((r) => r.isSystemRole).length;
    const customCount = total - systemCount;
    const allModules = new Set();
    roles.forEach((r) => r.permissions?.forEach((p) => p.module && allModules.add(p.module)));
    return { total, systemCount, customCount, moduleCount: allModules.size };
  }, [roles]);

  // Distinct list of modules discovered from role permissions
  const availableModules = useMemo(() => {
    const moduleSet = new Set();
    roles.forEach((r) => {
      r.permissions?.forEach((p) => {
        if (p.module) moduleSet.add(p.module);
      });
    });
    return Array.from(moduleSet).sort();
  }, [roles]);

  // Filtered dropdown list (for the dropdown popup)
  const dropdownRoleList = useMemo(() => {
    if (!search || search.trim() === '') return roles;
    const q = search.toLowerCase().trim();
    return roles.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        r.key?.toLowerCase().includes(q)
    );
  }, [roles, search]);

  // Main list filter based on Search, Role Type, and Module
  const filteredRoles = useMemo(() => {
    return roles.filter((r) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.name?.toLowerCase().includes(q) ||
        r.key?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q);

      const matchesType =
        selectedType === 'ALL' ||
        (selectedType === 'SYSTEM' && r.isSystemRole) ||
        (selectedType === 'CUSTOM' && !r.isSystemRole);

      const matchesModule =
        selectedModule === 'ALL' ||
        r.permissions?.some((p) => p.module === selectedModule);

      return matchesSearch && matchesType && matchesModule;
    });
  }, [roles, search, selectedType, selectedModule]);

  const handleSelectRoleFromDropdown = (role) => {
    setSearch(role.name);
    setShowRoleDropdown(false);
  };

  const resetAllFilters = () => {
    setSearch('');
    setSelectedType('ALL');
    setSelectedModule('ALL');
    setShowRoleDropdown(false);
  };

  const hasActiveFilters = search || selectedType !== 'ALL' || selectedModule !== 'ALL';

  return (
    <div className="erp-roles-wrapper">
      <style>{`
        @import url("https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css");

        html, body {
          overflow-x: hidden !important;
          max-width: 100vw !important;
          margin: 0;
          padding: 0;
        }

        .erp-roles-wrapper {
          background-color: #F8FAFC;
          min-height: 100vh;
          width: 100%;
          padding: 12px 10px 48px;
          box-sizing: border-box;
          color: #1E293B;
        }
        @media (min-width: 576px) {
          .erp-roles-wrapper {
            padding: 18px 16px 48px;
          }
        }
        @media (min-width: 768px) {
          .erp-roles-wrapper {
            padding: 28px 32px 64px;
          }
        }

        .erp-container-inner {
          max-width: 1440px;
          margin: 0 auto;
        }

        /* ── SECTION 1: Banner ── */
        .erp-header-banner {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 16px 14px;
          margin-bottom: 12px;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
        }
        @media (min-width: 768px) {
          .erp-header-banner {
            border-radius: 14px;
            padding: 22px 26px;
            margin-bottom: 20px;
          }
        }

        .btn-erp-brand {
          background: #1E5385;
          border: 1px solid #1E5385;
          color: #FFFFFF !important;
          font-weight: 600;
          font-size: 0.88rem;
          border-radius: 8px;
          min-height: 44px;
          padding: 8px 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          white-space: nowrap;
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .btn-erp-brand:hover {
          background: #164069;
          transform: translateY(-1px);
        }

        /* ── SECTION 2: KPI Metrics ── */
        .erp-metrics-grid {
          margin-bottom: 12px;
        }
        @media (min-width: 768px) {
          .erp-metrics-grid {
            margin-bottom: 20px;
          }
        }

        .kpi-card-box {
          border-radius: 10px;
          border: 1px solid #E2E8F0;
          background: #FFFFFF;
          padding: 10px 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          height: 100%;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
        }
        @media (min-width: 768px) {
          .kpi-card-box {
            border-radius: 12px;
            padding: 16px 18px;
            gap: 14px;
          }
        }

        .kpi-icon-square {
          width: 38px;
          height: 38px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        /* ── SECTION 3: Filter Console Bar ── */
        .erp-filter-panel {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 12px;
          margin-bottom: 14px;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
          position: relative;
        }

        /* Unified Single-Border Search Box (Fixes broken top border seam) */
        .erp-search-unified {
          display: flex;
          align-items: center;
          background: #FFFFFF;
          border: 1px solid #CBD5E1;
          border-radius: 8px;
          min-height: 44px;
          padding: 0 8px 0 12px;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .erp-search-unified:focus-within {
          border-color: #0284C7;
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
        }
        .erp-search-unified input {
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
          background: transparent !important;
          width: 100%;
          font-size: 14px;
          color: #1E293B;
          padding: 8px 6px;
        }
        .erp-search-unified input::placeholder {
          color: #64748B;
          font-size: 13.5px;
        }

        /* Fixes the text & chevron collision bug */
        .erp-select-dropdown {
          border-radius: 8px;
          border: 1px solid #CBD5E1;
          background-color: #FFFFFF;
          font-size: 13px !important;
          color: #1E293B;
          font-weight: 500;
          min-height: 44px;
          width: 100%;
          /* 32px right padding gives plenty of room for the chevron */
          padding: 8px 32px 8px 10px !important; 
          background-position: right 10px center !important;
          background-size: 14px 10px !important;
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
          transition: border-color 0.15s ease;
        }
        .erp-select-dropdown:focus {
          border-color: #0284C7;
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
          outline: none;
        }

        /* ── Dropdown Select Popup ── */
        .role-dropdown-menu {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          background: #FFFFFF;
          border: 1px solid #CBD5E1;
          border-radius: 10px;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14);
          z-index: 1050;
          max-height: 250px;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }
        .dropdown-item-hover {
          padding: 11px 14px;
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

        /* ── SECTION 4: Role Cards ── */
        .erp-role-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
          box-shadow: 0 1px 4px rgba(15, 23, 42, 0.04);
        }
        .role-card-header {
          padding: 12px 14px;
          border-bottom: 1px solid #F1F5F9;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
        }
        .role-card-body {
          padding: 12px 14px;
          flex: 1;
        }
        .role-card-footer {
          padding: 10px 14px;
          background-color: #FAFCFE;
          border-top: 1px solid #F1F5F9;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        @media (min-width: 576px) {
          .role-card-footer {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }
        }

        /* Badges */
        .badge-system {
          background-color: #FEE2E2;
          color: #DC2626;
          font-weight: 600;
          font-size: 0.68rem;
          padding: 3px 8px;
          border-radius: 20px;
          white-space: nowrap;
        }
        .badge-custom {
          background-color: #DCFCE7;
          color: #15803D;
          font-weight: 600;
          font-size: 0.68rem;
          padding: 3px 8px;
          border-radius: 20px;
          white-space: nowrap;
        }
        .badge-module-pill {
          background-color: #F8FAFC;
          color: #334155;
          border: 1px solid #E2E8F0;
          font-size: 0.72rem;
          padding: 3px 7px;
          border-radius: 6px;
          font-weight: 500;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .btn-action-edit {
          color: #1E5385;
          border: 1px solid #1E5385;
          background-color: transparent;
          font-weight: 600;
          font-size: 0.84rem;
          min-height: 40px;
          padding: 6px 12px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          flex-grow: 1;
        }
        .btn-action-delete {
          color: #DC2626;
          border: 1px solid #DC2626;
          background-color: transparent;
          width: 44px;
          min-height: 40px;
          padding: 0;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>

      <div className="erp-container-inner">

        {/* ── SECTION 1: Top Header Banner ── */}
        <div className="erp-header-banner d-flex flex-column flex-md-row justify-content-between align-items-stretch align-items-md-center gap-2.5">
          <div>
            <div className="d-flex align-items-center flex-wrap gap-2 mb-1">
              <h3 className="fw-bold mb-0 text-dark fs-5">
                Role &amp; Permission Matrix
              </h3>
              <span
                className="badge rounded-pill small"
                style={{ backgroundColor: '#E0F2FE', color: '#0369A1', fontWeight: 600, padding: '4px 10px' }}
              >
                {metrics.total} Configured
              </span>
            </div>
            <p className="text-muted small mb-0" style={{ fontSize: '0.80rem' }}>
              Configure dynamic authorization rights and functional privileges across ERP modules.
            </p>
          </div>

          <div className="flex-shrink-0 mt-1 mt-md-0">
            <PermissionGate module="roles" action="create">
              <Link to="/roles/create" className="btn-erp-brand w-100">
                <i className="bi bi-shield-plus fs-6"></i>
                <span>Create New Role</span>
              </Link>
            </PermissionGate>
          </div>
        </div>

        {/* ── SECTION 2: KPI Metrics Cards (Wrap text cleanly, NO truncation clipping) ── */}
        <div className="row g-2 g-md-3 erp-metrics-grid">
          <div className="col-6 col-lg-3">
            <div className="kpi-card-box">
              <div className="kpi-icon-square" style={{ backgroundColor: 'rgba(30, 83, 133, 0.1)', color: '#1E5385' }}>
                <i className="bi bi-shield-lock-fill fs-5"></i>
              </div>
              <div>
                <span className="text-muted fw-bold d-block text-uppercase" style={{ fontSize: '0.64rem', letterSpacing: '0.4px', lineHeight: 1.1 }}>
                  Total Roles
                </span>
                <h4 className="fw-bold text-dark mb-0 fs-6 mt-1">{metrics.total}</h4>
              </div>
            </div>
          </div>

          <div className="col-6 col-lg-3">
            <div className="kpi-card-box">
              <div className="kpi-icon-square" style={{ backgroundColor: 'rgba(220, 38, 38, 0.1)', color: '#DC2626' }}>
                <i className="bi bi-lock-fill fs-5"></i>
              </div>
              <div>
                {/* Fixed: Wraps cleanly on 2 lines instead of "SYSTEM GUAR..." */}
                <span className="text-muted fw-bold d-block text-uppercase" style={{ fontSize: '0.64rem', letterSpacing: '0.4px', lineHeight: 1.1 }}>
                  System Guarded
                </span>
                <h4 className="fw-bold text-danger mb-0 fs-6 mt-1">{metrics.systemCount}</h4>
              </div>
            </div>
          </div>

          <div className="col-6 col-lg-3">
            <div className="kpi-card-box">
              <div className="kpi-icon-square" style={{ backgroundColor: 'rgba(22, 163, 74, 0.1)', color: '#15803D' }}>
                <i className="bi bi-person-gear fs-5"></i>
              </div>
              <div>
                <span className="text-muted fw-bold d-block text-uppercase" style={{ fontSize: '0.64rem', letterSpacing: '0.4px', lineHeight: 1.1 }}>
                  Custom Roles
                </span>
                <h4 className="fw-bold text-success mb-0 fs-6 mt-1">{metrics.customCount}</h4>
              </div>
            </div>
          </div>

          <div className="col-6 col-lg-3">
            <div className="kpi-card-box">
              <div className="kpi-icon-square" style={{ backgroundColor: 'rgba(2, 132, 199, 0.1)', color: '#0284C7' }}>
                <i className="bi bi-grid-fill fs-5"></i>
              </div>
              <div>
                <span className="text-muted fw-bold d-block text-uppercase" style={{ fontSize: '0.64rem', letterSpacing: '0.4px', lineHeight: 1.1 }}>
                  Modules
                </span>
                <h4 className="fw-bold text-dark mb-0 fs-6 mt-1">{metrics.moduleCount}</h4>
              </div>
            </div>
          </div>
        </div>

        {/* ── SECTION 3: Filter Console Bar (Clean Border & Separated Chevrons) ── */}
        <div className="erp-filter-panel">
          <div className="row g-2 align-items-center">

            {/* 1. Seamless Search Box */}
            <div className="col-12 col-md-5 col-lg-4" ref={roleDropdownRef}>
              <div className="position-relative">
                <div className="erp-search-unified">
                  <i className="bi bi-search text-muted me-1"></i>
                  <input
                    type="text"
                    placeholder={`Select or search role (${roles.length})...`}
                    value={search}
                    onFocus={() => setShowRoleDropdown(true)}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setShowRoleDropdown(true);
                    }}
                  />
                  {search ? (
                    <button
                      type="button"
                      className="btn btn-sm p-1 text-muted border-0 shadow-none d-flex align-items-center"
                      onClick={() => {
                        setSearch('');
                        setShowRoleDropdown(false);
                      }}
                    >
                      <i className="bi bi-x-circle-fill"></i>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-sm p-1 text-muted border-0 shadow-none d-flex align-items-center"
                      onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                    >
                      <i className={`bi ${showRoleDropdown ? 'bi-chevron-up' : 'bi-chevron-down'} small`}></i>
                    </button>
                  )}
                </div>

                {/* Dropdown Popup */}
                {showRoleDropdown && (
                  <div className="role-dropdown-menu">
                    <div
                      className="dropdown-item-hover fw-semibold text-primary border-bottom"
                      onClick={() => {
                        setSearch('');
                        setShowRoleDropdown(false);
                      }}
                    >
                      <div className="d-flex align-items-center gap-2">
                        <i className="bi bi-shield-fill"></i>
                        <span>All Roles ({roles.length})</span>
                      </div>
                    </div>

                    {dropdownRoleList.length > 0 ? (
                      dropdownRoleList.map((r) => (
                        <div
                          key={r._id}
                          className="dropdown-item-hover"
                          onClick={() => handleSelectRoleFromDropdown(r)}
                        >
                          <div className="d-flex align-items-center gap-2 text-truncate">
                            <i className={`bi ${r.isSystemRole ? 'bi-shield-shaded text-danger' : 'bi-shield-check text-primary'} fs-6`}></i>
                            <div className="text-truncate">
                              <div className="fw-semibold text-dark small text-truncate">{r.name}</div>
                              <code className="text-muted small" style={{ fontSize: '0.70rem' }}>{r.key}</code>
                            </div>
                          </div>
                          <span className={`${r.isSystemRole ? 'badge-system' : 'badge-custom'} ms-2`}>
                            {r.isSystemRole ? 'System' : 'Custom'}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-center text-muted small">
                        No roles match "{search}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 2. Role Type Filter (Proper padding prevents arrow collision) */}
            <div className="col-6 col-md-3 col-lg-3">
              <select
                className="form-select erp-select-dropdown"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="ALL">All Types ({roles.length})</option>
                <option value="SYSTEM">System Guarded</option>
                <option value="CUSTOM">Custom Roles</option>
              </select>
            </div>

            {/* 3. ERP Module Filter (Proper padding prevents arrow collision) */}
            <div className="col-6 col-md-3 col-lg-3">
              <select
                className="form-select erp-select-dropdown"
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
              >
                <option value="ALL">All Modules ({availableModules.length})</option>
                {availableModules.map((mod) => (
                  <option key={mod} value={mod}>
                    {mod.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Reset Filters Button */}
            {hasActiveFilters && (
              <div className="col-12 col-md-1 col-lg-2 text-md-end text-center mt-1 mt-md-0">
                <button
                  type="button"
                  className="btn btn-sm btn-link text-decoration-none text-danger fw-semibold px-2 py-1 w-100 w-md-auto d-inline-flex align-items-center justify-content-center gap-1"
                  onClick={resetAllFilters}
                >
                  <i className="bi bi-arrow-counterclockwise"></i>
                  <span>Reset</span>
                </button>
              </div>
            )}

          </div>
        </div>

        {/* ── SECTION 4: Role Cards Grid ── */}
        {loading ? (
          <div className="py-5 text-center my-3">
            <LoadingSpinner text="LOADING" subtext="Loading roles &amp; permissions matrix..." />
          </div>
        ) : error ? (
          <div className="p-3 bg-white rounded-3 border border-danger mb-3">
            <div className="d-flex align-items-center gap-2 text-danger small">
              <i className="bi bi-exclamation-triangle-fill fs-5"></i>
              <div>{error}</div>
            </div>
          </div>
        ) : filteredRoles.length === 0 ? (
          <div className="erp-role-card p-4 text-center my-2 bg-white">
            <i className="bi bi-shield-x fs-1 mb-2 d-block text-muted"></i>
            <h6 className="fw-bold mb-1 text-dark">No roles match your criteria</h6>
            <p className="small mb-3 text-muted">Try clearing your filters or create a new authorization role.</p>
            {hasActiveFilters && (
              <button className="btn btn-sm btn-outline-secondary px-3" onClick={resetAllFilters}>
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="row g-2.5 g-md-3 g-lg-4">
            {filteredRoles.map((r) => (
              <div className="col-12 col-md-6 col-lg-4" key={r._id}>
                <div className="erp-role-card">
                  {/* Card Header */}
                  <div className="role-card-header">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <div
                          className="rounded-2 d-inline-flex align-items-center justify-content-center"
                          style={{
                            backgroundColor: r.isSystemRole ? 'rgba(220, 38, 38, 0.1)' : 'rgba(30, 83, 133, 0.1)',
                            color: r.isSystemRole ? '#DC2626' : '#1E5385',
                            width: 30,
                            height: 30,
                            flexShrink: 0,
                          }}
                        >
                          <i className={`bi ${r.isSystemRole ? 'bi-shield-shaded' : 'bi-shield-check'} fs-6`}></i>
                        </div>
                        <h5 className="fw-bold mb-0 text-truncate text-dark" style={{ fontSize: '0.96rem' }}>
                          {r.name}
                        </h5>
                      </div>
                      <code
                        className="small px-2 py-0.5 rounded font-monospace"
                        style={{ backgroundColor: '#F1F5F9', color: '#0369A1', fontSize: '0.72rem' }}
                      >
                        {r.key}
                      </code>
                    </div>

                    <span className={r.isSystemRole ? 'badge-system' : 'badge-custom'}>
                      {r.isSystemRole ? 'System' : 'Custom'}
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="role-card-body">
                    <p className="small mb-2 text-muted" style={{ minHeight: '34px', lineHeight: '1.45', fontSize: '0.78rem' }}>
                      {r.description || 'Standard access permissions configured across specific ERP operational modules.'}
                    </p>

                    <div className="d-flex justify-content-between align-items-center mb-1.5">
                      <span className="small fw-bold text-uppercase text-dark" style={{ fontSize: '0.66rem', letterSpacing: '0.04em' }}>
                        Configured Modules
                      </span>
                      <span className="badge rounded-pill" style={{ backgroundColor: '#F1F5F9', color: '#64748B', fontSize: '0.66rem' }}>
                        {r.permissions?.length || 0} active
                      </span>
                    </div>

                    {/* Modules Pill Grid */}
                    <div className="d-flex flex-wrap gap-1" style={{ minHeight: '40px' }}>
                      {r.permissions && r.permissions.length > 0 ? (
                        r.permissions.map((p) => (
                          <span key={p.module} className="badge-module-pill">
                            <i className="bi bi-check2 text-success"></i>
                            <span>{p.module}</span>
                          </span>
                        ))
                      ) : (
                        <span className="small fst-italic text-muted" style={{ fontSize: '0.72rem' }}>
                          No specific modules attached.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Footer with Mobile Actions */}
                  <div className="role-card-footer">
                    <div className="role-date-badge">
                      <i className="bi bi-calendar3"></i>
                      <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>

                    <div className="d-flex align-items-center gap-2 w-100 w-sm-auto">
                      <PermissionGate module="roles" action="edit">
                        <button
                          className="btn-action-edit"
                          onClick={() => navigate(`/roles/${r._id}/edit`)}
                          title="Configure Module Matrix"
                        >
                          <i className="bi bi-sliders"></i>
                          <span>Matrix</span>
                        </button>
                      </PermissionGate>

                      {!r.isSystemRole && (
                        <PermissionGate module="roles" action="delete">
                          <button
                            className="btn-action-delete"
                            onClick={() => handleDeleteRole(r._id, r.name)}
                            title="Delete Custom Role"
                          >
                            <i className="bi bi-trash3"></i>
                          </button>
                        </PermissionGate>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RoleListPage;