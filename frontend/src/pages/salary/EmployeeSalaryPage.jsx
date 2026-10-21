import React, { useState, useEffect, useMemo } from 'react';
import { erpApi } from '../../api/erpApi';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';

// Official ERP Design System Palette
const ERP = {
  primary: '#087FF5',       // Electric Blue
  sidebar: '#071A33',       // Deep Navy
  secondaryBlue: '#0057B8', // Royal Blue
  silver: '#C5CED8',        // Silver
  mainBg: '#F4F7FB',        // Ice White
  cardBg: '#FFFFFF',        // Pure White
  textPrimary: '#1E293B',   // Slate
  textSecondary: '#64748B', // Gray
  border: '#E2E8F0',        // Light Border
  success: '#16A34A',       // Green
  warning: '#D97706',       // Amber
  error: '#DC2626',         // Red
};

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
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

  // PDF DOWNLOAD FUNCTION NAMED: [EmployeeID]_[Date]_SalarySlip.pdf
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

    // Fallback: Generate printable PDF payslip invoice
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
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #087FF5; padding-bottom: 12px; margin-bottom: 20px; }
            .title { font-size: 20px; font-weight: bold; color: #071A33; }
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
                <strong style="color: #087FF5;">#${salary._id?.slice(-6).toUpperCase()}</strong><br/>
                <small>Emp ID: ${empId}</small>
              </div>
            </div>
            <div class="row"><span>Employee Name:</span><strong>${user?.name || 'Staff'}</strong></div>
            <div class="row"><span>Email:</span><span>${user?.email || 'N/A'}</span></div>
            <div class="row"><span>Present Days:</span><span>${salary.presentDays} / ${salary.totalWorkingDays} Days</span></div>
            <hr style="border: 0; border-top: 1px dashed #CBD5E1; margin: 15px 0;" />
            <div class="row"><span>Base Salary:</span><span>₹${(salary.baseSalary || 0).toLocaleString()}</span></div>
            <div class="row"><span>Gross Salary:</span><span>₹${(salary.grossSalary || 0).toLocaleString()}</span></div>
            <div class="row" style="color: #DC2626;"><span>Advance Deductions:</span><span>- ₹${(salary.advanceDeductions || 0).toLocaleString()}</span></div>
            <div class="row total-row" style="color: #16A34A;">
              <span>Net Salary Payable:</span>
              <span>₹${(salary.netSalary || 0).toLocaleString()}</span>
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

  // Summary stats
  const totalAdvanceReceived = advances.reduce((sum, a) => sum + (a.amount || 0), 0);
  const totalDeducted = advances.reduce((sum, a) => sum + (a.deductedAmount || 0), 0);
  const totalPending = totalAdvanceReceived - totalDeducted;

  // Filtered Salaries
  const filteredSalaries = useMemo(() => {
    return salaries.filter(s => {
      const matchesYear = !filterYear || String(s.year) === String(filterYear);
      const matchesMonth = !filterMonth || String(s.month) === String(filterMonth);
      const matchesStatus = !filterStatus || s.status === filterStatus;
      return matchesYear && matchesMonth && matchesStatus;
    });
  }, [salaries, filterYear, filterMonth, filterStatus]);

  // Filtered Advances
  const filteredAdvances = useMemo(() => {
    return advances.filter(a => {
      const matchesStatus = !filterStatus || a.status === filterStatus;
      return matchesStatus;
    });
  }, [advances, filterStatus]);

  return (
    <>
      <style>{`
        .erp-card-elevated {
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease;
        }
        .erp-card-elevated:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06) !important;
        }
        .erp-hover-btn {
          transition: all 0.18s ease-in-out;
        }
        .erp-hover-btn:hover {
          transform: translateY(-1px);
          filter: brightness(1.04);
        }
        .erp-table-row {
          transition: background-color 0.15s ease;
        }
        .erp-table-row:hover {
          background-color: #F8FAFC !important;
        }
      `}</style>

      <div 
        className="w-100 px-3 px-sm-4 px-xl-5 py-4"
        style={{ backgroundColor: ERP.mainBg, minHeight: '100vh', color: ERP.textPrimary }}
      >
        <div className="mx-auto" style={{ maxWidth: '1360px' }}>
          
          {/* Header Banner */}
          <div
            className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4 p-3.5 p-sm-4 rounded-4 shadow-sm"
            style={{ backgroundColor: ERP.cardBg, border: `1px solid ${ERP.border}` }}
          >
            <div>
              <div className="d-flex align-items-center gap-2 mb-1.5">
                <span
                  className="badge rounded-pill fw-bold"
                  style={{ backgroundColor: '#EBF4FE', color: ERP.primary, fontSize: '0.68rem', letterSpacing: '0.5px' }}
                >
                  PERSONAL PAYROLL
                </span>
              </div>
              <h3 className="fw-bold mb-1" style={{ color: ERP.sidebar, fontSize: '1.4rem', letterSpacing: '-0.2px' }}>
                My Salary & Advances
              </h3>
              <p className="small mb-0 text-muted" style={{ fontSize: '0.82rem' }}>
                Track your monthly payslips, verified salary settlements, and advance recovery ledger.
              </p>
            </div>
          </div>

          {/* KPI Summary Cards Grid */}
          <div className="row g-3 g-xl-4 mb-4">
            <div className="col-12 col-md-4">
              <div 
                className="card border-0 shadow-sm rounded-4 h-100 erp-card-elevated"
                style={{ backgroundColor: ERP.cardBg, border: `1px solid ${ERP.border}` }}
              >
                <div className="card-body p-3.5 p-sm-4 d-flex align-items-center gap-3">
                  <div 
                    className="rounded-3 d-flex align-items-center justify-content-center"
                    style={{ width: '48px', height: '48px', backgroundColor: '#EBF4FE', color: ERP.primary, fontSize: '1.4rem' }}
                  >
                    📄
                  </div>
                  <div>
                    <div className="small text-uppercase fw-bold text-muted" style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}>
                      Total Payslips
                    </div>
                    <div className="fw-bold fs-4" style={{ color: ERP.sidebar }}>{salaries.length}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div 
                className="card border-0 shadow-sm rounded-4 h-100 erp-card-elevated"
                style={{ backgroundColor: ERP.cardBg, border: `1px solid ${ERP.border}` }}
              >
                <div className="card-body p-3.5 p-sm-4 d-flex align-items-center gap-3">
                  <div 
                    className="rounded-3 d-flex align-items-center justify-content-center"
                    style={{ width: '48px', height: '48px', backgroundColor: '#DCFCE7', color: ERP.success, fontSize: '1.4rem' }}
                  >
                    ✅
                  </div>
                  <div>
                    <div className="small text-uppercase fw-bold text-muted" style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}>
                      Settled / Paid
                    </div>
                    <div className="fw-bold fs-4" style={{ color: ERP.success }}>
                      {salaries.filter(s => s.status === 'Paid').length}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div 
                className="card border-0 shadow-sm rounded-4 h-100 erp-card-elevated"
                style={{ backgroundColor: ERP.cardBg, border: `1px solid ${ERP.border}` }}
              >
                <div className="card-body p-3.5 p-sm-4 d-flex align-items-center gap-3">
                  <div 
                    className="rounded-3 d-flex align-items-center justify-content-center"
                    style={{ width: '48px', height: '48px', backgroundColor: '#FEF3C7', color: ERP.warning, fontSize: '1.4rem' }}
                  >
                    ⏳
                  </div>
                  <div>
                    <div className="small text-uppercase fw-bold text-muted" style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}>
                      Pending Advance Liability
                    </div>
                    <div className="fw-bold fs-4" style={{ color: totalPending > 0 ? ERP.warning : ERP.success }}>
                      ₹{totalPending.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div 
            className="d-flex flex-wrap align-items-center gap-2 mb-4 p-1.5 p-sm-2 rounded-3 shadow-sm"
            style={{ backgroundColor: ERP.cardBg, border: `1px solid ${ERP.border}`, width: 'fit-content' }}
          >
            <button
              type="button"
              className="btn fw-bold px-4 py-2 rounded-2 shadow-none"
              style={{
                backgroundColor: activeTab === 'salaries' ? ERP.primary : 'transparent',
                color: activeTab === 'salaries' ? '#FFFFFF' : ERP.textSecondary,
                border: activeTab === 'salaries' ? `1px solid ${ERP.primary}` : '1px solid transparent',
                fontSize: '0.84rem',
              }}
              onClick={() => setActiveTab('salaries')}
            >
              📑 My Salary Slips
            </button>
            <button
              type="button"
              className="btn fw-bold px-4 py-2 rounded-2 shadow-none"
              style={{
                backgroundColor: activeTab === 'advances' ? ERP.primary : 'transparent',
                color: activeTab === 'advances' ? '#FFFFFF' : ERP.textSecondary,
                border: activeTab === 'advances' ? `1px solid ${ERP.primary}` : '1px solid transparent',
                fontSize: '0.84rem',
              }}
              onClick={() => setActiveTab('advances')}
            >
              🏦 My Advances History
            </button>
          </div>

          {/* Filter Bar */}
          <div 
            className="d-flex flex-column flex-sm-row justify-content-between align-items-stretch align-items-sm-center gap-3 mb-4 p-3 p-sm-3.5 rounded-4 shadow-sm"
            style={{ backgroundColor: ERP.cardBg, border: `1px solid ${ERP.border}` }}
          >
            <div className="d-flex align-items-center gap-2">
              <h6 className="fw-bold mb-0" style={{ color: ERP.sidebar, fontSize: '0.90rem' }}>
                Filter History
              </h6>
              <span className="badge rounded-pill fw-semibold" style={{ backgroundColor: '#F1F5F9', color: ERP.textSecondary, fontSize: '0.72rem' }}>
                {activeTab === 'salaries' ? filteredSalaries.length : filteredAdvances.length} Records
              </span>
            </div>

            <div className="d-flex flex-wrap align-items-center gap-2">
              {activeTab === 'salaries' && (
                <>
                  <select
                    className="form-select form-select-sm fw-semibold shadow-none"
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    style={{ borderRadius: '8px', borderColor: ERP.border, fontSize: '0.82rem', minWidth: '120px' }}
                  >
                    <option value="">All Months</option>
                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>

                  <select
                    className="form-select form-select-sm fw-semibold shadow-none"
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    style={{ borderRadius: '8px', borderColor: ERP.border, fontSize: '0.82rem', minWidth: '100px' }}
                  >
                    <option value="">All Years</option>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                  </select>
                </>
              )}

              <select
                className="form-select form-select-sm fw-semibold shadow-none"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ borderRadius: '8px', borderColor: ERP.border, fontSize: '0.82rem', minWidth: '120px' }}
              >
                <option value="">All Statuses</option>
                {activeTab === 'salaries' ? (
                  <>
                    <option value="Paid">Paid Only</option>
                    <option value="Draft">Draft Only</option>
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
          </div>

          {loading ? (
            <div className="py-5 text-center">
              <LoadingSpinner text={activeTab === 'salaries' ? 'Loading salary slips...' : 'Loading advances...'} />
            </div>
          ) : (
            <>
              {/* MY SALARY SLIPS TAB */}
              {activeTab === 'salaries' && (
                <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4" style={{ border: `1px solid ${ERP.border}` }}>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table align-middle mb-0 text-nowrap">
                        <thead style={{ backgroundColor: '#F8FAFC', borderBottom: `2px solid ${ERP.border}` }}>
                          <tr className="text-uppercase" style={{ color: ERP.textSecondary, fontSize: '0.74rem', letterSpacing: '0.5px' }}>
                            <th className="py-3 px-3 px-md-4">Month / Year</th>
                            <th className="py-3 px-3 text-end">Base Salary</th>
                            <th className="py-3 px-3 text-end">Present Days</th>
                            <th className="py-3 px-3 text-end">Gross Salary</th>
                            <th className="py-3 px-3 text-end">Advance Deducted</th>
                            <th className="py-3 px-3 text-end">Net Salary</th>
                            <th className="py-3 px-3 text-center">Status</th>
                            <th className="py-3 px-3 px-md-4 text-center">Download Payslip</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSalaries.length === 0 ? (
                            <tr>
                              <td colSpan="8" className="text-center py-5 text-muted">
                                <span className="fs-1 d-block mb-2 opacity-50">📑</span>
                                No salary records match your filter criteria.
                              </td>
                            </tr>
                          ) : filteredSalaries.map(s => (
                            <tr key={s._id} className="erp-table-row" style={{ borderBottom: `1px solid ${ERP.border}` }}>
                              <td className="py-3.5 px-3 px-md-4 fw-semibold" style={{ color: ERP.sidebar }}>
                                {MONTHS[s.month - 1]} {s.year}
                              </td>
                              <td className="py-3.5 px-3 text-end font-monospace">₹{(s.baseSalary || 0).toLocaleString()}</td>
                              <td className="py-3.5 px-3 text-end small">{s.presentDays} / {s.totalWorkingDays} days</td>
                              <td className="py-3.5 px-3 text-end font-monospace">₹{(s.grossSalary || 0).toFixed(2)}</td>
                              <td className="py-3.5 px-3 text-end font-monospace fw-semibold" style={{ color: ERP.error }}>
                                {s.advanceDeductions > 0 ? `- ₹${s.advanceDeductions.toFixed(2)}` : '—'}
                              </td>
                              <td className="py-3.5 px-3 text-end font-monospace fw-bold" style={{ color: ERP.success, fontSize: '0.92rem' }}>
                                ₹{(s.netSalary || 0).toFixed(2)}
                              </td>
                              <td className="py-3.5 px-3 text-center">
                                <span 
                                  className="badge px-2.5 py-1 fw-semibold rounded-pill"
                                  style={{
                                    backgroundColor: s.status === 'Paid' ? '#DCFCE7' : '#F1F5F9',
                                    color: s.status === 'Paid' ? ERP.success : ERP.textSecondary,
                                    border: `1px solid ${s.status === 'Paid' ? '#BBF7D0' : ERP.border}`
                                  }}
                                >
                                  {s.status}
                                </span>
                              </td>
                              {/* PDF Download Button named: [EmployeeID]_[Date]_SalarySlip.pdf */}
                              <td className="py-3.5 px-3 px-md-4 text-center">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-primary rounded-2 px-3 py-1 erp-hover-btn fw-bold"
                                  style={{ fontSize: '0.76rem' }}
                                  title={`Download ${user?.employeeId || 'EMP'}_${s.year}-${s.month}_SalarySlip.pdf`}
                                  onClick={() => handleDownloadSalaryPDF(s)}
                                >
                                  📥 Download PDF
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* MY ADVANCES TAB */}
              {activeTab === 'advances' && (
                <>
                  {advances.length > 0 && (
                    <div 
                      className="card border-0 shadow-sm rounded-4 text-white mb-4 p-3.5 p-sm-4"
                      style={{ background: `linear-gradient(135deg, ${ERP.primary} 0%, ${ERP.secondaryBlue} 100%)` }}
                    >
                      <div className="row text-center g-3">
                        <div className="col-4">
                          <div className="small opacity-75 text-uppercase fw-semibold" style={{ fontSize: '0.70rem', letterSpacing: '0.5px' }}>Total Advance Issued</div>
                          <div className="fw-bold fs-4 mt-1">₹{totalAdvanceReceived.toLocaleString()}</div>
                        </div>
                        <div className="col-4 border-start border-end border-white border-opacity-25">
                          <div className="small opacity-75 text-uppercase fw-semibold" style={{ fontSize: '0.70rem', letterSpacing: '0.5px' }}>Total Deducted</div>
                          <div className="fw-bold fs-4 mt-1">₹{totalDeducted.toLocaleString()}</div>
                        </div>
                        <div className="col-4">
                          <div className="small opacity-75 text-uppercase fw-semibold" style={{ fontSize: '0.70rem', letterSpacing: '0.5px' }}>Outstanding Liability</div>
                          <div className="fw-bold fs-4 mt-1" style={{ color: totalPending > 0 ? '#FDE68A' : '#FFFFFF' }}>
                            ₹{totalPending.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4" style={{ border: `1px solid ${ERP.border}` }}>
                    <div className="card-body p-0">
                      <div className="table-responsive">
                        <table className="table align-middle mb-0 text-nowrap">
                          <thead style={{ backgroundColor: '#F8FAFC', borderBottom: `2px solid ${ERP.border}` }}>
                            <tr className="text-uppercase" style={{ color: ERP.textSecondary, fontSize: '0.74rem', letterSpacing: '0.5px' }}>
                              <th className="py-3 px-3 px-md-4">Date Issued</th>
                              <th className="py-3 px-3 text-end">Amount (₹)</th>
                              <th className="py-3 px-3 text-end">Deducted (₹)</th>
                              <th className="py-3 px-3 text-end">Balance (₹)</th>
                              <th className="py-3 px-3">Reason</th>
                              <th className="py-3 px-3">Issued By</th>
                              <th className="py-3 px-3 px-md-4 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredAdvances.length === 0 ? (
                              <tr>
                                <td colSpan="7" className="text-center py-5 text-muted">
                                  <span className="fs-1 d-block mb-2 opacity-50">🏦</span>
                                  No advance records match your criteria.
                                </td>
                              </tr>
                            ) : filteredAdvances.map(a => (
                              <tr key={a._id} className="erp-table-row" style={{ borderBottom: `1px solid ${ERP.border}` }}>
                                <td className="py-3.5 px-3 px-md-4 small fw-semibold">
                                  {new Date(a.issuedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </td>
                                <td className="py-3.5 px-3 text-end font-monospace fw-bold" style={{ color: ERP.sidebar }}>
                                  ₹{(a.amount || 0).toLocaleString()}
                                </td>
                                <td className="py-3.5 px-3 text-end font-monospace fw-semibold" style={{ color: ERP.success }}>
                                  {a.deductedAmount > 0 ? `₹${a.deductedAmount.toLocaleString()}` : '—'}
                                </td>
                                <td className="py-3.5 px-3 text-end font-monospace fw-bold" style={{ color: a.status !== 'Deducted' ? ERP.warning : ERP.success }}>
                                  ₹{((a.amount || 0) - (a.deductedAmount || 0)).toLocaleString()}
                                </td>
                                <td className="py-3.5 px-3 small text-muted text-truncate" style={{ maxWidth: '240px' }}>{a.reason || '—'}</td>
                                <td className="py-3.5 px-3 small">{a.issuedBy?.name || 'Admin'}</td>
                                <td className="py-3.5 px-3 px-md-4 text-center">
                                  <span 
                                    className="badge px-2.5 py-1 fw-semibold rounded-pill"
                                    style={{
                                      backgroundColor: a.status === 'Deducted' ? '#DCFCE7' : a.status === 'Partial' ? '#EBF4FE' : '#FEF3C7',
                                      color: a.status === 'Deducted' ? ERP.success : a.status === 'Partial' ? ERP.primary : ERP.warning,
                                      border: `1px solid ${a.status === 'Deducted' ? '#BBF7D0' : a.status === 'Partial' ? '#BFDBFE' : '#FDE68A'}`
                                    }}
                                  >
                                    {a.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

        </div>
      </div>
    </>
  );
};

export default EmployeeSalaryPage;