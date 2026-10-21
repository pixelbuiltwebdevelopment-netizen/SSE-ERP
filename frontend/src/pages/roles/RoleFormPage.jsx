import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { roleApi } from '../../api/roleApi';
import { moduleApi } from '../../api/moduleApi';
import PermissionMatrix from '../../components/permissions/PermissionMatrix';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const RoleFormPage = () => {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [autoKey, setAutoKey] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const modRes = await moduleApi.getModules();
        setModules(modRes.data.data);

        if (isEditMode) {
          const roleRes = await roleApi.getRoleById(id);
          const r = roleRes.data.data;
          setName(r.name);
          setKey(r.key);
          setDescription(r.description || '');
          setPermissions(r.permissions || []);
        } else {
          const initialPerms = modRes.data.data.map((m) => ({
            module: m.key,
            actions: {
              view: { allowed: false, scope: 'OWN' },
              create: { allowed: false, scope: 'OWN' },
              edit: { allowed: false, scope: 'OWN' },
              delete: { allowed: false, scope: 'OWN' },
              export: { allowed: false, scope: 'OWN' },
              assign: { allowed: false, scope: 'OWN' },
            },
          }));
          setPermissions(initialPerms);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load configuration');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, isEditMode]);

  const handleNameChange = (e) => {
    const val = e.target.value;
    setName(val);
    if (!isEditMode && autoKey) {
      setKey(val.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''));
    }
  };

  const handleKeyChange = (e) => {
    setAutoKey(false);
    setKey(e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (isEditMode) {
        await roleApi.updateRole(id, { name, description, permissions });
      } else {
        await roleApi.createRole({ name, key, description, permissions });
      }
      navigate('/roles');
    } catch (err) {
      const fieldErrors = err.response?.data?.errors;
      if (fieldErrors && fieldErrors.length > 0) {
        setError(fieldErrors.map((f) => `${f.field}: ${f.message}`).join(', '));
      } else {
        setError(err.response?.data?.message || 'Failed to save role configuration');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="LOADING" subtext="Loading permission matrix configuration..." />;
  }

  return (
    <div className="erp-page-wrapper">
      <style>{`
        /* Direct Bootstrap Icons guarantee */
        @import url("https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css");

        html, body {
          overflow-x: hidden !important;
          max-width: 100vw !important;
          margin: 0;
          padding: 0;
        }

        .erp-page-wrapper {
          background-color: #F8FAFC;
          min-height: 100vh;
          width: 100%;
          padding: 16px 14px 48px;
          box-sizing: border-box;
          color: #1E293B;
        }
        @media (min-width: 768px) {
          .erp-page-wrapper {
            padding: 32px 36px 64px;
          }
        }

        .erp-container-inner {
          max-width: 1440px;
          margin: 0 auto;
        }

        /* ── SECTION: Header Card ── */
        .erp-header-banner {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          padding: 18px 20px;
          margin-bottom: 24px;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
        }
        @media (min-width: 768px) {
          .erp-header-banner {
            padding: 24px 28px;
          }
        }

        /* ── SECTION: Form Section Card ── */
        .erp-form-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          box-shadow: 0 1px 4px rgba(15, 23, 42, 0.04);
          margin-bottom: 24px;
          overflow: hidden;
        }

        .erp-card-header {
          background-color: #0F172A;
          color: #FFFFFF;
          padding: 14px 20px;
          font-weight: 600;
          font-size: 0.90rem;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .erp-card-body {
          padding: 20px;
        }
        @media (min-width: 768px) {
          .erp-card-body {
            padding: 26px 28px;
          }
        }

        .erp-input-field {
          border-radius: 8px;
          border: 1px solid #CBD5E1;
          font-size: 0.88rem;
          padding: 10px 14px;
          width: 100%;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .erp-input-field:focus {
          border-color: #0284C7;
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
          outline: none;
        }
        .erp-input-field:disabled {
          background-color: #F1F5F9;
          cursor: not-allowed;
          color: #64748B;
        }

        .erp-form-label {
          font-size: 0.74rem;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
          display: block;
        }

        /* Buttons */
        .btn-erp-brand {
          background: #1E5385;
          border: 1px solid #1E5385;
          color: #FFFFFF !important;
          font-weight: 600;
          font-size: 0.88rem;
          border-radius: 8px;
          padding: 10px 22px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .btn-erp-brand:hover:not(:disabled) {
          background: #164069;
          box-shadow: 0 4px 12px rgba(30, 83, 133, 0.25);
        }
        .btn-erp-brand:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .btn-erp-outline {
          border: 1px solid #CBD5E1;
          background: #FFFFFF;
          color: #475569;
          font-weight: 600;
          font-size: 0.88rem;
          border-radius: 8px;
          padding: 10px 20px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }
        .btn-erp-outline:hover {
          background: #F8FAFC;
          color: #1E293B;
          border-color: #94A3B8;
        }

        /* Mobile specific layout tweaks (< 768px) */
        @media (max-width: 767.98px) {
          .erp-header-banner {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 16px !important;
          }
          .mobile-footer-actions {
            flex-direction: column-reverse !important;
            gap: 10px !important;
          }
          .mobile-footer-actions button {
            width: 100% !important;
            min-height: 44px;
          }
        }
      `}</style>

      <div className="erp-container-inner">

        {/* ── SECTION 1: Top Navigation Banner ── */}
        <div className="erp-header-banner d-flex justify-content-between align-items-start align-items-md-center">
          <div>
            <div className="d-flex align-items-center flex-wrap gap-2 mb-1.5">
              <h3 className="fw-bold mb-0 text-dark fs-5">
                {isEditMode ? `Edit Role: ${name || 'Role Matrix'}` : 'Create Dynamic ERP Role'}
              </h3>
              <span
                className="badge rounded-pill small"
                style={{
                  backgroundColor: isEditMode ? '#E0F2FE' : '#DCFCE7',
                  color: isEditMode ? '#0369A1' : '#15803D',
                  fontWeight: 600,
                  padding: '5px 10px',
                }}
              >
                {isEditMode ? 'Edit Mode' : 'New Role'}
              </span>
            </div>
            <p className="text-muted small mb-0">
              Define operational privileges, data authorization levels, and scope boundaries per module.
            </p>
          </div>

          <div className="w-100 w-md-auto text-end mt-2 mt-md-0">
            <button
              type="button"
              className="btn btn-erp-outline w-100 w-md-auto"
              onClick={() => navigate('/roles')}
            >
              <i className="bi bi-arrow-left me-1.5"></i>
              <span>Back to Roles</span>
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="alert alert-danger rounded-3 d-flex align-items-center gap-2.5 p-3 mb-4">
            <i className="bi bi-exclamation-triangle-fill fs-5 flex-shrink-0"></i>
            <div className="small fw-semibold">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* ── SECTION 2: Role Metadata Card ── */}
          <div className="erp-form-card">
            <div className="erp-card-header">
              <i className="bi bi-shield-check"></i>
              <span>Role Identification &amp; Details</span>
            </div>
            <div className="erp-card-body">
              <div className="row g-3">
                <div className="col-12 col-md-4">
                  <label className="erp-form-label">Role Name *</label>
                  <input
                    type="text"
                    className="form-control erp-input-field"
                    placeholder="e.g. Regional Operations Manager"
                    value={name}
                    onChange={handleNameChange}
                    required
                  />
                </div>

                <div className="col-12 col-md-4">
                  <label className="erp-form-label">
                    Role Key Identifier * {isEditMode && <span className="text-muted text-capitalize fw-normal">(Fixed)</span>}
                  </label>
                  <input
                    type="text"
                    className="form-control erp-input-field font-monospace"
                    placeholder="e.g. regional_operations_manager"
                    value={key}
                    onChange={handleKeyChange}
                    required
                    disabled={isEditMode}
                  />
                  {!isEditMode && autoKey && (
                    <small className="text-muted mt-1 d-block" style={{ fontSize: '0.72rem' }}>
                      <i className="bi bi-magic me-1 text-primary"></i>Auto-formatted to standard code
                    </small>
                  )}
                </div>

                <div className="col-12 col-md-4">
                  <label className="erp-form-label">Description</label>
                  <input
                    type="text"
                    className="form-control erp-input-field"
                    placeholder="Brief summary of duties and responsibilities..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── SECTION 3: Visual Interactive Permission Matrix ── */}
          <div className="erp-form-card p-3 p-md-4">
            <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-3">
              <div>
                <h5 className="fw-bold text-dark mb-1 fs-6">
                  <i className="bi bi-grid-3x3-gap-fill me-2 text-primary"></i>
                  Module Rights &amp; Access Scope Configuration
                </h5>
                <p className="text-muted small mb-0">
                  Toggle functional privileges across operational screens and specify department or global scope.
                </p>
              </div>
            </div>

            {/* Matrix Component (Wrapped for clean horizontal overflow on mobile) */}
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <PermissionMatrix 
                modules={modules} 
                permissions={permissions} 
                onChange={setPermissions} 
              />
            </div>
          </div>

          {/* ── SECTION 4: Sticky/Responsive Action Footer ── */}
          <div className="d-flex justify-content-end gap-2.5 mb-5 mobile-footer-actions">
            <button
              type="button"
              className="btn btn-erp-outline px-4"
              onClick={() => navigate('/roles')}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-erp-brand px-4"
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Saving Configuration...
                </>
              ) : (
                <>
                  <i className="bi bi-check2-circle me-2 fs-6"></i>
                  Save Role Configuration
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default RoleFormPage;