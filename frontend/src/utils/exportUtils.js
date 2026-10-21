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
