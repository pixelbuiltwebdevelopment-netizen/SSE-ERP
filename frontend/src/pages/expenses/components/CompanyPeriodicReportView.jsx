import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Download,
  FileSpreadsheet,
  FileText,
  BarChart3,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Users,
  CreditCard,
  Receipt,
  PieChart as PieIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import { expenseApi } from '../../../api/expenseApi';
import { exportPeriodicReportPDF, exportPeriodicReportExcel } from '../../../utils/exportUtils';
import LoadingSpinner from '../../../components/common/LoadingSpinner';

const ERP_COLORS = {
  primary: '#087FF5',
  primaryHover: '#0066CC',
  navy: '#071A33',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
  cardBg: '#FFFFFF',
  border: '#E2E8F0',
  subtle: '#F8FAFC',
};

const CompanyPeriodicReportView = ({ dateFilter, title = 'Company Periodic Financial Reports' }) => {
  const [groupBy, setGroupBy] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState('');
  const [chartView, setChartView] = useState('trend'); // 'trend' | 'advances'

  useEffect(() => {
    fetchReport();
  }, [groupBy, dateFilter?.startDate, dateFilter?.endDate]);

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        groupBy,
      };
      if (dateFilter?.startDate) params.startDate = dateFilter.startDate;
      if (dateFilter?.endDate) params.endDate = dateFilter.endDate;

      const res = await expenseApi.getCompanyPeriodicReports(params);
      if (res.data?.success) {
        setReportData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load periodic reports:', err);
      setError('Could not generate periodic report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reports = reportData?.reports || [];

  // Aggregated totals across all periods in report
  const grandTotals = reports.reduce(
    (acc, r) => {
      acc.totalClaims += r.totalClaims || 0;
      acc.pendingClaims += r.pendingClaims || 0;
      acc.approvedClaims += r.approvedClaims || 0;
      acc.rejectedClaims += r.rejectedClaims || 0;
      acc.totalClaimedAmount += r.totalClaimedAmount || 0;
      acc.totalApprovedAmount += r.totalApprovedAmount || 0;
      acc.advancesIssued += r.advancesIssued || 0;
      acc.expensesAdjusted += r.expensesAdjusted || 0;
      acc.refundsReceived += r.refundsReceived || 0;
      acc.netAdvance += r.netAdvance || 0;
      return acc;
    },
    {
      totalClaims: 0,
      pendingClaims: 0,
      approvedClaims: 0,
      rejectedClaims: 0,
      totalClaimedAmount: 0,
      totalApprovedAmount: 0,
      advancesIssued: 0,
      expensesAdjusted: 0,
      refundsReceived: 0,
      netAdvance: 0,
    }
  );

  // Prepare chart series (chronological order)
  const chartData = [...reports].reverse().map((r) => ({
    name: r.periodLabel?.length > 18 ? r.periodKey : r.periodLabel,
    fullLabel: r.periodLabel,
    totalClaimed: r.totalClaimedAmount || 0,
    totalApproved: r.totalApprovedAmount || 0,
    advancesIssued: r.advancesIssued || 0,
    expensesAdjusted: r.expensesAdjusted || 0,
    claimsCount: r.totalClaims || 0,
    staffCount: r.employeesCount || 0,
  }));

  const handleExportPDF = () => {
    if (!reportData || reports.length === 0) {
      alert('No data available to export.');
      return;
    }
    exportPeriodicReportPDF(reports, {
      groupBy,
      startDate: reportData.reportingPeriod?.startDate,
      endDate: reportData.reportingPeriod?.endDate,
      label: dateFilter?.label || `${groupBy.toUpperCase()} Report`,
    });
  };

  const handleExportExcel = () => {
    if (!reportData || reports.length === 0) {
      alert('No data available to export.');
      return;
    }
    exportPeriodicReportExcel(reports, {
      groupBy,
      startDate: reportData.reportingPeriod?.startDate,
      endDate: reportData.reportingPeriod?.endDate,
      label: dateFilter?.label || `${groupBy.toUpperCase()} Report`,
    });
  };

  return (
    <div className="card border-0 shadow-sm rounded-3 overflow-hidden mb-4">
      {/* ── Header Strip ── */}
      <div className="card-header bg-white border-bottom p-3 p-md-4">
        <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
          <div>
            <div className="d-flex align-items-center gap-2">
              <span className="p-2 rounded-2 bg-primary-subtle text-primary d-inline-flex">
                <BarChart3 size={18} />
              </span>
              <h5 className="fw-bold text-dark mb-0">{title}</h5>
            </div>
            <p className="text-muted small mb-0 mt-1">
              Consolidated financial statements grouped by reporting cadence for{' '}
              <strong className="text-dark">{dateFilter?.label || 'Selected Reporting Range'}</strong>.
            </p>
          </div>

          <div className="d-flex flex-wrap align-items-center gap-2">
            {/* Cadence Tabs */}
            <div className="btn-group btn-group-sm p-0.5 rounded-2 bg-light border" role="group">
              {[
                { id: 'monthly', label: 'Monthly' },
                { id: 'weekly', label: 'Weekly' },
                { id: 'daily', label: 'Daily' },
                { id: 'quarterly', label: 'Quarterly' },
                { id: 'yearly', label: 'Yearly' },
              ].map((cad) => (
                <button
                  key={cad.id}
                  type="button"
                  className={`btn btn-sm px-2.5 py-1 fw-semibold ${
                    groupBy === cad.id
                      ? 'btn-white bg-white text-primary shadow-sm'
                      : 'btn-transparent text-secondary border-0'
                  }`}
                  onClick={() => setGroupBy(cad.id)}
                >
                  {cad.label}
                </button>
              ))}
            </div>

            {/* Refresh */}
            <button
              type="button"
              className="erp-btn erp-btn-secondary erp-btn-sm p-1.5"
              onClick={fetchReport}
              disabled={loading}
              title="Refresh report"
            >
              <RefreshCw size={14} className={loading ? 'erp-spin' : ''} />
            </button>

            {/* Export Buttons */}
            <button
              type="button"
              className="erp-btn erp-btn-secondary erp-btn-sm p-1.5 px-2.5 d-inline-flex align-items-center gap-1.5"
              onClick={handleExportPDF}
              disabled={reports.length === 0}
            >
              <FileText size={13} className="text-danger" />
              <span>Export PDF</span>
            </button>
            <button
              type="button"
              className="erp-btn erp-btn-secondary erp-btn-sm p-1.5 px-2.5 d-inline-flex align-items-center gap-1.5"
              onClick={handleExportExcel}
              disabled={reports.length === 0}
            >
              <FileSpreadsheet size={13} className="text-success" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>
      </div>

      <div className="card-body p-3 p-md-4">
        {loading ? (
          <div className="py-5 text-center">
            <LoadingSpinner text="Computing periodic financial aggregations..." />
          </div>
        ) : error ? (
          <div className="alert alert-danger mb-0">{error}</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <Calendar size={36} className="text-secondary opacity-50 mb-2" />
            <h6 className="fw-semibold text-dark">No Financial Activity Found</h6>
            <p className="small mb-0">
              There were no claims or advance transactions recorded during the selected period.
            </p>
          </div>
        ) : (
          <>
            {/* ── Summary KPI Tiles ── */}
            <div className="row g-2.5 mb-4">
              <div className="col-6 col-md-3">
                <div className="p-3 rounded-3 bg-light border">
                  <span className="text-muted small d-block">Total Claimed</span>
                  <div className="fs-5 fw-bold font-monospace text-dark mt-0.5">
                    ₹{grandTotals.totalClaimedAmount.toLocaleString()}
                  </div>
                  <small className="text-muted" style={{ fontSize: '11px' }}>
                    {grandTotals.totalClaims} Claims Submitted
                  </small>
                </div>
              </div>

              <div className="col-6 col-md-3">
                <div className="p-3 rounded-3 bg-light border">
                  <span className="text-muted small d-block">Total Approved</span>
                  <div className="fs-5 fw-bold font-monospace text-success mt-0.5">
                    ₹{grandTotals.totalApprovedAmount.toLocaleString()}
                  </div>
                  <small className="text-muted" style={{ fontSize: '11px' }}>
                    {grandTotals.approvedClaims} Approved Claims
                  </small>
                </div>
              </div>

              <div className="col-6 col-md-3">
                <div className="p-3 rounded-3 bg-light border">
                  <span className="text-muted small d-block">Advances Issued</span>
                  <div className="fs-5 fw-bold font-monospace text-primary mt-0.5">
                    ₹{grandTotals.advancesIssued.toLocaleString()}
                  </div>
                  <small className="text-muted" style={{ fontSize: '11px' }}>
                    Disbursed during periods
                  </small>
                </div>
              </div>

              <div className="col-6 col-md-3">
                <div className="p-3 rounded-3 bg-light border">
                  <span className="text-muted small d-block">Expenses Adjusted</span>
                  <div className="fs-5 fw-bold font-monospace text-danger mt-0.5">
                    ₹{grandTotals.expensesAdjusted.toLocaleString()}
                  </div>
                  <small className="text-muted" style={{ fontSize: '11px' }}>
                    Offset against advances
                  </small>
                </div>
              </div>
            </div>

            {/* ── Visual Analytics (Recharts) ── */}
            <div className="p-3 p-md-3.5 rounded-3 border bg-light mb-4">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="d-flex align-items-center gap-2">
                  <span className="fw-bold text-dark small text-uppercase font-monospace">
                    {chartView === 'trend' ? 'Expense Trend (Claimed vs Approved)' : 'Cash Flow (Advances vs Adjustments)'}
                  </span>
                </div>
                <div className="btn-group btn-group-sm">
                  <button
                    type="button"
                    className={`btn btn-sm ${chartView === 'trend' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setChartView('trend')}
                  >
                    Expense Trend
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${chartView === 'advances' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setChartView('advances')}
                  >
                    Advances vs Adjustments
                  </button>
                </div>
              </div>

              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  {chartView === 'trend' ? (
                    <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="claimedColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#087FF5" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#087FF5" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="approvedColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#16A34A" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#16A34A" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                      <Tooltip
                        formatter={(val) => [`₹${Number(val).toLocaleString()}`, '']}
                        labelFormatter={(lbl, p) => p?.[0]?.payload?.fullLabel || lbl}
                      />
                      <Legend />
                      <Area type="monotone" dataKey="totalClaimed" name="Total Claimed (₹)" stroke="#087FF5" fillOpacity={1} fill="url(#claimedColor)" />
                      <Area type="monotone" dataKey="totalApproved" name="Approved Amount (₹)" stroke="#16A34A" fillOpacity={1} fill="url(#approvedColor)" />
                    </AreaChart>
                  ) : (
                    <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                      <Tooltip
                        formatter={(val) => [`₹${Number(val).toLocaleString()}`, '']}
                        labelFormatter={(lbl, p) => p?.[0]?.payload?.fullLabel || lbl}
                      />
                      <Legend />
                      <Bar dataKey="advancesIssued" name="Advances Issued (₹)" fill="#087FF5" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expensesAdjusted" name="Expenses Adjusted (₹)" fill="#DC2626" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── Periodic Data Table ── */}
            <div className="table-responsive border rounded-3">
              <table className="erp-table mb-0 table-sm">
                <thead>
                  <tr>
                    <th>Reporting Period</th>
                    <th className="text-center">Active Staff</th>
                    <th className="text-center">Claims (P / A / R)</th>
                    <th className="text-end">Claimed Amount</th>
                    <th className="text-end">Approved Amount</th>
                    <th className="text-end">Advances Issued</th>
                    <th className="text-end">Expenses Adjusted</th>
                    <th className="text-end">Net Advance</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.periodKey}>
                      <td className="fw-semibold text-dark">
                        <div className="d-flex align-items-center gap-1.5">
                          <Calendar size={13} className="text-primary flex-shrink-0" />
                          <span>{r.periodLabel}</span>
                        </div>
                      </td>
                      <td className="text-center">
                        <span className="badge bg-secondary-subtle text-secondary rounded-pill px-2 py-0.5">
                          {r.employeesCount} staff
                        </span>
                      </td>
                      <td className="text-center small font-monospace">
                        <span className="text-warning fw-bold">{r.pendingClaims}P</span>
                        <span className="text-muted mx-1">/</span>
                        <span className="text-success fw-bold">{r.approvedClaims}A</span>
                        <span className="text-muted mx-1">/</span>
                        <span className="text-danger fw-bold">{r.rejectedClaims}R</span>
                      </td>
                      <td className="text-end font-monospace fw-semibold text-dark">
                        ₹{(r.totalClaimedAmount || 0).toLocaleString()}
                      </td>
                      <td className="text-end font-monospace fw-semibold text-success">
                        ₹{(r.totalApprovedAmount || 0).toLocaleString()}
                      </td>
                      <td className="text-end font-monospace fw-semibold text-primary">
                        ₹{(r.advancesIssued || 0).toLocaleString()}
                      </td>
                      <td className="text-end font-monospace fw-semibold text-danger">
                        -₹{(r.expensesAdjusted || 0).toLocaleString()}
                      </td>
                      <td className="text-end font-monospace fw-bold">
                        <span className={r.netAdvance >= 0 ? 'text-primary' : 'text-danger'}>
                          ₹{(r.netAdvance || 0).toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="table-light fw-bold">
                  <tr>
                    <td>Consolidated Total</td>
                    <td className="text-center">—</td>
                    <td className="text-center font-monospace">
                      <span className="text-warning">{grandTotals.pendingClaims}P</span>
                      <span className="text-muted mx-1">/</span>
                      <span className="text-success">{grandTotals.approvedClaims}A</span>
                      <span className="text-muted mx-1">/</span>
                      <span className="text-danger">{grandTotals.rejectedClaims}R</span>
                    </td>
                    <td className="text-end font-monospace text-dark">
                      ₹{grandTotals.totalClaimedAmount.toLocaleString()}
                    </td>
                    <td className="text-end font-monospace text-success">
                      ₹{grandTotals.totalApprovedAmount.toLocaleString()}
                    </td>
                    <td className="text-end font-monospace text-primary">
                      ₹{grandTotals.advancesIssued.toLocaleString()}
                    </td>
                    <td className="text-end font-monospace text-danger">
                      -₹{grandTotals.expensesAdjusted.toLocaleString()}
                    </td>
                    <td className="text-end font-monospace">
                      <span className={grandTotals.netAdvance >= 0 ? 'text-primary' : 'text-danger'}>
                        ₹{grandTotals.netAdvance.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CompanyPeriodicReportView;
