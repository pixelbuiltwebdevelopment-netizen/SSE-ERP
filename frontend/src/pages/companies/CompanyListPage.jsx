import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  XCircle,
  Eye,
  Edit2,
  Trash2,
  Search,
  Download,
  Plus,
} from 'lucide-react';
import { usePermission } from '../../hooks/usePermission';
import { getCompanies, updateCompanyStatus, deleteCompany } from '../../api/companyApi';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/Skeleton';
import Pagination from '../../components/common/Pagination';
import CompanyDetailPage from './CompanyDetailPage';
import PermissionGate from '../../components/permissions/PermissionGate';

const CompanyListPage = () => {
  const navigate = useNavigate();
  const { can } = usePermission();

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Detail Modal
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Fetch companies API
  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getCompanies({
        page,
        limit: 10,
        search,
        status: status || undefined,
      });
      if (res.success) {
        setCompanies(res.data.companies || []);
        setPagination({
          page: res.data.pagination.page,
          totalPages: res.data.pagination.pages,
          total: res.data.pagination.total,
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch company profiles.');
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const metrics = useMemo(() => {
    const total = pagination.total || companies.length;
    const active = companies.filter((c) => c.status === 'Active' || c.status === 'Customer').length;
    const disabled = companies.filter((c) => c.status === 'Disabled').length;
    return { total, active, disabled };
  }, [companies, pagination]);

  const handleStatusToggle = async (company) => {
    const nextStatus = company.status === 'Disabled' ? 'Active' : 'Disabled';
    if (!window.confirm(`Are you sure you want to change status of "${company.company}" to ${nextStatus}?`)) return;

    try {
      await updateCompanyStatus(company._id, nextStatus);
      setSuccessMsg(`Status of "${company.company}" updated to ${nextStatus}`);
      fetchCompanies();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update company status');
    }
  };

  const handleDelete = async (company) => {
    if (!window.confirm(`Are you sure you want to delete company profile "${company.company}"?`)) return;

    try {
      await deleteCompany(company._id);
      setSuccessMsg(`Company "${company.company}" deleted successfully`);
      fetchCompanies();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete company profile');
    }
  };

  const handleExportPDF = () => {
    if (!companies.length) return;
    window.print();
  };

  return (
    <div className="erp-fade-in pb-4">
      {/* ── Page Header ── */}
      <PageHeader
        title="Client Companies & Machines"
        subtitle="Manage customer profiles, contracts, and service branches"
        breadcrumbs={[{ label: 'Organization' }, { label: 'Companies' }]}
        actions={
          <div className="d-flex align-items-center gap-2">
            <PermissionGate module="companies" action="export">
              <button
                type="button"
                className="erp-btn erp-btn-secondary"
                onClick={handleExportPDF}
              >
                <Download size={15} /> Export Report
              </button>
            </PermissionGate>

            <PermissionGate module="companies" action="create">
              <Link to="/companies/create" className="erp-btn erp-btn-primary">
                <Plus size={16} /> Add Company
              </Link>
            </PermissionGate>
          </div>
        }
      />

      {successMsg && (
        <div className="alert alert-success small py-2.5 px-3 mb-4 d-flex align-items-center justify-content-between border-0 shadow-xs">
          <span>{successMsg}</span>
          <button type="button" className="btn-close shadow-none p-2" onClick={() => setSuccessMsg('')} />
        </div>
      )}

      {error && (
        <div className="alert alert-danger small py-2.5 px-3 mb-4 d-flex align-items-center justify-content-between border-0 shadow-xs">
          <span>{error}</span>
          <button type="button" className="btn-close shadow-none p-2" onClick={() => setError('')} />
        </div>
      )}

      {/* ── KPI Row ── */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-4">
          <StatCard
            title="Total Client Accounts"
            value={metrics.total}
            subtitle="Scoped accounts"
            icon={Building2}
            variant="primary"
          />
        </div>
        <div className="col-12 col-md-4">
          <StatCard
            title="Active Companies"
            value={metrics.active}
            subtitle="Engaged customers"
            icon={CheckCircle2}
            variant="success"
          />
        </div>
        <div className="col-12 col-md-4">
          <StatCard
            title="Disabled / Suspended"
            value={metrics.disabled}
            subtitle="Inactive accounts"
            icon={XCircle}
            variant="danger"
          />
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
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
                placeholder="Search by company name, profile code, contact person..."
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
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Account Statuses</option>
              <option value="Active">Active</option>
              <option value="Customer">Customer</option>
              <option value="Disabled">Disabled</option>
            </select>
          </div>

          <div className="col-6 col-md-3 text-end text-muted small">
            <span>Showing {companies.length} of {pagination.total || companies.length}</span>
          </div>
        </div>
      </div>

      {/* ── Companies Data Table ── */}
      {loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : companies.length === 0 ? (
        <div className="erp-card p-4">
          <EmptyState
            icon={Building2}
            title="No client companies found"
            description="No company profiles match your current search parameters or scope permissions."
            actionLabel="Reset Search"
            onAction={() => {
              setSearch('');
              setStatus('');
            }}
          />
        </div>
      ) : (
        <div className="erp-table-container">
          <div className="table-responsive">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Profile Code</th>
                  <th>Company Name</th>
                  <th>Contact Person & Phone</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <span className="font-monospace fw-bold small text-primary">
                        {c.profileCode || 'COMP-1001'}
                      </span>
                    </td>

                    <td>
                      <Link
                        to={`/companies/${c._id}`}
                        className="fw-bold text-decoration-none text-dark hover-text-primary d-inline-block"
                        style={{ fontSize: '0.88rem' }}
                      >
                        {c.company}
                      </Link>
                      <small className="text-muted d-block" style={{ fontSize: '0.72rem' }}>
                        {c.businessType || 'Commercial Mill'}
                      </small>
                    </td>

                    <td>
                      <div className="small fw-medium">{c.contactPerson || '—'}</div>
                      <small className="font-monospace text-muted d-block">{c.contactNumber || '—'}</small>
                    </td>

                    <td>
                      <div className="small text-truncate" style={{ maxWidth: '180px' }}>
                        {[c.city || c.area, c.state].filter(Boolean).join(', ') || '—'}
                      </div>
                      <small className="text-muted d-block font-monospace">{c.pincode || ''}</small>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="btn btn-sm p-0 border-0"
                        onClick={() => handleStatusToggle(c)}
                        title="Click to toggle company active status"
                      >
                        <StatusBadge status={c.status || 'Active'} size="sm" />
                      </button>
                    </td>

                    <td className="text-end">
                      <div className="d-inline-flex align-items-center gap-1">
                        <Link
                          to={`/companies/${c._id}`}
                          className="erp-btn erp-btn-secondary erp-btn-sm p-1.5"
                          title="Inspect Profile, Stats & Tickets"
                        >
                          <Eye size={14} />
                        </Link>

                        <PermissionGate module="companies" action="edit">
                          <Link
                            to={`/companies/${c._id}/edit`}
                            className="erp-btn erp-btn-secondary erp-btn-sm p-1.5"
                            title="Edit Company"
                          >
                            <Edit2 size={14} />
                          </Link>
                        </PermissionGate>

                        <PermissionGate module="companies" action="delete">
                          <button
                            type="button"
                            className="erp-btn erp-btn-danger-outline erp-btn-sm p-1.5"
                            onClick={() => handleDelete(c)}
                            title="Delete Company"
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
    </div>
  );
};

export default CompanyListPage;
