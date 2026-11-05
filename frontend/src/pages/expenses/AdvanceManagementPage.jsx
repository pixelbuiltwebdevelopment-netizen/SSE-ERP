import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Wallet,
  TrendingDown,
  TrendingUp,
  RotateCcw,
  Clock,
  Search,
  Filter,
  FileText,
  DollarSign,
  UserCheck,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  BarChart3,
  FileSpreadsheet,
} from 'lucide-react';
import { expenseApi } from '../../api/expenseApi';
import { userApi } from '../../api/userApi';
import { usePermission } from '../../hooks/usePermission';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import IssueAdvanceModal from './components/IssueAdvanceModal';
import EmployeeStatementModal from './components/EmployeeStatementModal';
import CompanyDateFilterBar from './components/CompanyDateFilterBar';
import CompanyPeriodicReportView from './components/CompanyPeriodicReportView';
import {
  exportCompanyAdvanceOverviewPDF,
  exportCompanyAdvanceOverviewExcel,
} from '../../utils/exportUtils';

const AdvanceManagementPage = () => {
  const { can } = usePermission();
  const canManageAdvance = can('expenses', 'manage_advance');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Global Company Reporting Period Date Filter
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: '',
    label: 'All Records',
    preset: 'all',
  });
  const [activeView, setActiveView] = useState('ledger'); // 'ledger' | 'reports'

  // Overview data
  const [summaryCards, setSummaryCards] = useState({
    totalAdvancesIssued: 0,
    totalExpensesAdjusted: 0,
    totalOutstandingAdvanceBalance: 0,
    totalEmployeesWithOutstandingAdvances: 0,
    totalPendingAdvanceSettlements: 0,
  });
  const [records, setRecords] = useState([]);
  const [users, setUsers] = useState([]);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [balanceFilter, setBalanceFilter] = useState('ALL'); // 'ALL', 'OUTSTANDING', 'ZERO', 'NEGATIVE'
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 12;

  // Modals
  const [issueModal, setIssueModal] = useState({ show: false, preselectedUserId: '' });
  const [statementModal, setStatementModal] = useState({ show: false, userId: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (filterToUse = dateFilter) => {
    setLoading(true);
    setError('');

    try {
      // 1. Fetch Users list for Issue Advance dropdown
      const userRes = await userApi.getUsers({ limit: 500 });
      if (userRes.data?.success) {
        setUsers(userRes.data.data.users?.filter((u) => u.isActive) || []);
      }
    } catch (err) {
      console.warn('Failed to fetch user list:', err);
    }

    try {
      // 2. Fetch Advance Overview (Cards + Ledgers) with Global Date Filter params
      const params = {};
      if (filterToUse?.startDate) params.startDate = filterToUse.startDate;
      if (filterToUse?.endDate) params.endDate = filterToUse.endDate;

      const overRes = await expenseApi.getAdvanceOverview(params);
      if (overRes.data?.success) {
        setSummaryCards(overRes.data.data.summaryCards || {});
        setRecords(overRes.data.data.records || []);
      }
    } catch (err) {
      console.error('Failed to load advance overview:', err);
      setError('Could not load advance management ledger. Please check your network or permissions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData(dateFilter);
  };

  const handleExportPDF = () => {
    exportCompanyAdvanceOverviewPDF(filteredRecords, summaryCards, {
      startDate: dateFilter.startDate,
      endDate: dateFilter.endDate,
      label: dateFilter.label,
    });
  };

  const handleExportExcel = () => {
    exportCompanyAdvanceOverviewExcel(filteredRecords, summaryCards, {
      startDate: dateFilter.startDate,
      endDate: dateFilter.endDate,
      label: dateFilter.label,
    });
  };

  // Distinct departments for filter
  const departments = useMemo(() => {
    const set = new Set();
    records.forEach((r) => {
      if (r.department && r.department !== 'General') set.add(r.department);
    });
    return Array.from(set);
  }, [records]);

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Balance filter
      if (balanceFilter === 'OUTSTANDING' && r.currentAdvanceBalance <= 0) return false;
      if (balanceFilter === 'ZERO' && r.currentAdvanceBalance !== 0) return false;
      if (balanceFilter === 'NEGATIVE' && r.currentAdvanceBalance >= 0) return false;

      // Department filter
      if (departmentFilter && r.department !== departmentFilter) return false;

      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = r.name?.toLowerCase().includes(q);
        const matchesId = r.employeeId?.toLowerCase().includes(q);
        const matchesEmail = r.email?.toLowerCase().includes(q);
        if (!matchesName && !matchesId && !matchesEmail) return false;
      }

      return true;
    });
  }, [records, balanceFilter, departmentFilter, searchQuery]);

  // Paginated records
  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, page]);

  const pagination = {
    page,
    totalPages: Math.ceil(filteredRecords.length / itemsPerPage) || 1,
    total: filteredRecords.length,
  };

  return (
    <div className="erp-fade-in pb-4">
      {/* ── Page Header ── */}
      <PageHeader
        title="Employee Advance Management & Financial Ledger"
        subtitle="Manage corporate advance distributions, reconciliation statements, and live employee financial balances"
        breadcrumbs={[
          { label: 'Finance' },
          { label: 'Expenses', path: '/expenses' },
          { label: 'Advance Ledger' },
        ]}
        showBackButton={true}
        backFallback="/expenses"
        actions={
          <div className="d-flex flex-wrap align-items-center gap-2">
            <button
              type="button"
              className="erp-btn erp-btn-secondary erp-btn-sm"
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh ledger balances"
            >
              <RefreshCw size={14} className={refreshing ? 'erp-spin' : ''} />
              <span>Refresh</span>
            </button>

            {/* Export buttons */}
            <button
              type="button"
              className="erp-btn erp-btn-secondary erp-btn-sm d-inline-flex align-items-center gap-1.5"
              onClick={handleExportPDF}
              disabled={filteredRecords.length === 0}
              title="Export Advance Overview to PDF"
            >
              <FileText size={13} className="text-danger" />
              <span>PDF</span>
            </button>
            <button
              type="button"
              className="erp-btn erp-btn-secondary erp-btn-sm d-inline-flex align-items-center gap-1.5"
              onClick={handleExportExcel}
              disabled={filteredRecords.length === 0}
              title="Export Advance Overview to Excel"
            >
              <FileSpreadsheet size={13} className="text-success" />
              <span>Excel</span>
            </button>

            {canManageAdvance && (
              <button
                type="button"
                className="erp-btn erp-btn-primary d-inline-flex align-items-center gap-1.5"
                onClick={() => setIssueModal({ show: true, preselectedUserId: '' })}
              >
                <Plus size={16} />
                <span>Issue Advance</span>
              </button>
            )}
          </div>
        }
      />

      {error && <div className="alert alert-danger mb-4 p-3">{error}</div>}

      {/* ── Global Company-Wide Date Filter Bar ── */}
      <CompanyDateFilterBar
        title="Company Advance Reporting Filter"
        onFilterChange={(newFilter) => {
          setDateFilter(newFilter);
          setPage(1);
          fetchData(newFilter);
        }}
        activeFilter={dateFilter}
      />

      {/* ── View Switcher: Employee Ledger vs Periodic Cadence Reports ── */}
      <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className={`btn btn-sm px-3 py-1.5 fw-semibold d-inline-flex align-items-center gap-1.5 ${
              activeView === 'ledger'
                ? 'btn-primary text-white shadow-sm'
                : 'btn-light border text-secondary'
            }`}
            onClick={() => setActiveView('ledger')}
          >
            <UserCheck size={14} />
            <span>Employee Advance Ledger</span>
            <span className="badge bg-white text-primary rounded-pill small ms-1">
              {filteredRecords.length}
            </span>
          </button>

          <button
            type="button"
            className={`btn btn-sm px-3 py-1.5 fw-semibold d-inline-flex align-items-center gap-1.5 ${
              activeView === 'reports'
                ? 'btn-primary text-white shadow-sm'
                : 'btn-light border text-secondary'
            }`}
            onClick={() => setActiveView('reports')}
          >
            <BarChart3 size={14} />
            <span>Periodic Financial Reports</span>
          </button>
        </div>

        <div className="text-muted small d-none d-md-block">
          Reporting Window: <strong className="text-dark">{dateFilter.label}</strong>
        </div>
      </div>

      {activeView === 'reports' ? (
        <CompanyPeriodicReportView
          dateFilter={dateFilter}
          title="Company Periodic Financial & Advance Reports"
        />
      ) : null}

      {/* ── Summary Cards (Phase 3A + Global Filter Aware) ── */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-2dot4 col-lg-4">
          <StatCard
            title={dateFilter.preset === 'all' ? 'Total Advances Issued' : 'Advances Issued (Period)'}
            value={`₹${(summaryCards.totalAdvancesIssued || 0).toLocaleString()}`}
            subtitle={dateFilter.preset === 'all' ? 'Lifetime corporate advances' : `Issued in ${dateFilter.label}`}
            icon={Wallet}
            variant="primary"
          />
        </div>

        <div className="col-12 col-sm-6 col-xl-2dot4 col-lg-4">
          <StatCard
            title={dateFilter.preset === 'all' ? 'Total Expenses Adjusted' : 'Adjusted In Period'}
            value={`₹${(summaryCards.totalExpensesAdjusted || 0).toLocaleString()}`}
            subtitle={dateFilter.preset === 'all' ? 'Amortized through claims' : `Offset in ${dateFilter.label}`}
            icon={TrendingDown}
            variant="danger"
          />
        </div>

        <div className="col-12 col-sm-6 col-xl-2dot4 col-lg-4">
          <StatCard
            title="Closing Outstanding Balance"
            value={`₹${(summaryCards.totalOutstandingAdvanceBalance || 0).toLocaleString()}`}
            subtitle={dateFilter.endDate ? `Balance as of ${dateFilter.endDate}` : 'Current corporate funds with staff'}
            icon={TrendingUp}
            variant="success"
          />
        </div>

        <div className="col-12 col-sm-6 col-xl-2dot4 col-lg-6">
          <StatCard
            title="Active Advance Holders"
            value={summaryCards.totalEmployeesWithOutstandingAdvances || 0}
            subtitle="Staff with balance > ₹0"
            icon={UserCheck}
            variant="info"
          />
        </div>

        <div className="col-12 col-sm-6 col-xl-2dot4 col-lg-6">
          <StatCard
            title="Pending Settlements"
            value={summaryCards.totalPendingAdvanceSettlements || 0}
            subtitle="Approved claims to adjust"
            icon={Clock}
            variant="warning"
          />
        </div>
      </div>

      {/* ── Filter Controls ── */}
      <div className="erp-card p-3 mb-3">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-5">
            <div className="erp-search-group">
              <span className="erp-search-icon">
                <Search size={15} />
              </span>
              <input
                type="text"
                className="erp-input erp-search-input"
                placeholder="Search by employee name, employee ID, or email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          <div className="col-6 col-md-3">
            <select
              className="erp-select"
              value={balanceFilter}
              onChange={(e) => {
                setBalanceFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">All Advance Statuses</option>
              <option value="OUTSTANDING">Outstanding Advances (Balance &gt; 0)</option>
              <option value="ZERO">Zero Balance Settled (= 0)</option>
              <option value="NEGATIVE">Negative / Excess Spent (&lt; 0)</option>
            </select>
          </div>

          <div className="col-6 col-md-2">
            <select
              className="erp-select"
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12 col-md-2 text-md-end text-muted small">
            <span>
              Showing {filteredRecords.length} of {records.length} staff
            </span>
          </div>
        </div>
      </div>

      {/* ── Employee Advance Ledger Table (Phase 3B) ── */}
      {loading ? (
        <div className="erp-card p-5 text-center">
          <LoadingSpinner text="Computing advance ledger balances..." />
        </div>
      ) : (
        <div className="erp-table-container">
          <div className="table-responsive">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Emp ID</th>
                  <th>Department & Role</th>
                  <th className="text-end">Advances Issued</th>
                  <th className="text-end text-danger">Expenses Adjusted</th>
                  <th className="text-end text-warning">Pending Claims</th>
                  <th className="text-end text-success fs-6">Advance Balance</th>
                  <th>Last Issued</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-5 text-muted">
                      No employee advance records found matching the search criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((emp) => {
                    const isPositive = emp.currentAdvanceBalance > 0;
                    const isNegative = emp.currentAdvanceBalance < 0;

                    return (
                      <tr key={emp._id}>
                        <td>
                          <div className="fw-semibold text-dark">{emp.name}</div>
                          <small className="text-muted d-block">{emp.email}</small>
                        </td>

                        <td>
                          <span className="font-monospace fw-semibold text-secondary small">
                            {emp.employeeId}
                          </span>
                        </td>

                        <td>
                          <div className="small fw-medium text-dark">{emp.department}</div>
                          <small className="text-muted">{emp.designation}</small>
                        </td>

                        <td className="text-end font-monospace">
                          <div className="fw-semibold text-primary">
                            ₹{(emp.totalAdvancesIssued || 0).toLocaleString()}
                          </div>
                          {dateFilter?.preset !== 'all_time' && emp.lifetimeAdvancesIssued !== undefined && emp.lifetimeAdvancesIssued !== emp.totalAdvancesIssued && (
                            <small className="text-muted d-block" style={{ fontSize: '10px' }}>
                              Lifetime: ₹{emp.lifetimeAdvancesIssued.toLocaleString()}
                            </small>
                          )}
                        </td>

                        <td className="text-end font-monospace">
                          <div className="fw-semibold text-danger">
                            -₹{(emp.totalExpensesAdjusted || 0).toLocaleString()}
                          </div>
                          {dateFilter?.preset !== 'all_time' && emp.lifetimeExpensesAdjusted !== undefined && emp.lifetimeExpensesAdjusted !== emp.totalExpensesAdjusted && (
                            <small className="text-muted d-block" style={{ fontSize: '10px' }}>
                              Lifetime: -₹{emp.lifetimeExpensesAdjusted.toLocaleString()}
                            </small>
                          )}
                        </td>

                        <td className="text-end font-monospace small">
                          {emp.pendingExpenseAmount > 0 ? (
                            <span className="text-warning-emphasis fw-semibold">
                              ₹{emp.pendingExpenseAmount.toLocaleString()} ({emp.pendingClaimsCount})
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>

                        <td className="text-end font-monospace fw-bold fs-6">
                          <span
                            className={
                              isPositive
                                ? 'text-success'
                                : isNegative
                                ? 'text-danger'
                                : 'text-muted'
                            }
                          >
                            ₹{emp.currentAdvanceBalance.toLocaleString()}
                          </span>
                        </td>

                        <td className="small text-muted text-nowrap">
                          {emp.lastAdvanceDate
                            ? new Date(emp.lastAdvanceDate).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </td>

                        <td className="text-end text-nowrap">
                          <div className="d-inline-flex align-items-center gap-1.5">
                            <button
                              type="button"
                              className="erp-btn erp-btn-secondary erp-btn-sm p-1.5 px-2.5 d-inline-flex align-items-center gap-1"
                              onClick={() => setStatementModal({ show: true, userId: emp._id })}
                              title="Open Employee Financial Statement"
                            >
                              <FileText size={13} />
                              <span>View Statement</span>
                            </button>

                            {canManageAdvance && (
                              <button
                                type="button"
                                className="erp-btn erp-btn-primary erp-btn-sm p-1.5 px-2"
                                onClick={() =>
                                  setIssueModal({ show: true, preselectedUserId: emp._id })
                                }
                                title="Issue Additional Advance"
                              >
                                <Plus size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {filteredRecords.length > itemsPerPage && (
            <div className="p-3 border-top">
              <Pagination pagination={pagination} onPageChange={(p) => setPage(p)} />
            </div>
          )}
        </div>
      )}

      {/* ── Issue Advance Modal (Phase 4) ── */}
      {issueModal.show && (
        <IssueAdvanceModal
          show={issueModal.show}
          onClose={() => setIssueModal({ show: false, preselectedUserId: '' })}
          users={users}
          onSuccess={fetchData}
        />
      )}

      {/* ── Employee Statement Modal (Phase 3C) ── */}
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

export default AdvanceManagementPage;
