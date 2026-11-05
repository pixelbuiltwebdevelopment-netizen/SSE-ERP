import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * Export attendance records to a styled corporate PDF
 */
export const exportAttendancePDF = ({
  title = 'Employee Attendance Report',
  dateRange = 'All Dates',
  records = [],
  companyName = 'Enterprise ERP System',
  filtersApplied = {},
}) => {
  const doc = new jsPDF('landscape', 'pt', 'a4');

  // Header Background Banner
  doc.setFillColor(7, 26, 51); // Deep Navy #071A33
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 65, 'F');

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(companyName, 40, 32);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(197, 206, 216); // Metallic Silver
  doc.text(title, 40, 50);

  // Report Meta info box
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // Gray
  const generatedAt = new Date().toLocaleString();
  doc.text(`Generated: ${generatedAt} (Asia/Kolkata)`, 40, 85);
  doc.text(`Period: ${dateRange}`, 40, 98);

  const filterText = Object.entries(filtersApplied)
    .filter(([_, v]) => Boolean(v))
    .map(([k, v]) => `${k}: ${v}`)
    .join(' | ');
  if (filterText) {
    doc.text(`Active Filters: ${filterText}`, 40, 111);
  }

  // Summary Counts
  const total = records.length;
  const present = records.filter((r) => r.status === 'Present').length;
  const late = records.filter((r) => r.lateMinutes > 0 || (r.flags && r.flags.includes('Late'))).length;
  const halfDay = records.filter((r) => r.status === 'Half-Day').length;
  const totalHours = records.reduce((acc, r) => acc + (r.workingHours || 0), 0).toFixed(1);

  doc.setFillColor(244, 247, 251); // Ice White
  doc.roundedRect(40, 120, doc.internal.pageSize.getWidth() - 80, 26, 4, 4, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59); // Slate
  doc.text(
    `Summary Totals -> Total Records: ${total}   |   Present: ${present}   |   Late: ${late}   |   Half-Day: ${halfDay}   |   Total Hours: ${totalHours}h`,
    50,
    136
  );

  // Table Data Formatter
  const tableHeaders = [
    'Date',
    'Emp ID',
    'Employee Name',
    'Department',
    'Shift',
    'Punch In',
    'Punch Out',
    'Late (m)',
    'Hours',
    'Overtime',
    'Status',
    'Method',
  ];

  const tableRows = records.map((r) => [
    r.date || '',
    r.userId?.employeeId || 'N/A',
    r.userId?.name || 'Unknown',
    r.departmentId?.name || 'N/A',
    r.shiftId?.code || 'GEN',
    r.punchIn?.time ? new Date(r.punchIn.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
    r.punchOut?.time ? new Date(r.punchOut.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
    r.lateMinutes || 0,
    r.workingHours ? `${r.workingHours}h` : '0h',
    r.overtimeMinutes ? `${(r.overtimeMinutes / 60).toFixed(1)}h` : '0h',
    r.status || 'Present',
    r.punchOut?.method || (r.punchOut?.isAutoPunched ? 'Auto' : 'Manual'),
  ]);

  // Generate Table
  autoTable(doc, {
    head: [tableHeaders],
    body: tableRows,
    startY: 155,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 5,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [8, 127, 245], // Electric Blue #087FF5
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didDrawPage: (data) => {
      // Footer page numbering
      const pageStr = `Page ${doc.internal.getNumberOfPages()}`;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        pageStr,
        doc.internal.pageSize.getWidth() - 60,
        doc.internal.pageSize.getHeight() - 15
      );
    },
  });

  const sanitizedFileName = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(sanitizedFileName);
};

/**
 * Export records to Excel (.xlsx)
 */
export const exportAttendanceXLSX = ({
  title = 'Attendance_Export',
  records = [],
}) => {
  const formattedData = records.map((r) => ({
    'Date': r.date || '',
    'Employee ID': r.userId?.employeeId || '',
    'Employee Name': r.userId?.name || '',
    'Email': r.userId?.email || '',
    'Department': r.departmentId?.name || '',
    'Shift': r.shiftId?.name || 'General Shift',
    'Punch In Time': r.punchIn?.time ? new Date(r.punchIn.time).toLocaleString() : '',
    'Punch Out Time': r.punchOut?.time ? new Date(r.punchOut.time).toLocaleString() : '',
    'Punch In Status': r.punchIn?.status || '',
    'Late Minutes': r.lateMinutes || 0,
    'Early Departure Minutes': r.earlyDepartureMinutes || 0,
    'Working Hours': r.workingHours || 0,
    'Effective Worked Minutes': r.effectiveWorkedMinutes || 0,
    'Overtime Minutes': r.overtimeMinutes || 0,
    'Attendance Status': r.status || '',
    'Auto Punched': r.isAutoPunchOut ? 'Yes' : 'No',
    'Punch Method': r.punchOut?.method || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');

  const fileName = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

/**
 * Export records to CSV
 */
export const exportAttendanceCSV = ({
  title = 'attendance_report',
  records = [],
}) => {
  if (!records || records.length === 0) return;

  const headers = [
    'Date',
    'Employee ID',
    'Name',
    'Email',
    'Department',
    'Shift',
    'Punch In',
    'Punch Out',
    'Late Minutes',
    'Working Hours',
    'Overtime Minutes',
    'Status',
    'Auto Punched',
  ];

  const rows = records.map((r) => [
    r.date || '',
    r.userId?.employeeId || '',
    `"${r.userId?.name || ''}"`,
    r.userId?.email || '',
    `"${r.departmentId?.name || ''}"`,
    `"${r.shiftId?.name || 'General'}"`,
    r.punchIn?.time ? new Date(r.punchIn.time).toLocaleTimeString() : '',
    r.punchOut?.time ? new Date(r.punchOut.time).toLocaleTimeString() : '',
    r.lateMinutes || 0,
    r.workingHours || 0,
    r.overtimeMinutes || 0,
    r.status || '',
    r.isAutoPunchOut ? 'Yes' : 'No',
  ]);

  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${title}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export Individual Employee Advance Ledger & Financial Statement to PDF
 */
export const exportAdvanceStatementPDF = ({
  employee = {},
  summary = {},
  statement = [],
  companyName = 'Satya Sai Electricals',
  reportTitle = 'Employee Advance Ledger & Financial Statement',
}) => {
  const doc = new jsPDF('portrait', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  // Top Navy Header Bar
  doc.setFillColor(7, 26, 51); // #071A33
  doc.rect(0, 0, pageWidth, 75, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(255, 255, 255);
  doc.text(companyName, 36, 32);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(197, 206, 216);
  doc.text(reportTitle, 36, 52);

  const printDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`Generated: ${printDate}`, pageWidth - 36, 45, { align: 'right' });

  // Employee Profile Card
  doc.setFillColor(248, 250, 252); // #F8FAFC
  doc.roundedRect(36, 90, pageWidth - 72, 54, 4, 4, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(36, 90, pageWidth - 72, 54, 4, 4, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(employee.name || 'Staff Member', 48, 110);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Emp ID: ${employee.employeeId || '—'}   |   Email: ${employee.email || '—'}`, 48, 124);
  doc.text(`Department: ${employee.department || 'General'}   |   Designation: ${employee.designation || 'Staff'}`, 48, 136);

  // Financial Summary Strip (4 KPI columns)
  const stripY = 152;
  const colWidth = (pageWidth - 72) / 4;

  const kpis = [
    { label: 'Advances Issued', val: `₹${(summary.totalAdvancesIssued || 0).toLocaleString()}`, color: [8, 127, 245] },
    { label: 'Expenses Adjusted', val: `₹${(summary.totalExpensesAdjusted || 0).toLocaleString()}`, color: [220, 38, 38] },
    { label: 'Refunds Returned', val: `₹${(summary.totalRefundsReceived || 0).toLocaleString()}`, color: [217, 119, 6] },
    { label: 'Outstanding Balance', val: `₹${(summary.totalOutstandingAdvanceBalance || 0).toLocaleString()}`, color: [22, 163, 74] },
  ];

  kpis.forEach((kpi, idx) => {
    const startX = 36 + idx * colWidth;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(startX, stripY, colWidth - 6, 44, 4, 4, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(startX, stripY, colWidth - 6, 44, 4, 4, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, startX + 8, stripY + 16);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...kpi.color);
    doc.text(kpi.val, startX + 8, stripY + 33);
  });

  // Transaction Ledger Table
  const tableData = statement.map((row) => [
    new Date(row.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    row.transactionId || '—',
    row.transactionType ? row.transactionType.replace(/_/g, ' ') : '—',
    row.purpose || row.notes || '—',
    row.claimRef || '—',
    row.advanceIssued ? `₹${Number(row.advanceIssued).toLocaleString()}` : '—',
    row.expenseAdjusted ? `₹${Number(row.expenseAdjusted).toLocaleString()}` : '—',
    `₹${Number(row.runningBalance || 0).toLocaleString()}`,
  ]);

  autoTable(doc, {
    startY: 206,
    margin: { left: 36, right: 36 },
    head: [['Date', 'Txn ID', 'Type', 'Description / Purpose', 'Claim Ref', 'Issued (+)', 'Adjusted (-)', 'Balance']],
    body: tableData.length > 0 ? tableData : [['—', '—', 'No transactions found', '—', '—', '—', '—', '₹0']],
    theme: 'striped',
    headStyles: {
      fillColor: [7, 26, 51],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    styles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 5,
    },
    columnStyles: {
      0: { cellWidth: 58 },
      1: { cellWidth: 72 },
      2: { cellWidth: 70 },
      3: { cellWidth: 120 },
      4: { cellWidth: 50 },
      5: { halign: 'right', fontStyle: 'bold', textColor: [8, 127, 245], cellWidth: 50 },
      6: { halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38], cellWidth: 50 },
      7: { halign: 'right', fontStyle: 'bold', textColor: [22, 163, 74], cellWidth: 52 },
    },
  });

  // Footer / Disclaimer
  const finalY = doc.lastAutoTable?.finalY || 400;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'This is a system-generated official ledger statement from SSE ERP. For any discrepancies, contact Finance & Accounts.',
    pageWidth / 2,
    finalY + 30,
    { align: 'center' }
  );

  const cleanName = (employee.name || 'employee').replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `${cleanName}_Advance_Statement_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

/**
 * Export Advance Statement to Excel (.xlsx)
 */
export const exportAdvanceStatementExcel = ({
  employee = {},
  summary = {},
  statement = [],
}) => {
  const formattedData = statement.map((row) => ({
    'Date': new Date(row.date).toLocaleDateString('en-IN'),
    'Transaction ID': row.transactionId || '',
    'Type': row.transactionType || '',
    'Description / Purpose': row.purpose || row.notes || '',
    'Payment Method': row.paymentMethod || '',
    'Reference No': row.transactionReference || '',
    'Claim Ref': row.claimRef || '',
    'Advance Issued (₹)': row.advanceIssued || 0,
    'Expense Adjusted (₹)': row.expenseAdjusted || 0,
    'Refund Received (₹)': row.refundReceived || 0,
    'Reimbursement Paid (₹)': row.reimbursementPaid || 0,
    'Running Balance (₹)': row.runningBalance || 0,
    'Processed By': row.processedBy || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Advance Ledger');

  const cleanName = (employee.name || 'employee').replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `${cleanName}_Advance_Statement_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

/**
 * Export Advance Statement to CSV
 */
export const exportAdvanceStatementCSV = ({
  employee = {},
  statement = [],
}) => {
  if (!statement || statement.length === 0) return;

  const headers = [
    'Date',
    'Transaction ID',
    'Transaction Type',
    'Purpose / Description',
    'Payment Method',
    'Reference No',
    'Claim Ref',
    'Advance Issued',
    'Expense Adjusted',
    'Refund Received',
    'Running Balance',
    'Processed By',
  ];

  const rows = statement.map((row) => [
    new Date(row.date).toISOString().split('T')[0],
    row.transactionId || '',
    row.transactionType || '',
    `"${(row.purpose || row.notes || '').replace(/"/g, '""')}"`,
    row.paymentMethod || '',
    row.transactionReference || '',
    row.claimRef || '',
    row.advanceIssued || 0,
    row.expenseAdjusted || 0,
    row.refundReceived || 0,
    row.runningBalance || 0,
    `"${row.processedBy || ''}"`,
  ]);

  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  const cleanName = (employee.name || 'employee').replace(/[^a-zA-Z0-9]/g, '_');
  link.setAttribute('download', `${cleanName}_Advance_Statement_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export Company-Wide Advance Management Overview to PDF
 */
export const exportCompanyAdvanceOverviewPDF = ({
  periodLabel = 'All Time',
  summaryCards = {},
  records = [],
  companyName = 'Satya Sai Electricals',
}) => {
  const doc = new jsPDF('landscape', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  // Top Navy Bar
  doc.setFillColor(7, 26, 51);
  doc.rect(0, 0, pageWidth, 70, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(companyName, 36, 30);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(197, 206, 216);
  doc.text(`Company-Wide Advance Management & Financial Overview | Period: ${periodLabel}`, 36, 48);

  // Financial KPI Cards
  const kpis = [
    { label: 'Advances Issued', val: `₹${(summaryCards.totalAdvancesIssued || 0).toLocaleString()}`, color: [8, 127, 245] },
    { label: 'Expenses Adjusted', val: `₹${(summaryCards.totalExpensesAdjusted || 0).toLocaleString()}`, color: [220, 38, 38] },
    { label: 'Refunds Received', val: `₹${(summaryCards.totalAdvanceRefundsReceived || 0).toLocaleString()}`, color: [217, 119, 6] },
    { label: 'Outstanding Balance', val: `₹${(summaryCards.totalOutstandingAdvanceBalance || 0).toLocaleString()}`, color: [22, 163, 74] },
    { label: 'Advance Recipients', val: `${summaryCards.uniqueAdvanceRecipientsCount || 0} Staff`, color: [30, 41, 59] },
  ];

  const stripY = 82;
  const colW = (pageWidth - 72) / kpis.length;
  kpis.forEach((kpi, idx) => {
    const x = 36 + idx * colW;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, stripY, colW - 6, 40, 3, 3, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, stripY, colW - 6, 40, 3, 3, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + 6, stripY + 14);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...kpi.color);
    doc.text(kpi.val, x + 6, stripY + 30);
  });

  // Table
  const tableData = records.map((r) => [
    r.name || '—',
    r.employeeId || '—',
    r.department || '—',
    r.advancesIssuedCount || 0,
    `₹${(r.totalAdvancesIssued || 0).toLocaleString()}`,
    r.adjustmentsCount || 0,
    `₹${(r.totalExpensesAdjusted || 0).toLocaleString()}`,
    r.totalExpenseClaimsSubmitted || 0,
    `₹${(r.pendingClaimsAmount || 0).toLocaleString()}`,
    `₹${(r.currentAdvanceBalance || 0).toLocaleString()}`,
  ]);

  autoTable(doc, {
    startY: 132,
    margin: { left: 36, right: 36 },
    head: [[
      'Employee',
      'Emp ID',
      'Dept',
      'Adv Count',
      'Advances Issued',
      'Adj Count',
      'Expenses Adjusted',
      'Claims Logged',
      'Pending Claims',
      'Closing Balance',
    ]],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [7, 26, 51], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 4, textColor: [30, 41, 59] },
    columnStyles: {
      4: { halign: 'right', fontStyle: 'bold', textColor: [8, 127, 245] },
      6: { halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38] },
      8: { halign: 'right', fontStyle: 'bold', textColor: [217, 119, 6] },
      9: { halign: 'right', fontStyle: 'bold', textColor: [22, 163, 74] },
    },
  });

  const fileName = `Company_Advance_Overview_${periodLabel.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(fileName);
};

/**
 * Export Company-Wide Advance Management Overview to Excel
 */
export const exportCompanyAdvanceOverviewExcel = ({
  periodLabel = 'All Time',
  records = [],
}) => {
  const formatted = records.map((r) => ({
    'Employee Name': r.name || '',
    'Employee ID': r.employeeId || '',
    'Department': r.department || '',
    'Designation': r.designation || '',
    'Advances Issued Count': r.advancesIssuedCount || 0,
    'Advances Issued (₹)': r.totalAdvancesIssued || 0,
    'Adjustments Count': r.adjustmentsCount || 0,
    'Expenses Adjusted (₹)': r.totalExpensesAdjusted || 0,
    'Claims Submitted Count': r.totalExpenseClaimsSubmitted || 0,
    'Pending Claims (₹)': r.pendingClaimsAmount || 0,
    'Approved Claims (₹)': r.approvedClaimsAmount || 0,
    'Reimbursements Paid (₹)': r.reimbursementsPaid || 0,
    'Outstanding Advance Balance (₹)': r.currentAdvanceBalance || 0,
    'Last Transaction Date': r.lastTransactionDate ? new Date(r.lastTransactionDate).toLocaleDateString('en-IN') : '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(formatted);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Company Advances');
  XLSX.writeFile(workbook, `Company_Advance_Overview_${periodLabel.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
};

/**
 * Export Company Periodic Breakdown (Monthly/Weekly) to PDF
 */
export const exportPeriodicReportPDF = ({
  groupBy = 'monthly',
  reports = [],
  companyName = 'Satya Sai Electricals',
}) => {
  const doc = new jsPDF('landscape', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(7, 26, 51);
  doc.rect(0, 0, pageWidth, 65, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(companyName, 36, 28);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(197, 206, 216);
  doc.text(`Company-Wide Periodic Financial Summary (${groupBy.toUpperCase()})`, 36, 46);

  const tableData = reports.map((row) => [
    row.periodLabel || row.periodKey,
    row.employeesCount || 0,
    row.totalClaims || 0,
    row.pendingClaims || 0,
    row.approvedClaims || 0,
    row.rejectedClaims || 0,
    `₹${(row.totalClaimedAmount || 0).toLocaleString()}`,
    `₹${(row.totalApprovedAmount || 0).toLocaleString()}`,
    `₹${(row.advancesIssued || 0).toLocaleString()}`,
    `₹${(row.expensesAdjusted || 0).toLocaleString()}`,
    `₹${(row.netAdvance || 0).toLocaleString()}`,
  ]);

  autoTable(doc, {
    startY: 85,
    margin: { left: 36, right: 36 },
    head: [[
      'Period',
      'Staff',
      'Claims',
      'Pending',
      'Approved',
      'Rejected',
      'Claim Amount',
      'Approved Amount',
      'Advances Issued',
      'Expenses Adjusted',
      'Net Advance',
    ]],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [7, 26, 51], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7.5, cellPadding: 4, textColor: [30, 41, 59] },
    columnStyles: {
      6: { halign: 'right', fontStyle: 'bold' },
      7: { halign: 'right', fontStyle: 'bold', textColor: [8, 127, 245] },
      8: { halign: 'right', fontStyle: 'bold', textColor: [22, 163, 74] },
      9: { halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38] },
      10: { halign: 'right', fontStyle: 'bold' },
    },
  });

  doc.save(`Company_Periodic_Report_${groupBy}.pdf`);
};

/**
 * Export Company Periodic Breakdown to Excel
 */
export const exportPeriodicReportExcel = ({
  groupBy = 'monthly',
  reports = [],
}) => {
  const formatted = reports.map((row) => ({
    'Period': row.periodLabel || row.periodKey,
    'Active Employees': row.employeesCount || 0,
    'Total Claims': row.totalClaims || 0,
    'Pending Claims': row.pendingClaims || 0,
    'Approved Claims': row.approvedClaims || 0,
    'Rejected Claims': row.rejectedClaims || 0,
    'Total Claimed Amount (₹)': row.totalClaimedAmount || 0,
    'Total Approved Amount (₹)': row.totalApprovedAmount || 0,
    'Advances Issued (₹)': row.advancesIssued || 0,
    'Expenses Adjusted (₹)': row.expensesAdjusted || 0,
    'Refunds Received (₹)': row.refundsReceived || 0,
    'Net Advance Activity (₹)': row.netAdvance || 0,
  }));

  const worksheet = XLSX.utils.json_to_sheet(formatted);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Periodic Report');
  XLSX.writeFile(workbook, `Company_Periodic_Report_${groupBy}.xlsx`);
};
