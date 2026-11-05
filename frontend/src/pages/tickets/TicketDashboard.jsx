import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Ticket as TicketIcon,
  Clock,
  Play,
  Square,
  Plus,
  Search,
  Building2,
  MapPin,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Eye,
  Filter,
  CheckSquare,
  ExternalLink,
  User,
} from 'lucide-react';
import { erpApi } from '../../api/erpApi';
import { useAuth } from '../../hooks/useAuth';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/Skeleton';
import PermissionGate from '../../components/permissions/PermissionGate';
import { calculateWorkingDuration } from '../../utils/geoUtils';

// Modals
import TicketBookingModal from './TicketBookingModal';
import StartTicketModal from './StartTicketModal';
import StopTicketModal from './StopTicketModal';
import TicketDetailModal from './TicketDetailModal';
import TicketWorkingDuration from './TicketWorkingDuration';

const TICKET_TYPE_OPTIONS = [
  'ALL',
  'Normal Ticket',
  'Rewinding Ticket',
  'Out Door Ticket',
  'AMC Ticket',
  'Panel Board Ticket',
];

const TicketDashboard = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Modals state
  const [openBookingModal, setOpenBookingModal] = useState(false);
  const [startTicketTarget, setStartTicketTarget] = useState(null);
  const [stopTicketTarget, setStopTicketTarget] = useState(null);
  const [detailTicketTarget, setDetailTicketTarget] = useState(null);

  const location = useLocation();

  // Open booking modal if redirected from dashboard shortcut
  useEffect(() => {
    if (location.state?.openBooking) {
      setOpenBookingModal(true);
    }
  }, [location.state]);

  // Active Timer Tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
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

  useEffect(() => {
    fetchData();
    fetchCompanies();
  }, []);

  // KPI Calculations
  const metrics = useMemo(() => {
    const total = tickets.length;
    const inProgress = tickets.filter(
      (t) => t.status === 'In Progress' || t.status === 'IN_PROGRESS'
    ).length;
    const completed = tickets.filter(
      (t) => t.status === 'Completed' || t.status === 'Resolved' || t.status === 'RESOLVED'
    ).length;
    const pending = tickets.filter(
      (t) => t.status === 'Pending' || t.status === 'Open' || t.status === 'OPEN'
    ).length;
    return { total, inProgress, completed, pending };
  }, [tickets]);

  // Filtered List
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        (t.ticketNo && t.ticketNo.toLowerCase().includes(q)) ||
        (t.subject && t.subject.toLowerCase().includes(q)) ||
        (t.contactPerson && t.contactPerson.toLowerCase().includes(q)) ||
        (t.phoneNumber && t.phoneNumber.toLowerCase().includes(q)) ||
        (t.millName && t.millName.toLowerCase().includes(q)) ||
        (t.createdBy?.name && t.createdBy.name.toLowerCase().includes(q)) ||
        (t.createdByName && t.createdByName.toLowerCase().includes(q)) ||
        (t.companyName && t.companyName.toLowerCase().includes(q)) ||
        (t.companyId?.company && t.companyId.company.toLowerCase().includes(q));

      const status = t.status || '';
      const isCompleted = status === 'Completed' || status === 'Resolved' || status === 'RESOLVED';
      const isInProgress = status === 'In Progress' || status === 'IN_PROGRESS';
      const isPending = status === 'Pending' || status === 'Open' || status === 'OPEN';

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PENDING' && isPending) ||
        (statusFilter === 'IN_PROGRESS' && isInProgress) ||
        (statusFilter === 'COMPLETED' && isCompleted);

      const matchesType =
        typeFilter === 'ALL' ||
        t.ticketType === typeFilter ||
        (typeFilter === 'Rewinding Ticket' && t.ticketType === 'Rewinding') ||
        (typeFilter === 'Out Door Ticket' && t.ticketType === 'Outdoor') ||
        (typeFilter === 'AMC Ticket' && t.ticketType === 'AMC') ||
        (typeFilter === 'Panel Board Ticket' && t.ticketType === 'Panel Board');

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [tickets, search, statusFilter, typeFilter]);

  return (
    <div className="erp-fade-in pb-4">
      {/* ── Page Header ── */}
      <PageHeader
        title="Service Desk & Field Tickets"
        subtitle="Manage dynamic service tickets, track technician GPS locations, start/stop service hours, and inspect equipment photos"
        breadcrumbs={[{ label: 'Operations' }, { label: 'Service Tickets' }]}
        actions={
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="erp-btn erp-btn-secondary"
              onClick={fetchData}
              title="Refresh tickets"
            >
              <RotateCcw size={15} /> Refresh
            </button>

            <PermissionGate module="tickets" action="create">
              <button
                type="button"
                className="erp-btn erp-btn-primary"
                onClick={() => setOpenBookingModal(true)}
              >
                <Plus size={16} /> Book Service Ticket
              </button>
            </PermissionGate>
          </div>
        }
      />

      {/* ── KPI Row ── */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Total Service Tickets"
            value={metrics.total}
            subtitle="All recorded tickets"
            icon={TicketIcon}
            variant="primary"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="In Progress (Active)"
            value={metrics.inProgress}
            subtitle="Engineers currently on-site"
            icon={Clock}
            variant="warning"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Completed Tickets"
            value={metrics.completed}
            subtitle="Resolved and hours logged"
            icon={CheckCircle2}
            variant="success"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Pending / Queued"
            value={metrics.pending}
            subtitle="Awaiting technician start"
            icon={AlertCircle}
            variant="danger"
          />
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="erp-card p-3 mb-4">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-5">
            <div className="erp-search-group">
              <span className="erp-search-icon">
                <Search size={16} />
              </span>
              <input
                type="text"
                className="erp-input erp-search-input"
                placeholder="Search ticket #, client, contact, mill name, issue..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="col-6 col-md-3">
            <select
              className="erp-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Ticket Statuses</option>
              <option value="PENDING">Pending / Open</option>
              <option value="IN_PROGRESS">In Progress (Active)</option>
              <option value="COMPLETED">Completed / Resolved</option>
            </select>
          </div>

          <div className="col-6 col-md-2">
            <select
              className="erp-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="ALL">All Ticket Types</option>
              {TICKET_TYPE_OPTIONS.filter((t) => t !== 'ALL').map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12 col-md-2 text-md-end text-muted small">
            <span>
              Showing {filteredTickets.length} of {tickets.length} tickets
            </span>
          </div>
        </div>
      </div>

      {/* ── Tickets Table ── */}
      {loading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : filteredTickets.length === 0 ? (
        <div className="erp-card p-4">
          <EmptyState
            icon={TicketIcon}
            title="No service tickets found"
            description="No tickets match your search parameters. Click 'Book Service Ticket' above to initiate a service dispatch."
            actionLabel="Reset Search & Filters"
            onAction={() => {
              setSearch('');
              setStatusFilter('ALL');
              setTypeFilter('ALL');
            }}
          />
        </div>
      ) : (
        <div className="erp-table-container">
          <div className="table-responsive">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Ticket # & Category</th>
                  <th>Client & Site Contact</th>
                  <th>Unit & Parameters</th>
                  <th>Fault Subject & Details</th>
                  <th>Working Duration</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((t) => {
                  const isRunning = t.status === 'In Progress' || t.status === 'IN_PROGRESS';
                  const isCompleted = t.status === 'Completed' || t.status === 'Resolved';
                  const isPending = !isRunning && !isCompleted;

                  return (
                    <tr key={t._id}>
                      {/* Ticket # & Category */}
                      <td>
                        <div
                          className="fw-bold font-monospace text-primary small"
                          style={{ cursor: 'pointer' }}
                          onClick={() => setDetailTicketTarget(t)}
                          title="Click to view complete ticket audit"
                        >
                          {t.ticketNo || `#TK-${t._id?.slice(-5).toUpperCase()}`}
                        </div>
                        <div className="mt-1">
                          <StatusBadge status={t.ticketType || 'Normal Ticket'} size="sm" />
                        </div>
                        <div
                          className="d-flex align-items-center gap-1 text-muted mt-1.5"
                          style={{ fontSize: '0.73rem' }}
                          title={`Booked by: ${t.createdBy?.name || t.createdByName || 'Authorized Staff'}`}
                        >
                          <User size={11} className="text-secondary flex-shrink-0" />
                          <span className="text-truncate" style={{ maxWidth: '140px' }}>
                            <span className="text-secondary fw-medium">By:</span> {t.createdBy?.name || t.createdByName || '—'}
                          </span>
                        </div>
                      </td>

                      {/* Client & Site */}
                      <td>
                        <div className="fw-semibold text-truncate" style={{ maxWidth: '200px', color: 'var(--erp-text-main)' }}>
                          {t.companyId?.company || t.companyName || 'Enterprise Client'}
                        </div>
                        <div className="text-muted small text-truncate" style={{ maxWidth: '200px' }}>
                          {t.contactPerson || 'Site Contact'}{' '}
                          {t.phoneNumber ? `(${t.phoneNumber})` : ''}
                        </div>
                      </td>

                      {/* Unit & Dynamic Specifications */}
                      <td>
                        <span className="erp-badge erp-badge-neutral mb-1" style={{ fontSize: '0.72rem' }}>
                          {t.unit || 'Plant'}
                        </span>
                        {/* Dynamic Parameters Badge */}
                        {(t.hp || t.rpm) && (
                          <div className="text-muted small" style={{ fontSize: '0.72rem' }}>
                            {t.hp ? `${t.hp} HP` : ''} {t.rpm ? `• ${t.rpm} RPM` : ''}
                          </div>
                        )}
                        {t.millName && (
                          <div className="text-muted small text-truncate" style={{ maxWidth: '160px', fontSize: '0.72rem' }}>
                            Mill: <strong>{t.millName}</strong>
                          </div>
                        )}
                      </td>

                      {/* Issue Subject */}
                      <td>
                        <div className="fw-medium text-truncate" style={{ maxWidth: '220px' }}>
                          {t.subject || '—'}
                        </div>
                        <small className="text-muted text-truncate d-block" style={{ maxWidth: '220px' }}>
                          {t.description || 'No description logged'}
                        </small>
                      </td>

                      {/* Working Duration (Start, Stop & Total) */}
                      <td>
                        <TicketWorkingDuration ticket={t} currentTime={currentTime} />
                      </td>

                      {/* Status */}
                      <td>
                        <StatusBadge status={t.status || 'Pending'} size="sm" />
                      </td>

                      {/* Actions */}
                      <td className="text-end">
                        <div className="d-inline-flex align-items-center gap-1.5">
                          {/* View Audit Details Button */}
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm p-1"
                            onClick={() => setDetailTicketTarget(t)}
                            title="View full ticket details & service photos"
                          >
                            <Eye size={14} />
                          </button>

                          <PermissionGate module="tickets" action="edit">
                            {/* Start Ticket Button (Only for Pending/Open) */}
                            {isPending && (
                              <button
                                type="button"
                                className="erp-btn erp-btn-success erp-btn-sm"
                                onClick={() => setStartTicketTarget(t)}
                                title="Start GPS service tracking"
                              >
                                <Play size={13} fill="currentColor" /> Start Ticket
                              </button>
                            )}

                            {/* Stop Ticket Button (Only for In Progress) */}
                            {isRunning && (
                              <button
                                type="button"
                                className="erp-btn erp-btn-danger erp-btn-sm"
                                onClick={() => setStopTicketTarget(t)}
                                title="Stop service & calculate working hours"
                              >
                                <Square size={13} fill="currentColor" /> Stop Ticket
                              </button>
                            )}

                            {/* Completed Status Checkmark */}
                            {isCompleted && (
                              <span
                                className="badge bg-success-subtle text-success border border-success d-inline-flex align-items-center gap-1 py-1 px-2"
                                style={{ fontSize: '0.72rem' }}
                              >
                                <CheckSquare size={12} /> Completed
                              </span>
                            )}
                          </PermissionGate>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Book Ticket Modal ── */}
      <TicketBookingModal
        show={openBookingModal}
        companies={companies}
        initialCompanyId={location.state?.selectedCompanyId}
        onClose={() => setOpenBookingModal(false)}
        onCreated={() => {
          fetchData();
        }}
      />

      {/* ── Start Ticket GPS Modal ── */}
      <StartTicketModal
        show={!!startTicketTarget}
        ticket={startTicketTarget}
        onClose={() => setStartTicketTarget(null)}
        onStarted={() => {
          fetchData();
        }}
      />

      {/* ── Stop Ticket GPS & Remarks Modal ── */}
      <StopTicketModal
        show={!!stopTicketTarget}
        ticket={stopTicketTarget}
        onClose={() => setStopTicketTarget(null)}
        onStopped={() => {
          fetchData();
        }}
      />

      {/* ── Ticket Detail Audit Modal ── */}
      <TicketDetailModal
        show={!!detailTicketTarget}
        ticket={detailTicketTarget}
        onClose={() => setDetailTicketTarget(null)}
        onRefresh={() => {
          fetchData();
          // Update selected target with fresh data
          if (detailTicketTarget) {
            erpApi.getTicketById(detailTicketTarget._id).then((res) => {
              const updated = res?.data?.data || res?.data;
              if (updated) setDetailTicketTarget(updated);
            });
          }
        }}
      />
    </div>
  );
};

export default TicketDashboard;
