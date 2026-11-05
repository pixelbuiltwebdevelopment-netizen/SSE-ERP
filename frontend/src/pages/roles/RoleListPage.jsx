import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldAlert,
  Plus,
  Search,
  Edit2,
  Trash2,
  Lock,
  Layers,
} from 'lucide-react';
import { fetchRoles, roleCreated, roleUpdated, roleDeleted } from '../../store/slices/roleSlice';
import { roleApi } from '../../api/roleApi';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/Skeleton';
import PermissionGate from '../../components/permissions/PermissionGate';
import { useSocket } from '../../components/providers/SocketProvider';

const RoleListPage = () => {
  const dispatch = useDispatch();
  const socket = useSocket();
  const navigate = useNavigate();
  const { roles = [], loading } = useSelector((state) => state.roles || {});

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');

  useEffect(() => {
    dispatch(fetchRoles());
  }, [dispatch]);

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

  // Filtered Roles
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

      return matchesSearch && matchesType;
    });
  }, [roles, search, selectedType]);

  return (
    <div className="erp-fade-in pb-4">
      {/* ── Page Header ── */}
      <PageHeader
        title="Roles & Dynamic Permissions"
        subtitle="Configure action-level rights and granular data scopes across organizational units"
        breadcrumbs={[{ label: 'Organization' }, { label: 'Roles' }]}
        actions={
          <PermissionGate module="roles" action="create">
            <Link to="/roles/create" className="erp-btn erp-btn-primary">
              <Plus size={16} /> Create New Role
            </Link>
          </PermissionGate>
        }
      />

      {/* ── KPI Row ── */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Total Configured Roles"
            value={metrics.total}
            subtitle="Access privilege profiles"
            icon={ShieldCheck}
            variant="primary"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="System Roles"
            value={metrics.systemCount}
            subtitle="Immutable core security"
            icon={Lock}
            variant="purple"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Custom Defined Roles"
            value={metrics.customCount}
            subtitle="Business custom scopes"
            icon={ShieldAlert}
            variant="success"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Governed Modules"
            value={metrics.moduleCount}
            subtitle="Protected resources"
            icon={Layers}
            variant="default"
          />
        </div>
      </div>

      {/* ── Filters Bar ── */}
      <div className="erp-card p-3 mb-4">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-6">
            <div className="erp-search-group">
              <span className="erp-search-icon">
                <Search size={16} />
              </span>
              <input
                type="text"
                className="erp-input erp-search-input"
                placeholder="Search roles by title, key, or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="col-12 col-md-3">
            <select
              className="erp-select"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="ALL">All Role Types ({roles.length})</option>
              <option value="SYSTEM">System Roles Only</option>
              <option value="CUSTOM">Custom Roles Only</option>
            </select>
          </div>

          <div className="col-12 col-md-3 text-md-end text-muted small">
            <span>Showing {filteredRoles.length} of {roles.length} roles</span>
          </div>
        </div>
      </div>

      {/* ── Roles Table ── */}
      {loading ? (
        <TableSkeleton rows={4} cols={5} />
      ) : filteredRoles.length === 0 ? (
        <div className="erp-card p-4">
          <EmptyState
            icon={ShieldCheck}
            title="No matching roles found"
            description="No roles match your search criteria. Try modifying your filter keywords."
            actionLabel="Reset Search"
            onAction={() => {
              setSearch('');
              setSelectedType('ALL');
            }}
          />
        </div>
      ) : (
        <div className="erp-table-container">
          <div className="table-responsive">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Role Name & Key</th>
                  <th>Description</th>
                  <th>Permission Scope Count</th>
                  <th>Type</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoles.map((r) => {
                  const allowedPermsCount =
                    r.permissions?.reduce((acc, p) => {
                      if (!p.actions) return acc;
                      return (
                        acc +
                        Object.values(p.actions).filter((a) => a && a.allowed).length
                      );
                    }, 0) || 0;

                  return (
                    <tr key={r._id}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div
                            className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
                            style={{
                              width: '32px',
                              height: '32px',
                              backgroundColor: r.isSystemRole
                                ? 'var(--erp-purple-bg)'
                                : 'var(--erp-primary-light)',
                              color: r.isSystemRole
                                ? 'var(--erp-purple)'
                                : 'var(--erp-primary)',
                            }}
                          >
                            <ShieldCheck size={16} />
                          </div>
                          <div>
                            <span className="fw-semibold d-block" style={{ color: 'var(--erp-text-main)' }}>
                              {r.name}
                            </span>
                            <span className="font-monospace text-muted" style={{ fontSize: '0.72rem' }}>
                              {r.key}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="text-muted text-truncate" style={{ maxWidth: '320px', fontSize: '0.82rem' }}>
                          {r.description || 'Enterprise role definition'}
                        </div>
                      </td>

                      <td>
                        <span className="erp-badge erp-badge-info">
                          {allowedPermsCount} Active Action Rights
                        </span>
                      </td>

                      <td>
                        {r.isSystemRole ? (
                          <StatusBadge status="System Role" size="sm" />
                        ) : (
                          <StatusBadge status="Custom Role" size="sm" />
                        )}
                      </td>

                      <td className="text-end">
                        <div className="d-inline-flex align-items-center gap-1">
                          <PermissionGate module="roles" action="edit">
                            <Link
                              to={`/roles/${r._id}/edit`}
                              className="erp-btn erp-btn-secondary erp-btn-sm p-1.5"
                              title="Edit Permission Matrix"
                            >
                              <Edit2 size={14} />
                            </Link>
                          </PermissionGate>

                          {!r.isSystemRole && (
                            <PermissionGate module="roles" action="delete">
                              <button
                                type="button"
                                className="erp-btn erp-btn-danger-outline erp-btn-sm p-1.5"
                                onClick={() => handleDeleteRole(r._id, r.name)}
                                title="Delete Custom Role"
                              >
                                <Trash2 size={14} />
                              </button>
                            </PermissionGate>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleListPage;
