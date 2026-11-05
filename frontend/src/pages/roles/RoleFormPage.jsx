import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Shield, ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { roleApi } from '../../api/roleApi';
import { moduleApi } from '../../api/moduleApi';
import PermissionMatrix from '../../components/permissions/PermissionMatrix';
import PageHeader from '../../components/common/PageHeader';
import { PageSkeleton } from '../../components/common/Skeleton';

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
    return <PageSkeleton />;
  }

  return (
    <div className="erp-fade-in pb-5">
      {/* ── Page Header ── */}
      <PageHeader
        title={isEditMode ? `Edit Role: ${name}` : 'Create Security Role'}
        subtitle="Define action-level permissions and data access boundaries for this organizational profile"
        showBackButton={true}
        backFallback="/roles"
        breadcrumbs={[
          { label: 'Organization' },
          { label: 'Roles', path: '/roles' },
          { label: isEditMode ? 'Edit Role' : 'Create Role' },
        ]}
        actions={
          <div className="d-flex align-items-center gap-2">
            <Link to="/roles" className="erp-btn erp-btn-secondary">
              <ArrowLeft size={16} /> Back to Directory
            </Link>
            <button
              type="button"
              className="erp-btn erp-btn-primary"
              onClick={handleSubmit}
              disabled={saving}
            >
              <Save size={16} /> {saving ? 'Saving Changes...' : 'Save Role Matrix'}
            </button>
          </div>
        }
      />

      {error && (
        <div className="alert alert-danger small py-2.5 px-3 mb-4 d-flex align-items-center gap-2 border-0 shadow-xs">
          <AlertCircle size={16} className="text-danger flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* ── Role Definition Card ── */}
        <div className="erp-card p-4 mb-4">
          <h5 className="fw-bold mb-3" style={{ color: 'var(--erp-text-main)', fontSize: '1rem' }}>
            1. Role Profile & Identification
          </h5>

          <div className="row g-3">
            <div className="col-12 col-md-5">
              <label className="erp-label">Role Title / Display Name *</label>
              <input
                type="text"
                className="erp-input"
                placeholder="e.g. Regional Operations Manager"
                value={name}
                onChange={handleNameChange}
                required
              />
            </div>

            <div className="col-12 col-md-4">
              <label className="erp-label">System Key (Unique Slug) *</label>
              <input
                type="text"
                className="erp-input font-monospace"
                placeholder="e.g. regional_ops_mgr"
                value={key}
                onChange={handleKeyChange}
                disabled={isEditMode}
                required
              />
              <small className="text-muted d-block mt-1" style={{ fontSize: '0.72rem' }}>
                {isEditMode ? 'Role key is immutable after creation' : 'Auto-generated lowercase slug'}
              </small>
            </div>

            <div className="col-12 col-md-3">
              <label className="erp-label">Access Model</label>
              <div className="p-2 rounded-2 bg-light text-muted small">
                Action-Level RBAC + Scoped ABAC
              </div>
            </div>

            <div className="col-12">
              <label className="erp-label">Role Description</label>
              <textarea
                className="erp-textarea"
                rows={2}
                placeholder="Brief summary of responsibilities and scope of access granted to this role..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ── Permission Matrix Card ── */}
        <div className="erp-card p-4 mb-4">
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2 mb-3 pb-2 border-bottom">
            <div>
              <h5 className="fw-bold mb-1" style={{ color: 'var(--erp-text-main)', fontSize: '1rem' }}>
                2. Module Action Rights & Data Scope Matrix
              </h5>
              <p className="text-muted small mb-0">
                Configure module toggles, specific action permissions, and data visibility boundary scopes (OWN, TEAM, DEPARTMENT, BRANCH, ALL)
              </p>
            </div>
          </div>

          <PermissionMatrix
            modules={modules}
            permissions={permissions}
            onChange={(updated) => setPermissions(updated)}
          />
        </div>

        {/* ── Sticky Bottom Action Bar ── */}
        <div className="d-flex justify-content-end gap-2">
          <Link to="/roles" className="erp-btn erp-btn-secondary">
            Cancel
          </Link>
          <button type="submit" className="erp-btn erp-btn-primary" disabled={saving}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save Role Matrix'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RoleFormPage;
