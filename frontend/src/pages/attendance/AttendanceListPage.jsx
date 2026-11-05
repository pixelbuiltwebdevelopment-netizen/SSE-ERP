import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { getAllAttendance, correctAttendanceRecord } from '../../api/attendanceApi';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import BackButton from '../../components/common/BackButton';
import { useSocket } from '../../components/providers/SocketProvider';
import { exportAttendancePDF, exportAttendanceXLSX, exportAttendanceCSV } from '../../utils/exportUtils';
import { matchRegionFromCoords } from '../../utils/reverseGeocode';

// ERP Design System Tokens
const THEME = {
  navy: '#0F172A',
  primary: '#1E5385',
  primaryDark: '#164069',
  primaryLight: '#EFF6FF',
  border: '#E2E8F0',
  surface: '#F8FAFC',
  cardBg: '#FFFFFF',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  successBg: '#DCFCE7',
  successText: '#15803D',
  warningBg: '#FEF3C7',
  warningText: '#B45309',
  dangerBg: '#FEE2E2',
  dangerText: '#DC2626',
};

const getStatusBadgeStyle = (status) => {
  switch (status) {
    case 'Present':
      return { bg: '#DCFCE7', color: '#16A34A', border: '#86EFAC' };
    case 'Incomplete':
      return { bg: '#F1F5F9', color: '#475569', border: '#CBD5E1' };
    case 'Half-Day':
      return { bg: '#FEF3C7', color: '#B45309', border: '#FDE68A' };
    case 'Absent':
      return { bg: '#FEE2E2', color: '#DC2626', border: '#FECACA' };
    case 'Leave':
      return { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' };
    default:
      return { bg: '#F1F5F9', color: '#64748B', border: '#CBD5E1' };
  }
};

// Global in-memory cache for resolved coordinates
const villageCache = new Map();

// Detect dummy placeholder text that should NOT be displayed as a village name
const isDummyPlaceholder = (text) => {
  if (!text) return true;
  const s = String(text).trim().toLowerCase();
  return (
    s === '' ||
    s === 'verified geolocation village' ||
    s === 'location logged' ||
    s === 'your location' ||
    s === 'current location' ||
    s === 'not logged' ||
    s === 'missing out' ||
    s === 'office terminal' ||
    s === 'default device' ||
    s.startsWith('gps:')
  );
};

// Format a clean village name (appends "Village" if not present)
const formatVillageTitle = (str) => {
  if (!str) return '';
  let v = String(str)
    .replace(/\b(Office Terminal|Terminal|Office Machine|Punch Terminal|Biometric Machine|Default Device)\b/gi, '')
    .replace(/\b\d{6}\b/g, '')
    .replace(/[(),]/g, '')
    .trim();

  if (!v || isDummyPlaceholder(v)) return '';

  if (!/(village|nagar|colony|puram|town|city|guda|palli|palle|wadi|bad|pur|kalan|khurd|mandal)/i.test(v)) {
    return `${v} Village`;
  }
  return v;
};

// Extract coordinates from any punch structure (objects, arrays, strings)
const extractCoords = (punch) => {
  if (!punch) return null;
  const loc = punch.location || punch;
  let lat = null;
  let lon = null;

  if (typeof loc === 'string') {
    const match = loc.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
    if (match) {
      lat = parseFloat(match[1]);
      lon = parseFloat(match[2]);
    }
  } else if (typeof loc === 'object') {
    if (loc.latitude && loc.longitude) {
      lat = parseFloat(loc.latitude);
      lon = parseFloat(loc.longitude);
    } else if (loc.lat && loc.lng) {
      lat = parseFloat(loc.lat);
      lon = parseFloat(loc.lng);
    } else if (Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) {
      // GeoJSON [lng, lat]
      lon = parseFloat(loc.coordinates[0]);
      lat = parseFloat(loc.coordinates[1]);
    }
  }

  if (!lat && punch.latitude) lat = parseFloat(punch.latitude);
  if (!lon && punch.longitude) lon = parseFloat(punch.longitude);

  if (lat && lon && !isNaN(lat) && !isNaN(lon) && lat !== 0) {
    return { lat, lon, key: `${lat.toFixed(4)},${lon.toFixed(4)}` };
  }
  return null;
};

// Extract genuine Village / Town name stored in the database record
const extractDirectVillageName = (punch) => {
  if (!punch) return '';
  const loc = punch.location || {};

  // 1. Direct explicit database keys
  const directFields = [
    punch.village,
    punch.locality,
    punch.villageName,
    punch.town,
    typeof loc === 'object' ? loc.village : null,
    typeof loc === 'object' ? loc.villageName : null,
    typeof loc === 'object' ? loc.locality : null,
    typeof loc === 'object' ? loc.suburb : null,
    typeof loc === 'object' ? loc.town : null,
    typeof loc === 'object' ? loc.area : null,
    typeof loc === 'object' && typeof loc.address === 'object' ? loc.address?.village || loc.address?.suburb || loc.address?.town : null,
    typeof loc === 'object' ? loc.name : null,
  ];

  for (const field of directFields) {
    if (field && !isDummyPlaceholder(field)) {
      const formatted = formatVillageTitle(field);
      if (formatted) return formatted;
    }
  }

  // 2. Parse from address string
  const rawAddress = typeof loc === 'string' ? loc : (loc.address || punch.address || '');
  if (rawAddress && !isDummyPlaceholder(rawAddress)) {
    const parts = String(rawAddress).split(',').map((p) => p.trim()).filter(Boolean);

    // Look for segment with village indicators
    const villagePart = parts.find((p) =>
      /(village|gram|gramam|palli|palle|nagar|colony|puram|wadi|bad|pur|mandal|town)/i.test(p)
    );
    if (villagePart && !isDummyPlaceholder(villagePart)) {
      return formatVillageTitle(villagePart);
    }

    // Filter door/plot numbers
    const filtered = parts.filter(
      (p) => !/^(plot|door|d\.no|h\.no|flat|survey|sy\.?\s?no|road|street|building|shop|near)\b/i.test(p) && !/^\d+[\w\/-]*$/.test(p)
    );
    if (filtered.length > 0 && !isDummyPlaceholder(filtered[0])) {
      return formatVillageTitle(filtered[0]);
    }
  }

  return '';
};

const toLocalDateString = (d) => {
  if (!d) return '';
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return '';
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isSameDay = (d1, d2) => {
  if (!d1 || !d2) return false;
  const a = new Date(d1);
  const b = new Date(d2);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

const AttendanceListPage = ({ hideHeader = false, dateRangeFilter = {}, filterParams = null }) => {
  const socket = useSocket();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Extract primitive filter values to avoid object identity reference re-trigger loops
  const effectiveFilter = filterParams || dateRangeFilter || {};
  const filterDate = effectiveFilter.date || '';
  const filterStartDate = effectiveFilter.startDate || '';
  const filterEndDate = effectiveFilter.endDate || '';

  // Resolved dynamic village state from coordinates
  const [geoVillageMap, setGeoVillageMap] = useState({});

  // Mode and Date Controller matching Image 4 exact pattern: [ Day | Week | Month ]  [ <  Date  > ]  [ ↺ Today ]
  const [viewMode, setViewMode] = useState('day'); // 'day' | 'week' | 'month'
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [exporting, setExporting] = useState(false);

  // Employee Dropdown Controller
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const employeeDropdownRef = useRef(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Admin Correction Modal
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [editPunchIn, setEditPunchIn] = useState('');
  const [editPunchOut, setEditPunchOut] = useState('');
  const [editStatus, setEditStatus] = useState('Present');
  const [editReason, setEditReason] = useState('');
  const [submittingCorrection, setSubmittingCorrection] = useState(false);

  // Compute Active Date Range & Label
  const rangeInfo = useMemo(() => {
    const d = new Date(anchorDate);
    d.setHours(0, 0, 0, 0);

    if (viewMode === 'day') {
      const dateStr = toLocalDateString(d);
      return {
        startDate: dateStr,
        endDate: dateStr,
        date: dateStr,
        label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
      };
    }

    if (viewMode === 'week') {
      const dayOfWeek = d.getDay(); // 0 is Sunday
      const monday = new Date(d);
      monday.setDate(d.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const startMonth = monday.toLocaleDateString('en-US', { month: 'short' });
      const endMonth = sunday.toLocaleDateString('en-US', { month: 'short' });
      const year = sunday.getFullYear();
      const label = `${monday.getDate()} ${startMonth} – ${sunday.getDate()} ${endMonth} ${year}`;

      return {
        startDate: toLocalDateString(monday),
        endDate: toLocalDateString(sunday),
        label,
      };
    }

    if (viewMode === 'month') {
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      return {
        startDate: toLocalDateString(start),
        endDate: toLocalDateString(end),
        label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      };
    }

    const todayStr = toLocalDateString(new Date());
    return { startDate: todayStr, endDate: todayStr, date: todayStr, label: 'Today' };
  }, [anchorDate, viewMode]);

  // Date Navigation Handlers
  const handlePrev = () => {
    const d = new Date(anchorDate);
    if (viewMode === 'day') d.setDate(d.getDate() - 1);
    else if (viewMode === 'week') d.setDate(d.getDate() - 7);
    else if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
    setAnchorDate(d);
    setPage(1);
  };

  const handleNext = () => {
    const d = new Date(anchorDate);
    if (viewMode === 'day') d.setDate(d.getDate() + 1);
    else if (viewMode === 'week') d.setDate(d.getDate() + 7);
    else if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
    setAnchorDate(d);
    setPage(1);
  };

  const handleToday = () => {
    setAnchorDate(new Date());
    setPage(1);
  };

  // Click outside listener for dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(e.target)) {
        setShowEmployeeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Attendance Records (stable primitive dependencies)
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page,
        limit: 15,
        status: status || undefined,
        search: search || undefined,
      };

      if (filterStartDate && filterEndDate) {
        params.startDate = filterStartDate;
        params.endDate = filterEndDate;
      } else if (filterDate) {
        params.date = filterDate;
      } else if (rangeInfo.startDate && rangeInfo.endDate && rangeInfo.startDate !== rangeInfo.endDate) {
        params.startDate = rangeInfo.startDate;
        params.endDate = rangeInfo.endDate;
      } else if (rangeInfo.startDate) {
        params.date = rangeInfo.startDate;
      }

      const res = await getAllAttendance(params);
      if (res && res.success) {
        setRecords(res.data.records || []);
        setPagination({
          page: res.data.pagination.page,
          totalPages: res.data.pagination.pages,
          total: res.data.pagination.total,
        });
      }
    } catch (err) {
      console.error('Fetch attendance records failed:', err);
      setError(err.response?.data?.message || 'Failed to fetch attendance records.');
    } finally {
      setLoading(false);
    }
  }, [page, rangeInfo.startDate, rangeInfo.endDate, filterDate, filterStartDate, filterEndDate, status, search]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Real-time socket sync
  useEffect(() => {
    if (!socket) return;

    const handleAttendanceUpdated = (updatedRecord) => {
      setRecords((prev) => {
        const index = prev.findIndex((r) => r._id === updatedRecord._id);
        if (index > -1) {
          const updated = [...prev];
          updated[index] = updatedRecord;
          return updated;
        }
        return [updatedRecord, ...prev];
      });
    };

    socket.on('attendance_updated', handleAttendanceUpdated);
    return () => socket.off('attendance_updated', handleAttendanceUpdated);
  }, [socket]);

  // ── Automatic Reverse-Geocoding Engine ──
  // Replaces placeholders like "Verified Geolocation Village" with real Village/Town names
  useEffect(() => {
    if (!records || records.length === 0) return;

    const lookups = [];

    records.forEach((r) => {
      [r.punchIn, r.punchOut].forEach((punch) => {
        if (!punch || !punch.time) return;

        // Check if genuine village is already in the database
        const direct = extractDirectVillageName(punch);
        if (direct && !isDummyPlaceholder(direct)) return;

        // If direct is missing or is dummy placeholder, look up from coordinates
        const coords = extractCoords(punch);
        if (coords && !villageCache.has(coords.key)) {
          villageCache.set(coords.key, 'LOOKING_UP');
          lookups.push(coords);
        }
      });
    });

    if (lookups.length === 0) return;

    let isCancelled = false;

    const resolveVillages = async () => {
      for (const item of lookups) {
        if (isCancelled) break;
        try {
          // BigDataCloud Client Reverse Geocode (CORS-friendly, returns exact village locality)
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${item.lat}&longitude=${item.lon}&localityLanguage=en`
          );
          const data = await res.json();

          let found = '';
          if (data && data.localityInfo && Array.isArray(data.localityInfo.administrative)) {
            const adminVillage = data.localityInfo.administrative.find(
              (a) => a.description && /village|gram|hamlet/i.test(a.description)
            ) || data.localityInfo.administrative.find(
              (a) => a.description && /subdistrict|mandal|town|locality/i.test(a.description)
            );
            if (adminVillage && adminVillage.name) found = adminVillage.name;
          }

          if (!found) {
            found = data.locality || data.city || '';
          }

          const formatted = formatVillageTitle(found);
          if (formatted) {
            villageCache.set(item.key, formatted);
            setGeoVillageMap((prev) => ({ ...prev, [item.key]: formatted }));
          }
          await new Promise((resolve) => setTimeout(resolve, 200));
        } catch {
          villageCache.set(item.key, '');
        }
      }
    };

    resolveVillages();

    return () => {
      isCancelled = true;
    };
  }, [records]);

  // Final Location Display Generator for each punch
  const getLocationDisplay = (punch) => {
    if (!punch || !punch.time) {
      return { isMissing: true, village: 'Missing Out', mapUrl: null };
    }

    const coords = extractCoords(punch);

    // 1. Direct real village from DB
    let village = extractDirectVillageName(punch);

    // 2. Check if reversed geocoded from coordinates
    if ((!village || isDummyPlaceholder(village)) && coords) {
      const geoResolved = geoVillageMap[coords.key] || villageCache.get(coords.key);
      if (geoResolved && geoResolved !== 'LOOKING_UP') {
        village = geoResolved;
      }
    }

    // 3. Fallback: clean regional coordinate presentation if still loading
    if (!village || isDummyPlaceholder(village)) {
      village = coords
        ? matchRegionFromCoords(coords.lat, coords.lon)
        : 'Madhapur, Hyderabad';
    }

    const mapUrl = coords
      ? `https://www.google.com/maps?q=${coords.lat},${coords.lon}`
      : `https://www.google.com/maps?q=${encodeURIComponent(village)}`;

    return {
      isMissing: false,
      village,
      mapUrl,
    };
  };

  // Suggestions Directory
  const employeeDirectory = useMemo(() => {
    const empMap = new Map();
    records.forEach((r) => {
      if (r.userId && r.userId._id && !empMap.has(r.userId._id)) {
        empMap.set(r.userId._id, {
          id: r.userId._id,
          name: r.userId.name || 'Employee',
          employeeId: r.userId.employeeId || '',
          email: r.userId.email || '',
          dept: r.departmentId?.name || 'General',
        });
      }
    });
    return Array.from(empMap.values());
  }, [records]);

  const dropdownEmployeeSuggestions = useMemo(() => {
    if (!search || search.trim() === '') return employeeDirectory;
    const q = search.toLowerCase();
    return employeeDirectory.filter(
      (e) =>
        e.name?.toLowerCase().includes(q) ||
        e.employeeId?.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q)
    );
  }, [employeeDirectory, search]);

  const handleSelectEmployee = (emp) => {
    setSearch(emp.name);
    setShowEmployeeDropdown(false);
    setPage(1);
  };

  // Full-Dataset Export Helper: fetches all records for the active date range
  const fetchAllForExport = async () => {
    try {
      const exportParams = {
        limit: 5000,
        status: status || undefined,
        search: search || undefined,
      };
      if (filterStartDate && filterEndDate) {
        exportParams.startDate = filterStartDate;
        exportParams.endDate = filterEndDate;
      } else if (filterDate) {
        exportParams.date = filterDate;
      } else if (rangeInfo.startDate && rangeInfo.endDate && rangeInfo.startDate !== rangeInfo.endDate) {
        exportParams.startDate = rangeInfo.startDate;
        exportParams.endDate = rangeInfo.endDate;
      } else if (rangeInfo.startDate) {
        exportParams.date = rangeInfo.startDate;
      }
      const res = await getAllAttendance(exportParams);
      if (res && res.success && res.data?.records?.length > 0) {
        return res.data.records;
      }
    } catch (err) {
      console.error('Export fetch failed, using loaded records:', err);
    }
    return records;
  };

  // Exports based on active date filter
  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const dataToExport = await fetchAllForExport();
      exportAttendancePDF({
        title: 'Company Attendance Report',
        dateRange: rangeInfo.label,
        records: dataToExport,
        filtersApplied: { Status: status, Search: search, Scope: `${viewMode.toUpperCase()} (${rangeInfo.label})` },
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportXLSX = async () => {
    setExporting(true);
    try {
      const dataToExport = await fetchAllForExport();
      exportAttendanceXLSX({
        title: `Attendance_${rangeInfo.startDate}_${rangeInfo.endDate}`,
        records: dataToExport,
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const dataToExport = await fetchAllForExport();
      exportAttendanceCSV({
        title: `attendance_${rangeInfo.startDate}_${rangeInfo.endDate}`,
        records: dataToExport,
      });
    } finally {
      setExporting(false);
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatus('');
    setAnchorDate(new Date());
    setViewMode('day');
    setPage(1);
  };

  const handleOpenEdit = (record) => {
    setSelectedRecord(record);
    setEditPunchIn(
      record.punchIn?.time ? new Date(record.punchIn.time).toISOString().slice(0, 16) : ''
    );
    setEditPunchOut(
      record.punchOut?.time ? new Date(record.punchOut.time).toISOString().slice(0, 16) : ''
    );
    setEditStatus(record.status || 'Present');
    setEditReason('');
  };

  const handleSaveCorrection = async (e) => {
    e.preventDefault();
    if (!editReason.trim()) {
      alert('A valid reason is required for attendance adjustments.');
      return;
    }

    setSubmittingCorrection(true);
    try {
      const res = await correctAttendanceRecord(selectedRecord._id, {
        punchInTime: editPunchIn ? new Date(editPunchIn).toISOString() : undefined,
        punchOutTime: editPunchOut ? new Date(editPunchOut).toISOString() : undefined,
        status: editStatus,
        reason: editReason,
      });

      if (res.success) {
        setSelectedRecord(null);
        fetchRecords();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Correction failed.');
    } finally {
      setSubmittingCorrection(false);
    }
  };

  const isToday = isSameDay(anchorDate, new Date());
  const hasActiveFilters = Boolean(search || status || viewMode !== 'day' || !isToday);

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100%', padding: '4px 0' }}>
      
      <style>{`
        @import url("https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css");

        .employee-dropdown-menu {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          background: #FFFFFF;
          border: 1px solid #CBD5E1;
          border-radius: 8px;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
          z-index: 1050;
          max-height: 280px;
          overflow-y: auto;
        }

        .dropdown-item-hover {
          padding: 10px 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #F1F5F9;
        }
        .dropdown-item-hover:hover {
          background-color: #F8FAFC;
        }
        .dropdown-item-hover:last-child {
          border-bottom: none;
        }

        .form-control-custom, .form-select-custom {
          border-radius: 8px;
          border: 1px solid #CBD5E1;
          font-size: 0.85rem;
          height: 38px;
        }

        /* Pill Badge for Punch In Village */
        .village-pill-in {
          background-color: #ECFDF5;
          color: #065F46;
          border: 1px solid #A7F3D0;
          font-weight: 700;
          font-size: 0.78rem;
          padding: 4px 10px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        /* Pill Badge for Punch Out Village */
        .village-pill-out {
          background-color: #FEF2F2;
          color: #991B1B;
          border: 1px solid #FECACA;
          font-weight: 700;
          font-size: 0.78rem;
          padding: 4px 10px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        /* Missing Out Badge */
        .missing-out-badge {
          background-color: #FEF2F2;
          color: #EF4444;
          border: 1px solid #FECACA;
          font-weight: 700;
          font-size: 0.76rem;
          padding: 4px 10px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .map-link-action {
          font-size: 0.76rem;
          color: #0284C7;
          text-decoration: none;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .map-link-action:hover {
          text-decoration: underline;
        }
      `}</style>

      {/* ── Header Section ── */}
      {!hideHeader && (
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center pb-2 mb-3 px-2 px-md-0">
          <div>
            <div className="d-flex align-items-center gap-2.5">
              <BackButton fallback="/attendance" tooltip="Back to Attendance Overview" />
              <i className="bi bi-geo-alt-fill text-primary fs-5"></i>
              <h4 className="fw-bold mb-0" style={{ color: THEME.navy, letterSpacing: '-0.02em', fontSize: '1.25rem' }}>
                Attendance Log
              </h4>
            </div>
            <p className="small text-muted mb-0 mt-1">
              Verified village geolocations, punch times, and shift telemetry.
            </p>
          </div>
          <div className="mt-2 mt-sm-0">
            <span
              className="badge px-2.5 py-1.5 rounded-pill"
              style={{
                backgroundColor: '#EFF6FF',
                color: THEME.primary,
                border: '1px solid #BFDBFE',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              Total Records: {pagination.total || records.length}
            </span>
          </div>
        </div>
      )}

      {/* ── Filter Console Bar ── */}
      <div
        className="rounded-3 p-3 mb-3 shadow-sm bg-white mx-1 mx-md-0 border-0"
      >
        {/* Top Date Filter Console & Export Action Bar (Matching Image 4) */}
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3 pb-3 border-bottom">
          {/* Exact Date Controller: [ Day | Week | Month ]  [ <  Date Label  > ]  [ ↺ Today ] */}
          <div className="d-flex flex-wrap align-items-center gap-2">
            {/* View Mode Toggle: Day | Week | Month */}
            <div className="btn-group p-0.5 rounded-3 bg-light border shadow-none" role="group">
              {['day', 'week', 'month'].map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`btn btn-sm fw-bold px-3 py-1.5 rounded-2 ${
                    viewMode === m ? 'bg-white shadow-xs text-primary' : 'text-muted border-0'
                  }`}
                  style={{ fontSize: '0.78rem', textTransform: 'capitalize' }}
                  onClick={() => {
                    setViewMode(m);
                    setPage(1);
                  }}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Date Arrow Navigation */}
            <div className="d-flex align-items-center gap-1.5 bg-white rounded-3 px-2 py-1 border shadow-xs">
              <button
                type="button"
                className="btn btn-sm p-1 rounded-2 text-muted border-0 d-flex align-items-center justify-content-center"
                style={{ width: '28px', height: '28px' }}
                onClick={handlePrev}
                title="Previous"
              >
                <ChevronLeft size={16} />
              </button>

              <span
                className="fw-bold px-2 text-dark font-monospace text-center"
                style={{ fontSize: '0.82rem', minWidth: viewMode === 'week' ? '170px' : '130px' }}
              >
                {rangeInfo.label}
              </span>

              <button
                type="button"
                className="btn btn-sm p-1 rounded-2 text-muted border-0 d-flex align-items-center justify-content-center"
                style={{ width: '28px', height: '28px' }}
                onClick={handleNext}
                title="Next"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Quick Reset Today Button */}
            <button
              type="button"
              className="btn btn-sm btn-outline-primary fw-semibold px-3 py-1.5 rounded-3 shadow-none d-flex align-items-center gap-1.5"
              style={{ fontSize: '0.78rem', height: '36px' }}
              onClick={handleToday}
            >
              <RotateCcw size={13} />
              <span>Today</span>
            </button>
          </div>

          {/* Export Controls & Reset */}
          <div className="d-flex align-items-center gap-1.5 ms-auto">
            {hasActiveFilters && (
              <button
                className="btn btn-sm btn-light border text-danger d-inline-flex align-items-center gap-1"
                onClick={handleClearFilters}
                title="Reset Filters"
                style={{ fontSize: '12px', height: '36px', padding: '0 10px', borderRadius: '8px' }}
              >
                <i className="bi bi-arrow-counterclockwise"></i>
                <span>Reset</span>
              </button>
            )}
            <div className="btn-group btn-group-sm flex-grow-1 flex-sm-grow-0" role="group">
              <button
                className="btn btn-outline-secondary mobile-btn-export d-inline-flex align-items-center gap-1"
                onClick={handleExportPDF}
                disabled={exporting}
                title={`Export PDF for ${rangeInfo.label}`}
                style={{ height: '36px', borderColor: THEME.border }}
              >
                <i className="bi bi-file-earmark-pdf"></i>
                <span>{exporting ? 'Exporting...' : 'PDF'}</span>
              </button>
              <button
                className="btn btn-outline-secondary mobile-btn-export d-inline-flex align-items-center gap-1"
                onClick={handleExportXLSX}
                disabled={exporting}
                title={`Export Excel for ${rangeInfo.label}`}
                style={{ height: '36px', borderColor: THEME.border }}
              >
                <i className="bi bi-file-earmark-excel"></i>
                <span>{exporting ? 'Exporting...' : 'Excel'}</span>
              </button>
              <button
                className="btn btn-outline-secondary mobile-btn-export d-inline-flex align-items-center gap-1"
                onClick={handleExportCSV}
                disabled={exporting}
                title={`Export CSV for ${rangeInfo.label}`}
                style={{ height: '36px', borderColor: THEME.border }}
              >
                <i className="bi bi-filetype-csv"></i>
                <span>{exporting ? 'Exporting...' : 'CSV'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Row: Search, Status, and Date Picker */}
        <div className="row g-2 align-items-center">
          {/* Employee Search */}
          <div className="col-12 col-md-5" ref={employeeDropdownRef}>
            <div className="position-relative">
              <div className="input-group">
                <span
                  className="input-group-text bg-white border-end-0 text-muted ps-2.5 pe-2"
                  style={{ borderColor: THEME.border }}
                >
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control form-control-custom border-start-0 border-end-0 ps-1"
                  placeholder={search ? search : `Search Employee (${employeeDirectory.length})...`}
                  value={search}
                  onFocus={() => setShowEmployeeDropdown(true)}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setShowEmployeeDropdown(true);
                    setPage(1);
                  }}
                />
                {search ? (
                  <button
                    className="btn btn-outline-secondary border-start-0 bg-white border-top border-bottom border-end px-2"
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setShowEmployeeDropdown(false);
                      setPage(1);
                    }}
                  >
                    <i className="bi bi-x-circle-fill text-muted"></i>
                  </button>
                ) : (
                  <span
                    className="input-group-text bg-white border-start-0 text-muted px-2.5"
                    style={{ cursor: 'pointer', borderColor: THEME.border }}
                    onClick={() => setShowEmployeeDropdown(!showEmployeeDropdown)}
                  >
                    <i className="bi bi-chevron-down small"></i>
                  </span>
                )}
              </div>

              {showEmployeeDropdown && (
                <div className="employee-dropdown-menu shadow">
                  <div
                    className="dropdown-item-hover fw-semibold text-primary border-bottom"
                    onClick={() => {
                      setSearch('');
                      setShowEmployeeDropdown(false);
                      setPage(1);
                    }}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-people-fill"></i>
                      <span>All Employees ({employeeDirectory.length})</span>
                    </div>
                  </div>

                  {dropdownEmployeeSuggestions.length > 0 ? (
                    dropdownEmployeeSuggestions.map((emp) => (
                      <div
                        key={emp.id}
                        className="dropdown-item-hover"
                        onClick={() => handleSelectEmployee(emp)}
                      >
                        <div className="text-truncate pe-2">
                          <div className="fw-semibold text-dark small text-truncate">{emp.name}</div>
                          <div className="text-muted small text-truncate" style={{ fontSize: '0.74rem' }}>
                            {emp.dept} {emp.employeeId ? `• ID: ${emp.employeeId}` : ''}
                          </div>
                        </div>
                        <span className="badge bg-light text-dark border small flex-shrink-0">
                          Select
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-muted small">
                      No matching records for "{search}"
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Status Dropdown */}
          <div className="col-6 col-md-3">
            <select
              className="form-select form-select-custom"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Incomplete">Incomplete</option>
              <option value="Half-Day">Half-Day</option>
              <option value="Absent">Absent</option>
              <option value="Leave">Leave</option>
            </select>
          </div>

          {/* Date Picker Input */}
          <div className="col-6 col-md-4">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0 text-muted ps-2.5 pe-2" style={{ borderColor: THEME.border }}>
                <i className="bi bi-calendar3 small"></i>
              </span>
              <input
                type="date"
                className="form-control form-control-custom border-start-0 ps-1"
                value={toLocalDateString(anchorDate)}
                onChange={(e) => {
                  if (e.target.value) {
                    setAnchorDate(new Date(e.target.value));
                    setViewMode('day');
                    setPage(1);
                  }
                }}
                title="Select specific date"
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div
          className="alert alert-danger small p-2.5 mb-3 d-flex align-items-center justify-content-between rounded-3 mx-1 mx-md-0"
          role="alert"
        >
          <span><i className="bi bi-exclamation-triangle-fill me-2"></i>{error}</span>
          <button className="btn-close btn-sm" onClick={() => setError('')}></button>
        </div>
      )}

      {/* ── Main Content: Table & Mobile Cards ── */}
      <div
        className="rounded-3 shadow-sm overflow-hidden bg-white mx-1 mx-md-0"
        style={{ border: `1px solid ${THEME.border}` }}
      >
        {loading ? (
          <div className="text-center py-5">
            <LoadingSpinner text="LOADING" subtext="Synchronizing attendance records & villages..." />
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-5 px-3">
            <i className="bi bi-calendar-x fs-1 text-muted d-block mb-2"></i>
            <h6 className="fw-bold" style={{ color: THEME.navy }}>
              No Records Found
            </h6>
            <p className="text-muted small mb-3">
              No employee attendance entries match your active parameters.
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="btn btn-sm btn-primary"
                style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* DESKTOP VIEW: Complete Table */}
            <div className="table-responsive d-none d-lg-block">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: '13px' }}>
                <thead style={{ backgroundColor: '#F8FAFC', color: '#1E293B', borderBottom: '1px solid #E2E8F0' }}>
                  <tr>
                    <th style={{ padding: '14px 16px', fontWeight: 700 }}>Date</th>
                    <th style={{ fontWeight: 700 }}>Employee</th>
                    <th style={{ fontWeight: 700 }}>Department</th>
                    <th style={{ fontWeight: 700 }}>Punch In Location</th>
                    <th style={{ fontWeight: 700 }}>Punch Out Location</th>
                    <th style={{ fontWeight: 700 }}>Work Hours</th>
                    <th style={{ fontWeight: 700 }}>Lateness</th>
                    <th style={{ fontWeight: 700 }}>Overtime</th>
                    <th style={{ fontWeight: 700 }}>Status</th>
                    <th className="text-end pe-3" style={{ fontWeight: 700 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => {
                    const statusBadge = getStatusBadgeStyle(r.status);
                    const inLoc = getLocationDisplay(r.punchIn);
                    const outLoc = getLocationDisplay(r.punchOut);

                    return (
                      <tr key={r._id} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                        <td className="fw-semibold text-nowrap" style={{ padding: '14px 16px', color: '#0F172A' }}>
                          {r.date}
                        </td>

                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div
                              style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '50%',
                                backgroundColor: '#E0F2FE',
                                color: '#0284C7',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '13px',
                                flexShrink: 0,
                              }}
                            >
                              {(r.userId?.name || 'E').charAt(0).toUpperCase()}
                            </div>
                            <div style={{ lineHeight: 1.25 }}>
                              <div className="fw-semibold text-truncate" style={{ maxWidth: '140px', color: '#0F172A' }}>
                                {r.userId?.name || 'Employee'}
                              </div>
                              <small className="text-muted" style={{ fontSize: '11px' }}>
                                {r.userId?.employeeId || r.userId?.email || 'EMP-001'}
                              </small>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div style={{ lineHeight: 1.25 }}>
                            <div className="fw-semibold text-dark text-truncate" style={{ fontSize: '12px', maxWidth: '140px' }}>
                              {r.departmentId?.name || 'Operations'}
                            </div>
                          </div>
                        </td>

                        {/* Punch In Location */}
                        <td>
                          <div className="d-flex flex-column gap-1" style={{ maxWidth: '210px' }}>
                            <span className="fw-bold" style={{ color: '#0F172A', fontSize: '13px' }}>
                              {r.punchIn?.time
                                ? new Date(r.punchIn.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : '-'}
                            </span>

                            {r.punchIn?.time && (
                              <div className="d-flex flex-column gap-1">
                                <div className="village-pill-in text-truncate" title={inLoc.village}>
                                  <i className="bi bi-geo-alt-fill text-success flex-shrink-0"></i>
                                  <span className="text-truncate">{inLoc.village}</span>
                                </div>
                                {inLoc.mapUrl && (
                                  <a
                                    href={inLoc.mapUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="map-link-action"
                                  >
                                    <i className="bi bi-map"></i> Map
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Punch Out Location */}
                        <td>
                          <div className="d-flex flex-column gap-1" style={{ maxWidth: '210px' }}>
                            {!outLoc.isMissing ? (
                              <>
                                <span className="fw-bold" style={{ color: '#0F172A', fontSize: '13px' }}>
                                  {new Date(r.punchOut.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <div className="d-flex flex-column gap-1">
                                  <div className="village-pill-out text-truncate" title={outLoc.village}>
                                    <i className="bi bi-geo-alt-fill text-danger flex-shrink-0"></i>
                                    <span className="text-truncate">{outLoc.village}</span>
                                  </div>
                                  {outLoc.mapUrl && (
                                    <a
                                      href={outLoc.mapUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="map-link-action"
                                    >
                                      <i className="bi bi-map"></i> Map
                                    </a>
                                  )}
                                </div>
                              </>
                            ) : (
                              <div className="missing-out-badge align-self-start mt-1">
                                <i className="bi bi-geo-alt-fill text-danger"></i>
                                <span>Missing Out</span>
                              </div>
                            )}
                          </div>
                        </td>

                        <td>
                          <span className="fw-bold" style={{ color: '#0284C7', fontSize: '13px' }}>
                            {r.workingHours ? `${r.workingHours} hrs` : '0 hrs'}
                          </span>
                        </td>

                        <td>
                          {r.lateMinutes > 0 ? (
                            <span
                              className="badge"
                              style={{
                                backgroundColor: THEME.warningBg,
                                color: THEME.warningText,
                                border: '1px solid #FDE68A',
                                fontSize: '11px',
                              }}
                            >
                              +{r.lateMinutes}m late
                            </span>
                          ) : (
                            <span className="text-muted" style={{ fontSize: '12px' }}>On-Time</span>
                          )}
                        </td>

                        <td>
                          <span className="text-muted" style={{ fontSize: '12px' }}>
                            {r.overtimeMinutes ? `${(r.overtimeMinutes / 60).toFixed(1)}h` : '0h'}
                          </span>
                        </td>

                        <td>
                          <span
                            className="badge"
                            style={{
                              backgroundColor: statusBadge.bg,
                              color: statusBadge.color,
                              border: `1px solid ${statusBadge.border}`,
                              fontSize: '11px',
                              padding: '5px 10px',
                              borderRadius: '8px',
                              fontWeight: 600,
                            }}
                          >
                            {r.status || 'Present'}
                          </span>
                        </td>

                        <td className="text-end pe-3">
                          <button
                            className="btn btn-sm btn-light border py-1 px-2.5 d-inline-flex align-items-center gap-1"
                            style={{ fontSize: '12px', borderColor: THEME.border }}
                            onClick={() => handleOpenEdit(r)}
                            title="Audit / Correct Record"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE & TABLET VIEW: Dedicated Location Touch Cards (< 992px) */}
            <div className="d-block d-lg-none p-2 p-sm-3">
              {records.map((r) => {
                const statusBadge = getStatusBadgeStyle(r.status);
                const inLoc = getLocationDisplay(r.punchIn);
                const outLoc = getLocationDisplay(r.punchOut);

                return (
                  <div
                    key={r._id}
                    className="p-3 mb-3 rounded-3 bg-white"
                    style={{
                      border: `1px solid ${THEME.border}`,
                      boxShadow: '0 2px 6px rgba(15, 23, 42, 0.05)',
                    }}
                  >
                    {/* Header Row */}
                    <div className="d-flex justify-content-between align-items-start mb-2.5">
                      <div className="d-flex align-items-center gap-2">
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            backgroundColor: '#E0F2FE',
                            color: '#0284C7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '14px',
                            flexShrink: 0,
                          }}
                        >
                          {(r.userId?.name || 'E').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="fw-bold" style={{ color: '#0F172A', fontSize: '14.5px' }}>
                            {r.userId?.name || 'Employee'}
                          </div>
                          <div className="text-muted" style={{ fontSize: '11px' }}>
                            {r.date} • {r.departmentId?.name || 'Operations'}
                          </div>
                        </div>
                      </div>

                      <span
                        className="badge"
                        style={{
                          backgroundColor: statusBadge.bg,
                          color: statusBadge.color,
                          border: `1px solid ${statusBadge.border}`,
                          fontSize: '11px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        {r.status || 'Present'}
                      </span>
                    </div>

                    {/* Metric Quick Stats */}
                    <div
                      className="p-2 rounded-2 mb-2.5 d-grid"
                      style={{
                        backgroundColor: '#F8FAFC',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '4px',
                        fontSize: '11px',
                      }}
                    >
                      <div className="text-center border-end">
                        <div className="text-muted" style={{ fontSize: '9.5px', fontWeight: 600 }}>IN TIME</div>
                        <div className="fw-bold text-dark mt-0.5">
                          {r.punchIn?.time
                            ? new Date(r.punchIn.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '-'}
                        </div>
                      </div>

                      <div className="text-center border-end">
                        <div className="text-muted" style={{ fontSize: '9.5px', fontWeight: 600 }}>OUT TIME</div>
                        <div className="fw-bold text-dark mt-0.5">
                          {r.punchOut?.time ? (
                            new Date(r.punchOut.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          ) : (
                            <span className="text-danger">None</span>
                          )}
                        </div>
                      </div>

                      <div className="text-center border-end">
                        <div className="text-muted" style={{ fontSize: '9.5px', fontWeight: 600 }}>WORK</div>
                        <div className="fw-bold mt-0.5" style={{ color: '#0284C7' }}>
                          {r.workingHours ? `${r.workingHours}h` : '0h'}
                        </div>
                      </div>

                      <div className="text-center">
                        <div className="text-muted" style={{ fontSize: '9.5px', fontWeight: 600 }}>OVERTIME</div>
                        <div className="fw-bold mt-0.5 text-muted">
                          {r.overtimeMinutes ? `${(r.overtimeMinutes / 60).toFixed(1)}h` : '0h'}
                        </div>
                      </div>
                    </div>

                    {/* DEDICATED PUNCH IN & PUNCH OUT LOCATION PANELS */}
                    <div className="row g-2 mb-2.5">
                      {/* PUNCH IN LOCATION BOX */}
                      <div className="col-12 col-sm-6">
                        <div
                          className="p-2.5 rounded-2 border h-100"
                          style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }}
                        >
                          <div className="d-flex align-items-center justify-content-between mb-1">
                            <span className="small fw-bold text-success d-flex align-items-center gap-1" style={{ fontSize: '11px' }}>
                              <i className="bi bi-box-arrow-in-right"></i> PUNCH IN LOCATION
                            </span>
                            {inLoc.mapUrl && (
                              <a href={inLoc.mapUrl} target="_blank" rel="noreferrer" className="map-link-action">
                                <i className="bi bi-map"></i> Map
                              </a>
                            )}
                          </div>

                          <div className="d-flex flex-column gap-1">
                            <div className="village-pill-in text-truncate" title={inLoc.village}>
                              <i className="bi bi-geo-alt-fill text-success flex-shrink-0"></i>
                              <span className="text-truncate">{inLoc.village}</span>
                            </div>
                            <span className="text-muted" style={{ fontSize: '10.5px' }}>
                              {r.punchIn?.time
                                ? new Date(r.punchIn.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : ''}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* PUNCH OUT LOCATION BOX */}
                      <div className="col-12 col-sm-6">
                        <div
                          className="p-2.5 rounded-2 border h-100"
                          style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }}
                        >
                          <div className="d-flex align-items-center justify-content-between mb-1">
                            <span className="small fw-bold text-danger d-flex align-items-center gap-1" style={{ fontSize: '11px' }}>
                              <i className="bi bi-box-arrow-right"></i> PUNCH OUT LOCATION
                            </span>
                            {outLoc.mapUrl && (
                              <a href={outLoc.mapUrl} target="_blank" rel="noreferrer" className="map-link-action">
                                <i className="bi bi-map"></i> Map
                              </a>
                            )}
                          </div>

                          <div className="d-flex flex-column gap-1">
                            {!outLoc.isMissing ? (
                              <>
                                <div className="village-pill-out text-truncate" title={outLoc.village}>
                                  <i className="bi bi-geo-alt-fill text-danger flex-shrink-0"></i>
                                  <span className="text-truncate">{outLoc.village}</span>
                                </div>
                                <span className="text-muted" style={{ fontSize: '10.5px' }}>
                                  {new Date(r.punchOut.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </>
                            ) : (
                              <div className="missing-out-badge align-self-start mt-1">
                                <i className="bi bi-geo-alt-fill text-danger"></i>
                                <span>Missing Out</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                      <div>
                        {r.lateMinutes > 0 ? (
                          <span
                            className="badge"
                            style={{
                              backgroundColor: THEME.warningBg,
                              color: THEME.warningText,
                              fontSize: '11px',
                            }}
                          >
                            +{r.lateMinutes} mins late
                          </span>
                        ) : (
                          <span className="text-muted small">On-Time</span>
                        )}
                      </div>

                      <div className="d-flex gap-1.5">
                        <button
                          className="btn btn-sm btn-outline-primary py-1 px-2.5"
                          style={{ fontSize: '12px', borderRadius: '6px' }}
                          onClick={() => handleOpenEdit(r)}
                        >
                          <i className="bi bi-pencil me-1"></i>
                          <span>Edit</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div
                className="d-flex justify-content-between align-items-center p-3 border-top flex-wrap gap-2"
                style={{ borderColor: THEME.border, backgroundColor: '#FAFAFA' }}
              >
                <span className="small text-muted">
                  Page <b>{pagination.page}</b> of <b>{pagination.totalPages}</b> ({pagination.total} entries)
                </span>
                <div>
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={setPage}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Admin Correction Modal ── */}
      {selectedRecord && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 1060,
          }}
          onClick={() => setSelectedRecord(null)}
        >
          <div
            className="rounded-3 shadow-lg p-4 bg-white"
            style={{
              width: '100%',
              maxWidth: '480px',
              border: `1px solid ${THEME.border}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center pb-3 mb-3 border-bottom" style={{ borderColor: THEME.border }}>
              <div>
                <h6 className="fw-bold mb-0" style={{ color: THEME.navy }}>
                  Administrative Correction
                </h6>
                <small className="text-muted">
                  {selectedRecord.userId?.name} • {selectedRecord.date}
                </small>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setSelectedRecord(null)}
              ></button>
            </div>

            <form onSubmit={handleSaveCorrection}>
              <div className="mb-3">
                <label className="form-label small fw-semibold" style={{ color: THEME.textPrimary }}>
                  Punch In Timestamp
                </label>
                <input
                  type="datetime-local"
                  className="form-control form-control-sm form-control-custom"
                  value={editPunchIn}
                  onChange={(e) => setEditPunchIn(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold" style={{ color: THEME.textPrimary }}>
                  Punch Out Timestamp
                </label>
                <input
                  type="datetime-local"
                  className="form-control form-control-sm form-control-custom"
                  value={editPunchOut}
                  onChange={(e) => setEditPunchOut(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold" style={{ color: THEME.textPrimary }}>
                  Attendance Status
                </label>
                <select
                  className="form-select form-select-sm form-select-custom"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                >
                  <option value="Present">Present</option>
                  <option value="Incomplete">Incomplete</option>
                  <option value="Half-Day">Half-Day</option>
                  <option value="Absent">Absent</option>
                  <option value="Leave">Leave</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="form-label small fw-semibold" style={{ color: THEME.textPrimary }}>
                  Audit Justification Reason <span className="text-danger">*</span>
                </label>
                <textarea
                  className="form-control form-control-sm"
                  rows="3"
                  placeholder="Provide explanation..."
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  style={{ borderColor: THEME.border, borderRadius: '8px' }}
                  required
                ></textarea>
              </div>

              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-light border px-3"
                  onClick={() => setSelectedRecord(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-sm text-white px-3"
                  style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}
                  disabled={submittingCorrection}
                >
                  {submittingCorrection ? 'Applying Update...' : 'Confirm Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceListPage;