import React, { useEffect, useState, useMemo } from 'react';
import { moduleApi } from '../../api/moduleApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
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

  // Live KPI Calculations
  const metrics = useMemo(() => {
    const total = modules.length;
    const active = modules.filter((m) => m.isActive).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [modules]);

  // Client-side quick filter
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
    const nameVal = e.target.value;
    const slugKey = nameVal.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

    setFormData((prev) => ({
      ...prev,
      name: nameVal,
      key: autoKey ? slugKey : prev.key,
    }));
  };

  const handleKeyChange = (e) => {
    setAutoKey(false);
    const keyVal = e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    setFormData((prev) => ({
      ...prev,
      key: keyVal,
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setModalError('');
    try {
      await moduleApi.createModule(formData);
      setShowModal(false);
      setFormData({ name: '', key: '', description: '' });
      setAutoKey(true);
      loadModules();
    } catch (err) {
      const fieldErrors = err.response?.data?.errors;
      if (fieldErrors && fieldErrors.length > 0) {
        setModalError(fieldErrors.map((f) => `${f.field}: ${f.message}`).join(', '));
      } else {
        setModalError(err.response?.data?.message || 'Failed to create module');
      }
    }
  };

  const handleToggleStatus = async (m) => {
    try {
      await moduleApi.updateModuleStatus(m._id, !m.isActive);
      loadModules();
    } catch (err) {
      alert(err.response?.data?.message || 'Status toggle failed');
    }
  };

  return (
    <div className="erp-modules-wrapper">
      {/* Strict Theme Styles & Keyframe Animations */}
      <style>{`
        :root {
          --erp-primary: #087FF5;
          --erp-navy: #071A33;
          --erp-royal: #0057B8;
          --erp-hover: #1D4ED8;
          --erp-silver: #C5CED8;
          --erp-bg: #F4F7FB;
          --erp-card: #FFFFFF;
          --erp-text: #1E293B;
          --erp-muted: #64748B;
          --erp-border: #E2E8F0;
          --erp-success: #16A34A;
          --erp-warning: #D97706;
          --erp-error: #DC2626;
        }

        /* Stop window horizontal overflow */
        html, body {
          overflow-x: hidden !important;
          max-width: 100vw !important;
        }

        .erp-modules-wrapper {
          background-color: var(--erp-bg);
          min-height: 100vh;
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
          padding: 1.25rem 1rem 2.5rem;
          color: var(--erp-text);
          box-sizing: border-box;
        }

        @media (min-width: 768px) {
          .erp-modules-wrapper {
            padding: 1.5rem 1.5rem 3rem;
          }
        }

        /* Responsive Header Grid (Never stretches across screen) */
        .erp-header-grid {
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 1.25rem;
          margin-bottom: 1.5rem;
          width: 100%;
        }

        @media (max-width: 640px) {
          .erp-header-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
        }

        /* Brand Action Button */
        .btn-erp-brand {
          background-color: var(--erp-primary);
          border: 1px solid var(--erp-primary);
          color: #FFFFFF !important;
          font-weight: 600;
          font-size: 0.9rem;
          border-radius: 8px;
          height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 1.25rem;
          white-space: nowrap;
          width: auto !important;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .btn-erp-brand:hover {
          background-color: var(--erp-hover);
          border-color: var(--erp-hover);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(8, 127, 245, 0.28);
        }

        /* Focus Outlines */
        button:focus-visible,
        .btn:focus-visible,
        input:focus-visible {
          outline: 2px solid var(--erp-primary) !important;
          outline-offset: 2px !important;
          box-shadow: 0 0 0 3px rgba(8, 127, 245, 0.2) !important;
        }

        /* Cards */
        .erp-card-elevated {
          background: var(--erp-card);
          border: 1px solid var(--erp-border);
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(7, 26, 51, 0.04);
          overflow: hidden;
          width: 100%;
        }

        .kpi-metric-card {
          border-radius: 10px;
          border: 1px solid var(--erp-border);
          background: var(--erp-card);
          padding: 0.85rem 1rem;
          display: flex;
          align-items: center;
          gap: 12px;
          height: 100%;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .kpi-metric-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(7, 26, 51, 0.05);
        }

        /* Inputs */
        .erp-input {
          border-radius: 8px;
          border: 1px solid var(--erp-border);
          height: 40px;
          font-size: 0.9rem;
          background-color: #FFFFFF;
        }
        .erp-input:focus {
          border-color: var(--erp-primary);
          box-shadow: 0 0 0 3px rgba(8, 127, 245, 0.15);
          outline: none;
        }

        /* Table & Internal Scrolling */
        .erp-table-responsive {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .erp-table {
          width: 100%;
          min-width: 760px;
          margin-bottom: 0;
          border-collapse: collapse;
        }

        .erp-table thead th {
          background-color: var(--erp-navy);
          color: #FFFFFF;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0.9rem 1.1rem;
          border: none;
          vertical-align: middle;
        }

        .erp-table tbody td {
          padding: 0.9rem 1.1rem;
          vertical-align: middle;
          border-bottom: 1px solid #F1F5F9;
        }
        .erp-table tbody tr:hover {
          background-color: #F8FAFC;
        }

        /* Status Dot */
        .status-pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
          margin-right: 6px;
        }
        .pulse-active {
          background-color: var(--erp-success);
          box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.25);
          animation: pulseAnim 2s infinite;
        }
        .pulse-inactive {
          background-color: #94A3B8;
        }
        @keyframes pulseAnim {
          0% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.4); }
          70% { box-shadow: 0 0 0 6px rgba(22, 163, 74, 0); }
          100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
        }

        /* Badges */
        .badge-soft-success { background-color: #DCFCE7; color: var(--erp-success); font-weight: 600; }
        .badge-soft-secondary { background-color: #F1F5F9; color: var(--erp-muted); font-weight: 600; }
        .badge-key-pill {
          background-color: #EFF6FF;
          color: var(--erp-royal);
          border: 1px solid #BFDBFE;
          font-family: SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.8rem;
          padding: 0.25rem 0.6rem;
          border-radius: 6px;
        }

        /* Action Buttons */
        .btn-status-toggle {
          font-size: 0.825rem;
          font-weight: 600;
          padding: 0.35rem 0.85rem;
          border-radius: 6px;
          transition: all 0.15s ease;
        }
        .btn-status-toggle:hover {
          transform: translateY(-1px);
        }
      `}</style>

      {/* TOP HEADER */}
      <div className="erp-header-grid">
        <div>
          <div className="d-flex align-items-center flex-wrap gap-2.5 mb-1">
            <h3 className="fw-bold mb-0" style={{ color: '#071A33', fontSize: '1.5rem', letterSpacing: '-0.01em' }}>
              ERP Module Directory
            </h3>
            <span
              className="badge px-2.5 py-1 rounded-pill small"
              style={{ backgroundColor: '#E0F2FE', color: '#087FF5', fontWeight: 600 }}
            >
              {metrics.total} Registered
            </span>
          </div>
          <p className="mb-0 small" style={{ color: '#64748B' }}>
            Manage core system modules, functional gateways, and dynamic enterprise access routes.
          </p>
        </div>

        <div style={{ justifySelf: 'end' }}>
          <PermissionGate module="modules" action="create">
            <button
              className="btn btn-erp-brand shadow-sm"
              onClick={() => {
                setModalError('');
                setShowModal(true);
              }}
            >
              <i className="bi bi-grid-plus me-2 fs-6"></i>
              <span>Register New Module</span>
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* KPI METRIC STRIP */}
      <div className="row g-2 g-md-3 mb-4">
        <div className="col-12 col-sm-4">
          <div className="kpi-metric-card">
            <div
              className="rounded-3 p-2 d-flex align-items-center justify-content-center"
              style={{ backgroundColor: 'rgba(8, 127, 245, 0.1)', color: '#087FF5', width: 38, height: 38 }}
            >
              <i className="bi bi-grid-fill fs-5"></i>
            </div>
            <div>
              <div className="small fw-medium" style={{ color: '#64748B' }}>Total Modules</div>
              <div className="fs-5 fw-bold" style={{ color: '#1E293B' }}>{metrics.total}</div>
            </div>
          </div>
        </div>

        <div className="col-6 col-sm-4">
          <div className="kpi-metric-card">
            <div
              className="rounded-3 p-2 d-flex align-items-center justify-content-center"
              style={{ backgroundColor: 'rgba(22, 163, 74, 0.1)', color: '#16A34A', width: 38, height: 38 }}
            >
              <i className="bi bi-check-circle-fill fs-5"></i>
            </div>
            <div>
              <div className="small fw-medium" style={{ color: '#64748B' }}>Active Modules</div>
              <div className="fs-5 fw-bold" style={{ color: '#16A34A' }}>{metrics.active}</div>
            </div>
          </div>
        </div>

        <div className="col-6 col-sm-4">
          <div className="kpi-metric-card">
            <div
              className="rounded-3 p-2 d-flex align-items-center justify-content-center"
              style={{ backgroundColor: 'rgba(217, 119, 6, 0.1)', color: '#D97706', width: 38, height: 38 }}
            >
              <i className="bi bi-pause-circle-fill fs-5"></i>
            </div>
            <div>
              <div className="small fw-medium" style={{ color: '#64748B' }}>Disabled</div>
              <div className="fs-5 fw-bold" style={{ color: '#D97706' }}>{metrics.inactive}</div>
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH BAR CARD */}
      <div className="erp-card-elevated p-3 mb-4">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-6 col-lg-5">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0 text-muted ps-3" style={{ borderColor: '#E2E8F0' }}>
                <i className="bi bi-search"></i>
              </span>
              <input
                type="text"
                className="form-control erp-input border-start-0 ps-1"
                placeholder="Search modules by name, slug or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          {search && (
            <div className="col-auto">
              <button
                className="btn btn-sm btn-link text-decoration-none px-0"
                style={{ color: '#DC2626' }}
                onClick={() => setSearch('')}
              >
                <i className="bi bi-x-circle me-1"></i>Reset filter
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="erp-card-elevated mb-4">
        {loading ? (
          <div className="py-5 text-center">
            <LoadingSpinner text="Loading ERP module directory..." />
          </div>
        ) : error ? (
          <div
            className="alert m-3 p-3 rounded-3 d-flex align-items-center gap-2"
            style={{ backgroundColor: '#FEE2E2', borderColor: '#FCA5A5', color: '#DC2626' }}
          >
            <i className="bi bi-exclamation-triangle-fill fs-5"></i>
            <div>{error}</div>
          </div>
        ) : filteredModules.length === 0 ? (
          <div className="text-center py-5">
            <i className="bi bi-grid-3x3-gap fs-1 d-block mb-2" style={{ color: '#C5CED8' }}></i>
            <h6 className="fw-bold mb-1" style={{ color: '#1E293B' }}>No modules found</h6>
            <p className="small mb-0" style={{ color: '#64748B' }}>
              {search ? 'Try modifying your search keywords.' : 'Get started by registering your first system module.'}
            </p>
          </div>
        ) : (
          <>
            {/* VIEW 1: Desktop / Tablet Table View (≥ 768px) */}
            <div className="erp-table-responsive d-none d-md-block">
              <table className="table erp-table align-middle">
                <thead>
                  <tr>
                    <th style={{ width: '28%' }}>Module Name</th>
                    <th style={{ width: '20%' }}>Key Identifier</th>
                    <th style={{ width: '30%' }}>Description</th>
                    <th style={{ width: '12%' }}>Status</th>
                    <th style={{ width: '10%', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredModules.map((m) => (
                    <tr key={m._id}>
                      {/* Name with Icon Badge */}
                      <td>
                        <div className="d-flex align-items-center gap-2.5">
                          <div
                            className="rounded-2 d-flex align-items-center justify-content-center"
                            style={{
                              width: 34,
                              height: 34,
                              backgroundColor: m.isActive ? 'rgba(8, 127, 245, 0.1)' : '#F1F5F9',
                              color: m.isActive ? '#087FF5' : '#64748B',
                            }}
                          >
                            <i className="bi bi-app-indicator small"></i>
                          </div>
                          <div>
                            <div className="fw-bold" style={{ color: '#071A33' }}>{m.name}</div>
                          </div>
                        </div>
                      </td>

                      {/* Key */}
                      <td>
                        <span className="badge-key-pill">{m.key}</span>
                      </td>

                      {/* Description */}
                      <td>
                        <span className="small text-truncate d-inline-block" style={{ color: '#64748B', maxWidth: '320px' }}>
                          {m.description || 'No description provided.'}
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <span
                          className={`badge px-2.5 py-1 rounded-pill d-inline-flex align-items-center ${
                            m.isActive ? 'badge-soft-success' : 'badge-soft-secondary'
                          }`}
                        >
                          <span className={`status-pulse-dot ${m.isActive ? 'pulse-active' : 'pulse-inactive'}`}></span>
                          {m.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <PermissionGate module="modules" action="edit">
                          <button
                            className="btn btn-sm btn-status-toggle"
                            style={{
                              borderColor: m.isActive ? '#D97706' : '#16A34A',
                              color: m.isActive ? '#D97706' : '#16A34A',
                              backgroundColor: 'transparent',
                            }}
                            onClick={() => handleToggleStatus(m)}
                          >
                            <i className={`bi ${m.isActive ? 'bi-pause-circle me-1' : 'bi-play-circle me-1'}`}></i>
                            {m.isActive ? 'Disable' : 'Enable'}
                          </button>
                        </PermissionGate>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* VIEW 2: Mobile Touch Card Grid (< 768px) */}
            <div className="d-block d-md-none p-3">
              <div className="row g-3">
                {filteredModules.map((m) => (
                  <div className="col-12" key={m._id}>
                    <div className="border rounded-3 p-3 bg-white" style={{ borderColor: '#E2E8F0' }}>
                      <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                        <div className="d-flex align-items-center gap-2">
                          <div
                            className="rounded-2 d-flex align-items-center justify-content-center"
                            style={{
                              width: 32,
                              height: 32,
                              backgroundColor: m.isActive ? 'rgba(8, 127, 245, 0.1)' : '#F1F5F9',
                              color: m.isActive ? '#087FF5' : '#64748B',
                            }}
                          >
                            <i className="bi bi-app-indicator small"></i>
                          </div>
                          <div>
                            <div className="fw-bold lh-sm" style={{ color: '#071A33' }}>{m.name}</div>
                            <span className="badge-key-pill mt-1 d-inline-block">{m.key}</span>
                          </div>
                        </div>

                        <span
                          className={`badge px-2 py-1 rounded-pill small flex-shrink-0 ${
                            m.isActive ? 'badge-soft-success' : 'badge-soft-secondary'
                          }`}
                        >
                          <span className={`status-pulse-dot ${m.isActive ? 'pulse-active' : 'pulse-inactive'}`}></span>
                          {m.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </div>

                      <div className="bg-light p-2.5 rounded-2 my-2.5 small" style={{ color: '#64748B' }}>
                        {m.description || 'No module description provided.'}
                      </div>

                      <div className="d-flex justify-content-end pt-2 border-top" style={{ borderColor: '#E2E8F0' }}>
                        <PermissionGate module="modules" action="edit">
                          <button
                            className="btn btn-sm btn-status-toggle w-100"
                            style={{
                              borderColor: m.isActive ? '#D97706' : '#16A34A',
                              color: m.isActive ? '#D97706' : '#16A34A',
                              backgroundColor: 'transparent',
                            }}
                            onClick={() => handleToggleStatus(m)}
                          >
                            <i className={`bi ${m.isActive ? 'bi-pause-circle me-1.5' : 'bi-play-circle me-1.5'}`}></i>
                            {m.isActive ? 'Disable Module' : 'Enable Module'}
                          </button>
                        </PermissionGate>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="card-footer bg-white border-top py-3 px-3.5 d-flex justify-content-between align-items-center" style={{ borderColor: '#E2E8F0' }}>
          <div className="small" style={{ color: '#64748B' }}>
            Showing <strong>{filteredModules.length}</strong> modules
          </div>
        </div>
      </div>

      {/* NEW MODULE MODAL */}
      <Modal show={showModal} title="Register New ERP Module" onClose={() => setShowModal(false)}>
        {modalError && (
          <div
            className="alert py-2 px-3 small mb-3 rounded-2 d-flex align-items-center gap-2"
            style={{ backgroundColor: '#FEE2E2', borderColor: '#FCA5A5', color: '#DC2626' }}
          >
            <i className="bi bi-exclamation-triangle-fill"></i>
            <div>{modalError}</div>
          </div>
        )}
        <form onSubmit={handleCreate}>
          <div className="mb-3">
            <label className="form-label fw-semibold small" style={{ color: '#1E293B' }}>Module Display Name</label>
            <input
              type="text"
              className="form-control erp-input"
              placeholder="e.g. Service Tickets"
              value={formData.name}
              onChange={handleNameChange}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold small" style={{ color: '#1E293B' }}>
              System Key Identifier <span className="text-muted fw-normal">(lowercase, underscores)</span>
            </label>
            <input
              type="text"
              className="form-control erp-input font-monospace"
              placeholder="e.g. service_tickets"
              value={formData.key}
              onChange={handleKeyChange}
              required
            />
            <div className="form-text small mt-1 font-monospace" style={{ color: '#64748B' }}>
              Registered route key: <strong style={{ color: '#0057B8' }}>{formData.key || 'service_tickets'}</strong>
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label fw-semibold small" style={{ color: '#1E293B' }}>Description</label>
            <input
              type="text"
              className="form-control erp-input"
              placeholder="Brief summary of module capabilities..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="d-flex justify-content-end gap-2 pt-2 border-top" style={{ borderColor: '#E2E8F0' }}>
            <button
              type="button"
              className="btn btn-light px-3.5"
              style={{ color: '#64748B', fontWeight: 600 }}
              onClick={() => setShowModal(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-erp-brand px-4">
              Register Module
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ModuleListPage;