import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Receipt,
  Wallet,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Search,
  Eye,
  Check,
  X,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  UserCheck,
  RotateCcw,
  RefreshCw,
  Building,
  BarChart3,
} from 'lucide-react';
import { expenseApi } from '../../api/expenseApi';
import { usePermission } from '../../hooks/usePermission';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/Skeleton';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';
import PermissionGate from '../../components/permissions/PermissionGate';

// Enhanced Child Modals & Components
import EmployeeStatementModal from './components/EmployeeStatementModal';
import ClaimDetailsModal from './components/ClaimDetailsModal';
import ClaimSettlementModal from './components/ClaimSettlementModal';
import CompanyDateFilterBar from './components/CompanyDateFilterBar';
import CompanyPeriodicReportView from './components/CompanyPeriodicReportView';

const ExpenseMainPage = () => {
  const { can } = usePermission();
  const canApprove = can('expenses', 'approve');
  const canManageAdvance = can('expenses', 'manage_advance');

  // Retrieve current user
  const currentUser = useMemo(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  }, []);

  // Tabs: 'my' or 'team'
  const [activeTab, setActiveTab] = useState('my');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // My Balance & Financial KPIs (Phase 6)
  const [balance, setBalance] = useState({
    totalAdvanceReceived: 0,
    totalExpensesDeducted: 0,
    totalRefundsReceived: 0,
    totalReimbursementsPaid: 0,
    currentBalance: 0,
    pendingClaimsCount: 0,
    pendingClaimsAmount: 0,
    approvedUnsettledAmount: 0,
    reimbursementsPendingAmount: 0,
  });

  // Team Financial Overview (Phase 2B)
  const [teamOverview, setTeamOverview] = useState({
    summaryCards: {
      employeesWithPendingClaims: 0,
      totalPendingClaims: 0,
      totalPendingClaimAmount: 0,
      totalOutstandingEmployeeAdvances: 0,
    },
    employeeSummaries: [],
  });
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [empPage, setEmpPage] = useState(1);
  const empPerPage = 8;

  // Team Tab Global Date Filter & View Mode
  const [teamDateFilter, setTeamDateFilter] = useState({
    startDate: '',
    endDate: '',
    label: 'All Records',
    preset: 'all',
  });
  const [teamView, setTeamView] = useState('overview'); // 'overview' | 'reports'

  // Claims Table State
  const [claims, setClaims] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [settlementFilter, setSettlementFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Modals state
  const [receiptModal, setReceiptModal] = useState({
    show: false,
    receipts: [],
    currentIndex: 0,
    claimId: '',
  });
  const [rejectModal, setRejectModal] = useState({ show: false, claimId: '', reason: '' });
  const [statementModal, setStatementModal] = useState({ show: false, userId: '' });
  const [detailsModal, setDetailsModal] = useState({ show: false, claim: null });
  const [settleModal, setSettleModal] = useState({ show: false, claim: null });
  const [processingId, setProcessingId] = useState(null);

  // Extract all receipts for a claim across items, arrays, single URLs and top-level attachments
  const getClaimReceipts = (claim) => {
    if (!claim) return [];
    const list = [];
    const seenUrls = new Set();

    const pushReceipt = (url, category, description, amount, date, label) => {
      if (!url || typeof url !== 'string' || seenUrls.has(url.trim())) return;
      const cleanUrl = url.trim();
      seenUrls.add(cleanUrl);
      list.push({
        url: cleanUrl,
        itemCategory: category || 'General',
        itemDescription: description || '',
        itemAmount: amount || 0,
        itemDate: date || claim.createdAt,
        label: label || `Bill #${list.length + 1}`,
        employeeId: claim.userId?.employeeId || claim.userId?.empId || 'EMP',
      });
    };

    // 1. Check itemized entries
    if (Array.isArray(claim.items)) {
      claim.items.forEach((item, itemIdx) => {
        const itemUrls = [];
        if (Array.isArray(item.receiptUrls)) {
          itemUrls.push(...item.receiptUrls.filter(Boolean));
        }
        if (item.receiptUrl && !itemUrls.includes(item.receiptUrl)) {
          itemUrls.push(item.receiptUrl);
        }

        itemUrls.forEach((u, uIdx) => {
          pushReceipt(
            u,
            item.category || `Item #${itemIdx + 1}`,
            item.description,
            item.amount,
            item.date,
            itemUrls.length > 1 ? `Bill #${uIdx + 1}` : (item.category || `Bill #${itemIdx + 1}`)
          );
        });
      });
    }

    // 2. Check top-level receiptUrls array
    if (Array.isArray(claim.receiptUrls)) {
      claim.receiptUrls.forEach((u, uIdx) => {
        pushReceipt(u, 'Receipt Attachment', '', 0, claim.createdAt, `Receipt #${uIdx + 1}`);
      });
    }

    // 3. Check top-level attachments array
    if (Array.isArray(claim.attachments)) {
      claim.attachments.forEach((att, aIdx) => {
        const u = typeof att === 'string' ? att : att?.url;
        pushReceipt(u, 'Attachment', '', 0, claim.createdAt, `Attachment #${aIdx + 1}`);
      });
    }

    // 4. Fallback top-level receiptUrl
    if (claim.receiptUrl) {
      pushReceipt(claim.receiptUrl, 'Receipt', '', 0, claim.createdAt, 'Receipt #1');
    }

    return list;
  };

  // Keyboard navigation for multi-receipt viewer
  useEffect(() => {
    if (!receiptModal.show || receiptModal.receipts.length <= 1) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        setReceiptModal((prev) => ({
          ...prev,
          currentIndex: (prev.currentIndex - 1 + prev.receipts.length) % prev.receipts.length,
        }));
      } else if (e.key === 'ArrowRight') {
        setReceiptModal((prev) => ({
          ...prev,
          currentIndex: (prev.currentIndex + 1) % prev.receipts.length,
        }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [receiptModal.show, receiptModal.receipts.length]);

  const handleDownloadReceipt = async (receipt, index) => {
    if (!receipt?.url) return;
    try {
      const response = await fetch(receipt.url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const isPdf = /\.pdf($|\?)/i.test(receipt.url) || blob.type.includes('pdf');
      const ext = isPdf ? 'pdf' : (receipt.url.split('.').pop().split('?')[0] || 'jpg');
      const dateStr = receipt.itemDate
        ? new Date(receipt.itemDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      const customName = `${receipt.employeeId || 'EMP'}_${dateStr}_Receipt_${index + 1}.${ext}`;

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = customName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download failed, opening directly:', err);
      window.open(receipt.url, '_blank');
    }
  };

  useEffect(() => {
    setPage(1);
    setSearchQuery('');
    setStatusFilter(activeTab === 'team' ? 'Pending' : '');
    setSettlementFilter('');
  }, [activeTab]);

  const fetchData = async (overrideTeamFilter = teamDateFilter) => {
    setLoading(true);
    try {
      // 1. My Balance / Employee KPIs
      const balRes = await expenseApi.getMyBalance();
      if (balRes.data?.success) setBalance(balRes.data.data);

      // 2. Team Financial Overview (when on Team tab or if authorized)
      if (canApprove || activeTab === 'team') {
        try {
          const overviewParams = {};
          if (overrideTeamFilter?.startDate) overviewParams.startDate = overrideTeamFilter.startDate;
          if (overrideTeamFilter?.endDate) overviewParams.endDate = overrideTeamFilter.endDate;

          const overviewRes = await expenseApi.getEmployeeFinancialOverview(overviewParams);
          if (overviewRes.data?.success) {
            setTeamOverview(overviewRes.data.data);
          }
        } catch (oErr) {
          console.warn('Could not load team employee summary:', oErr);
        }
      }

      // 3. Claims List
      const params = { page, limit: 12 };
      if (statusFilter) params.status = statusFilter;
      if (settlementFilter) params.settlementStatus = settlementFilter;
      if (dateFrom) params.startDate = dateFrom;
      if (dateTo) params.endDate = dateTo;

      const claimRes =
        activeTab === 'my'
          ? await expenseApi.getMyClaims(params)
          : await expenseApi.getClaims(params);

      if (claimRes.data?.success) {
        setClaims(claimRes.data.data.records || []);
        setPagination({
          page: claimRes.data.data.pagination.page || 1,
          totalPages: claimRes.data.data.pagination.pages || 1,
          total: claimRes.data.data.pagination.total || 0,
        });
      }
    } catch (err) {
      console.error('Failed to load expense dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, activeTab, statusFilter, settlementFilter, dateFrom, dateTo]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Filtered claims for live search
  const filteredClaims = useMemo(() => {
    return claims.filter((claim) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const matchesId = claim._id?.toLowerCase().includes(q);
      const matchesEmp = claim.userId?.name?.toLowerCase().includes(q);
      const matchesEmpId = claim.userId?.employeeId?.toLowerCase().includes(q);
      const matchesDesc = claim.items?.some((it) => it.description?.toLowerCase().includes(q));
      return matchesId || matchesEmp || matchesEmpId || matchesDesc;
    });
  }, [claims, searchQuery]);

  // Filtered employee summaries for Team Overview
  const filteredEmployeeSummaries = useMemo(() => {
    const list = teamOverview.employeeSummaries || [];
    if (!employeeSearch.trim()) return list;
    const q = employeeSearch.toLowerCase();
    return list.filter(
      (emp) =>
        emp.name?.toLowerCase().includes(q) ||
        emp.employeeId?.toLowerCase().includes(q) ||
        emp.email?.toLowerCase().includes(q) ||
        emp.department?.toLowerCase().includes(q)
    );
  }, [teamOverview.employeeSummaries, employeeSearch]);

  const paginatedEmployeeSummaries = useMemo(() => {
    const start = (empPage - 1) * empPerPage;
    return filteredEmployeeSummaries.slice(start, start + empPerPage);
  }, [filteredEmployeeSummaries, empPage]);

  // Handle Approve (pure approval without auto-deducting advance)
  const handleApprove = async (id) => {
    if (!window.confirm('Approve this expense claim? Note: Settlement will be processed separately.')) return;
    setProcessingId(id);
    try {
      await expenseApi.approveClaim(id, { remarks: 'Approved by reviewer' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Approval failed');
    } finally {
      setProcessingId(null);
    }
  };

  // Handle Reject
  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectModal.reason.trim()) {
      alert('Please state a reason for rejecting the claim.');
      return;
    }
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

  return (
    <div className="erp-fade-in pb-4">
      {/* ── Page Header ── */}
      <PageHeader
        title="Expense Claims & Advance Ledger"
        subtitle="Manage employee reimbursements, receipt attachments, and corporate advance balances"
        breadcrumbs={[{ label: 'Finance' }, { label: 'Expenses' }]}
        actions={
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="erp-btn erp-btn-secondary erp-btn-sm"
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh ledger records"
            >
              <RefreshCw size={14} className={refreshing ? 'erp-spin' : ''} />
              <span>Refresh</span>
            </button>

            {/* My Advance Statement Action (Phase 6) */}
            {currentUser && (
              <button
                type="button"
                className="erp-btn erp-btn-secondary erp-btn-sm d-inline-flex align-items-center gap-1.5"
                onClick={() => setStatementModal({ show: true, userId: currentUser._id })}
                title="View My Chronological Advance Statement"
              >
                <FileText size={14} />
                <span>My Statement</span>
              </button>
            )}

            {canManageAdvance && (
              <Link to="/expenses/advances" className="erp-btn erp-btn-secondary erp-btn-sm">
                <Wallet size={14} />
                <span>Advance Ledger</span>
              </Link>
            )}

            <Link to="/expenses/submit" className="erp-btn erp-btn-primary erp-btn-sm">
              <Plus size={15} />
              <span>Submit Claim</span>
            </Link>
          </div>
        }
      />

      {/* ── Tabs Navigation ── */}
      <div className="erp-tab-group mb-4">
        <button
          type="button"
          className={`erp-tab-btn ${activeTab === 'my' ? 'active' : ''}`}
          onClick={() => setActiveTab('my')}
        >
          <Receipt size={16} />
          <span>My Submitted Claims</span>
        </button>

        {canApprove && (
          <button
            type="button"
            className={`erp-tab-btn ${activeTab === 'team' ? 'active' : ''}`}
            onClick={() => setActiveTab('team')}
          >
            <CheckCircle2 size={16} />
            <span>Team Approvals & Financial Review</span>
            {teamOverview.summaryCards?.totalPendingClaims > 0 && (
              <span className="badge bg-danger rounded-pill ms-1.5" style={{ fontSize: '11px' }}>
                {teamOverview.summaryCards.totalPendingClaims}
              </span>
            )}
          </button>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1: MY EXPENSES (PHASE 6 & PHASE 2A)
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'my' && (
        <>
          {/* Employee Personal Summary Cards (Phase 6) */}
          <div className="row g-3 mb-4">
            <div className="col-12 col-sm-6 col-xl-2dot4 col-lg-4">
              <StatCard
                title="Advances Received"
                value={`₹${(balance.totalAdvanceReceived || 0).toLocaleString()}`}
                subtitle="Total corporate advances"
                icon={Wallet}
                variant="primary"
              />
            </div>

            <div className="col-12 col-sm-6 col-xl-2dot4 col-lg-4">
              <StatCard
                title="Expenses Adjusted"
                value={`₹${(balance.totalExpensesDeducted || 0).toLocaleString()}`}
                subtitle="Deducted from advances"
                icon={TrendingDown}
                variant="danger"
              />
            </div>

            <div className="col-12 col-sm-6 col-xl-2dot4 col-lg-4">
              <StatCard
                title="Available Advance"
                value={`₹${(balance.currentBalance || 0).toLocaleString()}`}
                subtitle={balance.currentBalance < 0 ? 'Negative balance' : 'Remaining advance'}
                icon={TrendingUp}
                variant={balance.currentBalance < 0 ? 'danger' : 'success'}
              />
            </div>

            <div className="col-12 col-sm-6 col-xl-2dot4 col-lg-6">
              <StatCard
                title="Pending Claims"
                value={`₹${(balance.pendingClaimsAmount || 0).toLocaleString()}`}
                subtitle={`${balance.pendingClaimsCount || 0} claims awaiting review`}
                icon={Clock}
                variant="warning"
              />
            </div>

            <div className="col-12 col-sm-6 col-xl-2dot4 col-lg-6">
              <StatCard
                title="Reimbursement Pending"
                value={`₹${(balance.reimbursementsPendingAmount || 0).toLocaleString()}`}
                subtitle="Approved personal payouts"
                icon={CreditCard}
                variant="info"
              />
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2: TEAM APPROVALS & FINANCIAL REVIEW (PHASE 2B)
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'team' && (
        <>
          {/* Global Company-Wide Date Filter Bar */}
          <CompanyDateFilterBar
            title="Team Approvals & Company-Wide Reporting Filter"
            onFilterChange={(newFilter) => {
              setTeamDateFilter(newFilter);
              fetchData(newFilter);
            }}
            activeFilter={teamDateFilter}
          />

          {/* View Mode Toggle: Overview vs Periodic Reports */}
          <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                className={`btn btn-sm px-3 py-1.5 fw-semibold d-inline-flex align-items-center gap-1.5 ${
                  teamView === 'overview'
                    ? 'btn-primary text-white shadow-sm'
                    : 'btn-light border text-secondary'
                }`}
                onClick={() => setTeamView('overview')}
              >
                <UserCheck size={14} />
                <span>Employee Financial Overview</span>
                <span className="badge bg-white text-primary rounded-pill small ms-1">
                  {teamOverview.employeeSummaries?.length || 0}
                </span>
              </button>

              <button
                type="button"
                className={`btn btn-sm px-3 py-1.5 fw-semibold d-inline-flex align-items-center gap-1.5 ${
                  teamView === 'reports'
                    ? 'btn-primary text-white shadow-sm'
                    : 'btn-light border text-secondary'
                }`}
                onClick={() => setTeamView('reports')}
              >
                <BarChart3 size={14} />
                <span>Periodic Financial Reports</span>
              </button>
            </div>

            <div className="text-muted small d-none d-md-block">
              Filter Active: <strong className="text-dark">{teamDateFilter.label}</strong>
            </div>
          </div>

          {teamView === 'reports' && (
            <CompanyPeriodicReportView
              dateFilter={teamDateFilter}
              title="Team & Company Periodic Financial Reports"
            />
          )}

          {/* Team Summary Cards (Phase 2B) */}
          <div className="row g-3 mb-4">
            <div className="col-12 col-sm-6 col-lg-3">
              <StatCard
                title="Staff With Pending Claims"
                value={teamOverview.summaryCards?.employeesWithPendingClaims || 0}
                subtitle="Employees needing review"
                icon={UserCheck}
                variant="warning"
              />
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <StatCard
                title="Total Pending Claims"
                value={teamOverview.summaryCards?.totalPendingClaims || 0}
                subtitle="Claims awaiting action"
                icon={Clock}
                variant="primary"
              />
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <StatCard
                title="Pending Claim Amount"
                value={`₹${(teamOverview.summaryCards?.totalPendingClaimAmount || 0).toLocaleString()}`}
                subtitle="Total claim queue value"
                icon={TrendingDown}
                variant="danger"
              />
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <StatCard
                title="Total Outstanding Advances"
                value={`₹${(teamOverview.summaryCards?.totalOutstandingEmployeeAdvances || 0).toLocaleString()}`}
                subtitle="Active corporate advance total"
                icon={Wallet}
                variant="success"
              />
            </div>
          </div>

          {/* Employee-wise Financial Overview (Phase 2B) */}
          <div className="erp-card p-3 mb-4">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
              <div>
                <h6 className="fw-bold text-dark mb-0 fs-6">
                  Employee-wise Financial Overview
                </h6>
                <small className="text-muted">
                  Aggregated employee claim metrics, advance distributions, and financial ledger status
                </small>
              </div>

              <div className="d-flex align-items-center gap-2">
                <input
                  type="text"
                  className="erp-input erp-search-input"
                  placeholder="Filter employees..."
                  style={{ width: '220px' }}
                  value={employeeSearch}
                  onChange={(e) => {
                    setEmployeeSearch(e.target.value);
                    setEmpPage(1);
                  }}
                />
              </div>
            </div>

            <div className="table-responsive border rounded-3">
              <table className="erp-table mb-0 table-sm">
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th>Emp ID</th>
                    <th>Email</th>
                    <th className="text-center">Total Claims</th>
                    <th className="text-end text-warning">Pending (Count / ₹)</th>
                    <th className="text-end text-primary">Approved (₹)</th>
                    <th className="text-end text-muted">Advances Issued (₹)</th>
                    <th className="text-end text-danger">Adjusted (₹)</th>
                    <th className="text-end text-success fs-6">Advance Balance</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEmployeeSummaries.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="text-center py-4 text-muted">
                        No employee summary records found.
                      </td>
                    </tr>
                  ) : (
                    paginatedEmployeeSummaries.map((emp) => (
                      <tr key={emp._id}>
                        <td>
                          <div className="fw-bold text-dark">{emp.name}</div>
                          <small className="text-muted">{emp.department} • {emp.designation}</small>
                        </td>
                        <td>
                          <span className="font-monospace fw-semibold text-secondary small">
                            {emp.employeeId}
                          </span>
                        </td>
                        <td className="small text-muted">{emp.email}</td>
                        <td className="text-center font-monospace fw-semibold">
                          {emp.totalClaimsSubmitted}
                        </td>
                        <td className="text-end font-monospace">
                          {(emp.pendingClaimsCount || 0) > 0 ? (
                            <span className="text-warning-emphasis fw-bold">
                              {emp.pendingClaimsCount} (₹{(emp.pendingClaimAmount ?? emp.pendingAmount ?? 0).toLocaleString()})
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="text-end font-monospace fw-semibold text-primary">
                          ₹{(emp.approvedClaimsAmount ?? emp.approvedAmount ?? 0).toLocaleString()}
                        </td>
                        <td className="text-end font-monospace fw-semibold text-muted">
                          ₹{(emp.totalAdvancesIssued || 0).toLocaleString()}
                        </td>
                        <td className="text-end font-monospace fw-semibold text-danger">
                          -₹{(emp.totalExpensesAdjusted || 0).toLocaleString()}
                        </td>
                        <td className="text-end font-monospace fw-bold fs-6">
                          {(() => {
                            const bal = emp.currentAdvanceBalance ?? emp.outstandingAdvanceBalance ?? 0;
                            return (
                              <span
                                className={
                                  bal > 0
                                    ? 'text-success'
                                    : bal < 0
                                    ? 'text-danger'
                                    : 'text-muted'
                                }
                              >
                                ₹{bal.toLocaleString()}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="text-end text-nowrap">
                          <button
                            type="button"
                            className="erp-btn erp-btn-secondary erp-btn-sm d-inline-flex align-items-center gap-1"
                            onClick={() => setStatementModal({ show: true, userId: emp._id })}
                            title="View Employee Financial Statement & Ledger"
                          >
                            <FileText size={12} />
                            <span>View Details</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {filteredEmployeeSummaries.length > empPerPage && (
              <div className="p-2 pt-3 d-flex justify-content-end">
                <Pagination
                  pagination={{
                    page: empPage,
                    totalPages: Math.ceil(filteredEmployeeSummaries.length / empPerPage) || 1,
                    total: filteredEmployeeSummaries.length,
                  }}
                  onPageChange={(p) => setEmpPage(p)}
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Claims Filter Bar ── */}
      <div className="erp-card p-3 mb-3">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-4">
            <div className="erp-search-group">
              <span className="erp-search-icon">
                <Search size={15} />
              </span>
              <input
                type="text"
                className="erp-input erp-search-input"
                placeholder="Search claims by ID, employee, or note..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="col-6 col-md-2">
            <select
              className="erp-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Review Statuses</option>
              <option value="Pending">Pending Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          <div className="col-6 col-md-2">
            <select
              className="erp-select"
              value={settlementFilter}
              onChange={(e) => {
                setSettlementFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Settlements</option>
              <option value="UNSETTLED">Unsettled</option>
              <option value="SETTLED_ADVANCE">Adjusted Advance</option>
              <option value="REIMBURSED">Reimbursed / Paid</option>
            </select>
          </div>

          <div className="col-6 col-md-2">
            <input
              type="date"
              className="erp-input"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              title="From Date"
            />
          </div>

          <div className="col-6 col-md-2 text-md-end text-muted small">
            <span>
              Showing {filteredClaims.length} of {pagination.total || claims.length} records
            </span>
          </div>
        </div>
      </div>

      {/* ── Claims Data Table ── */}
      {loading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : filteredClaims.length === 0 ? (
        <div className="erp-card p-5 text-center">
          <EmptyState
            icon={Receipt}
            title={activeTab === 'my' ? 'No expense claims submitted' : 'No claims found'}
            description={
              activeTab === 'my'
                ? 'You have not submitted any reimbursement claims yet.'
                : 'There are no claims matching your filter criteria.'
            }
            actionLabel={activeTab === 'my' ? 'Submit Claim' : undefined}
            onAction={activeTab === 'my' ? () => {} : undefined}
          />
        </div>
      ) : (
        <div className="erp-table-container">
          <div className="table-responsive">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Claim ID</th>
                  {activeTab === 'team' && <th>Employee</th>}
                  <th>Items / Category</th>
                  <th>Claim Amount</th>
                  <th>Approved Amount</th>
                  <th>Date Logged</th>
                  <th>Receipts</th>
                  <th>Status</th>
                  <th>Settlement</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClaims.map((claim) => {
                  const claimReceipts = getClaimReceipts(claim);
                  const isSettledAdvance = claim.settlementStatus === 'SETTLED_ADVANCE';
                  const isReimbursed = claim.settlementStatus === 'REIMBURSED';

                  return (
                    <tr key={claim._id}>
                      {/* Claim ID */}
                      <td>
                        <span className="font-monospace fw-bold text-primary small">
                          #{claim._id?.slice(-6).toUpperCase()}
                        </span>
                      </td>

                      {/* Employee (Team tab) */}
                      {activeTab === 'team' && (
                        <td>
                          <div className="fw-semibold text-dark">
                            {claim.userId?.name || 'Staff Member'}
                          </div>
                          <small className="text-muted d-block">
                            {claim.userId?.employeeId || claim.userId?.email || '—'}
                          </small>
                        </td>
                      )}

                      {/* Items / Category */}
                      <td>
                        <div className="small fw-semibold text-dark">
                          {claim.items?.[0]?.category || 'General Expense'}
                        </div>
                        <small className="text-muted text-truncate d-block" style={{ maxWidth: '220px' }}>
                          {claim.items?.[0]?.description || 'Travel & operational expense'}
                          {claim.items?.length > 1 && ` (+${claim.items.length - 1} more)`}
                        </small>
                      </td>

                      {/* Claim Amount */}
                      <td>
                        <span className="fw-bold font-monospace text-dark">
                          ₹{(claim.totalClaimAmount || 0).toLocaleString()}
                        </span>
                      </td>

                      {/* Approved Amount */}
                      <td>
                        <span className="font-monospace fw-semibold text-primary">
                          {claim.approvedAmount ? `₹${claim.approvedAmount.toLocaleString()}` : '—'}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="small text-nowrap">
                        {new Date(claim.createdAt || claim.date).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Receipts */}
                      <td>
                        {claimReceipts.length > 0 ? (
                          <button
                            type="button"
                            className="erp-btn erp-btn-secondary erp-btn-sm p-1 px-2 d-inline-flex align-items-center gap-1.5"
                            onClick={() =>
                              setReceiptModal({
                                show: true,
                                claimId: claim._id,
                                receipts: claimReceipts,
                                currentIndex: 0,
                              })
                            }
                            title={`Inspect ${claimReceipts.length} Attached Receipt${claimReceipts.length > 1 ? 's' : ''}`}
                          >
                            <Eye size={13} />
                            <span>View</span>
                            <span
                              className={`badge rounded-pill px-1.5 py-0.5 ${
                                claimReceipts.length > 1
                                  ? 'bg-primary text-white'
                                  : 'bg-secondary-subtle text-secondary'
                              }`}
                              style={{ fontSize: '10px', lineHeight: 1 }}
                            >
                              {claimReceipts.length}
                            </span>
                          </button>
                        ) : (
                          <span className="text-muted small">No receipt</span>
                        )}
                      </td>

                      {/* Approval Status */}
                      <td>
                        <StatusBadge status={claim.status || 'Pending'} size="sm" />
                      </td>

                      {/* Settlement Status */}
                      <td>
                        <span
                          className={`badge px-2 py-0.5 rounded-pill small ${
                            isSettledAdvance
                              ? 'bg-success-subtle text-success border border-success-subtle'
                              : isReimbursed
                              ? 'bg-primary-subtle text-primary border border-primary-subtle'
                              : 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'
                          }`}
                        >
                          {isSettledAdvance
                            ? 'Adjusted Advance'
                            : isReimbursed
                            ? 'Reimbursed'
                            : 'Unsettled'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="text-end text-nowrap">
                        <div className="d-inline-flex align-items-center gap-1">
                          {/* Claim Details button (Phase 2A) */}
                          <button
                            type="button"
                            className="erp-btn erp-btn-secondary erp-btn-sm p-1.5 px-2"
                            onClick={() => setDetailsModal({ show: true, claim })}
                            title="View Full Claim Details & Entries"
                          >
                            <FileText size={13} />
                            <span>Details</span>
                          </button>

                          {/* Approval / Settlement Actions for Reviewers */}
                          {activeTab === 'team' && canApprove && (
                            <>
                              {claim.status === 'Pending' && (
                                <>
                                  <button
                                    type="button"
                                    className="erp-btn erp-btn-success erp-btn-sm p-1.5"
                                    onClick={() => handleApprove(claim._id)}
                                    disabled={processingId === claim._id}
                                    title="Approve Claim (Settlement Pending)"
                                  >
                                    <Check size={14} />
                                    <span>Approve</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="erp-btn erp-btn-danger-outline erp-btn-sm p-1.5"
                                    onClick={() => setRejectModal({ show: true, claimId: claim._id, reason: '' })}
                                    disabled={processingId === claim._id}
                                    title="Reject Claim"
                                  >
                                    <X size={14} />
                                  </button>
                                </>
                              )}

                              {claim.status === 'Approved' && claim.settlementStatus === 'UNSETTLED' && (
                                <button
                                  type="button"
                                  className="erp-btn erp-btn-primary erp-btn-sm p-1.5 px-2.5 d-inline-flex align-items-center gap-1"
                                  onClick={() => setSettleModal({ show: true, claim })}
                                  title="Process Settlement (Advance Adjustment or Reimbursement)"
                                >
                                  <CreditCard size={13} />
                                  <span>Settle</span>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-3 border-top">
            <Pagination pagination={pagination} onPageChange={(p) => setPage(p)} />
          </div>
        </div>
      )}

      {/* ── Multi-Receipt Viewer Modal ── */}
      {receiptModal.show && receiptModal.receipts.length > 0 && (() => {
        const activeReceipt = receiptModal.receipts[receiptModal.currentIndex] || receiptModal.receipts[0];
        const isPdf = activeReceipt?.url && (/\.pdf($|\?)/i.test(activeReceipt.url) || activeReceipt.url.includes('pdf'));
        const totalReceipts = receiptModal.receipts.length;

        return (
          <Modal
            show={receiptModal.show}
            title={
              totalReceipts > 1
                ? `Attached Expense Receipts (${receiptModal.currentIndex + 1} of ${totalReceipts})`
                : 'Attached Expense Receipt'
            }
            onClose={() => setReceiptModal({ show: false, receipts: [], currentIndex: 0, claimId: '' })}
            size={totalReceipts > 1 ? 'lg' : 'md'}
            icon={Receipt}
          >
            <div>
              {/* Top toolbar */}
              <div className="d-flex align-items-center justify-content-between p-2 mb-3 rounded-2 bg-light border">
                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-primary text-white px-2 py-1 rounded-pill small">
                    {activeReceipt.label}
                  </span>
                  <span className="badge bg-secondary-subtle text-secondary px-2 py-1 rounded-pill small">
                    {activeReceipt.itemCategory}
                  </span>
                  {activeReceipt.itemAmount > 0 && (
                    <span className="fw-semibold text-dark small font-monospace">
                      ₹{activeReceipt.itemAmount.toLocaleString()}
                    </span>
                  )}
                </div>

                <div className="d-flex align-items-center gap-1.5">
                  <button
                    type="button"
                    className="erp-btn erp-btn-secondary erp-btn-sm p-1 px-2 d-inline-flex align-items-center gap-1"
                    onClick={() => handleDownloadReceipt(activeReceipt, receiptModal.currentIndex)}
                    title="Download / Save this receipt"
                  >
                    <Download size={13} />
                    <span>Save</span>
                  </button>
                  <a
                    href={activeReceipt.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="erp-btn erp-btn-secondary erp-btn-sm p-1 px-2 d-inline-flex align-items-center gap-1 text-decoration-none"
                    title="Open original file in new tab"
                  >
                    <ExternalLink size={13} />
                    <span>Open</span>
                  </a>
                </div>
              </div>

              {/* Viewer container with left/right navigation */}
              <div
                className="position-relative d-flex align-items-center justify-content-center p-3 rounded-3"
                style={{
                  backgroundColor: '#0F172A',
                  minHeight: '380px',
                  maxHeight: '68vh',
                  overflow: 'hidden',
                }}
              >
                {/* Previous button */}
                {totalReceipts > 1 && (
                  <button
                    type="button"
                    className="btn btn-dark position-absolute start-0 ms-2 rounded-circle d-flex align-items-center justify-content-center shadow-lg"
                    style={{
                      width: '40px',
                      height: '40px',
                      zIndex: 10,
                      backgroundColor: 'rgba(15, 23, 42, 0.85)',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                    }}
                    onClick={() =>
                      setReceiptModal((prev) => ({
                        ...prev,
                        currentIndex: (prev.currentIndex - 1 + totalReceipts) % totalReceipts,
                      }))
                    }
                    title="Previous receipt (Left Arrow)"
                  >
                    <ChevronLeft size={22} color="#FFFFFF" />
                  </button>
                )}

                {/* Media (Image or PDF) */}
                {isPdf ? (
                  <iframe
                    src={activeReceipt.url}
                    title={`Receipt ${receiptModal.currentIndex + 1}`}
                    className="w-100 rounded border-0"
                    style={{ height: '62vh' }}
                  />
                ) : (
                  <img
                    src={activeReceipt.url}
                    alt={`Receipt ${receiptModal.currentIndex + 1}`}
                    className="img-fluid rounded-2 shadow"
                    style={{
                      maxHeight: '62vh',
                      maxWidth: '100%',
                      objectFit: 'contain',
                    }}
                  />
                )}

                {/* Next button */}
                {totalReceipts > 1 && (
                  <button
                    type="button"
                    className="btn btn-dark position-absolute end-0 me-2 rounded-circle d-flex align-items-center justify-content-center shadow-lg"
                    style={{
                      width: '40px',
                      height: '40px',
                      zIndex: 10,
                      backgroundColor: 'rgba(15, 23, 42, 0.85)',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                    }}
                    onClick={() =>
                      setReceiptModal((prev) => ({
                        ...prev,
                        currentIndex: (prev.currentIndex + 1) % totalReceipts,
                      }))
                    }
                    title="Next receipt (Right Arrow)"
                  >
                    <ChevronRight size={22} color="#FFFFFF" />
                  </button>
                )}
              </div>

              {/* Bottom thumbnail gallery strip */}
              {totalReceipts > 1 && (
                <div className="d-flex align-items-center justify-content-center gap-2 mt-3 pt-2 border-top overflow-auto py-1">
                  {receiptModal.receipts.map((rcpt, idx) => {
                    const isActive = idx === receiptModal.currentIndex;
                    const isRcptPdf = /\.pdf($|\?)/i.test(rcpt.url);

                    return (
                      <button
                        key={idx}
                        type="button"
                        className="p-1 rounded-2 border position-relative"
                        style={{
                          width: '74px',
                          height: '58px',
                          cursor: 'pointer',
                          backgroundColor: '#F8FAFC',
                          borderColor: isActive ? 'var(--erp-primary, #087FF5)' : 'var(--erp-border, #E2E8F0)',
                          boxShadow: isActive ? '0 0 0 2.5px rgba(8, 127, 245, 0.45)' : 'none',
                          opacity: isActive ? 1 : 0.6,
                          transform: isActive ? 'scale(1.05)' : 'scale(1)',
                          transition: 'all 0.15s ease',
                        }}
                        onClick={() => setReceiptModal((prev) => ({ ...prev, currentIndex: idx }))}
                        title={`Select Bill #${idx + 1}`}
                      >
                        {isRcptPdf ? (
                          <div className="w-100 h-100 d-flex flex-column align-items-center justify-content-center text-danger">
                            <FileText size={18} />
                            <span style={{ fontSize: '9px', fontWeight: 600 }}>PDF</span>
                          </div>
                        ) : (
                          <img
                            src={rcpt.url}
                            alt={`Thumb ${idx + 1}`}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              borderRadius: '4px',
                            }}
                          />
                        )}
                        <span
                          className="position-absolute top-0 start-0 bg-dark text-white rounded-bottom px-1"
                          style={{ fontSize: '9px', fontWeight: 700, opacity: 0.85 }}
                        >
                          #{idx + 1}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </Modal>
        );
      })()}

      {/* ── Reject Reason Modal ── */}
      {rejectModal.show && (
        <Modal
          show={rejectModal.show}
          title="Reject Expense Claim"
          onClose={() => setRejectModal({ show: false, claimId: '', reason: '' })}
          size="md"
          icon={XCircle}
        >
          <form onSubmit={handleRejectSubmit}>
            <div className="mb-3">
              <label className="erp-label">Rejection Remarks *</label>
              <textarea
                className="erp-textarea"
                rows={3}
                placeholder="State the reason for rejecting this claim (e.g. Missing tax invoice, unauthorized travel expense)..."
                value={rejectModal.reason}
                onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                required
              />
            </div>

            <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
              <button
                type="button"
                className="erp-btn erp-btn-secondary"
                onClick={() => setRejectModal({ show: false, claimId: '', reason: '' })}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="erp-btn erp-btn-danger"
                disabled={processingId === rejectModal.claimId}
              >
                Confirm Rejection
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Individual Claim Details Modal (Phase 2A) ── */}
      {detailsModal.show && (
        <ClaimDetailsModal
          show={detailsModal.show}
          claim={detailsModal.claim}
          onClose={() => setDetailsModal({ show: false, claim: null })}
          canApprove={canApprove}
          onSettle={(claimToSettle) => {
            setDetailsModal({ show: false, claim: null });
            setSettleModal({ show: true, claim: claimToSettle });
          }}
        />
      )}

      {/* ── Financial Settlement Modal (Phase 5) ── */}
      {settleModal.show && (
        <ClaimSettlementModal
          show={settleModal.show}
          claim={settleModal.claim}
          onClose={() => setSettleModal({ show: false, claim: null })}
          onSuccess={fetchData}
        />
      )}

      {/* ── Employee Statement & Ledger Modal (Phase 2B & Phase 3C) ── */}
      {statementModal.show && (
        <EmployeeStatementModal
          show={statementModal.show}
          userId={statementModal.userId}
          onClose={() => setStatementModal({ show: false, userId: '' })}
        />
      )}
    </div>
  );
};

export default ExpenseMainPage;
