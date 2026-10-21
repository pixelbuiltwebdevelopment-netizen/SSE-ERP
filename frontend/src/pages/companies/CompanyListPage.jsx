import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermission } from '../../hooks/usePermission';
import { getCompanies, updateCompanyStatus, deleteCompany } from '../../api/companyApi';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import CompanyDetailPage from './CompanyDetailPage';
import { COUNTRY_LIST, statesOf, districtsOf } from '../../utils/geo';

// Self-contained SVG Icons
const Icons = {
  Building: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
      <path d="M9 22v-4h6v4"></path>
      <path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01"></path>
    </svg>
  ),
  CheckCircle: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  ),
  SlashCircle: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
    </svg>
  ),
  Cpu: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
      <rect x="9" y="9" width="6" height="6"></rect>
      <line x1="9" y1="1" x2="9" y2="4"></line>
      <line x1="15" y1="1" x2="15" y2="4"></line>
      <line x1="9" y1="20" x2="9" y2="23"></line>
      <line x1="15" y1="20" x2="15" y2="23"></line>
      <line x1="20" y1="9" x2="23" y2="9"></line>
      <line x1="20" y1="14" x2="23" y2="14"></line>
      <line x1="1" y1="9" x2="4" y2="9"></line>
      <line x1="1" y1="14" x2="4" y2="14"></line>
    </svg>
  ),
  Eye: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  ),
  Edit: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
  ),
  Trash: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
  ),
  Search: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  ),
  Pdf: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  ),
  Plus: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  ),
  ChevronDown: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  ),
  Close: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  ),
};

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
  const [country, setCountry] = useState('India');
  const [state, setState] = useState('');
  const [area, setArea] = useState('');

  // Dropdown Autocomplete Controller
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const companyDropdownRef = useRef(null);

  // Pagination
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
        status,
        country: country || undefined,
        state: state || undefined,
        area: area || undefined,
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
  }, [page, search, status, country, state, area]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Click outside to dismiss company search dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(e.target)) {
        setShowCompanyDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const metrics = useMemo(() => {
    const total = pagination.total || companies.length;
    const active = companies.filter((c) => c.status === 'Active' || c.status === 'Customer').length;
    const disabled = companies.filter((c) => c.status === 'Disabled').length;
    const totalFleet = companies.reduce((acc, c) => acc + (c.machines?.length || 0), 0);
    return { total, active, disabled, totalFleet };
  }, [companies, pagination]);

  // Dynamic dropdown suggestions
  const dropdownCompanyList = useMemo(() => {
    if (!search || search.trim() === '') return companies;
    const q = search.toLowerCase();
    return companies.filter(
      (c) =>
        c.company?.toLowerCase().includes(q) ||
        c.profileCode?.toLowerCase().includes(q) ||
        c.contactPerson?.toLowerCase().includes(q) ||
        c.contactNumber?.includes(q)
    );
  }, [companies, search]);

  const handleSelectCompany = (comp) => {
    setSearch(comp.company);
    setShowCompanyDropdown(false);
    setPage(1);
  };

  const handleStatusToggle = async (company) => {
    const nextStatus = company.status === 'Disabled' ? 'Active' : 'Disabled';
    if (!window.confirm(`Are you sure you want to change status of "${company.company}" to ${nextStatus}?`)) return;

    try {
      await updateCompanyStatus(company._id, nextStatus);
      setSuccessMsg(`Status of "${company.company}" changed to ${nextStatus}`);
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

    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('Please allow popups to export the PDF report.');
      return;
    }

    const tableRows = companies
      .map(
        (c, idx) => `
        <tr>
          <td style="padding: 10px 12px; border: 1px solid #CBD5E1; text-align: center;">${idx + 1}</td>
          <td style="padding: 10px 12px; border: 1px solid #CBD5E1; font-family: monospace; font-weight: bold; color: #0284C7;">${c.profileCode || 'N/A'}</td>
          <td style="padding: 10px 12px; border: 1px solid #CBD5E1; font-weight: 600;">${c.company || '—'}</td>
          <td style="padding: 10px 12px; border: 1px solid #CBD5E1;">${c.contactPerson || '—'}</td>
          <td style="padding: 10px 12px; border: 1px solid #CBD5E1; font-family: monospace;">${c.contactNumber || '—'}</td>
          <td style="padding: 10px 12px; border: 1px solid #CBD5E1;">${[c.area, c.state, c.country].filter(Boolean).join(', ') || '—'}</td>
          <td style="padding: 10px 12px; border: 1px solid #CBD5E1; text-align: center;">
            <span style="display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; background-color: ${
              c.status === 'Disabled' ? '#FEE2E2' : '#DCFCE7'
            }; color: ${c.status === 'Disabled' ? '#DC2626' : '#16A34A'};">
              ${c.status || 'Active'}
            </span>
          </td>
        </tr>
      `
      )
      .join('');

    const htmlDoc = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Company_Profiles_${new Date().toISOString().slice(0, 10)}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 32px; color: #0F172A; }
            .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #087FF5; padding-bottom: 16px; margin-bottom: 24px; }
            .title { font-size: 22px; font-weight: 800; color: #071A33; margin: 0; }
            .meta { font-size: 12px; color: #64748B; margin-top: 6px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
            th { background-color: #071A33; color: #ffffff; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
            @media print {
              @page { size: landscape; margin: 10mm; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">Enterprise Customer Directory</div>
              <div class="meta">Exported on: ${new Date().toLocaleString()} | Total Records: ${companies.length}</div>
            </div>
            <div style="font-weight: 700; font-size: 13px; color: #087FF5;">
              ERP SYSTEM REPORT
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 5%; text-align: center;">#</th>
                <th style="width: 14%;">Code</th>
                <th style="width: 25%;">Company Name</th>
                <th style="width: 18%;">Contact Person</th>
                <th style="width: 14%;">Contact Phone</th>
                <th style="width: 14%;">Location</th>
                <th style="width: 10%; text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(htmlDoc);
    printWin.document.close();
  };

  return (
    <div className="company-page-container">
      <style>{`
        html, body {
          overflow-x: hidden !important;
          max-width: 100vw !important;
          margin: 0;
          padding: 0;
        }

        .company-page-container {
          background-color: #F8FAFC;
          min-height: 100vh;
          padding: 12px 10px 48px;
          box-sizing: border-box;
          color: #1E293B;
        }
        @media (min-width: 576px) {
          .company-page-container {
            padding: 18px 16px 48px;
          }
        }
        @media (min-width: 768px) {
          .company-page-container {
            padding: 28px 32px 64px;
          }
        }

        /* ── SECTION 1: Banner ── */
        .company-header-banner {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 14px 16px;
          margin-bottom: 12px;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
        }
        @media (min-width: 768px) {
          .company-header-banner {
            border-radius: 14px;
            padding: 22px 26px;
            margin-bottom: 20px;
          }
        }

        .btn-modern {
          transition: all 0.2s ease;
        }
        .btn-modern:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        /* ── SECTION 2: KPI Grid ── */
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

        .kpi-icon-box {
          width: 38px;
          height: 38px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        @media (min-width: 768px) {
          .kpi-icon-box {
            width: 46px;
            height: 46px;
            border-radius: 10px;
          }
        }

        /* ── SECTION 3: Filter Console Bar ── */
        .company-filter-panel {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 12px;
          margin-bottom: 14px;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
          position: relative;
        }
        @media (min-width: 768px) {
          .company-filter-panel {
            padding: 18px 22px;
            margin-bottom: 22px;
          }
        }

        /* Unified Single-Border Search Box */
        .company-search-unified {
          display: flex;
          align-items: center;
          background: #FFFFFF;
          border: 1px solid #CBD5E1;
          border-radius: 8px;
          min-height: 44px;
          padding: 0 8px 0 12px;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .company-search-unified:focus-within {
          border-color: #0284C7;
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
        }
        .company-search-unified input {
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
          background: transparent !important;
          width: 100%;
          font-size: 14px;
          color: #1E293B;
          padding: 8px 6px;
        }
        .company-search-unified input::placeholder {
          color: #64748B;
          font-size: 13.5px;
        }

        /* Select styling with right padding to prevent chevron overlap */
        .form-select-custom {
          border-radius: 8px;
          border: 1px solid #CBD5E1;
          background-color: #FFFFFF;
          font-size: 13px !important;
          color: #1E293B;
          font-weight: 500;
          min-height: 44px;
          width: 100%;
          padding: 8px 28px 8px 10px !important;
          background-position: right 8px center !important;
          background-size: 14px 10px !important;
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
          transition: border-color 0.15s ease;
        }
        .form-select-custom:focus {
          border-color: #0284C7 !important;
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15) !important;
          outline: none;
        }

        /* ── Autocomplete Dropdown Menu ── */
        .company-dropdown-menu {
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
        .company-dropdown-item {
          padding: 11px 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #F1F5F9;
          transition: background-color 0.15s ease;
        }
        .company-dropdown-item:hover {
          background-color: #F8FAFC;
        }
        .company-dropdown-item:last-child {
          border-bottom: none;
        }

        /* Mobile specific card */
        .mobile-company-card {
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 14px;
          background: #FFFFFF;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
          margin-bottom: 12px;
        }
        .mobile-company-action-btn {
          min-height: 40px;
          font-size: 0.82rem;
        }
      `}</style>

      {/* ── SECTION 1: Top Header Banner ── */}
      <div className="company-header-banner">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-stretch align-items-md-center gap-2.5">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
              <h4 className="fw-bold mb-0 text-dark fs-5">
                Company Profiles &amp; Customers
              </h4>
              <span
                className="badge rounded-pill fw-bold"
                style={{ backgroundColor: '#E0F2FE', color: '#0369A1', fontSize: '0.72rem', padding: '4px 10px' }}
              >
                {metrics.total} Registered
              </span>
            </div>
            <p className="text-muted small mb-0" style={{ fontSize: '0.80rem' }}>
              Manage enterprise clients, operational locations, machinery equipment, and service profiles.
            </p>
          </div>

          <div className="d-flex align-items-center gap-2 w-100 w-md-auto mt-1 mt-md-0">
            {can('companies', 'export') && (
              <button
                type="button"
                className="btn btn-outline-secondary btn-modern d-inline-flex align-items-center justify-content-center fw-semibold rounded-3 flex-fill flex-md-grow-0"
                style={{ fontSize: '0.84rem', minHeight: '44px', padding: '0 14px', gap: '6px' }}
                onClick={handleExportPDF}
                disabled={!companies.length}
              >
                <Icons.Pdf />
                <span>Export PDF</span>
              </button>
            )}

            {can('companies', 'create') && (
              <button
                type="button"
                className="btn btn-primary btn-modern d-inline-flex align-items-center justify-content-center fw-bold shadow-sm rounded-3 flex-fill flex-md-grow-0"
                style={{
                  backgroundColor: '#1E5385',
                  borderColor: '#1E5385',
                  fontSize: '0.84rem',
                  minHeight: '44px',
                  padding: '0 16px',
                  gap: '6px',
                }}
                onClick={() => navigate('/companies/create')}
              >
                <Icons.Plus />
                <span>Create Company</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── SECTION 2: KPI Metric Cards Grid (2x2 on Mobile, 4 across on Desktop) ── */}
      <div className="row g-2 g-md-3 erp-metrics-grid">
        <div className="col-6 col-lg-3">
          <div className="kpi-card-box">
            <div
              className="kpi-icon-box"
              style={{ backgroundColor: '#E0F2FE', color: '#0369A1' }}
            >
              <Icons.Building />
            </div>
            <div className="text-truncate">
              <span className="fw-semibold text-muted text-uppercase d-block mb-0.5 text-truncate" style={{ fontSize: '0.64rem', letterSpacing: '0.4px' }}>
                Total Accounts
              </span>
              <h4 className="fw-bold text-dark mb-0 fs-6 fs-md-5">
                {metrics.total}
              </h4>
            </div>
          </div>
        </div>

        <div className="col-6 col-lg-3">
          <div className="kpi-card-box">
            <div
              className="kpi-icon-box"
              style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}
            >
              <Icons.CheckCircle />
            </div>
            <div className="text-truncate">
              <span className="fw-semibold text-muted text-uppercase d-block mb-0.5 text-truncate" style={{ fontSize: '0.64rem', letterSpacing: '0.4px' }}>
                Active Clients
              </span>
              <h4 className="fw-bold text-success mb-0 fs-6 fs-md-5">
                {metrics.active}
              </h4>
            </div>
          </div>
        </div>

        <div className="col-6 col-lg-3">
          <div className="kpi-card-box">
            <div
              className="kpi-icon-box"
              style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}
            >
              <Icons.SlashCircle />
            </div>
            <div className="text-truncate">
              <span className="fw-semibold text-muted text-uppercase d-block mb-0.5 text-truncate" style={{ fontSize: '0.64rem', letterSpacing: '0.4px' }}>
                Disabled
              </span>
              <h4 className="fw-bold text-danger mb-0 fs-6 fs-md-5">
                {metrics.disabled}
              </h4>
            </div>
          </div>
        </div>

        <div className="col-6 col-lg-3">
          <div className="kpi-card-box">
            <div
              className="kpi-icon-box"
              style={{ backgroundColor: '#EDE9FE', color: '#7C3AED' }}
            >
              <Icons.Cpu />
            </div>
            <div className="text-truncate">
              <span className="fw-semibold text-muted text-uppercase d-block mb-0.5 text-truncate" style={{ fontSize: '0.64rem', letterSpacing: '0.4px' }}>
                Fleet Machines
              </span>
              <h4 className="fw-bold text-dark mb-0 fs-6 fs-md-5">
                {metrics.totalFleet}
              </h4>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="alert alert-danger shadow-sm border-0 rounded-3 mb-2.5 d-flex justify-content-between align-items-center p-2.5">
          <span className="small fw-semibold">{error}</span>
          <button type="button" className="btn-close btn-close-sm" onClick={() => setError('')}></button>
        </div>
      )}
      {successMsg && (
        <div className="alert alert-success shadow-sm border-0 rounded-3 mb-2.5 d-flex justify-content-between align-items-center p-2.5">
          <span className="small fw-semibold">{successMsg}</span>
          <button type="button" className="btn-close btn-close-sm" onClick={() => setSuccessMsg('')}></button>
        </div>
      )}

      {/* ── SECTION 3: Filter Console Bar (Mobile-Optimized) ── */}
      <div className="company-filter-panel">
        <div className="row g-2 align-items-center">
          
          {/* 1. Seamless Search & Dropdown Picker */}
          <div className="col-12 col-md-4 col-lg-4" ref={companyDropdownRef}>
            <div className="position-relative">
              <div className="company-search-unified">
                <span className="text-muted d-flex align-items-center me-1">
                  <Icons.Search />
                </span>
                <input
                  type="text"
                  placeholder={`Select or search company (${companies.length})...`}
                  value={search}
                  onFocus={() => setShowCompanyDropdown(true)}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setShowCompanyDropdown(true);
                    setPage(1);
                  }}
                />
                {search ? (
                  <button
                    type="button"
                    className="btn btn-sm p-1 text-muted border-0 shadow-none d-flex align-items-center"
                    onClick={() => {
                      setSearch('');
                      setShowCompanyDropdown(false);
                    }}
                  >
                    <Icons.Close />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-sm p-1 text-muted border-0 shadow-none d-flex align-items-center"
                    onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
                  >
                    <Icons.ChevronDown />
                  </button>
                )}
              </div>

              {/* Dynamic Company Selection Menu */}
              {showCompanyDropdown && (
                <div className="company-dropdown-menu">
                  <div
                    className="company-dropdown-item fw-semibold text-primary border-bottom"
                    onClick={() => {
                      setSearch('');
                      setShowCompanyDropdown(false);
                    }}
                  >
                    <span>All Companies ({companies.length})</span>
                  </div>

                  {dropdownCompanyList.length > 0 ? (
                    dropdownCompanyList.map((c) => (
                      <div
                        key={c._id}
                        className="company-dropdown-item"
                        onClick={() => handleSelectCompany(c)}
                      >
                        <div className="text-truncate pe-2">
                          <div className="fw-semibold text-dark small text-truncate">{c.company}</div>
                          <div className="text-muted small text-truncate" style={{ fontSize: '0.72rem' }}>
                            {c.contactPerson} {c.contactNumber ? `• ${c.contactNumber}` : ''}
                          </div>
                        </div>
                        <span
                          className="badge font-monospace flex-shrink-0"
                          style={{ backgroundColor: '#EFF6FF', color: '#0369A1', fontSize: '0.70rem' }}
                        >
                          {c.profileCode || 'N/A'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-muted small">
                      No companies match "{search}"
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 2. Country Select */}
          <div className="col-6 col-md-2 col-lg-2">
            <select
              className="form-select form-select-custom"
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setState('');
                setArea('');
                setPage(1);
              }}
            >
              <option value="">All Countries</option>
              {COUNTRY_LIST.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* 3. State Select */}
          <div className="col-6 col-md-2 col-lg-2">
            <select
              className="form-select form-select-custom"
              value={state}
              onChange={(e) => {
                setState(e.target.value);
                setArea('');
                setPage(1);
              }}
            >
              <option value="">All States</option>
              {statesOf(country).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* 4. District / Area Select */}
          <div className="col-6 col-md-2 col-lg-2">
            <select
              className="form-select form-select-custom"
              value={area}
              onChange={(e) => {
                setArea(e.target.value);
                setPage(1);
              }}
              disabled={!state}
            >
              <option value="">All Districts</option>
              {districtsOf(country, state).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* 5. Status Select */}
          <div className="col-6 col-md-1 col-lg-1">
            <select
              className="form-select form-select-custom"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              <option value="Active">Active</option>
              <option value="Disabled">Disabled</option>
              <option value="Customer">Customer</option>
            </select>
          </div>

          {/* 6. Reset Action Button */}
          <div className="col-12 col-md-1 col-lg-1 text-md-end text-center mt-1 mt-md-0">
            <button
              type="button"
              className="btn btn-link text-decoration-none p-0 text-danger fw-semibold btn-modern w-100 w-md-auto d-inline-flex align-items-center justify-content-center gap-1"
              style={{ fontSize: '0.82rem' }}
              onClick={() => {
                setSearch('');
                setStatus('');
                setCountry('India');
                setState('');
                setArea('');
                setPage(1);
              }}
            >
              Reset
            </button>
          </div>

        </div>
      </div>

      {/* ── SECTION 4: Data Table & Mobile Cards ── */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-3 bg-white" style={{ border: '1px solid #E2E8F0' }}>
        {loading ? (
          <div className="py-5 text-center">
            <LoadingSpinner text="LOADING" subtext="Retrieving enterprise company profiles..." />
          </div>
        ) : companies.length === 0 ? (
          <div className="text-center py-5">
            <h6 className="fw-bold mb-1 text-dark" style={{ fontSize: '0.95rem' }}>
              No Companies Found
            </h6>
            <p className="text-muted small mb-0" style={{ fontSize: '0.80rem' }}>
              Try adjusting your search criteria or clearing filters.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (>= 768px) */}
            <div className="table-responsive d-none d-md-block">
              <table className="table align-middle mb-0" style={{ fontSize: '0.84rem' }}>
                <thead style={{ backgroundColor: '#0F172A', color: '#FFFFFF' }}>
                  <tr>
                    <th className="py-3 px-3.5" style={{ letterSpacing: '0.5px', fontSize: '0.72rem' }}>CODE</th>
                    <th className="py-3 px-3.5" style={{ letterSpacing: '0.5px', fontSize: '0.72rem' }}>COMPANY NAME</th>
                    <th className="py-3 px-3.5" style={{ letterSpacing: '0.5px', fontSize: '0.72rem' }}>CONTACT PERSON</th>
                    <th className="py-3 px-3.5" style={{ letterSpacing: '0.5px', fontSize: '0.72rem' }}>PHONE / EMAIL</th>
                    <th className="py-3 px-3.5" style={{ letterSpacing: '0.5px', fontSize: '0.72rem' }}>LOCATION</th>
                    <th className="py-3 px-3.5" style={{ letterSpacing: '0.5px', fontSize: '0.72rem' }}>STATUS</th>
                    <th className="py-3 px-3.5 text-end" style={{ letterSpacing: '0.5px', fontSize: '0.72rem' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((comp) => (
                    <tr key={comp._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td className="px-3.5 py-3">
                        <span
                          className="badge font-monospace"
                          style={{ backgroundColor: '#EFF6FF', color: '#0369A1', border: '1px solid #BFDBFE', padding: '5px 8px' }}
                        >
                          {comp.profileCode || 'N/A'}
                        </span>
                      </td>

                      <td className="px-3.5 py-3">
                        <button
                          type="button"
                          className="btn btn-link text-decoration-none p-0 fw-bold text-start"
                          style={{ color: '#1E5385', fontSize: '0.88rem' }}
                          onClick={() => {
                            setSelectedCompanyId(comp._id);
                            setShowDetailModal(true);
                          }}
                        >
                          {comp.company}
                        </button>
                      </td>

                      <td className="px-3.5 py-3 fw-semibold text-dark">
                        {comp.contactPerson}
                      </td>

                      <td className="px-3.5 py-3">
                        <div className="font-monospace fw-semibold text-dark">{comp.contactNumber}</div>
                        <small className="text-muted">{comp.contactEmail || '—'}</small>
                      </td>

                      <td className="px-3.5 py-3">
                        <div className="fw-semibold text-dark">
                          {[comp.area, comp.state].filter(Boolean).join(', ') || comp.country}
                        </div>
                        <small className="text-muted">{comp.country}</small>
                      </td>

                      <td className="px-3.5 py-3">
                        <span
                          className={`badge rounded-pill fw-semibold ${
                            comp.status === 'Disabled'
                              ? 'bg-danger-subtle text-danger border-danger'
                              : 'bg-success-subtle text-success border-success'
                          }`}
                          style={{ fontSize: '0.72rem', padding: '4px 10px', border: '1px solid' }}
                        >
                          {comp.status}
                        </span>
                      </td>

                      <td className="px-3.5 py-3 text-end">
                        <div className="d-inline-flex align-items-center justify-content-end" style={{ gap: '8px' }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-info rounded-3 d-flex align-items-center justify-content-center"
                            style={{ width: '34px', height: '34px', padding: 0 }}
                            title="View Profile"
                            onClick={() => {
                              setSelectedCompanyId(comp._id);
                              setShowDetailModal(true);
                            }}
                          >
                            <Icons.Eye />
                          </button>

                          {can('companies', 'edit') && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary rounded-3 d-flex align-items-center justify-content-center"
                              style={{ width: '34px', height: '34px', padding: 0 }}
                              title="Edit Profile"
                              onClick={() => navigate(`/companies/${comp._id}/edit`)}
                            >
                              <Icons.Edit />
                            </button>
                          )}

                          {can('companies', 'activate') && (
                            <button
                              type="button"
                              className={`btn btn-sm ${
                                comp.status === 'Disabled' ? 'btn-outline-success' : 'btn-outline-warning'
                              } rounded-3 d-flex align-items-center justify-content-center`}
                              style={{ width: '34px', height: '34px', padding: 0 }}
                              title={comp.status === 'Disabled' ? 'Activate' : 'Deactivate'}
                              onClick={() => handleStatusToggle(comp)}
                            >
                              {comp.status === 'Disabled' ? <Icons.CheckCircle /> : <Icons.SlashCircle />}
                            </button>
                          )}

                          {can('companies', 'delete') && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger rounded-3 d-flex align-items-center justify-content-center"
                              style={{ width: '34px', height: '34px', padding: 0 }}
                              title="Delete Profile"
                              onClick={() => handleDelete(comp)}
                            >
                              <Icons.Trash />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View Cards (< 768px) */}
            <div className="d-block d-md-none p-2 p-sm-3">
              <div className="d-flex flex-column" style={{ gap: '10px' }}>
                {companies.map((comp) => (
                  <div
                    key={comp._id}
                    className="mobile-company-card"
                  >
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div className="pe-2 text-truncate">
                        <span
                          className="badge font-monospace mb-1"
                          style={{ backgroundColor: '#EFF6FF', color: '#0369A1', border: '1px solid #BFDBFE', fontSize: '0.70rem' }}
                        >
                          {comp.profileCode || 'N/A'}
                        </span>
                        <h6 className="fw-bold mb-0 text-dark text-truncate" style={{ fontSize: '0.96rem' }}>
                          {comp.company}
                        </h6>
                      </div>

                      <span
                        className={`badge rounded-pill fw-semibold flex-shrink-0 ${
                          comp.status === 'Disabled' ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success'
                        }`}
                        style={{ fontSize: '0.68rem', padding: '3px 8px' }}
                      >
                        {comp.status}
                      </span>
                    </div>

                    <div
                      className="p-2.5 rounded-3 mb-2.5"
                      style={{ backgroundColor: '#F8FAFC', border: '1px solid #F1F5F9', fontSize: '0.78rem' }}
                    >
                      <div className="d-flex align-items-center justify-content-between mb-1.5">
                        <span className="text-muted">Person:</span>
                        <strong className="text-dark text-truncate ps-2">{comp.contactPerson || '—'}</strong>
                      </div>
                      <div className="d-flex align-items-center justify-content-between mb-1.5">
                        <span className="text-muted">Phone:</span>
                        <span className="font-monospace text-dark fw-bold">{comp.contactNumber || '—'}</span>
                      </div>
                      <div className="d-flex align-items-center justify-content-between">
                        <span className="text-muted">Area:</span>
                        <span className="text-dark text-truncate text-end ps-2" style={{ maxWidth: '65%' }}>
                          {[comp.area, comp.state, comp.country].filter(Boolean).join(', ') || '—'}
                        </span>
                      </div>
                    </div>

                    {/* Mobile Action Buttons */}
                    <div className="d-flex align-items-center pt-2 border-top" style={{ borderColor: '#F1F5F9', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-info flex-fill fw-semibold d-inline-flex align-items-center justify-content-center mobile-company-action-btn rounded-2"
                        style={{ gap: '4px' }}
                        onClick={() => {
                          setSelectedCompanyId(comp._id);
                          setShowDetailModal(true);
                        }}
                      >
                        <Icons.Eye />
                        <span>View</span>
                      </button>

                      {can('companies', 'edit') && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary flex-fill fw-semibold d-inline-flex align-items-center justify-content-center mobile-company-action-btn rounded-2"
                          style={{ gap: '4px' }}
                          onClick={() => navigate(`/companies/${comp._id}/edit`)}
                        >
                          <Icons.Edit />
                          <span>Edit</span>
                        </button>
                      )}

                      {can('companies', 'activate') && (
                        <button
                          type="button"
                          className={`btn btn-sm ${
                            comp.status === 'Disabled' ? 'btn-outline-success' : 'btn-outline-warning'
                          } flex-fill fw-semibold d-inline-flex align-items-center justify-content-center mobile-company-action-btn rounded-2`}
                          style={{ gap: '4px' }}
                          onClick={() => handleStatusToggle(comp)}
                        >
                          {comp.status === 'Disabled' ? <Icons.CheckCircle /> : <Icons.SlashCircle />}
                          <span>{comp.status === 'Disabled' ? 'Active' : 'Disable'}</span>
                        </button>
                      )}

                      {can('companies', 'delete') && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger d-inline-flex align-items-center justify-content-center flex-shrink-0 rounded-2"
                          style={{ width: '40px', height: '40px', padding: 0 }}
                          onClick={() => handleDelete(comp)}
                          title="Delete"
                        >
                          <Icons.Trash />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── SECTION 5: Pagination Footer ── */}
        <div
          className="bg-white border-top d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2"
          style={{ borderColor: '#E2E8F0', padding: '14px 16px' }}
        >
          <div className="small text-muted text-center text-sm-start" style={{ fontSize: '0.78rem' }}>
            Showing <strong>{companies.length}</strong> of <strong>{pagination.total}</strong> records
          </div>
          <Pagination pagination={pagination} onPageChange={(p) => setPage(p)} />
        </div>
      </div>

      {/* Details Modal */}
      {showDetailModal && (
        <CompanyDetailPage
          companyId={selectedCompanyId}
          show={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedCompanyId(null);
          }}
        />
      )}
    </div>
  );
};

export default CompanyListPage;