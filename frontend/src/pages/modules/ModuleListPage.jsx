import React, { useEffect, useState, useMemo } from 'react';
import { Layers, Plus, Search, CheckCircle2, ShieldCheck } from 'lucide-react';
import { moduleApi } from '../../api/moduleApi';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/Skeleton';
import Modal from '../../components/common/Modal';
import PermissionGate from '../../components/permissions/PermissionGate';

const ModuleListPage = () => {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', key: '', description: '' });
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [autoKey, setAutoKey] = useState(true);
  const [search, setSearch] = useState('');

  const loadModules = async () => {
    try {
      setLoading(true);
      const res = await moduleApi.getModules();
      setModules(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load modules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModules();
  }, []);

  const metrics = useMemo(() => {
    const total = modules.length;
    const active = modules.filter((m) => m.isActive).length;
    const inactive = total - active;
    const totalActions = modules.reduce((acc, m) => acc + (m.availableActions?.length || 0), 0);
    return { total, active, inactive, totalActions };
  }, [modules]);

  const filteredModules = useMemo(() => {
    if (!search.trim()) return modules;
    const q = search.toLowerCase();
    return modules.filter(
      (m) =>
        m.name?.toLowerCase().includes(q) ||
        m.key?.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q)
    );
  }, [modules, search]);

  const handleNameChange = (e) => {
    const val = e.target.value;
    const slugKey = val.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    setFormData((prev) => ({
      ...prev,
      name: val,
      key: autoKey ? slugKey : prev.key,
    }));
  };

  const handleKeyChange = (e) => {
    setAutoKey(false);
    setFormData((prev) => ({
      ...prev,
      key: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    try {
      await moduleApi.createModule(formData);
      setShowModal(false);
      setFormData({ name: '', key: '', description: '' });
      loadModules();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to create module');
    }
  };

  return (
    <div className="erp-fade-in pb-4">
      {/* ── Page Header ── */}
      <PageHeader
        title="Enterprise System Modules"
        subtitle="Catalog and schema registry of all governed resources, operational units, and permitted actions"
        breadcrumbs={[{ label: 'Organization' }, { label: 'System Modules' }]}
        actions={
          <PermissionGate module="modules" action="create">
            <button
              type="button"
              className="erp-btn erp-btn-primary"
              onClick={() => {
                setModalError('');
                setShowModal(true);
              }}
            >
              <Plus size={16} /> Register Module
            </button>
          </PermissionGate>
        }
      />

      {error && (
        <div className="alert alert-danger small py-2 px-3 mb-4 border-0 shadow-xs">
          {error}
        </div>
      )}

      {/* ── KPI Row ── */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Registered Modules"
            value={metrics.total}
            subtitle="Core system domains"
            icon={Layers}
            variant="primary"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Active Modules"
            value={metrics.active}
            subtitle="Operational modules"
            icon={CheckCircle2}
            variant="success"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Action Schema Endpoints"
            value={metrics.totalActions}
            subtitle="Granular RBAC actions"
            icon={ShieldCheck}
            variant="purple"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Inactive Modules"
            value={metrics.inactive}
            subtitle="Decommissioned or draft"
            icon={Layers}
            variant="default"
          />
        </div>
      </div>

      {/* ── Filter Bar ── */}
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
                placeholder="Search modules by name, key, or capabilities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="col-12 col-md-6 text-md-end text-muted small">
            <span>Showing {filteredModules.length} of {modules.length} registered modules</span>
          </div>
        </div>
      </div>

      {/* ── Modules Table ── */}
      {loading ? (
        <TableSkeleton rows={6} cols={4} />
      ) : filteredModules.length === 0 ? (
        <div className="erp-card p-4">
          <EmptyState
            icon={Layers}
            title="No modules match your query"
            description="No system modules match your search filter."
            actionLabel="Reset Search"
            onAction={() => setSearch('')}
          />
        </div>
      ) : (
        <div className="erp-table-container">
          <div className="table-responsive">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Module Name & Slug</th>
                  <th>Description</th>
                  <th>Available Actions & Scopes</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredModules.map((m) => (
                  <tr key={m._id || m.key}>
                    <td>
                      <div className="d-flex align-items-center gap-2.5">
                        <div
                          className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
                          style={{
                            width: '32px',
                            height: '32px',
                            backgroundColor: 'var(--erp-primary-light)',
                            color: 'var(--erp-primary)',
                          }}
                        >
                          <Layers size={16} />
                        </div>
                        <div>
                          <span className="fw-semibold d-block" style={{ color: 'var(--erp-text-main)' }}>
                            {m.name}
                          </span>
                          <span className="font-monospace text-muted" style={{ fontSize: '0.72rem' }}>
                            {m.key}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="text-muted small" style={{ maxWidth: '340px' }}>
                        {m.description || 'Enterprise platform module'}
                      </div>
                    </td>

                    <td>
                      <div className="d-flex flex-wrap gap-1" style={{ maxWidth: '420px' }}>
                        {m.availableActions?.map((act) => (
                          <span
                            key={act.key}
                            className={`erp-badge ${act.requiresScope ? 'erp-badge-purple' : 'erp-badge-neutral'}`}
                            style={{ fontSize: '0.675rem' }}
                            title={act.requiresScope ? 'Requires OWN/TEAM/DEPT/BRANCH/ALL scope' : 'Global action'}
                          >
                            {act.name}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td>
                      <StatusBadge status={m.isActive ? 'Active' : 'Inactive'} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Register Module Modal ── */}
      <Modal
        show={showModal}
        title="Register New System Module"
        onClose={() => setShowModal(false)}
        size="md"
        icon={Layers}
      >
        <form onSubmit={handleSubmit}>
          {modalError && (
            <div className="alert alert-danger small py-2 px-3 mb-3 border-0">
              {modalError}
            </div>
          )}

          <div className="mb-3">
            <label className="erp-label">Module Title *</label>
            <input
              type="text"
              className="erp-input"
              placeholder="e.g. Asset Management"
              value={formData.name}
              onChange={handleNameChange}
              required
            />
          </div>

          <div className="mb-3">
            <label className="erp-label">Module Key (Unique Identifier) *</label>
            <input
              type="text"
              className="erp-input font-monospace"
              placeholder="e.g. assets"
              value={formData.key}
              onChange={handleKeyChange}
              required
            />
          </div>

          <div className="mb-3">
            <label className="erp-label">Description</label>
            <textarea
              className="erp-textarea"
              rows={2}
              placeholder="System module purpose and governed data sets..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
            <button
              type="button"
              className="erp-btn erp-btn-secondary"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </button>
            <button type="submit" className="erp-btn erp-btn-primary">
              Register Module
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ModuleListPage;
