import React, { useEffect, useState } from 'react';
import { auditApi } from '../../api/auditApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
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
      setLogs(res.data.data.logs);
      setPagination(res.data.data.pagination);
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, search]);

  return (
    <div className="container-fluid py-2">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold text-dark mb-1">System Audit & Governance Logs</h3>
          <p className="text-muted mb-0">Immutable record of security events, authentication logs, and data mutations</p>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-3">
          <input
            type="text"
            className="form-control"
            placeholder="Search by user email, action name, or event description..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {loading ? (
            <LoadingSpinner text="Loading security audit logs..." />
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-dark">
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Module</th>
                    <th>Description</th>
                    <th>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id}>
                      <td className="small text-muted" style={{ width: '170px' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td>
                        <div className="fw-semibold text-dark">{log.userName}</div>
                        <small className="text-muted">{log.userEmail || 'System'}</small>
                      </td>
                      <td>
                        <span className={`badge ${
                          log.action.includes('FAILED') || log.action.includes('DELETED')
                            ? 'bg-danger'
                            : log.action.includes('LOGIN')
                            ? 'bg-success'
                            : 'bg-primary'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border font-monospace">{log.module}</span>
                      </td>
                      <td className="small">{log.description}</td>
                      <td className="font-monospace small text-muted">{log.ipAddress || '127.0.0.1'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="card-footer bg-white">
          <Pagination pagination={pagination} onPageChange={(p) => setPage(p)} />
        </div>
      </div>
    </div>
  );
};

export default AuditLogPage;
