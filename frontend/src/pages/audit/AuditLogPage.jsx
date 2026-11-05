import React, { useEffect, useState, useMemo } from 'react';
import {
  FileText,
  ShieldAlert,
  ShieldCheck,
  Search,
  Download,
  AlertTriangle,
  Layers,
  Terminal,
} from 'lucide-react';
import { auditApi } from '../../api/auditApi';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/Skeleton';
import Pagination from '../../components/common/Pagination';

const AuditLogPage = () => {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await auditApi.getAuditLogs({ page, limit: 15, search });
      setLogs(res.data.data.logs || []);
      setPagination(res.data.data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, search]);

  const metrics = useMemo(() => {
    const total = pagination.total || logs.length;
    const failures = logs.filter((l) => l.action?.includes('FAIL') || l.action?.includes('DENIED')).length;
    const logins = logs.filter((l) => l.action === 'LOGIN').length;
    const mods = new Set(logs.map((l) => l.module)).size;
    return { total, failures, logins, mods };
  }, [logs, pagination]);

  const handleExport = () => {
    window.print();
  };

  return (
    <div className="erp-fade-in pb-4">
      {/* ── Page Header ── */}
      <PageHeader
        title="Security Audit & Compliance Logs"
        subtitle="Immutable forensic audit trail tracking authentication events, security anomalies, and permission modifications"
        breadcrumbs={[{ label: 'Governance' }, { label: 'Audit Logs' }]}
        actions={
          <button
            type="button"
            className="erp-btn erp-btn-secondary"
            onClick={handleExport}
          >
            <Download size={15} /> Export Audit Trail
          </button>
        }
      />

      {/* ── KPI Row ── */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Total Security Records"
            value={metrics.total}
            subtitle="Immutable event entries"
            icon={FileText}
            variant="primary"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Authenticated Logins"
            value={metrics.logins}
            subtitle="Dual-token sessions granted"
            icon={ShieldCheck}
            variant="success"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Anomalies / Failures"
            value={metrics.failures}
            subtitle="Rejected access attempts"
            icon={AlertTriangle}
            variant="danger"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Active Modules Tracked"
            value={metrics.mods}
            subtitle="Audited subsystems"
            icon={Layers}
            variant="purple"
          />
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="erp-card p-3 mb-4">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-8">
            <div className="erp-search-group">
              <span className="erp-search-icon">
                <Search size={16} />
              </span>
              <input
                type="text"
                className="erp-input erp-search-input"
                placeholder="Search audit trail by user email, action name, IP address, or event description..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
          <div className="col-12 col-md-4 text-md-end text-muted small">
            <span>Showing {logs.length} of {pagination.total || logs.length} audit entries</span>
          </div>
        </div>
      </div>

      {/* ── Security Table ── */}
      {loading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : logs.length === 0 ? (
        <div className="erp-card p-4">
          <EmptyState
            icon={FileText}
            title="No audit entries found"
            description="No security audit events match your search query."
            actionLabel="Reset Search"
            onAction={() => setSearch('')}
          />
        </div>
      ) : (
        <div className="erp-table-container">
          <div className="table-responsive">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor / User</th>
                  <th>Action Event</th>
                  <th>Module</th>
                  <th>Event Description</th>
                  <th>Origin IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const isFail =
                    log.action?.includes('FAIL') ||
                    log.action?.includes('DENIED') ||
                    log.action?.includes('DELETED');
                  const isSuccess = log.action === 'LOGIN' || log.action?.includes('CREATE');

                  return (
                    <tr key={log._id}>
                      <td>
                        <span className="font-monospace small text-muted">
                          {new Date(log.createdAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </td>

                      <td>
                        <div className="fw-semibold small" style={{ color: 'var(--erp-text-main)' }}>
                          {log.userName || 'System Engine'}
                        </div>
                        <small className="text-muted d-block font-monospace" style={{ fontSize: '0.72rem' }}>
                          {log.userEmail || 'daemon@system'}
                        </small>
                      </td>

                      <td>
                        <span
                          className={`erp-badge ${
                            isFail
                              ? 'erp-badge-danger'
                              : isSuccess
                              ? 'erp-badge-success'
                              : 'erp-badge-info'
                          }`}
                          style={{ fontSize: '0.7rem' }}
                        >
                          {log.action}
                        </span>
                      </td>

                      <td>
                        <span className="erp-badge erp-badge-neutral font-monospace" style={{ fontSize: '0.675rem' }}>
                          {log.module || 'auth'}
                        </span>
                      </td>

                      <td>
                        <div className="small text-truncate" style={{ maxWidth: '380px' }}>
                          {log.description}
                        </div>
                      </td>

                      <td>
                        <div className="d-flex align-items-center gap-1 font-monospace text-muted small" style={{ fontSize: '0.75rem' }}>
                          <Terminal size={12} className="text-muted" />
                          <span>{log.ipAddress || '127.0.0.1'}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-3 border-top">
            <Pagination pagination={pagination} onPageChange={(p) => setPage(p)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogPage;
