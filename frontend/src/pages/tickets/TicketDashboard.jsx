import React, { useState, useEffect, useMemo } from 'react';
import { erpApi } from '../../api/erpApi';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const THEME = {
  navy: '#0F172A',
  primary: '#1E5385',
  primaryLight: '#EFF6FF',
  background: '#F8FAFC',
  cardBg: '#FFFFFF',
  textMain: '#1E293B',
  textMuted: '#64748B',
  border: '#CBD5E1',
  success: '#15803D',
  warning: '#B45309',
  danger: '#DC2626',
};

const TICKET_TYPES = ['Round Silo', 'Mill', 'Normal Ticket', 'Rewinding', 'Outdoor', 'AMC', 'Panel Board'];
const UNITS = ['Plant', 'Boiler', 'Silo Section', 'Turbine Floor', 'Control Room', 'Substation', 'Other'];

const TicketDashboard = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Box Panel States
  const [openBookingBox, setOpenBookingBox] = useState(false);
  const [openCompanyBox, setOpenCompanyBox] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [savingTicket, setSavingTicket] = useState(false);

  // Ticket Form State
  const [ticketForm, setTicketForm] = useState({
    companyId: '',
    companyName: '',
    contactPerson: '',
    phoneNumber: '',
    unit: 'Plant',
    ticketType: 'Round Silo',
    subject: '',
    description: '',
    initialImages: [],
    pincode: '',
    addressLocation: '',
    location: null,
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchData();
    fetchCompanies();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await erpApi.getTickets({ limit: 100 });
      const raw = res?.data?.data?.tickets || res?.data?.tickets || res?.data?.data || res?.data || [];
      setTickets(Array.isArray(raw) ? raw : []);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await erpApi.getCompaniesForTicket();
      const raw = res?.data?.data?.companies || res?.data?.companies || res?.data?.data || res?.data || [];
      setCompanies(Array.isArray(raw) ? raw : []);
    } catch (err) {
      console.error('Failed to fetch companies:', err);
    }
  };

  const autoDetectGPSAndPincode = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          const detectedPincode = data.address?.postcode || '';
          const address = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          setTicketForm((prev) => ({
            ...prev,
            location: { lat, lng },
            pincode: detectedPincode,
            addressLocation: address,
          }));
        } catch {
          setTicketForm((prev) => ({
            ...prev,
            location: { lat, lng },
            addressLocation: `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`,
          }));
        } finally {
          setIsLocating(false);
        }
      },
      () => setIsLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleToggleBookingBox = () => {
    const nextState = !openBookingBox;
    setOpenBookingBox(nextState);
    if (nextState) autoDetectGPSAndPincode();
  };

  const handleSelectCompany = (c) => {
    setTicketForm((prev) => ({
      ...prev,
      companyId: c._id,
      companyName: c.company || c.name || '',
      contactPerson: c.contactPerson || c.person || prev.contactPerson,
      phoneNumber: c.phone || c.phoneNumber || prev.phoneNumber,
    }));
    setOpenCompanyBox(false);
  };

  const handleSaveTicketBox = async () => {
    if (!ticketForm.companyId && !ticketForm.companyName) {
      alert('Please select a Company in Box 1');
      return;
    }
    if (!ticketForm.subject.trim()) {
      alert('Please enter Subject / Issue in Box 6');
      return;
    }

    setSavingTicket(true);
    try {
      await erpApi.createTicket({
        ...ticketForm,
        subject: ticketForm.subject || `${ticketForm.ticketType} - ${ticketForm.unit}`,
      });
      setOpenBookingBox(false);
      setTicketForm({
        companyId: '',
        companyName: '',
        contactPerson: '',
        phoneNumber: '',
        unit: 'Plant',
        ticketType: 'Round Silo',
        subject: '',
        description: '',
        initialImages: [],
        pincode: '',
        addressLocation: '',
        location: null,
      });
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create ticket');
    } finally {
      setSavingTicket(false);
    }
  };

  // KPI Calculations
  const metrics = useMemo(() => {
    const total = tickets.length;
    const inProgress = tickets.filter((t) => t.status === 'In Progress' || t.status === 'IN_PROGRESS').length;
    const resolved = tickets.filter((t) => t.status === 'Resolved' || t.status === 'RESOLVED').length;
    const pending = total - (inProgress + resolved);
    return { total, inProgress, resolved, pending: Math.max(0, pending) };
  }, [tickets]);

  // Filtered List
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        (t.ticketNo && t.ticketNo.toLowerCase().includes(q)) ||
        (t.subject && t.subject.toLowerCase().includes(q)) ||
        (t.companyName && t.companyName.toLowerCase().includes(q)) ||
        (t.companyId?.company && t.companyId.company.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'IN_PROGRESS' && (t.status === 'In Progress' || t.status === 'IN_PROGRESS')) ||
        (statusFilter === 'OPEN' && (t.status === 'Open' || t.status === 'OPEN')) ||
        (statusFilter === 'RESOLVED' && (t.status === 'Resolved' || t.status === 'RESOLVED'));

      return matchesSearch && matchesStatus;
    });
  }, [tickets, search, statusFilter]);

  const calculateDuration = (startTime, stopTime, status) => {
    if (!startTime) return 'Not Started';
    const start = new Date(startTime).getTime();
    const end = (status === 'In Progress' || status === 'IN_PROGRESS') ? currentTime : stopTime ? new Date(stopTime).getTime() : start;
    const diffMs = Math.max(0, end - start);
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    const pad = (n) => String(n).padStart(2, '0');
    return `${hours > 0 ? `${hours}h ` : ''}${pad(minutes)}m ${pad(seconds)}s`;
  };

  return (
    <div className="erp-page-wrapper">
      <style>{`
        @import url("https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css");

        html, body {
          overflow-x: hidden !important;
          max-width: 100vw !important;
          margin: 0;
          padding: 0;
        }

        .erp-page-wrapper {
          background-color: #F8FAFC;
          min-height: 100vh;
          width: 100%;
          padding: 16px 14px 48px;
          box-sizing: border-box;
          color: #1E293B;
        }
        @media (min-width: 768px) {
          .erp-page-wrapper {
            padding: 32px 36px 64px;
          }
        }

        .erp-container-inner {
          max-width: 1440px;
          margin: 0 auto;
        }

        .erp-header-banner {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          padding: 20px 24px;
          margin-bottom: 24px;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
        }

        .kpi-card-box {
          border-radius: 12px;
          border: 1px solid #E2E8F0;
          background: #FFFFFF;
          padding: 16px 18px;
          display: flex;
          align-items: center;
          gap: 16px;
          height: 100%;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .kpi-card-box:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
        }

        .kpi-icon-square {
          width: 46px;
          height: 46px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .erp-filter-panel {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 18px 20px;
          margin-bottom: 24px;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
        }

        .erp-input-field {
          border-radius: 8px;
          border: 1px solid #CBD5E1;
          font-size: 0.88rem;
          padding: 10px 14px;
          width: 100%;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .erp-input-field:focus {
          border-color: #0284C7;
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
          outline: none;
        }

        .erp-table-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          box-shadow: 0 1px 4px rgba(15, 23, 42, 0.04);
          overflow: hidden;
          margin-bottom: 32px;
        }

        .erp-data-table thead th {
          background-color: #0F172A;
          color: #FFFFFF;
          font-size: 0.74rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 16px 20px;
          border: none;
        }
        .erp-data-table tbody td {
          padding: 16px 20px;
          border-bottom: 1px solid #F1F5F9;
        }

        .btn-erp-brand {
          background: #1E5385;
          border: 1px solid #1E5385;
          color: #FFFFFF !important;
          font-weight: 600;
          font-size: 0.88rem;
          border-radius: 8px;
          padding: 10px 20px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
        }
        .btn-erp-brand:hover {
          background: #164069;
        }

        /* Mobile specific card styles (< 768px) */
        @media (max-width: 767.98px) {
          .erp-header-banner {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 16px !important;
          }
          .erp-ticket-mobile-card {
            border: 1px solid #E2E8F0;
            border-radius: 12px;
            padding: 16px;
            background: #FFFFFF;
            box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
            margin-bottom: 12px;
          }
        }
      `}</style>

      <div className="erp-container-inner">

        {/* ── SECTION 1: Top Header Banner ── */}
        <div className="erp-header-banner d-flex justify-content-between align-items-start align-items-md-center">
          <div>
            <div className="d-flex align-items-center flex-wrap gap-2 mb-2">
              <h3 className="fw-bold mb-0 text-dark fs-5">
                Service Tickets &amp; Job Dispatch
              </h3>
              <span
                className="badge rounded-pill small"
                style={{ backgroundColor: '#E0F2FE', color: '#0369A1', fontWeight: 600, padding: '6px 12px' }}
              >
                {metrics.total} Registered
              </span>
            </div>
            <p className="text-muted small mb-0">
              Book plant repairs, dispatch technical engineers, and audit active running hours.
            </p>
          </div>

          <div className="w-100 w-md-auto text-end mt-2 mt-md-0 d-flex gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary d-inline-flex align-items-center gap-1.5"
              onClick={fetchData}
              title="Refresh Tickets"
              style={{ borderRadius: '8px' }}
            >
              <i className="bi bi-arrow-clockwise"></i>
              <span className="d-none d-sm-inline">Refresh</span>
            </button>
            <button
              type="button"
              className="btn btn-erp-brand w-100 w-md-auto"
              style={{ backgroundColor: openBookingBox ? THEME.danger : THEME.primary }}
              onClick={handleToggleBookingBox}
            >
              <i className={`bi ${openBookingBox ? 'bi-x-lg' : 'bi-plus-circle'}`}></i>
              <span>{openBookingBox ? 'Close Form' : 'Book Service Ticket'}</span>
            </button>
          </div>
        </div>

        {/* ── SECTION 2: Interactive Service Booking Panel ── */}
        {openBookingBox && (
          <div
            className="p-3 p-md-4 rounded-4 shadow-sm mb-4 bg-white"
            style={{ border: `2px solid ${THEME.primary}` }}
          >
            <div className="d-flex justify-content-between align-items-center pb-3 mb-3 border-bottom">
              <div>
                <h5 className="fw-bold mb-0 text-dark">
                  <i className="bi bi-ticket-perforated-fill text-primary me-2"></i>
                  Create Service Ticket
                </h5>
                <small className="text-muted">Enter unit, technical fault descriptions, and customer information.</small>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-light border"
                onClick={() => setOpenBookingBox(false)}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className="row g-3">
              {/* 1. Company Picker */}
              <div className="col-12 col-md-6">
                <div className="p-3 rounded-3 bg-light border h-100">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <label className="fw-bold small text-muted text-uppercase mb-0">1. Client / Company *</label>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary py-1 px-2.5"
                      style={{ fontSize: '0.78rem' }}
                      onClick={() => setOpenCompanyBox(!openCompanyBox)}
                    >
                      {openCompanyBox ? 'Close' : 'Select Company'}
                    </button>
                  </div>

                  <div className="p-2.5 bg-white rounded border d-flex align-items-center gap-2">
                    <i className="bi bi-building text-primary"></i>
                    <strong className="text-dark small text-truncate">
                      {ticketForm.companyName || 'Tap "Select Company" above'}
                    </strong>
                  </div>

                  {openCompanyBox && (
                    <div className="p-2.5 bg-white rounded-3 border mt-2 shadow-sm">
                      <input
                        type="text"
                        className="form-control form-control-sm mb-2"
                        placeholder="Search company name..."
                        value={companySearch}
                        onChange={(e) => setCompanySearch(e.target.value)}
                      />
                      <div className="d-flex flex-column gap-1 overflow-y-auto" style={{ maxHeight: '160px' }}>
                        {companies
                          .filter((c) => (c.company || c.name || '').toLowerCase().includes(companySearch.toLowerCase()))
                          .map((c) => (
                            <button
                              key={c._id}
                              type="button"
                              className="btn btn-sm text-start p-2 border d-flex justify-content-between"
                              style={{
                                backgroundColor: ticketForm.companyId === c._id ? '#EFF6FF' : '#FFFFFF',
                              }}
                              onClick={() => handleSelectCompany(c)}
                            >
                              <span className="small fw-semibold">{c.company || c.name}</span>
                              {ticketForm.companyId === c._id && <i className="bi bi-check2 text-primary"></i>}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Ticket Type */}
              <div className="col-12 col-md-6">
                <div className="p-3 rounded-3 bg-light border h-100">
                  <label className="fw-bold small text-muted text-uppercase mb-2 d-block">2. Ticket Category</label>
                  <div className="d-flex flex-wrap gap-1.5">
                    {TICKET_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setTicketForm({ ...ticketForm, ticketType: type })}
                        className={`btn btn-sm ${ticketForm.ticketType === type ? 'btn-primary' : 'btn-white border'} py-1 px-2.5`}
                        style={{ fontSize: '0.80rem' }}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. Unit Selection */}
              <div className="col-12 col-md-6">
                <div className="p-3 rounded-3 bg-light border h-100">
                  <label className="fw-bold small text-muted text-uppercase mb-2 d-block">3. Operational Unit</label>
                  <div className="d-flex flex-wrap gap-1.5">
                    {UNITS.map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setTicketForm({ ...ticketForm, unit: u })}
                        className={`btn btn-sm ${ticketForm.unit === u ? 'btn-success text-white' : 'btn-white border'} py-1 px-2.5`}
                        style={{ fontSize: '0.80rem' }}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. Contact Details */}
              <div className="col-12 col-md-6">
                <div className="p-3 rounded-3 bg-light border h-100">
                  <label className="fw-bold small text-muted text-uppercase mb-2 d-block">4. Contact Person &amp; Phone</label>
                  <div className="row g-2">
                    <div className="col-6">
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Contact name..."
                        value={ticketForm.contactPerson}
                        onChange={(e) => setTicketForm({ ...ticketForm, contactPerson: e.target.value })}
                      />
                    </div>
                    <div className="col-6">
                      <input
                        type="tel"
                        className="form-control form-control-sm"
                        placeholder="Phone number..."
                        value={ticketForm.phoneNumber}
                        onChange={(e) => setTicketForm({ ...ticketForm, phoneNumber: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Subject & Issue Description */}
              <div className="col-12">
                <div className="p-3 rounded-3 bg-light border">
                  <label className="fw-bold small text-muted text-uppercase mb-2 d-block">5. Fault Details &amp; Subject *</label>
                  <input
                    type="text"
                    className="form-control form-control-sm mb-2"
                    placeholder="Brief subject (e.g. Silo Gearbox Oil Leakage)"
                    value={ticketForm.subject}
                    onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                    required
                  />
                  <textarea
                    className="form-control form-control-sm"
                    rows="3"
                    placeholder="Enter thorough problem symptoms and service instructions..."
                    value={ticketForm.description}
                    onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2 pt-3 mt-3 border-top">
              <button
                type="button"
                className="btn btn-light border px-3"
                onClick={() => setOpenBookingBox(false)}
                disabled={savingTicket}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-erp-brand px-4"
                onClick={handleSaveTicketBox}
                disabled={savingTicket}
              >
                {savingTicket ? 'Saving Ticket...' : 'Dispatch Ticket'}
              </button>
            </div>
          </div>
        )}

        {/* ── SECTION 3: KPI Metrics Cards Grid ── */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-lg-3">
            <div className="kpi-card-box">
              <div className="kpi-icon-square bg-primary bg-opacity-10 text-primary">
                <i className="bi bi-ticket-detailed-fill fs-5"></i>
              </div>
              <div>
                <span className="text-muted small fw-bold d-block text-uppercase mb-1" style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}>
                  Total Tickets
                </span>
                <h4 className="fw-bold text-dark mb-0 fs-5">{metrics.total}</h4>
              </div>
            </div>
          </div>

          <div className="col-6 col-lg-3">
            <div className="kpi-card-box">
              <div className="kpi-icon-square bg-warning bg-opacity-10 text-warning">
                <i className="bi bi-clock-history fs-5"></i>
              </div>
              <div>
                <span className="text-muted small fw-bold d-block text-uppercase mb-1" style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}>
                  In Progress
                </span>
                <h4 className="fw-bold text-warning mb-0 fs-5">{metrics.inProgress}</h4>
              </div>
            </div>
          </div>

          <div className="col-6 col-lg-3">
            <div className="kpi-card-box">
              <div className="kpi-icon-square bg-success bg-opacity-10 text-success">
                <i className="bi bi-check-circle-fill fs-5"></i>
              </div>
              <div>
                <span className="text-muted small fw-bold d-block text-uppercase mb-1" style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}>
                  Resolved
                </span>
                <h4 className="fw-bold text-success mb-0 fs-5">{metrics.resolved}</h4>
              </div>
            </div>
          </div>

          <div className="col-6 col-lg-3">
            <div className="kpi-card-box">
              <div className="kpi-icon-square bg-danger bg-opacity-10 text-danger">
                <i className="bi bi-exclamation-octagon-fill fs-5"></i>
              </div>
              <div>
                <span className="text-muted small fw-bold d-block text-uppercase mb-1" style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}>
                  Open / Pending
                </span>
                <h4 className="fw-bold text-danger mb-0 fs-5">{metrics.pending}</h4>
              </div>
            </div>
          </div>
        </div>

        {/* ── SECTION 4: Filter Console ── */}
        <div className="erp-filter-panel">
          <div className="row g-2.5 align-items-center">
            <div className="col-12 col-md-6 col-lg-5">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0 text-muted ps-3 pe-2">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control erp-input-field border-start-0 ps-1"
                  placeholder="Search by ticket #, company or subject..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="col-6 col-md-3">
              <select
                className="form-select erp-input-field"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open Only</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>

            <div className="col-6 col-md-3 text-end">
              {(search || statusFilter !== 'ALL') && (
                <button
                  type="button"
                  className="btn btn-sm btn-link text-danger text-decoration-none fw-semibold"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('ALL');
                  }}
                >
                  <i className="bi bi-arrow-counterclockwise me-1"></i>Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── SECTION 5: Data Content (Table + Mobile Cards) ── */}
        {loading ? (
          <div className="py-5 text-center my-4">
            <LoadingSpinner text="LOADING" subtext="Fetching field service tickets..." />
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="erp-table-card p-5 text-center bg-white">
            <i className="bi bi-ticket-perforated fs-1 text-muted d-block mb-2"></i>
            <h6 className="fw-bold mb-1 text-dark">No Service Tickets Found</h6>
            <p className="small text-muted mb-0">Try clearing your filters or create a new ticket above.</p>
          </div>
        ) : (
          <div className="erp-table-card bg-white">
            {/* Desktop Table View */}
            <div className="table-responsive d-none d-md-block">
              <table className="table erp-data-table align-middle mb-0 text-nowrap">
                <thead>
                  <tr>
                    <th>Ticket ID &amp; Type</th>
                    <th>Company &amp; Contact</th>
                    <th>Unit</th>
                    <th>Subject</th>
                    <th className="text-center">Working Time</th>
                    <th className="text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((t) => {
                    const isRunning = t.status === 'In Progress' || t.status === 'IN_PROGRESS';
                    const duration = calculateDuration(t.startTime, t.stopTime, t.status);

                    return (
                      <tr key={t._id}>
                        <td>
                          <div className="fw-bold text-dark mb-0.5">
                            {t.ticketNo || `#TK-${t._id?.slice(-5).toUpperCase()}`}
                          </div>
                          <span className="badge px-2.5 py-1 bg-light text-secondary border" style={{ fontSize: '0.72rem' }}>
                            {t.ticketType || 'Normal Ticket'}
                          </span>
                        </td>
                        <td>
                          <div className="fw-semibold text-dark mb-0.5">
                            {t.companyId?.company || t.companyName || 'Enterprise Client'}
                          </div>
                          <small className="text-muted d-block">{t.contactPerson || 'General Contact'}</small>
                        </td>
                        <td>
                          <span className="badge px-2.5 py-1 bg-primary bg-opacity-10 text-primary border" style={{ fontSize: '0.75rem' }}>
                            {t.unit || 'Plant'}
                          </span>
                        </td>
                        <td style={{ maxWidth: '240px' }}>
                          <div className="fw-semibold text-dark text-truncate mb-0.5">{t.subject || '—'}</div>
                          <small className="text-muted text-truncate d-block">{t.description || 'No notes'}</small>
                        </td>
                        <td className="text-center">
                          <span className={`badge px-2.5 py-1.5 font-monospace ${isRunning ? 'bg-success-subtle text-success border border-success' : 'bg-light text-muted border'}`}>
                            {duration}
                          </span>
                        </td>
                        <td className="text-center">
                          <span
                            className={`badge px-3 py-1.5 rounded-pill fw-semibold ${
                              t.status === 'Resolved' || t.status === 'RESOLVED'
                                ? 'bg-success text-white'
                                : isRunning
                                ? 'bg-warning text-dark'
                                : 'bg-primary text-white'
                            }`}
                            style={{ fontSize: '0.72rem' }}
                          >
                            {t.status || 'OPEN'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile View Card Deck (< 768px) */}
            <div className="d-block d-md-none p-3">
              {filteredTickets.map((t) => {
                const isRunning = t.status === 'In Progress' || t.status === 'IN_PROGRESS';
                const duration = calculateDuration(t.startTime, t.stopTime, t.status);

                return (
                  <div key={t._id} className="erp-ticket-mobile-card">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <div className="fw-bold text-dark">
                          {t.ticketNo || `#TK-${t._id?.slice(-5).toUpperCase()}`}
                        </div>
                        <span className="badge bg-light text-secondary border small mt-1">
                          {t.ticketType || 'Normal Ticket'}
                        </span>
                      </div>

                      <span
                        className={`badge rounded-pill fw-semibold ${
                          t.status === 'Resolved' || t.status === 'RESOLVED'
                            ? 'bg-success text-white'
                            : isRunning
                            ? 'bg-warning text-dark'
                            : 'bg-primary text-white'
                        }`}
                        style={{ fontSize: '0.70rem' }}
                      >
                        {t.status || 'OPEN'}
                      </span>
                    </div>

                    <div className="bg-light p-2.5 rounded-3 my-2.5 small">
                      <div className="row g-2">
                        <div className="col-12">
                          <span className="text-muted d-block" style={{ fontSize: '0.70rem' }}>SUBJECT</span>
                          <span className="fw-semibold text-dark text-truncate d-block">{t.subject || '—'}</span>
                        </div>
                        <div className="col-6">
                          <span className="text-muted d-block" style={{ fontSize: '0.70rem' }}>CLIENT</span>
                          <span className="text-dark fw-medium text-truncate d-block">{t.companyId?.company || t.companyName || '—'}</span>
                        </div>
                        <div className="col-6">
                          <span className="text-muted d-block" style={{ fontSize: '0.70rem' }}>UNIT</span>
                          <span className="text-primary fw-medium">{t.unit || 'Plant'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                      <div className="small text-muted font-monospace">
                        <i className="bi bi-clock me-1"></i>
                        {duration}
                      </div>
                      <span className="badge bg-light text-dark border">
                        {t.contactPerson || 'Assigned'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default TicketDashboard;