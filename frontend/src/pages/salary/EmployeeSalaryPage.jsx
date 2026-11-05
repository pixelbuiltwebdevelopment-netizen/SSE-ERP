import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  Eye,
  Filter,
} from 'lucide-react';
import { erpApi } from '../../api/erpApi';
import { useAuth } from '../../hooks/useAuth';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/Skeleton';
import Modal from '../../components/common/Modal';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const EmployeeSalaryPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('salaries');
  const [salaries, setSalaries] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState(null);

  // Filters
  const [filterYear, setFilterYear] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'salaries') {
        const res = await erpApi.getMySalaries();
        setSalaries(res.data.data || []);
      } else {
        const res = await erpApi.getMyAdvances();
        setAdvances(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSalaryPDF = async (salary) => {
    const empId = user?.employeeId || user?._id?.slice(-6) || 'EMP';
    const formattedDate = `${salary.year}-${String(salary.month).padStart(2, '0')}`;
    const customFileName = `${empId}_${formattedDate}_SalarySlip.pdf`;

    if (salary.slipUrl) {
      try {
        const response = await fetch(salary.slipUrl);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = customFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
        return;
      } catch (err) {
        console.warn('Direct file download fallback to print invoice:', err);
      }
    }

    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('Please allow popups to download/print your Payslip PDF.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${customFileName}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 30px; color: #1E293B; }
            .slip-card { border: 2px solid #E2E8F0; border-radius: 12px; padding: 24px; max-width: 700px; margin: auto; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0284C7; padding-bottom: 12px; margin-bottom: 20px; }
            .title { font-size: 20px; font-weight: bold; color: #0B132B; }
            .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
            .total-row { border-top: 2px solid #E2E8F0; margin-top: 15px; padding-top: 10px; font-size: 16px; font-weight: bold; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="slip-card">
            <div class="header">
              <div>
                <div class="title">OFFICIAL SALARY PAYSLIP</div>
                <small style="color: #64748B;">Period: ${MONTHS[salary.month - 1]} ${salary.year}</small>
              </div>
              <div style="text-align: right;">
                <strong style="color: #0284C7;">#${salary._id?.slice(-6).toUpperCase()}</strong><br/>
                <small>Emp ID: ${empId}</small>
              </div>
            </div>
            <div class="row"><span>Employee Name:</span><strong>${user?.name || 'Staff'}</strong></div>
            <div class="row"><span>Email:</span><span>${user?.email || 'N/A'}</span></div>
            <div class="row"><span>Present Days:</span><span>${salary.presentDays} / ${salary.totalWorkingDays} Days</span></div>
            <hr style="border: 0; border-top: 1px dashed #CBD5E1; margin: 15px 0;" />
            <div class="row"><span>Base Salary:</span><span>₹${(salary.baseSalary || 0).toLocaleString()}</span></div>
            <div class="row"><span>Gross Salary:</span><span>₹${(salary.grossSalary || 0).toFixed(2)}</span></div>
            <div class="row" style="color: #DC2626;"><span>Advance Deductions:</span><span>- ₹${(salary.advanceDeductions || 0).toFixed(2)}</span></div>
            <div class="row total-row" style="color: #16A34A;">
              <span>Net Salary Payable:</span>
              <span>₹${(salary.netSalary || 0).toFixed(2)}</span>
            </div>
            <div style="margin-top: 30px; font-size: 11px; color: #64748B; text-align: center;">
              This is a computer-generated salary receipt. Document ID: ${customFileName}
            </div>
          </div>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `;
    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
  };

  const totalAdvanceReceived = advances.reduce((sum, a) => sum + (a.amount || 0), 0);
  const totalDeducted = advances.reduce((sum, a) => sum + (a.deductedAmount || 0), 0);
  const totalPending = totalAdvanceReceived - totalDeducted;

  const filteredSalaries = useMemo(() => {
    return salaries.filter((s) => {
      const matchesYear = !filterYear || String(s.year) === String(filterYear);
      const matchesMonth = !filterMonth || String(s.month) === String(filterMonth);
      const matchesStatus = !filterStatus || s.status === filterStatus;
      return matchesYear && matchesMonth && matchesStatus;
    });
  }, [salaries, filterYear, filterMonth, filterStatus]);

  const filteredAdvances = useMemo(() => {
    return advances.filter((a) => {
      const matchesStatus = !filterStatus || a.status === filterStatus;
      return matchesStatus;
    });
  }, [advances, filterStatus]);

  return (
    <div className="erp-fade-in pb-4">
      {/* ── Page Header ── */}
      <PageHeader
        title="My Salary Slips & Advances"
        subtitle="View your monthly compensation statements, net earnings breakdowns, and salary advance repayments"
        breadcrumbs={[{ label: 'Finance' }, { label: 'My Salary' }]}
      />

      {/* ── KPI Row ── */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-4">
          <StatCard
            title="Generated Payslips"
            value={salaries.length}
            subtitle="Verified compensation cycles"
            icon={FileText}
            variant="primary"
          />
        </div>
        <div className="col-12 col-sm-4">
          <StatCard
            title="Settled / Paid"
            value={salaries.filter((s) => s.status === 'Paid').length}
            subtitle="Credited monthly salaries"
            icon={CheckCircle2}
            variant="success"
          />
        </div>
        <div className="col-12 col-sm-4">
          <StatCard
            title="Outstanding Advance Liability"
            value={`₹${totalPending.toLocaleString()}`}
            subtitle="Pending salary deduction"
            icon={Wallet}
            variant={totalPending > 0 ? 'warning' : 'success'}
          />
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="erp-tabs-nav mb-3">
        <button
          type="button"
          className={`erp-tab-btn ${activeTab === 'salaries' ? 'active' : ''}`}
          onClick={() => setActiveTab('salaries')}
        >
          <FileText size={16} />
          <span>My Payslips</span>
        </button>
        <button
          type="button"
          className={`erp-tab-btn ${activeTab === 'advances' ? 'active' : ''}`}
          onClick={() => setActiveTab('advances')}
        >
          <Wallet size={16} />
          <span>Advance Repayment Ledger</span>
        </button>
      </div>

      {/* ── Filters Bar ── */}
      <div className="erp-card p-3 mb-4">
        <div className="row g-2 align-items-center">
          {activeTab === 'salaries' && (
            <>
              <div className="col-6 col-md-3">
                <select
                  className="erp-select"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                >
                  <option value="">All Months</option>
                  {MONTHS.map((m, i) => (
                    <option key={i} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-6 col-md-2">
                <select
                  className="erp-select"
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                >
                  <option value="">All Years</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                </select>
              </div>
            </>
          )}

          <div className="col-6 col-md-3">
            <select
              className="erp-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              {activeTab === 'salaries' ? (
                <>
                  <option value="Paid">Paid</option>
                  <option value="Draft">Draft</option>
                </>
              ) : (
                <>
                  <option value="Pending">Pending</option>
                  <option value="Partial">Partial</option>
                  <option value="Deducted">Deducted</option>
                </>
              )}
            </select>
          </div>

          <div className="col-6 col-md text-end text-muted small">
            <span>
              Showing {activeTab === 'salaries' ? filteredSalaries.length : filteredAdvances.length} records
            </span>
          </div>
        </div>
      </div>

      {/* ── Data Tables ── */}
      {loading ? (
        <TableSkeleton rows={4} cols={7} />
      ) : activeTab === 'salaries' ? (
        filteredSalaries.length === 0 ? (
          <div className="erp-card p-4">
            <EmptyState
              icon={FileText}
              title="No salary slips found"
              description="No monthly salary records match your filter criteria."
            />
          </div>
        ) : (
          <div className="erp-table-container">
            <div className="table-responsive">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Payroll Period</th>
                    <th className="text-end">Base Pay</th>
                    <th className="text-end">Attendance</th>
                    <th className="text-end">Gross Salary</th>
                    <th className="text-end">Advance Deductions</th>
                    <th className="text-end">Net Payable</th>
                    <th className="text-center">Status</th>
                    <th className="text-center">Download Payslip</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSalaries.map((s) => (
                    <tr key={s._id}>
                      <td>
                        <span className="fw-semibold" style={{ color: 'var(--erp-text-main)' }}>
                          {MONTHS[s.month - 1]} {s.year}
                        </span>
                      </td>

                      <td className="text-end font-monospace">
                        ₹{(s.baseSalary || 0).toLocaleString()}
                      </td>

                      <td className="text-end small">
                        {s.presentDays} / {s.totalWorkingDays} days
                      </td>

                      <td className="text-end font-monospace">
                        ₹{(s.grossSalary || 0).toFixed(2)}
                      </td>

                      <td className="text-end font-monospace text-danger fw-semibold">
                        {s.advanceDeductions > 0 ? `- ₹${s.advanceDeductions.toFixed(2)}` : '—'}
                      </td>

                      <td className="text-end font-monospace fw-bold text-success" style={{ fontSize: '0.92rem' }}>
                        ₹{(s.netSalary || 0).toFixed(2)}
                      </td>

                      <td className="text-center">
                        <StatusBadge status={s.status || 'Draft'} size="sm" />
                      </td>

                      <td className="text-center">
                        <button
                          type="button"
                          className="erp-btn erp-btn-secondary erp-btn-sm"
                          onClick={() => handleDownloadSalaryPDF(s)}
                          title="Download Official Payslip PDF"
                        >
                          <Download size={13} /> Payslip PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : filteredAdvances.length === 0 ? (
        <div className="erp-card p-4">
          <EmptyState
            icon={Wallet}
            title="No salary advances on record"
            description="You have no active salary advance records."
          />
        </div>
      ) : (
        <div className="erp-table-container">
          <div className="table-responsive">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Issued Date</th>
                  <th>Reason / Purpose</th>
                  <th className="text-end">Advance Amount</th>
                  <th className="text-end">Deducted / Repaid</th>
                  <th className="text-end">Remaining Due</th>
                  <th className="text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdvances.map((a) => {
                  const remaining = (a.amount || 0) - (a.deductedAmount || 0);

                  return (
                    <tr key={a._id}>
                      <td>
                        <div className="small fw-semibold">
                          {new Date(a.issuedDate || a.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                      </td>

                      <td>
                        <div className="small text-truncate" style={{ maxWidth: '300px' }}>
                          {a.reason || 'Salary advance'}
                        </div>
                      </td>

                      <td className="text-end font-monospace fw-semibold">
                        ₹{(a.amount || 0).toLocaleString()}
                      </td>

                      <td className="text-end font-monospace text-success">
                        ₹{(a.deductedAmount || 0).toLocaleString()}
                      </td>

                      <td className="text-end font-monospace fw-bold text-danger">
                        ₹{remaining.toLocaleString()}
                      </td>

                      <td className="text-center">
                        <StatusBadge status={a.status || 'Pending'} size="sm" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeSalaryPage;
