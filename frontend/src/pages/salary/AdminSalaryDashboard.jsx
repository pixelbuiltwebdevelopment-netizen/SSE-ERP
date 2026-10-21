import React, { useState, useEffect, useMemo, useRef } from 'react';
import { erpApi } from '../../api/erpApi';
import { useAuth } from '../../hooks/useAuth';
import PermissionGate from '../../components/permissions/PermissionGate';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';

// Official Enterprise ERP Palette
const ERP = {
  primary: '#087FF5',       // Electric Blue
  sidebar: '#071A33',       // Deep Navy
  secondaryBlue: '#0057B8', // Royal Blue
  silver: '#C5CED8',        // Silver
  mainBg: '#F4F7FB',        // Ice White
  cardBg: '#FFFFFF',        // Pure White
  textPrimary: '#1E293B',   // Slate Navy
  textSecondary: '#64748B', // Cool Slate Gray
  border: '#E2E8F0',        // Border
  borderLight: '#EDF2F7',
  success: '#16A34A',       // Green
  warning: '#D97706',       // Amber
  error: '#DC2626',         // Red
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const AdminSalaryDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('salaries');

  // Overview state
  const [overview, setOverview] = useState([]);
  const [overviewLoading, setOverviewLoading] = useState(false);

  // Salary records state
  const [salaries, setSalaries] = useState([]);
  const [salariesLoading, setSalariesLoading] = useState(false);

  // All advances state
  const [advances, setAdvances] = useState([]);
  const [advancesLoading, setAdvancesLoading] = useState(false);

  // ── Dual-Purpose Search & Employee Combobox States ──
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const searchBoxRef = useRef(null);

  // Filter States
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Issue Advance Modal
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({
    userId: '',
    amount: '',
    reason: '',
    issuedDate: new Date().toISOString().split('T')[0],
  });
  const [advanceError, setAdvanceError] = useState('');
  const [advanceSubmitting, setAdvanceSubmitting] = useState(false);

  // Generate Salary Modal
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    userId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    totalWorkingDays: 30,
    baseSalary: 0,
    presentDays: 0,
    grossSalary: 0,
    advanceDeductions: 0,
    netSalary: 0,
    slipUrl: '',
  });
  const [previewLoading, setPreviewLoading] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [generateSubmitting, setGenerateSubmitting] = useState(false);

  // Initial Data Fetching
  useEffect(() => {
    fetchOverview();
    fetchSalaries();
    fetchAllAdvances();
  }, []);

  // Close Combobox on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setIsEmployeeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchOverview = async () => {
    setOverviewLoading(true);
    try {
      const res = await erpApi.getEmployeeSalaryOverview();
      const data = res?.data?.data || (Array.isArray(res?.data) ? res.data : []);
      setOverview(data);
    } catch (err) {
      console.error('Failed to fetch overview:', err);
    } finally {
      setOverviewLoading(false);
    }
  };

  const fetchSalaries = async () => {
    setSalariesLoading(true);
    try {
      const res = await erpApi.getSalaries();
      const list = res?.data?.data || res?.data?.salaries || (Array.isArray(res?.data) ? res.data : []);
      setSalaries(list);
    } catch (err) {
      console.error('Failed to fetch salaries:', err);
    } finally {
      setSalariesLoading(false);
    }
  };

  const fetchAllAdvances = async () => {
    setAdvancesLoading(true);
    try {
      const res = await erpApi.getAllAdvances();
      const list = res?.data?.data || res?.data?.advances || (Array.isArray(res?.data) ? res.data : []);
      setAdvances(list);
    } catch (err) {
      console.error('Failed to fetch advances:', err);
    } finally {
      setAdvancesLoading(false);
    }
  };

  const resolveEmpId = (empObj) => {
    return empObj?.employeeId || empObj?.empId || empObj?._id?.slice(-6)?.toUpperCase() || 'EMP';
  };

  // Filter list of employees inside the dropdown
  const filteredDropdownEmployees = useMemo(() => {
    if (!searchQuery) return overview;
    const query = searchQuery.toLowerCase().trim();
    return overview.filter((emp) => {
      const name = (emp.name || '').toLowerCase();
      const email = (emp.email || '').toLowerCase();
      const code = resolveEmpId(emp).toLowerCase();
      const dept = (emp.departmentId?.name || '').toLowerCase();
      return name.includes(query) || email.includes(query) || code.includes(query) || dept.includes(query);
    });
  }, [overview, searchQuery]);

  const handleSelectEmployee = (emp) => {
    setSelectedEmployee(emp);
    setSearchQuery(emp.name);
    setIsEmployeeDropdownOpen(false);
  };

  const handleClearEmployeeSelection = () => {
    setSelectedEmployee(null);
    setSearchQuery('');
  };

  // 1. SALARY SLIP PDF DOWNLOAD
  const handleDownloadSalaryPDF = async (salary) => {
    const empCode = resolveEmpId(salary.userId);
    const dateFormatted = `${salary.year}-${String(salary.month).padStart(2, '0')}`;
    const customFileName = `${empCode}_${dateFormatted}_SalarySlip.pdf`;

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
        console.warn('Fallback to standard slip view:', err);
      }
    }

    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('Please allow popups to print/download the Salary Slip PDF.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${customFileName}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 36px; color: #1E293B; background: #fff; }
            .slip-card { border: 2px solid #E2E8F0; border-radius: 12px; padding: 32px; max-width: 740px; margin: auto; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #087FF5; padding-bottom: 16px; margin-bottom: 24px; }
            .title { font-size: 22px; font-weight: bold; color: #071A33; }
            .sub-title { font-size: 13px; color: #64748B; margin-top: 4px; }
            .emp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #F8FAFC; padding: 16px; border-radius: 8px; margin-bottom: 24px; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 14px; }
            th, td { padding: 12px 16px; border-bottom: 1px solid #E2E8F0; }
            th { background: #F1F5F9; color: #475569; text-align: left; font-size: 12px; text-transform: uppercase; }
            .total-row { font-size: 16px; font-weight: bold; background: #F0FDF4; color: #16A34A; }
            .footer-sig { display: flex; justify-content: space-between; margin-top: 55px; padding-top: 24px; border-top: 1px dashed #CBD5E1; }
            .sig-box { text-align: center; font-size: 12px; color: #64748B; width: 180px; border-top: 1px solid #94A3B8; padding-top: 6px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="slip-card">
            <div class="header">
              <div>
                <div class="title">OFFICIAL SALARY PAYSLIP</div>
                <div class="sub-title">Period: ${MONTHS[salary.month - 1]} ${salary.year}</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 15px; font-weight: bold; color: #087FF5;">#${salary._id?.slice(-6).toUpperCase()}</div>
                <small style="color: #64748B;">Status: ${salary.status || 'Paid'}</small>
              </div>
            </div>

            <div class="emp-grid">
              <div>Employee Name: <strong>${salary.userId?.name || 'Staff'}</strong></div>
              <div>Employee ID: <strong>${empCode}</strong></div>
              <div>Email: <strong>${salary.userId?.email || 'N/A'}</strong></div>
              <div>Attendance: <strong>${salary.presentDays} / ${salary.totalWorkingDays} Days</strong></div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Component</th>
                  <th style="text-align: right;">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Base Salary</td>
                  <td style="text-align: right;">₹${(salary.baseSalary || 0).toLocaleString()}</td>
                </tr>
                <tr>
                  <td>Gross Salary Earned</td>
                  <td style="text-align: right;">₹${(salary.grossSalary || 0).toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="color: #DC2626;">Advance Deductions Recovered</td>
                  <td style="text-align: right; color: #DC2626;">- ₹${(salary.advanceDeductions || 0).toLocaleString()}</td>
                </tr>
                <tr class="total-row">
                  <td>Net Payable / Disbursed</td>
                  <td style="text-align: right;">₹${(salary.netSalary || 0).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            <div class="footer-sig">
              <div class="sig-box">Employee Signature</div>
              <div class="sig-box">Authorized Signatory / HR</div>
            </div>

            <div style="margin-top: 32px; font-size: 11px; color: #94A3B8; text-align: center;">
              Document Name: <b>${customFileName}</b>
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

  // 2. ADVANCE RECEIPT PDF DOWNLOAD
  const handleDownloadAdvancePDF = (advance) => {
    const empCode = resolveEmpId(advance.userId);
    const dateFormatted = advance.issuedDate ? new Date(advance.issuedDate).toISOString().split('T')[0] : 'N-A';
    const customFileName = `${empCode}_${dateFormatted}_AdvanceReceipt.pdf`;

    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('Please allow popups to print/download Advance Receipts.');
      return;
    }

    const remaining = (advance.amount || 0) - (advance.deductedAmount || 0);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${customFileName}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 36px; color: #1E293B; background: #fff; }
            .card-box { border: 2px solid #CBD5E1; border-radius: 12px; padding: 32px; max-width: 700px; margin: auto; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #16A34A; padding-bottom: 16px; margin-bottom: 24px; }
            .title { font-size: 20px; font-weight: bold; color: #071A33; }
            .emp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #F8FAFC; padding: 16px; border-radius: 8px; margin-bottom: 24px; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 14px; }
            th, td { padding: 12px 16px; border-bottom: 1px solid #E2E8F0; }
            th { background: #F1F5F9; color: #475569; text-align: left; font-size: 12px; text-transform: uppercase; }
            .total-row { font-size: 15px; font-weight: bold; background: #FFFBEB; color: #D97706; }
            .footer-sig { display: flex; justify-content: space-between; margin-top: 55px; padding-top: 24px; border-top: 1px dashed #CBD5E1; }
            .sig-box { text-align: center; font-size: 12px; color: #64748B; width: 180px; border-top: 1px solid #94A3B8; padding-top: 6px; }
          </style>
        </head>
        <body>
          <div class="card-box">
            <div class="header">
              <div>
                <div class="title">SALARY ADVANCE RECEIPT</div>
                <div style="font-size: 12px; color: #64748B; margin-top: 4px;">Date Issued: ${dateFormatted}</div>
              </div>
              <div style="text-align: right;">
                <div style="font-weight: bold; color: #16A34A; font-size: 15px;">#${advance._id?.slice(-6).toUpperCase()}</div>
                <small style="color: #64748B;">Status: ${advance.status}</small>
              </div>
            </div>

            <div class="emp-grid">
              <div>Employee Name: <strong>${advance.userId?.name || 'Staff'}</strong></div>
              <div>Employee ID: <strong>${empCode}</strong></div>
              <div>Email: <strong>${advance.userId?.email || 'N/A'}</strong></div>
              <div>Authorized By: <strong>${advance.issuedBy?.name || 'Accounts Admin'}</strong></div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="text-align: right;">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Total Advance Issued</td>
                  <td style="text-align: right; font-weight: bold;">₹${(advance.amount || 0).toLocaleString()}</td>
                </tr>
                <tr>
                  <td>Deducted from Previous Payrolls</td>
                  <td style="text-align: right; color: #16A34A;">₹${(advance.deductedAmount || 0).toLocaleString()}</td>
                </tr>
                <tr class="total-row">
                  <td>Remaining Liability Balance</td>
                  <td style="text-align: right;">₹${remaining.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            <div style="margin-top: 18px; font-size: 13px; background: #F8FAFC; padding: 12px 16px; border-radius: 6px;">
              <strong>Reason:</strong> ${advance.reason || 'General salary advance'}
            </div>

            <div class="footer-sig">
              <div class="sig-box">Employee Receiver</div>
              <div class="sig-box">Accounts Officer</div>
            </div>

            <div style="margin-top: 32px; font-size: 11px; color: #94A3B8; text-align: center;">
              Document Reference: <b>${customFileName}</b>
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

  const openIssueAdvance = (emp = null) => {
    setAdvanceForm({
      userId: emp ? emp._id : '',
      amount: '',
      reason: '',
      issuedDate: new Date().toISOString().split('T')[0],
    });
    setAdvanceError('');
    setShowAdvanceModal(true);
  };

  const handleIssueAdvance = async (e) => {
    e.preventDefault();
    setAdvanceSubmitting(true);
    setAdvanceError('');
    try {
      await erpApi.issueAdvance({
        ...advanceForm,
        amount: Number(advanceForm.amount),
      });
      setShowAdvanceModal(false);
      fetchOverview();
      fetchAllAdvances();
    } catch (err) {
      setAdvanceError(err.response?.data?.message || 'Failed to issue advance');
    } finally {
      setAdvanceSubmitting(false);
    }
  };

  const openGenerateSalary = (emp = null) => {
    const base = emp ? { userId: emp._id, baseSalary: emp.baseSalary || 0 } : { userId: '', baseSalary: 0 };
    setGenerateForm({
      ...base,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      totalWorkingDays: 30,
      presentDays: 0,
      grossSalary: 0,
      advanceDeductions: emp ? emp.pendingAdvance || 0 : 0,
      netSalary: -(emp ? emp.pendingAdvance || 0 : 0),
      slipUrl: '',
    });
    setGenerateError('');
    setShowGenerateModal(true);
    if (emp) {
      fetchPreview({
        userId: emp._id,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        totalWorkingDays: 30,
      });
    }
  };

  const fetchPreview = async (formState) => {
    if (!formState.userId || !formState.month || !formState.year) return;
    setPreviewLoading(true);
    try {
      const res = await erpApi.previewSalary({
        userId: formState.userId,
        month: formState.month,
        year: formState.year,
        totalWorkingDays: formState.totalWorkingDays,
      });
      const d = res?.data?.data || res?.data || {};
      setGenerateForm(prev => ({
        ...prev,
        baseSalary: d.baseSalary ?? prev.baseSalary,
        presentDays: d.presentDays ?? prev.presentDays,
        grossSalary: d.grossSalary ?? prev.grossSalary,
        advanceDeductions: d.advanceDeductions ?? prev.advanceDeductions,
        netSalary: d.netSalary ?? prev.netSalary,
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handlePreviewChange = (field, value) => {
    const updated = { ...generateForm, [field]: value };
    setGenerateForm(updated);
    if (['userId', 'month', 'year', 'totalWorkingDays'].includes(field)) {
      fetchPreview(updated);
    }
  };

  const handleOverrideChange = (field, value) => {
    const numVal = Number(value);
    const updated = { ...generateForm, [field]: numVal };
    if (field === 'grossSalary' || field === 'advanceDeductions') {
      updated.netSalary = updated.grossSalary - updated.advanceDeductions;
    }
    setGenerateForm(updated);
  };

  const handleGenerateSalary = async (e) => {
    e.preventDefault();
    setGenerateSubmitting(true);
    setGenerateError('');
    try {
      await erpApi.generateSalary({
        userId: generateForm.userId,
        month: Number(generateForm.month),
        year: Number(generateForm.year),
        totalWorkingDays: Number(generateForm.totalWorkingDays),
        slipUrl: generateForm.slipUrl,
        baseSalary: Number(generateForm.baseSalary),
        presentDays: Number(generateForm.presentDays),
        grossSalary: Number(generateForm.grossSalary),
        advanceDeductions: Number(generateForm.advanceDeductions),
        netSalary: Number(generateForm.netSalary),
      });
      setShowGenerateModal(false);
      fetchOverview();
      fetchSalaries();
    } catch (err) {
      setGenerateError(err.response?.data?.message || 'Failed to generate salary.');
    } finally {
      setGenerateSubmitting(false);
    }
  };

  const handleMarkPaid = async (salaryId) => {
    if (!window.confirm('Mark this salary as Paid?')) return;
    try {
      await erpApi.updateSalaryStatus(salaryId, { status: 'Paid' });
      fetchSalaries();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  // ── Unified Search & Dropdown Filter Pipeline ──
  const searchLower = searchQuery.toLowerCase().trim();

  const filteredSalaries = useMemo(() => {
    return (salaries || []).filter(s => {
      const emp = s.userId || {};
      const empId = emp._id || '';

      if (selectedEmployee) {
        if (empId !== selectedEmployee._id) return false;
      } else if (searchLower) {
        const empName = (emp.name || '').toLowerCase();
        const empEmail = (emp.email || '').toLowerCase();
        const empCode = (emp.employeeId || empId).toLowerCase();
        if (!empName.includes(searchLower) && !empEmail.includes(searchLower) && !empCode.includes(searchLower)) {
          return false;
        }
      }

      const matchesMonth = !filterMonth || String(s.month) === String(filterMonth);
      const matchesYear = !filterYear || String(s.year) === String(filterYear);
      const matchesStatus = !filterStatus || s.status === filterStatus;

      return matchesMonth && matchesYear && matchesStatus;
    });
  }, [salaries, selectedEmployee, searchLower, filterMonth, filterYear, filterStatus]);

  const filteredOverview = useMemo(() => {
    return (overview || []).filter(emp => {
      const empId = emp._id || '';

      if (selectedEmployee) {
        return empId === selectedEmployee._id;
      }

      if (searchLower) {
        const empName = (emp.name || '').toLowerCase();
        const empEmail = (emp.email || '').toLowerCase();
        const empDept = (emp.departmentId?.name || '').toLowerCase();
        const empCode = (emp.employeeId || empId).toLowerCase();
        return empName.includes(searchLower) || empEmail.includes(searchLower) || empDept.includes(searchLower) || empCode.includes(searchLower);
      }

      return true;
    });
  }, [overview, selectedEmployee, searchLower]);

  const filteredAdvances = useMemo(() => {
    return (advances || []).filter(a => {
      const emp = a.userId || {};
      const empId = emp._id || '';

      if (selectedEmployee) {
        if (empId !== selectedEmployee._id) return false;
      } else if (searchLower) {
        const empName = (emp.name || '').toLowerCase();
        const empEmail = (emp.email || '').toLowerCase();
        const empCode = (emp.employeeId || empId).toLowerCase();
        if (!empName.includes(searchLower) && !empEmail.includes(searchLower) && !empCode.includes(searchLower)) {
          return false;
        }
      }

      const matchesStatus = !filterStatus || a.status === filterStatus;
      return matchesStatus;
    });
  }, [advances, selectedEmployee, searchLower, filterStatus]);

  // Aggregate KPI Calculations
  const filterKpis = useMemo(() => {
    if (activeTab === 'salaries') {
      const totalNet = filteredSalaries.reduce((acc, s) => acc + (s.netSalary || 0), 0);
      const totalDeducted = filteredSalaries.reduce((acc, s) => acc + (s.advanceDeductions || 0), 0);
      const paidCount = filteredSalaries.filter(s => s.status === 'Paid').length;
      return { totalNet, totalDeducted, count: filteredSalaries.length, paidCount };
    }
    if (activeTab === 'advances') {
      const totalAmount = filteredAdvances.reduce((acc, a) => acc + (a.amount || 0), 0);
      const totalRemaining = filteredAdvances.reduce((acc, a) => acc + ((a.amount || 0) - (a.deductedAmount || 0)), 0);
      return { totalAmount, totalRemaining, count: filteredAdvances.length };
    }
    const totalPayrollLiability = filteredOverview.reduce((acc, e) => acc + (e.baseSalary || 0), 0);
    const totalPendingAdv = filteredOverview.reduce((acc, e) => acc + (e.pendingAdvance || 0), 0);
    return { totalPayrollLiability, totalPendingAdv, count: filteredOverview.length };
  }, [activeTab, filteredSalaries, filteredAdvances, filteredOverview]);

  const activeFilterCount = [
    Boolean(searchQuery || selectedEmployee),
    Boolean(filterMonth),
    Boolean(filterYear),
    Boolean(filterStatus),
  ].filter(Boolean).length;

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedEmployee(null);
    setFilterMonth('');
    setFilterYear('');
    setFilterStatus('');
  };

  return (
    <>
      <style>{`
        /* Professional Enterprise ERP Styles */
        .erp-dashboard-fade {
          animation: erpFade 0.3s ease-out;
        }
        @keyframes erpFade {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .erp-filter-panel {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(7, 26, 51, 0.05);
          transition: box-shadow 0.2s ease;
        }

        .erp-filter-label {
          font-size: 0.72rem;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .erp-field-focus:focus {
          border-color: #087FF5 !important;
          outline: none;
          box-shadow: 0 0 0 3px rgba(8, 127, 245, 0.14) !important;
        }

        /* Animated Combobox Dropdown */
        .erp-combobox-menu {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          background: #FFFFFF;
          border-radius: 12px;
          border: 1px solid #CBD5E1;
          box-shadow: 0 14px 32px rgba(15, 23, 42, 0.15);
          z-index: 1050;
          max-height: 310px;
          overflow-y: auto;
          animation: menuSlide 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes menuSlide {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .erp-combobox-item {
          padding: 10px 14px;
          cursor: pointer;
          transition: background-color 0.15s ease;
          border-bottom: 1px solid #F1F5F9;
        }
        .erp-combobox-item:last-child {
          border-bottom: none;
        }
        .erp-combobox-item:hover {
          background-color: #F8FAFC;
        }
        .erp-combobox-item.active {
          background-color: #EBF4FE;
        }

        .erp-badge-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          background: #EFF6FF;
          color: #1D4ED8;
          border: 1px solid #BFDBFE;
          border-radius: 8px;
          font-size: 0.74rem;
          font-weight: 600;
        }
        .erp-badge-chip button {
          background: none;
          border: none;
          padding: 0;
          color: #3B82F6;
          font-weight: bold;
          cursor: pointer;
          font-size: 0.85rem;
          line-height: 1;
        }
        .erp-badge-chip button:hover {
          color: #DC2626;
        }

        .erp-quick-preset-btn {
          border: 1px solid #CBD5E1;
          background: #F8FAFC;
          color: #475569;
          font-size: 0.74rem;
          font-weight: 600;
          padding: 6px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.18s ease;
        }
        .erp-quick-preset-btn:hover {
          background: #EFF6FF;
          color: #087FF5;
          border-color: #93C5FD;
          transform: translateY(-1px);
        }

        .erp-kpi-pill {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          padding: 10px 18px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.02);
        }

        .erp-table-row {
          transition: background-color 0.16s ease;
        }
        .erp-table-row:hover {
          background-color: #F8FAFC !important;
        }

        .erp-card-elevated {
          transition: transform 0.22s ease, box-shadow 0.22s ease;
        }
        .erp-card-elevated:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08) !important;
        }
      `}</style>

      {/* Main Page Container */}
      <div 
        className="w-100 px-3 px-sm-4 px-md-5 py-4 py-md-5 erp-dashboard-fade"
        style={{ backgroundColor: ERP.mainBg, minHeight: '100vh', color: ERP.textPrimary }}
      >
        <div className="mx-auto" style={{ maxWidth: '1400px' }}>
          
          {/* Header Banner Section */}
          <div
            className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4 p-4 rounded-4 shadow-sm erp-card-elevated"
            style={{ backgroundColor: ERP.cardBg, border: `1px solid ${ERP.border}` }}
          >
            <div className="pe-sm-3">
              <div className="d-flex align-items-center gap-2 mb-2">
                <span
                  className="badge rounded-pill fw-bold px-3 py-1.5"
                  style={{ backgroundColor: '#EBF4FE', color: ERP.primary, fontSize: '0.68rem', letterSpacing: '0.6px' }}
                >
                  ENTERPRISE PAYROLL LEDGER
                </span>
                {selectedEmployee && (
                  <span
                    className="badge rounded-pill fw-bold px-3 py-1.5"
                    style={{ backgroundColor: '#DCFCE7', color: ERP.success, fontSize: '0.68rem' }}
                  >
                    FOCUS: {selectedEmployee.name.toUpperCase()}
                  </span>
                )}
              </div>
              <h3 className="fw-bold mb-1.5" style={{ color: ERP.sidebar, fontSize: '1.45rem', letterSpacing: '-0.3px' }}>
                Payroll & Advance Administration
              </h3>
              <p className="small mb-0 text-muted" style={{ fontSize: '0.83rem', lineHeight: '1.4' }}>
                Reconcile salary disbursements, monitor advance amortizations, and download audited PDF slips.
              </p>
            </div>

            <div className="d-flex align-items-center gap-2 mt-2 mt-sm-0 flex-shrink-0">
              <PermissionGate module="salary" action="issue_advance">
                <button
                  className="btn text-white fw-bold px-4 py-2.5 rounded-3 shadow-sm"
                  style={{ backgroundColor: ERP.success, border: 'none', fontSize: '0.84rem' }}
                  onClick={() => openIssueAdvance()}
                >
                  + Issue Salary Advance
                </button>
              </PermissionGate>
            </div>
          </div>

          {/* Tab Navigation Section */}
          <div 
            className="d-flex flex-wrap align-items-center gap-1.5 mb-4 p-1.5 rounded-3 shadow-sm"
            style={{ backgroundColor: ERP.cardBg, border: `1px solid ${ERP.border}`, width: 'fit-content' }}
          >
            {[
              { id: 'salaries', label: 'Salary Ledger', icon: '📑' },
              { id: 'overview', label: 'Employee Overview', icon: '👥' },
              { id: 'advances', label: 'Advances Register', icon: '🏦' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                className="btn fw-bold px-3.5 py-2 rounded-2 shadow-none"
                style={{
                  backgroundColor: activeTab === tab.id ? ERP.primary : 'transparent',
                  color: activeTab === tab.id ? '#FFFFFF' : ERP.textSecondary,
                  border: activeTab === tab.id ? `1px solid ${ERP.primary}` : '1px solid transparent',
                  fontSize: '0.82rem',
                }}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="me-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filter Panel Section */}
          <div className="erp-filter-panel p-3.5 p-sm-4 mb-4">
            
            {/* Header row in filter */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 pb-3 mb-3 border-bottom">
              <div className="d-flex align-items-center gap-2.5">
                <div 
                  className="d-flex align-items-center justify-content-center rounded-2"
                  style={{ width: '34px', height: '34px', backgroundColor: '#EBF4FE', color: ERP.primary, fontSize: '1rem' }}
                >
                  ⚡
                </div>
                <div>
                  <h6 className="fw-bold mb-0.5" style={{ color: ERP.sidebar, fontSize: '0.94rem' }}>
                    Ledger Query & Employee Search
                  </h6>
                  <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
                    Type an employee name or click the drop-down to filter records directly
                  </span>
                </div>
              </div>

              {/* Presets and Reset */}
              <div className="d-flex align-items-center flex-wrap gap-2 mt-2 mt-md-0">
                <span className="small text-muted me-1 fw-semibold" style={{ fontSize: '0.73rem' }}>Presets:</span>
                <button
                  type="button"
                  className="erp-quick-preset-btn"
                  onClick={() => {
                    const now = new Date();
                    setFilterMonth(now.getMonth() + 1);
                    setFilterYear(now.getFullYear());
                  }}
                >
                  📅 Current Month
                </button>

                {activeTab === 'salaries' && (
                  <>
                    <button
                      type="button"
                      className="erp-quick-preset-btn"
                      onClick={() => setFilterStatus('Paid')}
                    >
                      ✓ Paid Only
                    </button>
                    <button
                      type="button"
                      className="erp-quick-preset-btn"
                      onClick={() => setFilterStatus('Draft')}
                    >
                      ⏳ Draft Only
                    </button>
                  </>
                )}

                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    className="btn btn-sm btn-link text-danger p-0 ps-2 ms-1 fw-bold text-decoration-none"
                    style={{ fontSize: '0.75rem' }}
                    onClick={resetAllFilters}
                  >
                    Reset All ({activeFilterCount})
                  </button>
                )}
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="row g-3 align-items-end mb-2">
              
              {/* Dual-Function Search & Employee Combobox */}
              <div className="col-12 col-md-5 col-lg-4" ref={searchBoxRef}>
                <label className="erp-filter-label">
                  <span>👤</span> Search Employee / Code
                </label>
                <div className="position-relative">
                  <div className="input-group">
                    <span 
                      className="input-group-text bg-white border-end-0 text-muted"
                      style={{ borderColor: selectedEmployee ? '#087FF5' : '#CBD5E1', padding: '0 12px' }}
                    >
                      {selectedEmployee ? '👤' : '🔎'}
                    </span>
                    <input
                      type="text"
                      className="form-control form-control-sm border-start-0 border-end-0 shadow-none erp-field-focus"
                      placeholder={selectedEmployee ? `Selected: ${selectedEmployee.name}` : "Type name, ID code, or click ▾"}
                      value={searchQuery}
                      onFocus={() => setIsEmployeeDropdownOpen(true)}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (selectedEmployee) setSelectedEmployee(null);
                        setIsEmployeeDropdownOpen(true);
                      }}
                      style={{ 
                        borderColor: selectedEmployee ? '#087FF5' : '#CBD5E1', 
                        padding: '9px 12px',
                        fontSize: '0.84rem',
                        height: '40px',
                        fontWeight: selectedEmployee ? '600' : 'normal',
                        color: selectedEmployee ? '#087FF5' : ERP.textPrimary
                      }}
                    />

                    {/* Clear Button */}
                    {(searchQuery || selectedEmployee) && (
                      <button
                        type="button"
                        className="btn btn-outline-secondary border-start-0 border-end-0 bg-white d-flex align-items-center justify-content-center"
                        style={{ borderColor: selectedEmployee ? '#087FF5' : '#CBD5E1', color: '#94A3B8', padding: '0 10px' }}
                        onClick={handleClearEmployeeSelection}
                        title="Clear selection"
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
                      title="Toggle employee list"
                      style={{ 
                        borderColor: selectedEmployee ? '#087FF5' : '#CBD5E1',
                        backgroundColor: isEmployeeDropdownOpen ? '#E2E8F0' : '#F8FAFC',
                        padding: '0 14px',
                        height: '40px',
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
                    <div className="erp-combobox-menu">
                      <div className="p-2.5 border-bottom d-flex justify-content-between align-items-center bg-light">
                        <span className="small fw-bold text-uppercase text-muted" style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}>
                          Personnel Directory ({overview.length})
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
                          No matching personnel found
                        </div>
                      ) : (
                        filteredDropdownEmployees.map((emp) => {
                          const isSelected = selectedEmployee?._id === emp._id;
                          const empCode = resolveEmpId(emp);
                          return (
                            <div
                              key={emp._id}
                              className={`erp-combobox-item d-flex align-items-center justify-content-between ${isSelected ? 'active' : ''}`}
                              onClick={() => handleSelectEmployee(emp)}
                            >
                              <div className="d-flex align-items-center gap-2.5">
                                <div
                                  className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                                  style={{
                                    width: '34px',
                                    height: '34px',
                                    backgroundColor: isSelected ? ERP.primary : '#475569',
                                    fontSize: '0.78rem'
                                  }}
                                >
                                  {emp.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="fw-bold text-dark" style={{ fontSize: '0.84rem' }}>
                                    {emp.name}
                                  </div>
                                  <small className="text-muted d-block" style={{ fontSize: '0.72rem' }}>
                                    {empCode} {emp.departmentId?.name ? `• ${emp.departmentId.name}` : ''}
                                  </small>
                                </div>
                              </div>
                              <div className="text-end">
                                <div className="font-monospace fw-semibold" style={{ fontSize: '0.78rem', color: ERP.sidebar }}>
                                  ₹{(emp.baseSalary || 0).toLocaleString()}
                                </div>
                                {emp.pendingAdvance > 0 && (
                                  <small className="text-warning fw-semibold" style={{ fontSize: '0.70rem' }}>
                                    Adv: ₹{emp.pendingAdvance.toLocaleString()}
                                  </small>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Month & Year Filters for Salaries */}
              {activeTab === 'salaries' && (
                <>
                  <div className="col-6 col-md-3 col-lg-2">
                    <label className="erp-filter-label">
                      <span>📆</span> Payroll Month
                    </label>
                    <select
                      className="form-select form-select-sm fw-semibold erp-field-focus shadow-none"
                      value={filterMonth}
                      onChange={(e) => setFilterMonth(e.target.value)}
                      style={{ borderRadius: '8px', borderColor: '#CBD5E1', height: '40px', fontSize: '0.84rem' }}
                    >
                      <option value="">All Months</option>
                      {MONTHS.map((m, i) => (
                        <option key={i} value={i + 1}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-6 col-md-2 col-lg-2">
                    <label className="erp-filter-label">
                      <span>📅</span> Fiscal Year
                    </label>
                    <select
                      className="form-select form-select-sm fw-semibold erp-field-focus shadow-none"
                      value={filterYear}
                      onChange={(e) => setFilterYear(e.target.value)}
                      style={{ borderRadius: '8px', borderColor: '#CBD5E1', height: '40px', fontSize: '0.84rem' }}
                    >
                      <option value="">All Years</option>
                      {[2024, 2025, 2026, 2027].map((yr) => (
                        <option key={yr} value={yr}>{yr}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-12 col-md-2 col-lg-2">
                    <label className="erp-filter-label">
                      <span>🏷️</span> Status
                    </label>
                    <select
                      className="form-select form-select-sm fw-semibold erp-field-focus shadow-none"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      style={{ borderRadius: '8px', borderColor: '#CBD5E1', height: '40px', fontSize: '0.84rem' }}
                    >
                      <option value="">All Statuses</option>
                      <option value="Paid">Paid</option>
                      <option value="Draft">Draft</option>
                    </select>
                  </div>
                </>
              )}

              {/* Advance Status Filter */}
              {activeTab === 'advances' && (
                <div className="col-12 col-md-4 col-lg-3">
                  <label className="erp-filter-label">
                    <span>🏷️</span> Advance Status
                  </label>
                  <select
                    className="form-select form-select-sm fw-semibold erp-field-focus shadow-none"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{ borderRadius: '8px', borderColor: '#CBD5E1', height: '40px', fontSize: '0.84rem' }}
                  >
                    <option value="">All Statuses</option>
                    <option value="Issued">Issued (Pending)</option>
                    <option value="Partial">Partial Recovery</option>
                    <option value="Deducted">Deducted (Settled)</option>
                  </select>
                </div>
              )}

              <div className="col d-flex justify-content-end align-items-center">
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    className="btn btn-link text-decoration-none text-danger fw-semibold p-0 me-2"
                    style={{ fontSize: '0.78rem' }}
                    onClick={resetAllFilters}
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Filter Badges Row */}
            {activeFilterCount > 0 && (
              <div className="d-flex flex-wrap align-items-center gap-2 pt-3 mt-3 border-top">
                <span className="small text-muted fw-bold me-1" style={{ fontSize: '0.73rem' }}>
                  ACTIVE CONDITIONS:
                </span>

                {selectedEmployee ? (
                  <span className="erp-badge-chip">
                    Employee: {selectedEmployee.name} [{resolveEmpId(selectedEmployee)}]
                    <button type="button" onClick={handleClearEmployeeSelection}>✕</button>
                  </span>
                ) : searchQuery ? (
                  <span className="erp-badge-chip">
                    Search: "{searchQuery}"
                    <button type="button" onClick={() => setSearchQuery('')}>✕</button>
                  </span>
                ) : null}

                {filterMonth && (
                  <span className="erp-badge-chip">
                    Month: {MONTHS[Number(filterMonth) - 1]}
                    <button type="button" onClick={() => setFilterMonth('')}>✕</button>
                  </span>
                )}

                {filterYear && (
                  <span className="erp-badge-chip">
                    Year: {filterYear}
                    <button type="button" onClick={() => setFilterYear('')}>✕</button>
                  </span>
                )}

                {filterStatus && (
                  <span className="erp-badge-chip">
                    Status: {filterStatus}
                    <button type="button" onClick={() => setFilterStatus('')}>✕</button>
                  </span>
                )}
              </div>
            )}

            {/* Live Filter KPI Summary Bar */}
            <div className="d-flex flex-wrap align-items-center gap-2.5 pt-3 mt-3 border-top bg-light p-3 rounded-3">
              <div className="erp-kpi-pill">
                <span className="text-muted small fw-semibold">Matched Records:</span>
                <strong style={{ color: ERP.sidebar }}>{filterKpis.count}</strong>
              </div>

              {activeTab === 'salaries' && (
                <>
                  <div className="erp-kpi-pill">
                    <span className="text-muted small fw-semibold">Disbursed Payable (Net):</span>
                    <strong className="text-success font-monospace">₹{filterKpis.totalNet?.toLocaleString()}</strong>
                  </div>
                  <div className="erp-kpi-pill">
                    <span className="text-muted small fw-semibold">Recovered Advances:</span>
                    <strong className="text-danger font-monospace">- ₹{filterKpis.totalDeducted?.toLocaleString()}</strong>
                  </div>
                  <div className="erp-kpi-pill">
                    <span className="text-muted small fw-semibold">Settled Slips:</span>
                    <span className="badge bg-success-subtle text-success fw-bold px-2 py-1">{filterKpis.paidCount} Paid</span>
                  </div>
                </>
              )}

              {activeTab === 'advances' && (
                <>
                  <div className="erp-kpi-pill">
                    <span className="text-muted small fw-semibold">Total Issued:</span>
                    <strong className="font-monospace">₹{filterKpis.totalAmount?.toLocaleString()}</strong>
                  </div>
                  <div className="erp-kpi-pill">
                    <span className="text-muted small fw-semibold">Outstanding Liability:</span>
                    <strong className="text-warning font-monospace">₹{filterKpis.totalRemaining?.toLocaleString()}</strong>
                  </div>
                </>
              )}

              {activeTab === 'overview' && (
                <>
                  <div className="erp-kpi-pill">
                    <span className="text-muted small fw-semibold">Monthly Salary Commitment:</span>
                    <strong className="text-primary font-monospace">₹{filterKpis.totalPayrollLiability?.toLocaleString()}</strong>
                  </div>
                  <div className="erp-kpi-pill">
                    <span className="text-muted small fw-semibold">Active Advances Liability:</span>
                    <strong className="text-warning font-monospace">₹{filterKpis.totalPendingAdv?.toLocaleString()}</strong>
                  </div>
                </>
              )}
            </div>

          </div>

          {/* Table Container Section: Salaries */}
          {activeTab === 'salaries' && (
            salariesLoading ? (
              <div className="py-5 text-center">
                <LoadingSpinner text="Loading verified salary records..." />
              </div>
            ) : (
              <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-5" style={{ border: `1px solid ${ERP.border}` }}>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table align-middle mb-0 text-nowrap">
                      <thead style={{ backgroundColor: '#F8FAFC', borderBottom: `2px solid ${ERP.border}` }}>
                        <tr className="text-uppercase" style={{ color: ERP.textSecondary, fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                          <th className="py-3 px-3 px-md-4">Employee</th>
                          <th className="py-3 px-3">Emp ID</th>
                          <th className="py-3 px-3">Month / Year</th>
                          <th className="py-3 px-3 text-end">Base Salary</th>
                          <th className="py-3 px-3 text-end">Gross</th>
                          <th className="py-3 px-3 text-end">Adv. Deducted</th>
                          <th className="py-3 px-3 text-end">Net Salary</th>
                          <th className="py-3 px-3 text-center">Status</th>
                          <th className="py-3 px-3 text-center">PDF Slip</th>
                          <th className="py-3 px-3 px-md-4 text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSalaries.length === 0 ? (
                          <tr><td colSpan="10" className="text-center text-muted py-5 px-3">No salary records match the applied filters.</td></tr>
                        ) : filteredSalaries.map(s => {
                          const empCode = resolveEmpId(s.userId);
                          const period = `${s.year}-${String(s.month).padStart(2, '0')}`;
                          return (
                            <tr key={s._id} className="erp-table-row" style={{ borderBottom: `1px solid ${ERP.border}` }}>
                              <td className="py-3.5 px-3 px-md-4">
                                <div className="fw-bold mb-0.5" style={{ color: ERP.textPrimary }}>{s.userId?.name || 'Staff Member'}</div>
                                <small style={{ color: ERP.textSecondary, fontSize: '0.74rem' }}>{s.userId?.email || 'N/A'}</small>
                              </td>
                              <td className="py-3.5 px-3 small font-monospace fw-semibold">{empCode}</td>
                              <td className="py-3.5 px-3 small fw-semibold">{MONTHS[(s.month || 1) - 1]} {s.year}</td>
                              <td className="py-3.5 px-3 text-end font-monospace">₹{(s.baseSalary || 0).toLocaleString()}</td>
                              <td className="py-3.5 px-3 text-end font-monospace">₹{(s.grossSalary || 0).toFixed(2)}</td>
                              <td className="py-3.5 px-3 text-end font-monospace fw-semibold" style={{ color: ERP.error }}>
                                {s.advanceDeductions > 0 ? `- ₹${s.advanceDeductions.toFixed(2)}` : '—'}
                              </td>
                              <td className="py-3.5 px-3 text-end font-monospace fw-bold" style={{ color: ERP.success, fontSize: '0.90rem' }}>
                                ₹{(s.netSalary || 0).toFixed(2)}
                              </td>
                              <td className="py-3.5 px-3 text-center">
                                <span 
                                  className="badge px-3 py-1.5 fw-semibold rounded-pill"
                                  style={{
                                    backgroundColor: s.status === 'Paid' ? '#DCFCE7' : '#F1F5F9',
                                    color: s.status === 'Paid' ? ERP.success : ERP.textSecondary,
                                    border: `1px solid ${s.status === 'Paid' ? '#BBF7D0' : ERP.border}`
                                  }}
                                >
                                  {s.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-3 text-center">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-primary rounded-2 px-3 py-1 fw-semibold shadow-none"
                                  style={{ fontSize: '0.75rem' }}
                                  title={`Download ${empCode}_${period}_SalarySlip.pdf`}
                                  onClick={() => handleDownloadSalaryPDF(s)}
                                >
                                  📥 PDF Slip
                                </button>
                              </td>
                              <td className="py-3.5 px-3 px-md-4 text-end">
                                {s.status === 'Draft' && (
                                  <PermissionGate module="salary" action="generate_salary">
                                    <button
                                      type="button"
                                      className="btn btn-sm text-white fw-bold rounded-2 px-3 py-1.5 shadow-sm"
                                      style={{ backgroundColor: ERP.success, border: 'none', fontSize: '0.76rem' }}
                                      onClick={() => handleMarkPaid(s._id)}
                                    >
                                      Mark Paid
                                    </button>
                                  </PermissionGate>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )
          )}

          {/* Table Container Section: Overview */}
          {activeTab === 'overview' && (
            overviewLoading ? (
              <div className="py-5 text-center">
                <LoadingSpinner text="Loading employee records..." />
              </div>
            ) : (
              <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-5" style={{ border: `1px solid ${ERP.border}` }}>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table align-middle mb-0 text-nowrap">
                      <thead style={{ backgroundColor: '#F8FAFC', borderBottom: `2px solid ${ERP.border}` }}>
                        <tr className="text-uppercase" style={{ color: ERP.textSecondary, fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                          <th className="py-3 px-3 px-md-4">Employee</th>
                          <th className="py-3 px-3">Emp ID</th>
                          <th className="py-3 px-3">Department</th>
                          <th className="py-3 px-3">Branch</th>
                          <th className="py-3 px-3 text-end">Base Salary (₹)</th>
                          <th className="py-3 px-3 text-end">Pending Advance (₹)</th>
                          <th className="py-3 px-3 px-md-4 text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOverview.length === 0 ? (
                          <tr><td colSpan="7" className="text-center text-muted py-5 px-3">No employees match your search query.</td></tr>
                        ) : filteredOverview.map(emp => (
                          <tr key={emp._id} className="erp-table-row" style={{ borderBottom: `1px solid ${ERP.border}` }}>
                            <td className="py-3.5 px-3 px-md-4">
                              <div className="fw-bold mb-0.5" style={{ color: ERP.textPrimary }}>{emp.name}</div>
                              <small style={{ color: ERP.textSecondary, fontSize: '0.74rem' }}>{emp.email}</small>
                            </td>
                            <td className="py-3.5 px-3 small font-monospace fw-semibold">{resolveEmpId(emp)}</td>
                            <td className="py-3.5 px-3 small">{emp.departmentId?.name || '—'}</td>
                            <td className="py-3.5 px-3 small">{emp.branchId?.name || '—'}</td>
                            <td className="py-3.5 px-3 text-end fw-bold font-monospace">₹{(emp.baseSalary || 0).toLocaleString()}</td>
                            <td className="py-3.5 px-3 text-end">
                              {emp.pendingAdvance > 0 ? (
                                <span className="badge px-3 py-1.5 fw-semibold" style={{ backgroundColor: '#FEF3C7', color: ERP.warning, border: '1px solid #FDE68A', borderRadius: '6px' }}>
                                  ₹{emp.pendingAdvance.toLocaleString()} ({emp.advanceCount || 1} adv)
                                </span>
                              ) : <span className="text-muted small">—</span>}
                            </td>
                            <td className="py-3.5 px-3 px-md-4 text-end">
                              <div className="d-inline-flex gap-2">
                                <PermissionGate module="salary" action="issue_advance">
                                  <button
                                    className="btn btn-sm fw-semibold rounded-2 shadow-none"
                                    style={{ border: `1px solid ${ERP.success}`, color: ERP.success, backgroundColor: '#FFFFFF', fontSize: '0.76rem', padding: '6px 12px' }}
                                    onClick={() => openIssueAdvance(emp)}
                                  >
                                    + Advance
                                  </button>
                                </PermissionGate>
                                <PermissionGate module="salary" action="generate_salary">
                                  <button
                                    className="btn btn-sm text-white fw-semibold rounded-2 shadow-sm"
                                    style={{ backgroundColor: ERP.primary, border: 'none', fontSize: '0.76rem', padding: '6px 13px' }}
                                    onClick={() => openGenerateSalary(emp)}
                                  >
                                    🧮 Generate Salary
                                  </button>
                                </PermissionGate>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )
          )}

          {/* Table Container Section: Advances */}
          {activeTab === 'advances' && (
            advancesLoading ? (
              <div className="py-5 text-center">
                <LoadingSpinner text="Loading advances registry..." />
              </div>
            ) : (
              <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-5" style={{ border: `1px solid ${ERP.border}` }}>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table align-middle mb-0 text-nowrap">
                      <thead style={{ backgroundColor: '#F8FAFC', borderBottom: `2px solid ${ERP.border}` }}>
                        <tr className="text-uppercase" style={{ color: ERP.textSecondary, fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                          <th className="py-3 px-3 px-md-4">Employee</th>
                          <th className="py-3 px-3">Emp ID</th>
                          <th className="py-3 px-3">Date Issued</th>
                          <th className="py-3 px-3 text-end">Amount (₹)</th>
                          <th className="py-3 px-3 text-end">Deducted (₹)</th>
                          <th className="py-3 px-3 text-end">Balance (₹)</th>
                          <th className="py-3 px-3">Reason</th>
                          <th className="py-3 px-3 text-center">Status</th>
                          <th className="py-3 px-3 px-md-4 text-center">Receipt PDF</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAdvances.length === 0 ? (
                          <tr><td colSpan="9" className="text-center text-muted py-5 px-3">No advances match your search filters.</td></tr>
                        ) : filteredAdvances.map(a => {
                          const empCode = resolveEmpId(a.userId);
                          const dateStr = a.issuedDate ? new Date(a.issuedDate).toLocaleDateString() : '—';
                          const isoDate = a.issuedDate ? new Date(a.issuedDate).toISOString().split('T')[0] : '';
                          const remainingAmt = (a.amount || 0) - (a.deductedAmount || 0);

                          return (
                            <tr key={a._id} className="erp-table-row" style={{ borderBottom: `1px solid ${ERP.border}` }}>
                              <td className="py-3.5 px-3 px-md-4">
                                <div className="fw-bold mb-0.5" style={{ color: ERP.textPrimary }}>{a.userId?.name || 'Staff Member'}</div>
                                <small style={{ color: ERP.textSecondary, fontSize: '0.74rem' }}>{a.userId?.email || 'N/A'}</small>
                              </td>
                              <td className="py-3.5 px-3 small font-monospace fw-semibold">{empCode}</td>
                              <td className="py-3.5 px-3 small">{dateStr}</td>
                              <td className="py-3.5 px-3 text-end font-monospace fw-semibold">₹{(a.amount || 0).toLocaleString()}</td>
                              <td className="py-3.5 px-3 text-end font-monospace" style={{ color: ERP.success }}>₹{(a.deductedAmount || 0).toLocaleString()}</td>
                              <td className="py-3.5 px-3 text-end font-monospace fw-bold" style={{ color: ERP.warning }}>
                                ₹{remainingAmt.toLocaleString()}
                              </td>
                              <td className="py-3.5 px-3 small text-muted text-truncate" style={{ maxWidth: '180px' }}>{a.reason || '—'}</td>
                              <td className="py-3.5 px-3 text-center">
                                <span 
                                  className="badge px-3 py-1.5 fw-semibold rounded-pill"
                                  style={{
                                    backgroundColor: a.status === 'Deducted' ? '#DCFCE7' : a.status === 'Partial' ? '#EBF4FE' : '#FEF3C7',
                                    color: a.status === 'Deducted' ? ERP.success : a.status === 'Partial' ? ERP.primary : ERP.warning,
                                    border: `1px solid ${a.status === 'Deducted' ? '#BBF7D0' : a.status === 'Partial' ? '#BFDBFE' : '#FDE68A'}`
                                  }}
                                >
                                  {a.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-3 px-md-4 text-center">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-success rounded-2 px-3 py-1 fw-semibold shadow-none"
                                  style={{ fontSize: '0.75rem' }}
                                  title={`Download ${empCode}_${isoDate}_AdvanceReceipt.pdf`}
                                  onClick={() => handleDownloadAdvancePDF(a)}
                                >
                                  📥 Receipt
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )
          )}

        </div>

        {/* Modal: Issue Advance */}
        <Modal show={showAdvanceModal} title="💵 Issue Salary Advance" onClose={() => setShowAdvanceModal(false)}>
          {advanceError && <div className="alert alert-danger py-2.5 px-3 mb-3 small">{advanceError}</div>}
          <form onSubmit={handleIssueAdvance} className="p-2">
            <div className="mb-3.5">
              <label className="form-label fw-bold small text-muted mb-2" style={{ fontSize: '0.78rem' }}>Select Employee *</label>
              <select
                className="form-select shadow-none"
                value={advanceForm.userId}
                onChange={e => setAdvanceForm({ ...advanceForm, userId: e.target.value })}
                required
                style={{ borderRadius: '8px', borderColor: ERP.border, fontSize: '0.86rem', padding: '10px 14px' }}
              >
                <option value="">-- Choose Employee --</option>
                {overview.map(emp => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name} — Base: ₹{(emp.baseSalary || 0).toLocaleString()}
                    {emp.pendingAdvance > 0 ? ` | Pending: ₹${emp.pendingAdvance.toLocaleString()}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3.5">
              <label className="form-label fw-bold small text-muted mb-2" style={{ fontSize: '0.78rem' }}>Advance Amount (₹) *</label>
              <input
                type="number"
                className="form-control fw-bold shadow-none"
                min="1"
                step="0.01"
                placeholder="e.g. 5000"
                value={advanceForm.amount}
                onChange={e => setAdvanceForm({ ...advanceForm, amount: e.target.value })}
                required
                style={{ borderRadius: '8px', borderColor: ERP.border, fontSize: '0.94rem', color: ERP.success, padding: '10px 14px' }}
              />
            </div>

            <div className="mb-3.5">
              <label className="form-label fw-bold small text-muted mb-2" style={{ fontSize: '0.78rem' }}>Issued Date *</label>
              <input
                type="date"
                className="form-control shadow-none"
                value={advanceForm.issuedDate}
                onChange={e => setAdvanceForm({ ...advanceForm, issuedDate: e.target.value })}
                required
                style={{ borderRadius: '8px', borderColor: ERP.border, fontSize: '0.86rem', padding: '10px 14px' }}
              />
            </div>

            <div className="mb-4">
              <label className="form-label fw-bold small text-muted mb-2" style={{ fontSize: '0.78rem' }}>Reason / Remarks</label>
              <input
                type="text"
                className="form-control shadow-none"
                placeholder="e.g., Medical or personal expense"
                value={advanceForm.reason}
                onChange={e => setAdvanceForm({ ...advanceForm, reason: e.target.value })}
                style={{ borderRadius: '8px', borderColor: ERP.border, fontSize: '0.86rem', padding: '10px 14px' }}
              />
            </div>

            <div className="d-flex justify-content-end gap-2.5 pt-3.5 border-top">
              <button type="button" className="btn btn-light fw-semibold px-4 py-2 shadow-none" style={{ border: `1px solid ${ERP.silver}`, borderRadius: '8px', fontSize: '0.82rem' }} onClick={() => setShowAdvanceModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn text-white fw-bold px-4 py-2 shadow-sm" style={{ backgroundColor: ERP.success, border: 'none', borderRadius: '8px', fontSize: '0.82rem' }} disabled={advanceSubmitting}>
                {advanceSubmitting ? 'Issuing...' : 'Confirm Issue'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal: Generate Salary */}
        <Modal show={showGenerateModal} title="🧮 Process Employee Salary" onClose={() => setShowGenerateModal(false)}>
          {generateError && <div className="alert alert-danger py-2.5 px-3 mb-3 small">{generateError}</div>}
          <form onSubmit={handleGenerateSalary} className="p-2">
            <div className="mb-3.5">
              <label className="form-label fw-bold small text-muted mb-2" style={{ fontSize: '0.78rem' }}>Select Employee *</label>
              <select
                className="form-select shadow-none"
                value={generateForm.userId}
                onChange={e => handlePreviewChange('userId', e.target.value)}
                required
                style={{ borderRadius: '8px', borderColor: ERP.border, fontSize: '0.86rem', padding: '10px 14px' }}
              >
                <option value="">-- Choose Employee --</option>
                {overview.map(emp => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name} — ₹{(emp.baseSalary || 0).toLocaleString()}/mo
                  </option>
                ))}
              </select>
            </div>

            <div className="row g-3 mb-3.5">
              <div className="col-6">
                <label className="form-label fw-bold small text-muted mb-2" style={{ fontSize: '0.78rem' }}>Month</label>
                <select 
                  className="form-select shadow-none" 
                  value={generateForm.month} 
                  onChange={e => handlePreviewChange('month', e.target.value)} 
                  required
                  style={{ borderRadius: '8px', borderColor: ERP.border, fontSize: '0.86rem', padding: '10px 14px' }}
                >
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div className="col-6">
                <label className="form-label fw-bold small text-muted mb-2" style={{ fontSize: '0.78rem' }}>Year</label>
                <input 
                  type="number" 
                  className="form-control shadow-none" 
                  value={generateForm.year} 
                  onChange={e => handlePreviewChange('year', e.target.value)} 
                  required 
                  min="2000" 
                  max="2100" 
                  style={{ borderRadius: '8px', borderColor: ERP.border, fontSize: '0.86rem', padding: '10px 14px' }}
                />
              </div>
            </div>

            <div className="row g-3 mb-3.5">
              <div className="col-6">
                <label className="form-label fw-bold small text-muted mb-2" style={{ fontSize: '0.78rem' }}>Total Days</label>
                <input 
                  type="number" 
                  className="form-control shadow-none" 
                  value={generateForm.totalWorkingDays} 
                  onChange={e => handlePreviewChange('totalWorkingDays', e.target.value)} 
                  required 
                  min="1" 
                  max="31" 
                  style={{ borderRadius: '8px', borderColor: ERP.border, fontSize: '0.86rem', padding: '10px 14px' }}
                />
              </div>
              <div className="col-6">
                <label className="form-label fw-bold small text-muted mb-2" style={{ fontSize: '0.78rem' }}>Present Days</label>
                <input 
                  type="number" 
                  className="form-control shadow-none" 
                  value={generateForm.presentDays} 
                  onChange={e => handleOverrideChange('presentDays', e.target.value)} 
                  required 
                  min="0" 
                  step="0.5" 
                  style={{ borderRadius: '8px', borderColor: ERP.border, fontSize: '0.86rem', padding: '10px 14px' }}
                />
                {previewLoading && <small className="text-primary d-block mt-1" style={{ fontSize: '0.72rem' }}>Calculating values...</small>}
              </div>
            </div>

            <div className="p-3.5 mb-4 rounded-3" style={{ backgroundColor: '#F8FAFC', border: `1px solid ${ERP.border}` }}>
              <div className="row g-3">
                <div className="col-6">
                  <label className="form-label small text-muted mb-1.5">Base Salary (₹)</label>
                  <input type="number" className="form-control form-control-sm py-2 px-2.5" value={generateForm.baseSalary} onChange={e => handleOverrideChange('baseSalary', e.target.value)} />
                </div>
                <div className="col-6">
                  <label className="form-label small text-muted mb-1.5">Gross Salary (₹)</label>
                  <input type="number" className="form-control form-control-sm py-2 px-2.5" value={generateForm.grossSalary} onChange={e => handleOverrideChange('grossSalary', e.target.value)} />
                </div>
                <div className="col-6">
                  <label className="form-label small text-danger mb-1.5">Advance Deductions (₹)</label>
                  <input type="number" className="form-control form-control-sm border-danger py-2 px-2.5" value={generateForm.advanceDeductions} onChange={e => handleOverrideChange('advanceDeductions', e.target.value)} />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-bold text-success mb-1.5">Net Salary (₹)</label>
                  <input type="number" className={`form-control form-control-sm fw-bold py-2 px-2.5 ${generateForm.netSalary < 0 ? 'border-danger text-danger' : 'border-success text-success'}`} value={generateForm.netSalary} onChange={e => handleOverrideChange('netSalary', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2.5 pt-3.5 border-top">
              <button type="button" className="btn btn-light fw-semibold px-4 py-2 shadow-none" style={{ border: `1px solid ${ERP.silver}`, borderRadius: '8px', fontSize: '0.82rem' }} onClick={() => setShowGenerateModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn text-white fw-bold px-4 py-2 shadow-sm" style={{ backgroundColor: ERP.primary, border: 'none', borderRadius: '8px', fontSize: '0.82rem' }} disabled={generateSubmitting || !generateForm.userId}>
                {generateSubmitting ? 'Generating...' : 'Save & Generate'}
              </button>
            </div>
          </form>
        </Modal>

      </div>
    </>
  );
};

export default AdminSalaryDashboard;