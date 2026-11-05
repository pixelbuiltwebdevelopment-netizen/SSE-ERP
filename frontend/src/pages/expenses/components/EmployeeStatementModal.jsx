import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Download,
  Calendar,
  Search,
  Filter,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Receipt,
  User,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
} from 'lucide-react';
import Modal from '../../../components/common/Modal';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import StatusBadge from '../../../components/common/StatusBadge';
import { expenseApi } from '../../../api/expenseApi';
import {
  exportAdvanceStatementPDF,
  exportAdvanceStatementExcel,
  exportAdvanceStatementCSV,
} from '../../../utils/exportUtils';

const EmployeeStatementModal = ({ show, onClose, userId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('statement'); // 'statement' or 'claims'

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [monthFilter, setMonthFilter] = useState('');

  useEffect(() => {
    if (!show || !userId) return;
    fetchStatement();
  }, [show, userId]);

  const fetchStatement = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await expenseApi.getEmployeeStatement(userId);
      if (res.data?.success) {
        setData(res.data.data);
      } else {
        setError(res.data?.message || 'Failed to load employee statement');
      }
    } catch (err) {
      console.error('Failed to fetch employee statement:', err);
      setError(err.response?.data?.message || 'Could not load statement records.');
    } finally {
      setLoading(false);
    }
  };

  // Filtered statement records
  const filteredStatement = useMemo(() => {
    if (!data?.statement) return [];
    return data.statement.filter((item) => {
      // Type filter
      if (typeFilter && item.transactionType !== typeFilter) return false;

      // Date range filter
      if (startDate) {
        const itemDate = new Date(item.date).toISOString().split('T')[0];
        if (itemDate < startDate) return false;
      }
      if (endDate) {
        const itemDate = new Date(item.date).toISOString().split('T')[0];
        if (itemDate > endDate) return false;
      }

      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesId = item.transactionId?.toLowerCase().includes(q);
        const matchesPurpose = item.purpose?.toLowerCase().includes(q);
        const matchesClaim = item.claimRef?.toLowerCase().includes(q);
        const matchesRef = item.transactionReference?.toLowerCase().includes(q);
        if (!matchesId && !matchesPurpose && !matchesClaim && !matchesRef) return false;
      }

      return true;
    });
  }, [data?.statement, typeFilter, startDate, endDate, searchQuery]);

  // Dynamic period summary when filters are active
  const filteredSummary = useMemo(() => {
    let advances = 0;
    let adjusted = 0;
    let refunds = 0;

    filteredStatement.forEach((txn) => {
      advances += txn.advanceIssued || 0;
      adjusted += txn.expenseAdjusted || 0;
      refunds += txn.refundReceived || 0;
    });

    const isFiltered = Boolean(startDate || endDate || monthFilter || typeFilter || searchQuery);

    return {
      advances,
      adjusted,
      refunds,
      isFiltered,
    };
  }, [filteredStatement, startDate, endDate, monthFilter, typeFilter, searchQuery]);

  const handleExportPDF = () => {
    if (!data) return;
    exportAdvanceStatementPDF({
      employee: data.employee,
      summary: data.summary,
      statement: filteredStatement,
    });
  };

  const handleExportExcel = () => {
    if (!data) return;
    exportAdvanceStatementExcel({
      employee: data.employee,
      summary: data.summary,
      statement: filteredStatement,
    });
  };

  const handleExportCSV = () => {
    if (!data) return;
    exportAdvanceStatementCSV({
      employee: data.employee,
      statement: filteredStatement,
    });
  };

  if (!show) return null;

  const emp = data?.employee || {};
  const sum = data?.summary || {};

  return (
    <Modal
      show={show}
      title="Employee Advance Ledger & Financial Statement"
      onClose={onClose}
      size="xl"
      icon={FileText}
    >
      {loading ? (
        <div className="py-5 text-center">
          <LoadingSpinner text="Generating employee financial ledger..." />
        </div>
      ) : error ? (
        <div className="alert alert-danger my-3 p-3">{error}</div>
      ) : (
        <div>
          {/* ── Employee Identity Banner ── */}
          <div className="d-flex flex-wrap align-items-center justify-content-between p-3 rounded-3 bg-light border mb-3">
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-sm"
                style={{
                  width: '46px',
                  height: '46px',
                  backgroundColor: 'var(--erp-primary, #087FF5)',
                  fontSize: '18px',
                }}
              >
                {emp.name?.charAt(0).toUpperCase() || 'E'}
              </div>
              <div>
                <h6 className="mb-0 fw-bold text-dark fs-6">{emp.name}</h6>
                <div className="text-muted small d-flex flex-wrap gap-2 align-items-center mt-0.5">
                  <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                    {emp.employeeId}
                  </span>
                  <span>{emp.email}</span>
                  <span>•</span>
                  <span>{emp.department}</span>
                  <span>•</span>
                  <span className="fw-medium text-secondary">{emp.designation}</span>
                </div>
              </div>
            </div>

            {/* Quick Export Actions */}
            <div className="d-flex align-items-center gap-2 mt-2 mt-md-0">
              <button
                type="button"
                className="erp-btn erp-btn-secondary erp-btn-sm d-inline-flex align-items-center gap-1.5"
                onClick={handleExportPDF}
                title="Download Official PDF Statement"
              >
                <Download size={13} />
                <span>PDF Statement</span>
              </button>
              <button
                type="button"
                className="erp-btn erp-btn-secondary erp-btn-sm d-inline-flex align-items-center gap-1.5"
                onClick={handleExportExcel}
                title="Export Excel Worksheet"
              >
                <FileText size={13} />
                <span>Excel</span>
              </button>
              <button
                type="button"
                className="erp-btn erp-btn-secondary erp-btn-sm d-inline-flex align-items-center gap-1.5"
                onClick={handleExportCSV}
                title="Export Raw CSV"
              >
                <span>CSV</span>
              </button>
            </div>
          </div>

          {/* ── Financial Summary KPIs (Phase 3C) ── */}
          <div className="row g-2 mb-3">
            <div className="col-6 col-md-3">
              <div className="p-2.5 rounded-3 border bg-white shadow-2xs">
                <span className="text-muted small d-flex align-items-center gap-1">
                  <Wallet size={13} className="text-primary" /> {filteredSummary.isFiltered ? 'Advances In Period' : 'Total Advances'}
                </span>
                <div className="fs-5 fw-bold text-primary font-monospace mt-1">
                  ₹{(filteredSummary.isFiltered ? filteredSummary.advances : (sum.totalAdvancesIssued || 0)).toLocaleString()}
                </div>
                {filteredSummary.isFiltered && (
                  <small className="text-muted d-block" style={{ fontSize: '10.5px' }}>
                    Lifetime: ₹{(sum.totalAdvancesIssued || 0).toLocaleString()}
                  </small>
                )}
              </div>
            </div>

            <div className="col-6 col-md-3">
              <div className="p-2.5 rounded-3 border bg-white shadow-2xs">
                <span className="text-muted small d-flex align-items-center gap-1">
                  <TrendingDown size={13} className="text-danger" /> {filteredSummary.isFiltered ? 'Adjusted In Period' : 'Expenses Adjusted'}
                </span>
                <div className="fs-5 fw-bold text-danger font-monospace mt-1">
                  -₹{(filteredSummary.isFiltered ? filteredSummary.adjusted : (sum.totalExpensesAdjusted || 0)).toLocaleString()}
                </div>
                {filteredSummary.isFiltered && (
                  <small className="text-muted d-block" style={{ fontSize: '10.5px' }}>
                    Lifetime: -₹{(sum.totalExpensesAdjusted || 0).toLocaleString()}
                  </small>
                )}
              </div>
            </div>

            <div className="col-6 col-md-3">
              <div className="p-2.5 rounded-3 border bg-white shadow-2xs">
                <span className="text-muted small d-flex align-items-center gap-1">
                  <RotateCcw size={13} className="text-warning" /> Refunds Returned
                </span>
                <div className="fs-5 fw-bold text-warning font-monospace mt-1">
                  ₹{(filteredSummary.isFiltered ? filteredSummary.refunds : (sum.totalRefundsReceived || 0)).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="col-6 col-md-3">
              <div
                className={`p-2.5 rounded-3 border shadow-2xs ${
                  sum.totalOutstandingAdvanceBalance > 0
                    ? 'bg-success-subtle border-success-subtle'
                    : sum.totalOutstandingAdvanceBalance < 0
                    ? 'bg-danger-subtle border-danger-subtle'
                    : 'bg-white'
                }`}
              >
                <span className="text-muted small d-flex align-items-center gap-1">
                  <TrendingUp size={13} className="text-success" /> Outstanding Balance
                </span>
                <div
                  className={`fs-5 fw-bold font-monospace mt-1 ${
                    sum.totalOutstandingAdvanceBalance > 0
                      ? 'text-success'
                      : sum.totalOutstandingAdvanceBalance < 0
                      ? 'text-danger'
                      : 'text-dark'
                  }`}
                >
                  ₹{(sum.totalOutstandingAdvanceBalance || 0).toLocaleString()}
                </div>
                <small className="text-muted d-block" style={{ fontSize: '10.5px' }}>
                  Current Ledger Balance
                </small>
              </div>
            </div>
          </div>

          {/* ── Sub-tabs: Ledger vs Claims History ── */}
          <div className="d-flex align-items-center justify-content-between border-bottom mb-3 pb-1">
            <div className="d-flex gap-2">
              <button
                type="button"
                className={`erp-btn erp-btn-sm ${activeTab === 'statement' ? 'erp-btn-primary' : 'erp-btn-secondary'}`}
                onClick={() => setActiveTab('statement')}
              >
                <FileText size={13} />
                <span>Transaction Ledger ({filteredStatement.length})</span>
              </button>
              <button
                type="button"
                className={`erp-btn erp-btn-sm ${activeTab === 'claims' ? 'erp-btn-primary' : 'erp-btn-secondary'}`}
                onClick={() => setActiveTab('claims')}
              >
                <Receipt size={13} />
                <span>Submitted Claims ({data.claims?.length || 0})</span>
              </button>
            </div>

            <div className="text-muted small">
              {activeTab === 'statement' && (
                <span>Pending Claims: ₹{(sum.pendingClaimsAmount || 0).toLocaleString()}</span>
              )}
            </div>
          </div>

          {/* ── Tab 1: Transaction Ledger Statement ── */}
          {activeTab === 'statement' && (
            <div>
              {/* Filter Controls Bar */}
              <div className="p-2.5 rounded-3 bg-light border mb-3">
                {/* Quick month selection chips */}
                <div className="d-flex flex-wrap align-items-center gap-1.5 mb-2 pb-2 border-bottom">
                  <span className="text-muted small fw-semibold me-1">Period Filter:</span>
                  <button
                    type="button"
                    className={`erp-btn erp-btn-sm py-0.5 px-2 rounded-pill ${
                      !startDate && !endDate && !monthFilter
                        ? 'erp-btn-primary fw-semibold'
                        : 'erp-btn-secondary text-secondary'
                    }`}
                    style={{ fontSize: '11px' }}
                    onClick={() => {
                      setMonthFilter('');
                      setStartDate('');
                      setEndDate('');
                    }}
                  >
                    All Time
                  </button>
                  <button
                    type="button"
                    className={`erp-btn erp-btn-sm py-0.5 px-2 rounded-pill ${
                      monthFilter && monthFilter === new Date().toISOString().slice(0, 7)
                        ? 'erp-btn-primary fw-semibold'
                        : 'erp-btn-secondary text-secondary'
                    }`}
                    style={{ fontSize: '11px' }}
                    onClick={() => {
                      const now = new Date();
                      const y = now.getFullYear();
                      const m = now.getMonth() + 1;
                      const mStr = `${y}-${String(m).padStart(2, '0')}`;
                      const lastDay = new Date(y, m, 0).getDate();
                      setMonthFilter(mStr);
                      setStartDate(`${y}-${String(m).padStart(2, '0')}-01`);
                      setEndDate(`${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`);
                    }}
                  >
                    This Month
                  </button>
                  <button
                    type="button"
                    className={`erp-btn erp-btn-sm py-0.5 px-2 rounded-pill`}
                    style={{ fontSize: '11px' }}
                    onClick={() => {
                      const now = new Date();
                      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                      const y = prev.getFullYear();
                      const m = prev.getMonth() + 1;
                      const mStr = `${y}-${String(m).padStart(2, '0')}`;
                      const lastDay = new Date(y, m, 0).getDate();
                      setMonthFilter(mStr);
                      setStartDate(`${y}-${String(m).padStart(2, '0')}-01`);
                      setEndDate(`${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`);
                    }}
                  >
                    Last Month
                  </button>
                </div>

                <div className="row g-2 align-items-center">
                  <div className="col-12 col-md-3">
                    <div className="erp-search-group">
                      <span className="erp-search-icon">
                        <Search size={14} />
                      </span>
                      <input
                        type="text"
                        className="erp-input erp-search-input"
                        placeholder="Search Txn ID, Claim, Purpose..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="col-6 col-md-2">
                    <select
                      className="erp-select"
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                    >
                      <option value="">All Types</option>
                      <option value="ADVANCE_ISSUED">Advance Issued (+)</option>
                      <option value="EXPENSE_ADJUSTMENT">Expense Adjusted (-)</option>
                      <option value="ADVANCE_REFUND">Advance Refund (-)</option>
                      <option value="REIMBURSEMENT_PAID">Reimbursement Paid</option>
                      <option value="ADVANCE_CORRECTION">Correction</option>
                    </select>
                  </div>

                  {/* Specific Month Picker */}
                  <div className="col-6 col-md-2">
                    <input
                      type="month"
                      className="erp-input font-monospace fw-semibold"
                      value={monthFilter}
                      onChange={(e) => {
                        const val = e.target.value;
                        setMonthFilter(val);
                        if (val) {
                          const [y, m] = val.split('-');
                          const yr = parseInt(y, 10);
                          const mo = parseInt(m, 10);
                          const lastDay = new Date(yr, mo, 0).getDate();
                          setStartDate(`${yr}-${String(mo).padStart(2, '0')}-01`);
                          setEndDate(`${yr}-${String(mo).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`);
                        } else {
                          setStartDate('');
                          setEndDate('');
                        }
                      }}
                      title="Select Specific Month directly"
                    />
                  </div>

                  <div className="col-6 col-md-2">
                    <input
                      type="date"
                      className="erp-input"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setMonthFilter('');
                      }}
                      title="From Date"
                    />
                  </div>

                  <div className="col-6 col-md-2">
                    <input
                      type="date"
                      className="erp-input"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setMonthFilter('');
                      }}
                      title="To Date"
                    />
                  </div>

                  <div className="col-12 col-md-1 text-md-end">
                    {(searchQuery || typeFilter || startDate || endDate || monthFilter) && (
                      <button
                        type="button"
                        className="erp-btn erp-btn-secondary erp-btn-sm p-1.5 w-100"
                        onClick={() => {
                          setSearchQuery('');
                          setTypeFilter('');
                          setStartDate('');
                          setEndDate('');
                          setMonthFilter('');
                        }}
                        title="Reset Filters"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Chronological Table */}
              <div className="table-responsive border rounded-3" style={{ maxHeight: '52vh', overflowY: 'auto' }}>
                <table className="erp-table mb-0 table-sm">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Txn ID</th>
                      <th>Type</th>
                      <th>Purpose / Description</th>
                      <th>Ref Claim</th>
                      <th className="text-end text-primary">Issued (+)</th>
                      <th className="text-end text-danger">Adjusted (-)</th>
                      <th className="text-end text-success">Running Balance</th>
                      <th>Receipts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStatement.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="text-center py-4 text-muted">
                          No transactions found matching the filter.
                        </td>
                      </tr>
                    ) : (
                      filteredStatement.map((txn) => {
                        const isCredit = txn.advanceIssued > 0;
                        const isDebit = txn.expenseAdjusted > 0;
                        const isRefund = txn.refundReceived > 0;

                        return (
                          <tr key={txn._id}>
                            <td className="small text-nowrap">
                              {new Date(txn.date).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </td>
                            <td>
                              <span className="font-monospace fw-semibold text-secondary small">
                                {txn.transactionId}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`badge px-2 py-0.5 rounded-pill small ${
                                  isCredit
                                    ? 'bg-primary-subtle text-primary border border-primary-subtle'
                                    : isDebit
                                    ? 'bg-danger-subtle text-danger border border-danger-subtle'
                                    : isRefund
                                    ? 'bg-warning-subtle text-warning border border-warning-subtle'
                                    : 'bg-light text-dark border'
                                }`}
                              >
                                {txn.transactionType?.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td style={{ maxWidth: '200px' }}>
                              <div className="small text-truncate" title={txn.purpose || txn.notes}>
                                {txn.purpose || txn.notes || '—'}
                              </div>
                              {txn.transactionReference && (
                                <small className="text-muted d-block text-truncate">
                                  Ref: {txn.transactionReference} ({txn.paymentMethod})
                                </small>
                              )}
                            </td>
                            <td>
                              {txn.claimRef ? (
                                <span className="font-monospace fw-bold text-primary small">
                                  {txn.claimRef}
                                </span>
                              ) : (
                                <span className="text-muted small">—</span>
                              )}
                            </td>
                            <td className="text-end font-monospace fw-semibold text-primary">
                              {txn.advanceIssued ? `₹${txn.advanceIssued.toLocaleString()}` : '—'}
                            </td>
                            <td className="text-end font-monospace fw-semibold text-danger">
                              {txn.expenseAdjusted ? `-₹${txn.expenseAdjusted.toLocaleString()}` : '—'}
                            </td>
                            <td className="text-end font-monospace fw-bold fs-6">
                              <span
                                className={
                                  txn.runningBalance > 0
                                    ? 'text-success'
                                    : txn.runningBalance < 0
                                    ? 'text-danger'
                                    : 'text-dark'
                                }
                              >
                                ₹{(txn.runningBalance || 0).toLocaleString()}
                              </span>
                            </td>
                            <td>
                              {txn.attachments && txn.attachments.length > 0 ? (
                                <div className="d-flex align-items-center gap-1">
                                  {txn.attachments.map((att, aIdx) => (
                                    <a
                                      key={aIdx}
                                      href={att.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="erp-btn erp-btn-secondary erp-btn-sm p-1"
                                      title={att.name || 'View Attachment'}
                                    >
                                      <ExternalLink size={12} />
                                    </a>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted small">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Tab 2: Submitted Claims History ── */}
          {activeTab === 'claims' && (
            <div className="table-responsive border rounded-3" style={{ maxHeight: '52vh', overflowY: 'auto' }}>
              <table className="erp-table mb-0 table-sm">
                <thead>
                  <tr>
                    <th>Claim ID</th>
                    <th>Date</th>
                    <th>Category & Notes</th>
                    <th>Claim Amount</th>
                    <th>Approved Amount</th>
                    <th>Status</th>
                    <th>Settlement Status</th>
                  </tr>
                </thead>
                <tbody>
                  {!data.claims || data.claims.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-4 text-muted">
                        No claims submitted by this employee yet.
                      </td>
                    </tr>
                  ) : (
                    data.claims.map((claim) => (
                      <tr key={claim._id}>
                        <td>
                          <span className="font-monospace fw-bold text-primary small">
                            #{claim._id.slice(-6).toUpperCase()}
                          </span>
                        </td>
                        <td className="small text-nowrap">
                          {new Date(claim.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td style={{ maxWidth: '220px' }}>
                          <div className="small fw-semibold text-truncate">
                            {claim.items?.[0]?.category || 'General'}
                          </div>
                          <small className="text-muted text-truncate d-block">
                            {claim.items?.[0]?.description || '—'}
                          </small>
                        </td>
                        <td className="font-monospace fw-bold text-dark">
                          ₹{(claim.totalClaimAmount || 0).toLocaleString()}
                        </td>
                        <td className="font-monospace fw-semibold text-primary">
                          {claim.approvedAmount ? `₹${claim.approvedAmount.toLocaleString()}` : '—'}
                        </td>
                        <td>
                          <StatusBadge status={claim.status} size="sm" />
                        </td>
                        <td>
                          <span
                            className={`badge px-2 py-0.5 rounded-pill small ${
                              claim.settlementStatus === 'SETTLED_ADVANCE'
                                ? 'bg-success-subtle text-success border border-success-subtle'
                                : claim.settlementStatus === 'REIMBURSED'
                                ? 'bg-primary-subtle text-primary border border-primary-subtle'
                                : 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'
                            }`}
                          >
                            {claim.settlementStatus === 'SETTLED_ADVANCE'
                              ? 'Adjusted Against Advance'
                              : claim.settlementStatus === 'REIMBURSED'
                              ? 'Reimbursed / Paid'
                              : 'Unsettled'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default EmployeeStatementModal;
