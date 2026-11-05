import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  Ticket,
  Clock,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Plus,
  ArrowLeft,
  Edit2,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Eye,
  Image as ImageIcon,
  FileText,
  Calendar,
  User,
  Search,
  CheckSquare,
} from 'lucide-react';
import { getCompanyById } from '../../api/companyApi';
import { erpApi } from '../../api/erpApi';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PermissionGate from '../../components/permissions/PermissionGate';
import TicketDetailModal from '../tickets/TicketDetailModal';
import TicketWorkingDuration from '../tickets/TicketWorkingDuration';

const CompanyDetailPage = ({ companyId: propCompanyId }) => {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const companyId = routeId || propCompanyId;

  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('tickets'); // 'tickets' | 'info' | 'photos'
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState('ALL');
  const [detailTicket, setDetailTicket] = useState(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Live timer interval for active tickets
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchDetails = useCallback(async () => {
    if (!companyId) return;
    setError('');
    try {
      const res = await getCompanyById(companyId);
      if (res && res.success) {
        setCompany(res.data);
      } else {
        setError(res?.message || 'Failed to retrieve company profile');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load company profile details');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    setLoading(true);
    fetchDetails();
  }, [fetchDetails]);

  const handleViewTicket = async (t) => {
    setDetailTicket(t);
    try {
      const res = await erpApi.getTicketById(t._id);
      const fresh = res?.data?.data || res?.data;
      if (fresh) {
        setDetailTicket(fresh);
      }
    } catch (err) {
      console.warn('Could not refresh full ticket details, using company ticket snapshot', err);
    }
  };

  // Filter company tickets
  const filteredTickets = useMemo(() => {
    const list = company?.tickets || [];
    return list.filter((t) => {
      const q = ticketSearch.toLowerCase();
      const matchSearch =
        !ticketSearch ||
        t.ticketNo?.toLowerCase().includes(q) ||
        t.subject?.toLowerCase().includes(q) ||
        t.contactPerson?.toLowerCase().includes(q) ||
        t.ticketType?.toLowerCase().includes(q) ||
        t.assignedTo?.name?.toLowerCase().includes(q) ||
        t.createdBy?.name?.toLowerCase().includes(q) ||
        t.createdByName?.toLowerCase().includes(q);

      const matchStatus =
        ticketStatusFilter === 'ALL' ||
        t.status?.toUpperCase() === ticketStatusFilter.toUpperCase();

      return matchSearch && matchStatus;
    });
  }, [company?.tickets, ticketSearch, ticketStatusFilter]);

  if (loading) {
    return (
      <div className="erp-fade-in py-5 text-center">
        <LoadingSpinner text="Retrieving company profile, telemetry, and service ticket records..." />
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="erp-fade-in py-5 text-center">
        <div className="alert alert-danger d-inline-block px-4 py-3 rounded-3 shadow-xs">
          <AlertCircle size={24} className="mb-2 text-danger" />
          <h6 className="fw-bold mb-1">Company Profile Unavailable</h6>
          <p className="small mb-3">{error || 'The requested company profile could not be found or access is restricted.'}</p>
          <Link to="/companies" className="erp-btn erp-btn-secondary erp-btn-sm">
            <ArrowLeft size={14} /> Return to Company Directory
          </Link>
        </div>
      </div>
    );
  }

  const stats = company.stats || {
    totalTickets: company.tickets?.length || 0,
    openTickets: (company.tickets || []).filter((t) => t.status === 'Open' || t.status === 'OPEN').length,
    inProgressTickets: (company.tickets || []).filter((t) => t.status === 'In Progress' || t.status === 'IN_PROGRESS').length,
    resolvedTickets: (company.tickets || []).filter((t) => t.status === 'Resolved' || t.status === 'RESOLVED' || t.status === 'Completed').length,
    totalHours: 0,
    photosCount: company.siteVisitImages?.length || 0,
  };

  const fullAddress = [company.addressLine1, company.city, company.area, company.state, company.pincode, company.country]
    .filter(Boolean)
    .join(', ');

  const googleMapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(
    fullAddress || company.company
  )}`;

  return (
    <div className="erp-fade-in pb-5">
      {/* ── Page Header & Quick Actions ── */}
      <PageHeader
        title={`${company.company} (${company.profileCode || 'COMP'})`}
        subtitle={`${company.businessType || 'Commercial Enterprise'} • Client Profile & Field Service Operations`}
        showBackButton={true}
        backFallback="/companies"
        breadcrumbs={[
          { label: 'Company Profiles', path: '/companies' },
          { label: company.company },
        ]}
        actions={
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <Link to="/companies" className="erp-btn erp-btn-secondary">
              <ArrowLeft size={15} /> Back to Directory
            </Link>

            <PermissionGate module="companies" action="edit">
              <Link to={`/companies/${company._id}/edit`} className="erp-btn erp-btn-secondary">
                <Edit2 size={15} /> Edit Profile
              </Link>
            </PermissionGate>

            <PermissionGate module="tickets" action="create">
              <Link
                to="/tickets"
                state={{ openBooking: true, selectedCompanyId: company._id, selectedCompanyName: company.company }}
                className="erp-btn erp-btn-primary"
              >
                <Plus size={15} /> Book Service Ticket
              </Link>
            </PermissionGate>
          </div>
        }
      />

      {/* ── Company Operations Stats Bar ── */}
      <div className="row g-3 mb-4">
        {/* Total Booked Tickets */}
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Total Tickets Booked"
            value={stats.totalTickets}
            subtitle="Lifetime service records"
            icon={Ticket}
            variant="primary"
          />
        </div>

        {/* Active / In Progress */}
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Active Tickets"
            value={stats.openTickets + stats.inProgressTickets}
            subtitle={`${stats.inProgressTickets} currently in-progress`}
            icon={Clock}
            variant="warning"
          />
        </div>

        {/* Resolved / Completed */}
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Resolved Tickets"
            value={stats.resolvedTickets}
            subtitle="Successfully serviced"
            icon={CheckCircle2}
            variant="success"
          />
        </div>

        {/* Total Service Hours Logged */}
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Logged Service Hours"
            value={`${stats.totalHours} hrs`}
            subtitle="On-site technician time"
            icon={Wrench}
            variant="purple"
          />
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="erp-tabs-nav mb-4">
        <button
          type="button"
          className={`erp-tab-btn ${activeTab === 'tickets' ? 'active' : ''}`}
          onClick={() => setActiveTab('tickets')}
        >
          <Ticket size={16} />
          <span>Service Tickets ({company.tickets?.length || 0})</span>
        </button>

        <button
          type="button"
          className={`erp-tab-btn ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          <Building2 size={16} />
          <span>Company Profile & Contacts</span>
        </button>

        <button
          type="button"
          className={`erp-tab-btn ${activeTab === 'photos' ? 'active' : ''}`}
          onClick={() => setActiveTab('photos')}
        >
          <ImageIcon size={16} />
          <span>Site Photos ({company.siteVisitImages?.length || 0})</span>
        </button>
      </div>

      {/* ── Tab 1: Service Tickets Booked for this Company ── */}
      {activeTab === 'tickets' && (
        <div className="erp-card p-3 p-md-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-3 pb-3 border-bottom">
            <div>
              <h5 className="fw-bold mb-1 text-dark" style={{ fontSize: '1.05rem' }}>
                Service Desk & Field Tickets
              </h5>
              <p className="text-muted small mb-0">
                All maintenance, repair, AMC, and installation tickets booked for {company.company}
              </p>
            </div>

            <div className="d-flex align-items-center gap-2 w-100 w-md-auto">
              {/* Search Bar */}
              <div className="input-group input-group-sm" style={{ maxWidth: '240px' }}>
                <span className="input-group-text bg-light border-0 text-muted ps-2.5">
                  <Search size={14} />
                </span>
                <input
                  type="text"
                  className="form-control form-control-sm bg-light border-0 ps-1"
                  placeholder="Search tickets..."
                  value={ticketSearch}
                  onChange={(e) => setTicketSearch(e.target.value)}
                />
              </div>

              {/* Status Filter */}
              <select
                className="form-select form-select-sm bg-light border-0 fw-semibold text-secondary"
                style={{ width: '130px', fontSize: '0.78rem' }}
                value={ticketStatusFilter}
                onChange={(e) => setTicketStatusFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Cancelled">Cancelled</option>
              </select>

              <Link
                to="/tickets"
                state={{ openBooking: true, selectedCompanyId: company._id, selectedCompanyName: company.company }}
                className="erp-btn erp-btn-primary erp-btn-sm text-nowrap"
              >
                <Plus size={14} /> Book Ticket
              </Link>
            </div>
          </div>

          {filteredTickets.length === 0 ? (
            <div className="py-5 text-center text-muted">
              <Ticket size={40} className="mx-auto mb-2 opacity-30 text-secondary" />
              <h6 className="fw-bold mb-1 text-dark">No Service Tickets Found</h6>
              <p className="small mb-3">
                {ticketSearch || ticketStatusFilter !== 'ALL'
                  ? 'No tickets match your search criteria.'
                  : `No service desk tickets have been booked for ${company.company} yet.`}
              </p>
              <Link
                to="/tickets"
                state={{ openBooking: true, selectedCompanyId: company._id, selectedCompanyName: company.company }}
                className="erp-btn erp-btn-primary erp-btn-sm d-inline-flex"
              >
                <Plus size={14} /> Book First Ticket
              </Link>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle mb-0" style={{ fontSize: '0.84rem' }}>
                <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <tr>
                    <th style={{ padding: '12px 14px', color: '#475569', fontSize: '0.74rem' }}>TICKET #</th>
                    <th style={{ padding: '12px 14px', color: '#475569', fontSize: '0.74rem' }}>TYPE / CATEGORY</th>
                    <th style={{ padding: '12px 14px', color: '#475569', fontSize: '0.74rem' }}>SUBJECT & ISSUE</th>
                    <th style={{ padding: '12px 14px', color: '#475569', fontSize: '0.74rem' }}>TECHNICIAN</th>
                    <th style={{ padding: '12px 14px', color: '#475569', fontSize: '0.74rem' }}>LOGGED TIME</th>
                    <th style={{ padding: '12px 14px', color: '#475569', fontSize: '0.74rem' }}>PRIORITY</th>
                    <th style={{ padding: '12px 14px', color: '#475569', fontSize: '0.74rem' }}>STATUS</th>
                    <th style={{ padding: '12px 14px', color: '#475569', fontSize: '0.74rem' }}>DATE</th>
                    <th style={{ padding: '12px 14px', color: '#475569', fontSize: '0.74rem' }} className="text-end">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((t) => {
                    return (
                      <tr key={t._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            className="font-monospace fw-bold text-primary d-block"
                            style={{ fontSize: '0.8rem', cursor: 'pointer' }}
                            onClick={() => handleViewTicket(t)}
                            title="View Ticket Details"
                          >
                            {t.ticketNo || 'TICK-N/A'}
                          </span>
                          <div
                            className="d-flex align-items-center gap-1 text-muted mt-1"
                            style={{ fontSize: '0.72rem' }}
                            title={`Booked by: ${t.createdBy?.name || t.createdByName || 'Authorized Staff'}`}
                          >
                            <User size={11} className="text-secondary flex-shrink-0" />
                            <span className="text-truncate" style={{ maxWidth: '130px' }}>
                              <span className="text-secondary fw-medium">By:</span> {t.createdBy?.name || t.createdByName || '—'}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            className="badge rounded-pill fw-semibold"
                            style={{
                              backgroundColor: '#EFF6FF',
                              color: '#2563EB',
                              fontSize: '0.7rem',
                              padding: '3px 8px',
                            }}
                          >
                            {t.ticketType || 'Normal Ticket'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div className="fw-semibold text-dark text-truncate" style={{ maxWidth: '220px' }}>
                            {t.subject || 'Service Request'}
                          </div>
                          {t.contactPerson && (
                            <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>
                              Contact: {t.contactPerson}
                            </small>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {t.assignedTo ? (
                            <div className="d-flex align-items-center gap-1.5">
                              <div
                                className="rounded-circle d-flex align-items-center justify-content-center fw-bold bg-primary-subtle text-primary"
                                style={{ width: '26px', height: '26px', fontSize: '0.7rem' }}
                              >
                                {t.assignedTo.name?.[0]?.toUpperCase() || 'T'}
                              </div>
                              <span className="text-dark small fw-medium text-truncate" style={{ maxWidth: '120px' }}>
                                {t.assignedTo.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted small">Unassigned</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <TicketWorkingDuration ticket={t} currentTime={currentTime} compact={true} />
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            className={`badge rounded-pill fw-semibold ${
                              t.priority === 'Urgent'
                                ? 'bg-danger text-white'
                                : t.priority === 'High'
                                ? 'bg-warning-subtle text-warning border border-warning'
                                : 'bg-light text-muted border'
                            }`}
                            style={{ fontSize: '0.68rem', padding: '3px 8px' }}
                          >
                            {t.priority || 'Medium'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <StatusBadge status={t.status || 'Open'} size="sm" />
                        </td>
                        <td style={{ padding: '12px 14px' }} className="text-muted small">
                          {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td style={{ padding: '12px 14px' }} className="text-end">
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm p-1.5"
                            onClick={() => handleViewTicket(t)}
                            title="View Ticket Details"
                          >
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 2: Company Profile Details & Address ── */}
      {activeTab === 'info' && (
        <div className="row g-4">
          <div className="col-12 col-lg-6">
            <div className="erp-card p-4 h-100">
              <h5 className="fw-bold mb-3 text-dark d-flex align-items-center gap-2" style={{ fontSize: '1rem' }}>
                <Building2 size={18} className="text-primary" /> General Profile Information
              </h5>

              <div className="d-flex flex-column gap-3 small">
                <div className="d-flex justify-content-between border-bottom pb-2">
                  <span className="text-muted">Company Name:</span>
                  <span className="fw-bold text-dark">{company.company}</span>
                </div>
                <div className="d-flex justify-content-between border-bottom pb-2">
                  <span className="text-muted">Profile Code:</span>
                  <span className="font-monospace fw-bold text-primary">{company.profileCode || 'COMP-1001'}</span>
                </div>
                <div className="d-flex justify-content-between border-bottom pb-2">
                  <span className="text-muted">Account Status:</span>
                  <StatusBadge status={company.status || 'Active'} size="sm" />
                </div>
                <div className="d-flex justify-content-between border-bottom pb-2">
                  <span className="text-muted">Business / Mill Type:</span>
                  <span className="fw-semibold text-dark">{company.businessType || 'Commercial Mill / Processing Plant'}</span>
                </div>
                <div className="d-flex justify-content-between border-bottom pb-2">
                  <span className="text-muted">Created By:</span>
                  <span className="text-secondary">{company.createdBy?.name || 'Administrator'}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Registered On:</span>
                  <span className="text-secondary">{company.createdAt ? new Date(company.createdAt).toLocaleDateString() : '—'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-6">
            <div className="erp-card p-4 h-100">
              <h5 className="fw-bold mb-3 text-dark d-flex align-items-center gap-2" style={{ fontSize: '1rem' }}>
                <Phone size={18} className="text-success" /> Contact & Physical Location
              </h5>

              <div className="d-flex flex-column gap-3 small">
                <div className="d-flex justify-content-between border-bottom pb-2">
                  <span className="text-muted">Key Contact Person:</span>
                  <span className="fw-bold text-dark">{company.contactPerson || '—'}</span>
                </div>
                <div className="d-flex justify-content-between border-bottom pb-2">
                  <span className="text-muted">Primary Phone:</span>
                  {company.contactNumber ? (
                    <a href={`tel:${company.contactNumber}`} className="text-decoration-none font-monospace fw-bold text-primary">
                      {company.contactNumber}
                    </a>
                  ) : (
                    <span>—</span>
                  )}
                </div>
                <div className="d-flex justify-content-between border-bottom pb-2">
                  <span className="text-muted">Alternate Contact:</span>
                  <span className="font-monospace text-secondary">{company.alternatePhone || '—'}</span>
                </div>
                <div className="d-flex justify-content-between border-bottom pb-2">
                  <span className="text-muted">Corporate Email:</span>
                  {company.contactEmail ? (
                    <a href={`mailto:${company.contactEmail}`} className="text-decoration-none fw-semibold text-primary">
                      {company.contactEmail}
                    </a>
                  ) : (
                    <span>—</span>
                  )}
                </div>
                <div className="d-flex justify-content-between border-bottom pb-2">
                  <span className="text-muted">District & State:</span>
                  <span className="fw-semibold text-dark">{[company.area || company.city, company.state, company.country].filter(Boolean).join(', ')}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-muted">Full Address:</span>
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1.5 py-1 px-2.5 rounded-2"
                    style={{ fontSize: '0.74rem' }}
                  >
                    <MapPin size={12} className="text-danger" /> View on Google Maps
                  </a>
                </div>
                <div className="p-2.5 rounded-2 bg-light border text-muted small" style={{ fontSize: '0.76rem' }}>
                  {fullAddress || 'No full street address recorded.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 3: Site Inspection Photos ── */}
      {activeTab === 'photos' && (
        <div className="erp-card p-4">
          <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
            <div>
              <h5 className="fw-bold mb-1 text-dark" style={{ fontSize: '1.05rem' }}>
                Plant & Mill Site Inspection Photos
              </h5>
              <p className="text-muted small mb-0">
                Premises visit photographs, factory entry visuals, and plant setup records
              </p>
            </div>
            <span className="badge rounded-pill bg-light text-muted border">
              {company.siteVisitImages?.length || 0} Photos
            </span>
          </div>

          {!company.siteVisitImages || company.siteVisitImages.length === 0 ? (
            <div className="py-5 text-center text-muted">
              <ImageIcon size={40} className="mx-auto mb-2 opacity-30 text-secondary" />
              <h6 className="fw-bold mb-1 text-dark">No Site Photos Available</h6>
              <p className="small mb-0">No site visit photos or premises images have been uploaded for this company.</p>
            </div>
          ) : (
            <div className="row g-3">
              {company.siteVisitImages.map((img, i) => (
                <div key={img.publicId || i} className="col-6 col-sm-4 col-md-3 col-xl-2">
                  <a
                    href={img.url}
                    target="_blank"
                    rel="noreferrer"
                    className="card border rounded-3 overflow-hidden shadow-xs text-decoration-none h-100 group position-relative"
                    style={{ backgroundColor: '#F8FAFC' }}
                  >
                    <div style={{ height: '140px', overflow: 'hidden' }}>
                      <img
                        src={img.url}
                        alt="Site Visit"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.2s ease' }}
                        className="hover-scale"
                      />
                    </div>
                    <div className="p-2 text-center bg-white border-top">
                      <small className="text-muted text-truncate d-block" style={{ fontSize: '0.7rem' }}>
                        {img.originalName || `Photo #${i + 1}`}
                      </small>
                    </div>
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Ticket Detail View Modal ── */}
      <TicketDetailModal
        show={!!detailTicket}
        ticket={detailTicket}
        onClose={() => setDetailTicket(null)}
        onRefresh={fetchDetails}
      />
    </div>
  );
};

export default CompanyDetailPage;
