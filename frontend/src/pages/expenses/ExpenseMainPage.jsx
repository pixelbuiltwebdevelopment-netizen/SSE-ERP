import React, { useState, useEffect, useMemo, useRef } from 'react';
import { expenseApi } from '../../api/expenseApi';
import { usePermission } from '../../hooks/usePermission';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';
import { Link } from 'react-router-dom';

// Official ERP Design System Palette
const ERP_COLORS = {
  primary: '#087FF5',       // Electric Blue
  sidebar: '#071A33',       // Deep Navy
  secondaryBlue: '#0057B8', // Royal Blue
  silver: '#C5CED8',        // Metallic Silver
  mainBg: '#F4F7FB',        // Ice White
  cardBg: '#FFFFFF',        // Pure White
  textPrimary: '#1E293B',   // Slate
  textSecondary: '#64748B', // Gray
  border: '#E2E8F0',        // Light Gray
  success: '#16A34A',       // Green
  warning: '#D97706',       // Amber
  error: '#DC2626',         // Red
};

// Date range calculation for ERP periods
const calculatePeriodRange = (period) => {
  const now = new Date();
  switch (period) {
    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start, end };
    }
    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start, end };
    }
    case 'last_30_days': {
      const start = new Date();
      start.setDate(now.getDate() - 30);
      return { start, end: now };
    }
    case 'this_year': {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { start, end };
    }
    default:
      return null;
  }
};

const ExpenseMainPage = () => {
  const { can } = usePermission();
  const [balance, setBalance] = useState({ totalAdvanceReceived: 0, totalExpensesDeducted: 0, currentBalance: 0 });
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  
  // Permissions
  const canApprove = can('expenses', 'approve');
  const canManageAdvance = can('expenses', 'manage_advance');

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState('my');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('');
  
  // Hybrid Employee & Text Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const searchBoxRef = useRef(null);

  // Modals
  const [viewModal, setViewModal] = useState({ show: false, claim: null });
  const [previewReceipt, setPreviewReceipt] = useState(null);
  const [rejectModal, setRejectModal] = useState({ show: false, claimId: '', reason: '' });
  const [processingId, setProcessingId] = useState(null);

  // Close employee combobox on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setIsEmployeeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset filters when switching tabs
  useEffect(() => {
    setPage(1);
    setStatusFilter(activeTab === 'team' ? 'Pending' : '');
    setPeriodFilter('');
    setSearchQuery('');
    setSelectedEmployee(null);
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const balRes = await expenseApi.getMyBalance();
      if (balRes.data?.success) setBalance(balRes.data.data);

      const params = { page, limit: 10 };
      if (statusFilter) params.status = statusFilter;

      if (periodFilter) {
        const range = calculatePeriodRange(periodFilter);
        if (range) {
          params.startDate = range.start.toISOString();
          params.endDate = range.end.toISOString();
          params.period = periodFilter;
        }
      }

      const claimRes = activeTab === 'my' 
        ? await expenseApi.getMyClaims(params)
        : await expenseApi.getClaims(params);

      if (claimRes.data?.success) {
        setClaims(claimRes.data.data.records || []);
        setPagination({
          page: claimRes.data.data.pagination.page || 1,
          totalPages: claimRes.data.data.pagination.pages || 1,
          total: claimRes.data.data.pagination.total || 0
        });
      }
    } catch (err) {
      console.error('Failed to load expense dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, activeTab, statusFilter, periodFilter]);

  // Extract unique employees from records for the searchable dropdown
  const uniqueEmployees = useMemo(() => {
    const empMap = new Map();
    claims.forEach((claim) => {
      if (claim.userId && claim.userId._id) {
        if (!empMap.has(claim.userId._id)) {
          empMap.set(claim.userId._id, {
            id: claim.userId._id,
            name: claim.userId.name || 'Unnamed Employee',
            email: claim.userId.email || '',
            employeeId: claim.userId.employeeId || claim.userId._id.slice(-6).toUpperCase(),
            count: 1
          });
        } else {
          empMap.get(claim.userId._id).count += 1;
        }
      }
    });
    return Array.from(empMap.values());
  }, [claims]);

  // Filter employees inside the dropdown matching typed search
  const filteredDropdownEmployees = useMemo(() => {
    if (!searchQuery) return uniqueEmployees;
    const query = searchQuery.toLowerCase();
    return uniqueEmployees.filter((emp) => 
      emp.name.toLowerCase().includes(query) || 
      emp.email.toLowerCase().includes(query) ||
      emp.employeeId.toLowerCase().includes(query)
    );
  }, [uniqueEmployees, searchQuery]);

  // Hybrid Filtering
  const filteredClaims = useMemo(() => {
    return claims.filter((claim) => {
      if (selectedEmployee) {
        if (claim.userId?._id !== selectedEmployee.id) return false;
      }

      if (searchQuery && !selectedEmployee) {
        const query = searchQuery.toLowerCase();
        const matchesId = claim._id.toLowerCase().includes(query);
        const matchesEmp = claim.userId?.name?.toLowerCase().includes(query);
        const matchesDesc = claim.items?.some((it) => it.description?.toLowerCase().includes(query));
        if (!matchesId && !matchesEmp && !matchesDesc) return false;
      }

      if (periodFilter) {
        const range = calculatePeriodRange(periodFilter);
        if (range) {
          const claimDate = new Date(claim.createdAt || claim.date);
          if (claimDate < range.start || claimDate > range.end) return false;
        }
      }

      return true;
    });
  }, [claims, searchQuery, selectedEmployee, periodFilter]);

  const filteredTotalAmount = useMemo(() => {
    return filteredClaims.reduce((acc, c) => acc + (c.totalClaimAmount || 0), 0);
  }, [filteredClaims]);

  const handleSelectEmployee = (emp) => {
    setSelectedEmployee(emp);
    setSearchQuery(emp.name);
    setIsEmployeeDropdownOpen(false);
    setPage(1);
  };

  const handleClearEmployeeSelection = () => {
    setSelectedEmployee(null);
    setSearchQuery('');
    setPage(1);
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Approve this claim? Amount will be deducted from employee balance.')) return;
    setProcessingId(id);
    try {
      await expenseApi.approveClaim(id);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Approval failed');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    setProcessingId(rejectModal.claimId);
    try {
      await expenseApi.rejectClaim(rejectModal.claimId, rejectModal.reason);
      setRejectModal({ show: false, claimId: '', reason: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Rejection failed');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDownloadModalReceipt = async (fileUrl, employeeId, itemDate, rIdx) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const isPdf = /\.pdf($|\?)/i.test(fileUrl) || blob.type.includes('pdf');
      const ext = isPdf ? 'pdf' : (fileUrl.split('.').pop().split('?')[0] || 'jpg');

      const safeDate = itemDate ? new Date(itemDate).toISOString().split('T')[0] : 'date';
      const safeEmpId = employeeId || 'EMP';
      const customFileName = `${safeEmpId}_${safeDate}_Receipt_${rIdx + 1}.${ext}`;

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = customFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download error:', err);
      window.open(fileUrl, '_blank');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return (
          <span 
            className="badge px-3 py-1.5 fw-semibold text-nowrap"
            style={{ 
              backgroundColor: '#DCFCE7', 
              color: ERP_COLORS.success, 
              border: '1px solid #BBF7D0', 
              borderRadius: '6px',
              fontSize: '0.74rem'
            }}
          >
            ● Approved
          </span>
        );
      case 'Rejected':
        return (
          <span 
            className="badge px-3 py-1.5 fw-semibold text-nowrap"
            style={{ 
              backgroundColor: '#FEE2E2', 
              color: ERP_COLORS.error, 
              border: '1px solid #FECACA', 
              borderRadius: '6px',
              fontSize: '0.74rem'
            }}
          >
            ✕ Rejected
          </span>
        );
      default:
        return (
          <span 
            className="badge px-3 py-1.5 fw-semibold text-nowrap"
            style={{ 
              backgroundColor: '#FEF3C7', 
              color: ERP_COLORS.warning, 
              border: '1px solid #FDE68A', 
              borderRadius: '6px',
              fontSize: '0.74rem'
            }}
          >
            ⏳ Pending
          </span>
        );
    }
  };

  return (
    <>
      <style>{`
        .erp-page-fade {
          animation: erpFadeIn 0.3s ease-out;
        }
        @keyframes erpFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .erp-card-elevated {
          transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s ease;
        }
        .erp-card-elevated:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08) !important;
        }

        .erp-btn-hover {
          transition: all 0.18s ease-in-out;
        }
        .erp-btn-hover:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(8, 127, 245, 0.25);
        }

        .erp-table-row {
          transition: background-color 0.16s ease;
        }
        .erp-table-row:hover {
          background-color: #F8FAFC !important;
        }

        .erp-input-focus:focus {
          border-color: #087FF5 !important;
          box-shadow: 0 0 0 3px rgba(8, 127, 245, 0.12) !important;
        }

        .combobox-menu {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          background: #FFFFFF;
          border-radius: 12px;
          border: 1px solid #CBD5E1;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14);
          z-index: 1050;
          max-height: 280px;
          overflow-y: auto;
          animation: menuSlide 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes menuSlide {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .combobox-item {
          padding: 9px 12px;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }
        .combobox-item:hover {
          background-color: #F1F5F9;
        }
        .combobox-item.active {
          background-color: #EBF4FE;
        }
      `}</style>

      {/* Main Canvas with Fluid Responsive Padding */}
      <div 
        className="w-100 px-3 px-sm-4 px-xl-5 py-4 erp-page-fade" 
        style={{ backgroundColor: ERP_COLORS.mainBg, minHeight: '100vh', color: ERP_COLORS.textPrimary }}
      >
        <div className="mx-auto" style={{ maxWidth: '1360px' }}>
          
          {/* 1. Header Banner */}
          <div 
            className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4 p-3.5 p-sm-4 rounded-4 shadow-sm erp-card-elevated"
            style={{ backgroundColor: ERP_COLORS.cardBg, border: `1px solid ${ERP_COLORS.border}` }}
          >
            <div>
              <div className="d-flex align-items-center gap-2 mb-2">
                <span 
                  className="badge rounded-pill px-2.5 py-1 fw-bold"
                  style={{ backgroundColor: '#EBF4FE', color: ERP_COLORS.primary, fontSize: '0.68rem', letterSpacing: '0.5px' }}
                >
                  FINANCIAL LEDGER
                </span>
                {periodFilter === 'last_month' && (
                  <span 
                    className="badge rounded-pill px-2.5 py-1 fw-bold"
                    style={{ backgroundColor: '#FEF3C7', color: ERP_COLORS.warning, fontSize: '0.68rem' }}
                  >
                    LAST MONTH'S EXPENSES
                  </span>
                )}
                {selectedEmployee && (
                  <span 
                    className="badge rounded-pill px-2.5 py-1 fw-bold"
                    style={{ backgroundColor: '#DCFCE7', color: ERP_COLORS.success, fontSize: '0.68rem' }}
                  >
                    EMPLOYEE: {selectedEmployee.name.toUpperCase()}
                  </span>
                )}
              </div>
              <h3 className="fw-bold mb-1" style={{ color: ERP_COLORS.sidebar, fontSize: '1.4rem', letterSpacing: '-0.3px' }}>
                Expense & Advance Hub
              </h3>
              <p className="small mb-0 text-muted" style={{ fontSize: '0.82rem' }}>
                Monitor advance ledger balances, audit monthly claims, and verify employee reimbursement cycles.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="d-flex flex-wrap align-items-center gap-2.5 gap-sm-3 w-100 w-md-auto mt-2 mt-md-0 pt-1 pt-md-0">
              {canManageAdvance && (
                <Link 
                  to="/expenses/advances" 
                  className="btn fw-semibold px-3.5 px-sm-4 py-2.5 flex-grow-1 flex-md-grow-0 erp-btn-hover"
                  style={{ 
                    borderRadius: '8px', 
                    border: `1.5px solid ${ERP_COLORS.success}`, 
                    color: ERP_COLORS.success,
                    backgroundColor: ERP_COLORS.cardBg,
                    fontSize: '0.84rem'
                  }}
                >
                  🏦 Advance Management
                </Link>
              )}
              <Link 
                to="/expenses/submit" 
                className="btn text-white fw-bold px-4 py-2.5 shadow-sm flex-grow-1 flex-md-grow-0 erp-btn-hover"
                style={{ 
                  borderRadius: '8px', 
                  backgroundColor: ERP_COLORS.primary, 
                  border: 'none',
                  fontSize: '0.84rem'
                }}
              >
                + Submit Claim
              </Link>
            </div>
          </div>

          {/* 2. KPI Balance Cards */}
          <div className="row g-3 g-xl-4 mb-4">
            <div className="col-12 col-md-4">
              <div 
                className="card border-0 shadow-sm rounded-4 text-white h-100 erp-card-elevated" 
                style={{ background: `linear-gradient(135deg, ${ERP_COLORS.primary} 0%, ${ERP_COLORS.secondaryBlue} 100%)` }}
              >
                <div className="card-body p-3.5 p-sm-4 d-flex flex-column justify-content-between">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="small text-uppercase fw-bold opacity-75" style={{ fontSize: '0.70rem', letterSpacing: '0.5px' }}>
                      Available Balance
                    </span>
                    <span className="fs-5">💳</span>
                  </div>
                  <div>
                    <h2 className="fw-bold mb-1" style={{ fontSize: '1.75rem', letterSpacing: '-0.5px' }}>
                      ₹{balance.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h2>
                    <small className="opacity-75 d-block" style={{ fontSize: '0.75rem' }}>
                      Remaining funds from disbursed advances
                    </small>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div 
                className="card border-0 shadow-sm rounded-4 text-white h-100 erp-card-elevated" 
                style={{ background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)' }}
              >
                <div className="card-body p-3.5 p-sm-4 d-flex flex-column justify-content-between">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="small text-uppercase fw-bold opacity-75" style={{ fontSize: '0.70rem', letterSpacing: '0.5px' }}>
                      Approved Expenses
                    </span>
                    <span className="fs-5">📊</span>
                  </div>
                  <div>
                    <h2 className="fw-bold mb-1" style={{ fontSize: '1.75rem', letterSpacing: '-0.5px' }}>
                      ₹{balance.totalExpensesDeducted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h2>
                    <small className="opacity-75 d-block" style={{ fontSize: '0.75rem' }}>
                      Total settled and deducted against ledger
                    </small>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div 
                className="card border-0 shadow-sm rounded-4 text-white h-100 erp-card-elevated" 
                style={{ background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)' }}
              >
                <div className="card-body p-3.5 p-sm-4 d-flex flex-column justify-content-between">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="small text-uppercase fw-bold opacity-75" style={{ fontSize: '0.70rem', letterSpacing: '0.5px' }}>
                      Total Advance Received
                    </span>
                    <span className="fs-5">🏦</span>
                  </div>
                  <div>
                    <h2 className="fw-bold mb-1" style={{ fontSize: '1.75rem', letterSpacing: '-0.5px' }}>
                      ₹{balance.totalAdvanceReceived.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h2>
                    <small className="opacity-75 d-block" style={{ fontSize: '0.75rem' }}>
                      Cumulative funds issued by company
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. My Claims & Team Approvals Tabs */}
          {canApprove && (
            <div 
              className="d-flex flex-wrap align-items-center gap-2 my-4 p-1.5 rounded-3 shadow-sm"
              style={{ 
                backgroundColor: ERP_COLORS.cardBg, 
                border: `1px solid ${ERP_COLORS.border}`,
                width: 'fit-content'
              }}
            >
              <button
                type="button"
                className="btn fw-bold px-4 py-2 erp-btn-hover"
                onClick={() => setActiveTab('my')}
                style={{
                  borderRadius: '8px',
                  backgroundColor: activeTab === 'my' ? ERP_COLORS.primary : 'transparent',
                  color: activeTab === 'my' ? '#FFFFFF' : ERP_COLORS.textSecondary,
                  border: 'none',
                  fontSize: '0.84rem',
                  boxShadow: activeTab === 'my' ? '0 3px 8px rgba(8, 127, 245, 0.25)' : 'none',
                }}
              >
                My Claims
              </button>
              <button
                type="button"
                className="btn fw-bold px-4 py-2 erp-btn-hover"
                onClick={() => setActiveTab('team')}
                style={{
                  borderRadius: '8px',
                  backgroundColor: activeTab === 'team' ? ERP_COLORS.primary : 'transparent',
                  color: activeTab === 'team' ? '#FFFFFF' : ERP_COLORS.textSecondary,
                  border: 'none',
                  fontSize: '0.84rem',
                  boxShadow: activeTab === 'team' ? '0 3px 8px rgba(8, 127, 245, 0.25)' : 'none',
                }}
              >
                Team Approvals
              </button>
            </div>
          )}

          {/* 4. Filter Toolbar with FIXED Segmented Quick Period Control */}
          <div 
            className="d-flex flex-column gap-3 mb-4 p-3.5 p-sm-4 rounded-4 shadow-sm"
            style={{ backgroundColor: ERP_COLORS.cardBg, border: `1px solid ${ERP_COLORS.border}` }}
          >
            {/* Header Row with Records Counter and Segmented Quick Period */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2.5">
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <h6 className="fw-bold mb-0" style={{ color: ERP_COLORS.sidebar, fontSize: '0.94rem' }}>
                  {activeTab === 'my' ? 'My Expense Submissions' : 'Team Submissions for Approval'}
                </h6>
                <span 
                  className="badge rounded-pill fw-semibold"
                  style={{ backgroundColor: '#F1F5F9', color: ERP_COLORS.textSecondary, border: `1px solid ${ERP_COLORS.border}`, fontSize: '0.72rem', padding: '4px 9px' }}
                >
                  {filteredClaims.length} records
                </span>
                {filteredTotalAmount > 0 && (
                  <span 
                    className="badge rounded-pill fw-bold"
                    style={{ backgroundColor: '#DCFCE7', color: ERP_COLORS.success, fontSize: '0.72rem', padding: '4px 9px' }}
                  >
                    Total: ₹{filteredTotalAmount.toLocaleString()}
                  </span>
                )}
              </div>

              {/* Seamless Segmented Control without overflow */}
              <div 
                className="d-inline-flex align-items-center rounded-3"
                style={{ 
                  backgroundColor: '#F1F5F9', 
                  border: `1px solid ${ERP_COLORS.border}`,
                  padding: '3px',
                  gap: '3px'
                }}
              >
                <span 
                  style={{ 
                    fontSize: '0.68rem', 
                    fontWeight: '700', 
                    color: ERP_COLORS.textSecondary, 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.5px',
                    padding: '0 8px 0 6px',
                    userSelect: 'none'
                  }}
                >
                  Quick Period:
                </span>

                {/* All Button */}
                <button
                  type="button"
                  className="btn p-0"
                  onClick={() => { setPeriodFilter(''); setPage(1); }}
                  style={{
                    height: '28px',
                    padding: '0 12px',
                    fontSize: '0.74rem',
                    fontWeight: periodFilter === '' ? '700' : '500',
                    color: periodFilter === '' ? '#087FF5' : ERP_COLORS.textSecondary,
                    backgroundColor: periodFilter === '' ? '#FFFFFF' : 'transparent',
                    borderRadius: '6px',
                    border: 'none',
                    boxShadow: periodFilter === '' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  All
                </button>

                {/* This Month Button */}
                <button
                  type="button"
                  className="btn p-0"
                  onClick={() => { setPeriodFilter('this_month'); setPage(1); }}
                  style={{
                    height: '28px',
                    padding: '0 12px',
                    fontSize: '0.74rem',
                    fontWeight: periodFilter === 'this_month' ? '700' : '500',
                    color: periodFilter === 'this_month' ? '#087FF5' : ERP_COLORS.textSecondary,
                    backgroundColor: periodFilter === 'this_month' ? '#FFFFFF' : 'transparent',
                    borderRadius: '6px',
                    border: 'none',
                    boxShadow: periodFilter === 'this_month' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  This Month
                </button>

                {/* Last Month Button */}
                <button
                  type="button"
                  className="btn p-0"
                  onClick={() => { setPeriodFilter('last_month'); setPage(1); }}
                  style={{
                    height: '28px',
                    padding: '0 12px',
                    fontSize: '0.74rem',
                    fontWeight: periodFilter === 'last_month' ? '700' : '600',
                    color: periodFilter === 'last_month' ? '#B45309' : '#D97706',
                    backgroundColor: periodFilter === 'last_month' ? '#FEF3C7' : 'transparent',
                    borderRadius: '6px',
                    border: periodFilter === 'last_month' ? '1px solid #FDE68A' : 'none',
                    boxShadow: periodFilter === 'last_month' ? '0 1px 3px rgba(217, 119, 6, 0.15)' : 'none',
                    transition: 'all 0.15s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <span>📅</span> Last Month
                </button>
              </div>
            </div>

            {/* Inputs & Hybrid Combobox Row */}
            <div className="row g-2.5 align-items-center pt-2 border-top" style={{ borderColor: '#F1F5F9' }}>
              
              {/* Dual-Function Search Box & Employee Dropdown with Enlarged Chevron */}
              <div className="col-12 col-md-5" ref={searchBoxRef}>
                <div className="position-relative">
                  <div className="input-group">
                    <span 
                      className="input-group-text bg-white border-end-0 text-muted"
                      style={{ borderColor: selectedEmployee ? '#087FF5' : '#CBD5E1', padding: '0 12px' }}
                    >
                      {selectedEmployee ? '👤' : '🔍'}
                    </span>
                    <input
                      type="text"
                      className="form-control form-control-sm border-start-0 border-end-0 shadow-none erp-input-focus"
                      placeholder={selectedEmployee ? `Selected: ${selectedEmployee.name}` : "Search by employee, claim #, or item..."}
                      value={searchQuery}
                      onFocus={() => setIsEmployeeDropdownOpen(true)}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (selectedEmployee) setSelectedEmployee(null);
                        setIsEmployeeDropdownOpen(true);
                      }}
                      style={{ 
                        borderColor: selectedEmployee ? '#087FF5' : '#CBD5E1', 
                        padding: '8px 12px',
                        fontSize: '0.82rem',
                        height: '38px',
                        fontWeight: selectedEmployee ? '600' : 'normal',
                        color: selectedEmployee ? '#087FF5' : ERP_COLORS.textPrimary
                      }}
                    />

                    {/* Clear Button */}
                    {(searchQuery || selectedEmployee) && (
                      <button
                        type="button"
                        className="btn btn-outline-secondary border-start-0 border-end-0 bg-white d-flex align-items-center justify-content-center"
                        style={{ 
                          borderColor: selectedEmployee ? '#087FF5' : '#CBD5E1', 
                          color: '#94A3B8',
                          padding: '0 10px'
                        }}
                        onClick={handleClearEmployeeSelection}
                        title="Clear search"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    )}

                    {/* Enlarged Chevron Dropdown Icon with Smooth 180° Flip */}
                    <button
                      type="button"
                      className="btn btn-light border-start-0 d-flex align-items-center justify-content-center"
                      onClick={() => setIsEmployeeDropdownOpen(!isEmployeeDropdownOpen)}
                      title="View all employees"
                      style={{ 
                        borderColor: selectedEmployee ? '#087FF5' : '#CBD5E1',
                        backgroundColor: isEmployeeDropdownOpen ? '#E2E8F0' : '#F8FAFC',
                        padding: '0 14px',
                        height: '38px',
                        cursor: 'pointer'
                      }}
                    >
                      <svg 
                        width="18" 
                        height="18" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke={isEmployeeDropdownOpen ? '#087FF5' : '#475569'} 
                        strokeWidth="2.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        style={{
                          transition: 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.2s ease',
                          transform: isEmployeeDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          display: 'block'
                        }}
                      >
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </button>
                  </div>

                  {/* Floating Employee Selection Menu */}
                  {isEmployeeDropdownOpen && (
                    <div className="combobox-menu">
                      <div className="p-2 border-bottom d-flex justify-content-between align-items-center bg-light">
                        <span className="small fw-bold text-uppercase text-muted" style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}>
                          Select Employee Directory ({uniqueEmployees.length})
                        </span>
                        {selectedEmployee && (
                          <button
                            type="button"
                            className="btn btn-link btn-sm p-0 text-decoration-none text-danger fw-semibold"
                            style={{ fontSize: '0.72rem' }}
                            onClick={handleClearEmployeeSelection}
                          >
                            Reset
                          </button>
                        )}
                      </div>

                      {filteredDropdownEmployees.length === 0 ? (
                        <div className="p-3 text-center text-muted small" style={{ fontSize: '0.80rem' }}>
                          No matching employee found
                        </div>
                      ) : (
                        filteredDropdownEmployees.map((emp) => {
                          const isSelected = selectedEmployee?.id === emp.id;
                          return (
                            <div
                              key={emp.id}
                              className={`combobox-item d-flex align-items-center justify-content-between ${isSelected ? 'active' : ''}`}
                              onClick={() => handleSelectEmployee(emp)}
                            >
                              <div className="d-flex align-items-center gap-2">
                                <div
                                  className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    backgroundColor: isSelected ? ERP_COLORS.primary : '#64748B',
                                    fontSize: '0.78rem'
                                  }}
                                >
                                  {emp.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="fw-bold text-dark" style={{ fontSize: '0.82rem' }}>
                                    {emp.name}
                                  </div>
                                  <small className="text-muted d-block" style={{ fontSize: '0.70rem' }}>
                                    {emp.email || `ID: ${emp.employeeId}`}
                                  </small>
                                </div>
                              </div>
                              <span 
                                className="badge rounded-pill fw-semibold"
                                style={{ backgroundColor: '#F1F5F9', color: '#64748B', fontSize: '0.68rem' }}
                              >
                                {emp.count} claim{emp.count > 1 ? 's' : ''}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Specific Period Dropdown */}
              <div className="col-6 col-md-3">
                <select 
                  className="form-select form-select-sm fw-semibold shadow-none erp-input-focus"
                  value={periodFilter}
                  onChange={(e) => { setPeriodFilter(e.target.value); setPage(1); }}
                  style={{ 
                    borderRadius: '8px', 
                    borderColor: periodFilter === 'last_month' ? '#F59E0B' : '#CBD5E1', 
                    padding: '8px 14px',
                    fontSize: '0.82rem',
                    height: '38px',
                    backgroundColor: periodFilter === 'last_month' ? '#FFFBEB' : '#FFFFFF'
                  }}
                >
                  <option value="">📅 All Time</option>
                  <option value="this_month">Current Month</option>
                  <option value="last_month">Last Month's Expenses</option>
                  <option value="last_30_days">Last 30 Days</option>
                  <option value="this_year">This Financial Year</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="col-6 col-md-2">
                <select 
                  className="form-select form-select-sm fw-semibold shadow-none erp-input-focus"
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                  style={{ 
                    borderRadius: '8px', 
                    borderColor: '#CBD5E1', 
                    padding: '8px 14px',
                    fontSize: '0.82rem',
                    height: '38px',
                  }}
                >
                  <option value="">All Statuses</option>
                  <option value="Pending">Pending Only</option>
                  <option value="Approved">Approved Only</option>
                  <option value="Rejected">Rejected Only</option>
                </select>
              </div>

              {/* Actions & Refresh */}
              <div className="col-12 col-md-2 d-flex justify-content-end align-items-center gap-2 mt-2 mt-md-0">
                {(statusFilter || periodFilter || searchQuery || selectedEmployee) && (
                  <button
                    type="button"
                    className="btn btn-sm btn-link text-decoration-none text-danger fw-semibold p-0 me-2"
                    style={{ fontSize: '0.78rem' }}
                    onClick={() => {
                      setStatusFilter('');
                      setPeriodFilter('');
                      setSearchQuery('');
                      setSelectedEmployee(null);
                      setPage(1);
                    }}
                  >
                    Clear All
                  </button>
                )}

                <button
                  type="button"
                  className="btn btn-sm px-3 erp-btn-hover d-flex align-items-center justify-content-center"
                  onClick={fetchData}
                  title="Refresh claims"
                  style={{ 
                    borderRadius: '8px', 
                    border: `1px solid ${ERP_COLORS.silver}`, 
                    backgroundColor: ERP_COLORS.cardBg,
                    color: ERP_COLORS.textSecondary,
                    height: '38px',
                  }}
                >
                  ↻ Refresh
                </button>
              </div>
            </div>
          </div>

          {/* 5. Claims Table */}
          <div 
            className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4" 
            style={{ border: `1px solid ${ERP_COLORS.border}` }}
          >
            <div className="card-body p-0">
              {loading ? (
                <div className="py-5 text-center">
                  <LoadingSpinner text="Loading expense claims..." />
                </div>
              ) : filteredClaims.length === 0 ? (
                <div className="text-center py-5 px-4" style={{ backgroundColor: ERP_COLORS.cardBg }}>
                  <div 
                    className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
                    style={{ width: '64px', height: '64px', backgroundColor: '#F1F5F9', color: ERP_COLORS.textSecondary }}
                  >
                    <span style={{ fontSize: '1.8rem' }}>🧾</span>
                  </div>
                  <h5 className="fw-bold mb-1" style={{ color: ERP_COLORS.sidebar, fontSize: '1.15rem' }}>No expense claims found</h5>
                  <p className="small mx-auto mb-4" style={{ maxWidth: '440px', color: ERP_COLORS.textSecondary, fontSize: '0.80rem' }}>
                    {selectedEmployee
                      ? `No claims found for ${selectedEmployee.name}.`
                      : periodFilter === 'last_month'
                      ? "No expense submissions found for last month."
                      : "Try clearing search filters or choosing a different status."}
                  </p>
                  <Link 
                    to="/expenses/submit" 
                    className="btn text-white fw-bold px-4 py-2.5 shadow-sm erp-btn-hover"
                    style={{ borderRadius: '8px', backgroundColor: ERP_COLORS.primary, border: 'none', fontSize: '0.84rem' }}
                  >
                    + Submit Claim
                  </Link>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table align-middle mb-0 text-nowrap">
                    <thead style={{ backgroundColor: '#F8FAFC', borderBottom: `1px solid ${ERP_COLORS.border}` }}>
                      <tr style={{ color: ERP_COLORS.textSecondary, fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <th className="py-3 px-3 px-md-4">Claim ID</th>
                        {activeTab === 'team' && <th className="py-3 px-3">Employee</th>}
                        <th className="py-3 px-3">Date</th>
                        <th className="py-3 px-3">Items</th>
                        <th className="py-3 px-3">Total Amount</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="text-end py-3 px-3 px-md-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredClaims.map((claim) => (
                        <tr key={claim._id} className="erp-table-row" style={{ borderBottom: `1px solid ${ERP_COLORS.border}` }}>
                          <td className="py-3.5 px-3 px-md-4 fw-semibold font-monospace" style={{ color: ERP_COLORS.primary, fontSize: '0.84rem' }}>
                            #{claim._id.slice(-6).toUpperCase()}
                          </td>

                          {activeTab === 'team' && (
                            <td className="py-3.5 px-3">
                              <div className="fw-bold text-truncate" style={{ maxWidth: '170px', color: ERP_COLORS.textPrimary, fontSize: '0.84rem' }}>
                                {claim.userId?.name || 'Unknown'}
                              </div>
                              <small className="text-truncate d-block" style={{ maxWidth: '170px', color: ERP_COLORS.textSecondary, fontSize: '0.72rem' }}>
                                {claim.userId?.email}
                              </small>
                            </td>
                          )}

                          <td className="py-3.5 px-3 small" style={{ color: ERP_COLORS.textSecondary, fontSize: '0.80rem' }}>
                            {new Date(claim.createdAt || claim.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          </td>

                          <td className="py-3.5 px-3">
                            <span 
                              className="badge rounded-pill fw-semibold"
                              style={{ 
                                backgroundColor: '#F1F5F9', 
                                color: ERP_COLORS.textSecondary, 
                                border: `1px solid ${ERP_COLORS.border}`,
                                fontSize: '0.72rem',
                                padding: '5px 9px',
                              }}
                            >
                              {claim.items.length} item{claim.items.length > 1 ? 's' : ''}
                            </span>
                          </td>

                          <td className="py-3.5 px-3 fw-bold" style={{ color: ERP_COLORS.sidebar, fontSize: '0.90rem' }}>
                            ₹{claim.totalClaimAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>

                          <td className="py-3.5 px-3">{getStatusBadge(claim.status)}</td>

                          <td className="text-end py-3.5 px-3 px-md-4">
                            <div className="d-flex align-items-center justify-content-end gap-2 flex-nowrap">
                              <button 
                                type="button"
                                className="btn btn-sm fw-semibold text-nowrap erp-btn-hover"
                                onClick={() => setViewModal({ show: true, claim })}
                                style={{ 
                                  borderRadius: '6px', 
                                  border: `1px solid ${ERP_COLORS.silver}`, 
                                  backgroundColor: ERP_COLORS.cardBg,
                                  color: ERP_COLORS.textPrimary,
                                  fontSize: '0.76rem',
                                  padding: '6px 13px'
                                }}
                              >
                                View Details
                              </button>
                              
                              {activeTab === 'team' && claim.status === 'Pending' && (
                                <>
                                  <button 
                                    type="button"
                                    className="btn btn-sm text-white fw-bold text-nowrap erp-btn-hover"
                                    onClick={() => handleApprove(claim._id)}
                                    disabled={processingId === claim._id}
                                    style={{ 
                                      borderRadius: '6px', 
                                      backgroundColor: ERP_COLORS.success,
                                      border: 'none',
                                      fontSize: '0.76rem',
                                      padding: '6px 13px',
                                    }}
                                  >
                                    Approve
                                  </button>

                                  <button 
                                    type="button"
                                    className="btn btn-sm text-white fw-bold text-nowrap erp-btn-hover"
                                    onClick={() => setRejectModal({ show: true, claimId: claim._id, reason: '' })}
                                    disabled={processingId === claim._id}
                                    style={{ 
                                      borderRadius: '6px', 
                                      backgroundColor: ERP_COLORS.error,
                                      border: 'none',
                                      fontSize: '0.76rem',
                                      padding: '6px 13px',
                                    }}
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {!loading && filteredClaims.length > 0 && (
              <div 
                className="card-footer bg-white border-top px-3 px-md-4 py-3 d-flex justify-content-center justify-content-md-end"
                style={{ borderColor: ERP_COLORS.border }}
              >
                <Pagination pagination={pagination} onPageChange={setPage} />
              </div>
            )}
          </div>

        </div>

        {/* View Claim Modal */}
        {viewModal.claim && (
          <Modal 
            show={viewModal.show} 
            title={`Claim #${viewModal.claim._id.slice(-6).toUpperCase()}`} 
            onClose={() => setViewModal({ show: false, claim: null })}
          >
            <div className="p-3.5 mb-3.5 rounded-3" style={{ backgroundColor: '#F8FAFC', border: `1px solid ${ERP_COLORS.border}` }}>
              <div className="row g-3">
                <div className="col-6"><small className="text-muted d-block mb-0.5">Employee</small><strong>{viewModal.claim.userId?.name}</strong></div>
                <div className="col-6"><small className="text-muted d-block mb-0.5">Status</small>{getStatusBadge(viewModal.claim.status)}</div>
                <div className="col-6"><small className="text-muted d-block mb-0.5">Submitted On</small>{new Date(viewModal.claim.createdAt).toLocaleDateString()}</div>
                <div className="col-6">
                  <small className="text-muted d-block mb-0.5">Total Claim</small>
                  <span className="fs-6 fw-bold text-success">₹{viewModal.claim.totalClaimAmount.toLocaleString()}</span>
                </div>
                {viewModal.claim.rejectionReason && (
                  <div className="col-12 mt-2 pt-2 border-top">
                    <strong className="text-danger small d-block mb-0.5">Rejection Reason:</strong>
                    <div className="text-danger small">{viewModal.claim.rejectionReason}</div>
                  </div>
                )}
              </div>
            </div>

            <h6 className="fw-bold mb-3" style={{ color: ERP_COLORS.sidebar, fontSize: '0.88rem' }}>
              Itemized Breakdown & Receipts
            </h6>
            
            <div className="table-responsive mb-3">
              <table className="table table-bordered table-sm align-middle mb-0">
                <thead style={{ backgroundColor: '#F1F5F9' }}>
                  <tr className="small text-secondary" style={{ fontSize: '0.74rem' }}>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5">Description</th>
                    <th className="p-2.5 text-end">Amount</th>
                    <th className="p-2.5 text-center">Receipt(s) & Download</th>
                  </tr>
                </thead>
                <tbody>
                  {viewModal.claim.items.map((item, idx) => {
                    const allReceipts = item.receiptUrls && item.receiptUrls.length > 0 
                      ? item.receiptUrls 
                      : (item.receiptUrl ? [item.receiptUrl] : []);

                    const empId = viewModal.claim.userId?.employeeId 
                      || viewModal.claim.userId?._id?.slice(-6) 
                      || 'EMP';

                    return (
                      <tr key={idx}>
                        <td className="p-2.5 small text-nowrap">{new Date(item.date).toLocaleDateString()}</td>
                        <td className="p-2.5"><span className="badge bg-light text-dark border small">{item.category}</span></td>
                        <td className="p-2.5 small">{item.description}</td>
                        <td className="p-2.5 text-end fw-bold small text-nowrap">₹{item.amount.toLocaleString()}</td>
                        <td className="p-2.5 text-center">
                          {allReceipts.length > 0 ? (
                            <div className="d-flex justify-content-center gap-2 flex-wrap">
                              {allReceipts.map((url, rIdx) => {
                                const isPdf = /\.pdf($|\?)/i.test(url);
                                return (
                                  <div
                                    key={rIdx}
                                    className="d-inline-flex align-items-center rounded-2 overflow-hidden shadow-sm"
                                    style={{
                                      border: `1px solid ${ERP_COLORS.border}`,
                                      backgroundColor: '#FFFFFF',
                                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)'
                                    }}
                                  >
                                    <button
                                      type="button"
                                      className="btn btn-sm fw-semibold erp-btn-hover"
                                      onClick={() => setPreviewReceipt(url)}
                                      style={{
                                        fontSize: '0.72rem',
                                        backgroundColor: '#EBF4FE',
                                        color: ERP_COLORS.primary,
                                        border: 'none',
                                        padding: '4px 8px',
                                      }}
                                      title="Inspect Receipt"
                                    >
                                      {isPdf ? '📄 PDF #' + (rIdx + 1) : '🧾 Bill #' + (rIdx + 1)}
                                    </button>

                                    <button
                                      type="button"
                                      className="btn btn-sm btn-light fw-bold text-success erp-btn-hover"
                                      onClick={() => handleDownloadModalReceipt(url, empId, item.date, rIdx)}
                                      style={{
                                        fontSize: '0.75rem',
                                        borderLeft: `1px solid ${ERP_COLORS.border}`,
                                        borderTop: 'none',
                                        borderRight: 'none',
                                        borderBottom: 'none',
                                        padding: '4px 8px',
                                      }}
                                      title={`Save as: ${empId}_${new Date(item.date).toISOString().split('T')[0]}_Receipt_${rIdx + 1}`}
                                    >
                                      📥 Save
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-muted small">None</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="d-flex justify-content-end pt-3 border-top">
              <button 
                className="btn btn-light fw-semibold px-4 py-2 erp-btn-hover" 
                onClick={() => setViewModal({ show: false, claim: null })}
                style={{ borderRadius: '8px', border: `1px solid ${ERP_COLORS.silver}`, fontSize: '0.82rem' }}
              >
                Close
              </button>
            </div>
          </Modal>
        )}

        {/* Cloudinary Receipt Preview Modal */}
        {previewReceipt && (
          <Modal show={Boolean(previewReceipt)} title="Receipt Preview" onClose={() => setPreviewReceipt(null)}>
            <div className="text-center p-3 p-md-4">
              <img 
                src={previewReceipt} 
                alt="Receipt Preview" 
                className="img-fluid rounded shadow-sm mb-4" 
                style={{ maxHeight: '65vh', objectFit: 'contain' }} 
              />
              <div>
                <a 
                  href={previewReceipt} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="btn text-white fw-bold px-4 py-2.5 erp-btn-hover"
                  style={{ borderRadius: '8px', backgroundColor: ERP_COLORS.primary, fontSize: '0.84rem' }}
                >
                  Open Full Size ↗
                </a>
              </div>
            </div>
          </Modal>
        )}

        {/* Rejection Reason Modal */}
        <Modal 
          show={rejectModal.show} 
          title="Reject Expense Claim" 
          onClose={() => setRejectModal({ show: false, claimId: '', reason: '' })}
        >
          <form onSubmit={handleReject} className="p-2">
            <div className="mb-3">
              <label className="form-label fw-bold small text-muted mb-2" style={{ fontSize: '0.78rem' }}>
                Reason for Rejection *
              </label>
              <textarea
                className="form-control shadow-none erp-input-focus"
                rows="3"
                value={rejectModal.reason}
                onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                required
                placeholder="State the reason (e.g. Missing receipts, over-limit expense)..."
                style={{ borderRadius: '8px', borderColor: ERP_COLORS.border, padding: '10px 14px', fontSize: '0.82rem' }}
              />
            </div>
            <div className="d-flex justify-content-end gap-2.5 pt-3 border-top">
              <button 
                type="button" 
                className="btn btn-light fw-semibold px-3.5 py-2 erp-btn-hover" 
                onClick={() => setRejectModal({ show: false, claimId: '', reason: '' })}
                style={{ borderRadius: '8px', border: `1px solid ${ERP_COLORS.silver}`, fontSize: '0.80rem' }}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn text-white fw-bold px-4 py-2 erp-btn-hover" 
                disabled={processingId === rejectModal.claimId}
                style={{ borderRadius: '8px', backgroundColor: ERP_COLORS.error, border: 'none', fontSize: '0.80rem' }}
              >
                Confirm Rejection
              </button>
            </div>
          </form>
        </Modal>

      </div>
    </>
  );
};

export default ExpenseMainPage;