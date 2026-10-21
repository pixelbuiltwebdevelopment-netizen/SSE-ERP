import React, { useState, useEffect } from 'react';
import { expenseApi } from '../../api/expenseApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';
import { useSocket } from '../../components/providers/SocketProvider';

const ExpenseApprovalPage = () => {
  const socket = useSocket();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [statusFilter, setStatusFilter] = useState('Pending');

  // Modals
  const [rejectModal, setRejectModal] = useState({ show: false, claimId: '', reason: '' });
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchClaims();
  }, [page, statusFilter]);

  useEffect(() => {
    if (!socket) return;

    const handleExpenseUpdated = (updatedClaim) => {
      setClaims((prevClaims) => {
        if (!statusFilter || updatedClaim.status === statusFilter) {
          const index = prevClaims.findIndex((c) => c._id === updatedClaim._id);
          if (index > -1) {
            const newClaims = [...prevClaims];
            newClaims[index] = updatedClaim;
            return newClaims;
          } else {
            return [updatedClaim, ...prevClaims];
          }
        } else {
          return prevClaims.filter((c) => c._id !== updatedClaim._id);
        }
      });
    };

    socket.on('expense_updated', handleExpenseUpdated);

    return () => {
      socket.off('expense_updated', handleExpenseUpdated);
    };
  }, [socket, statusFilter]);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const res = await expenseApi.getClaims({ page, limit: 15, status: statusFilter });
      if (res.data.success) {
        setClaims(res.data.data.records);
        setPagination({
          page: res.data.data.pagination.page,
          totalPages: res.data.data.pagination.pages,
          total: res.data.data.pagination.total
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm("Approve this claim? The amount will be deducted from the user's advance balance.")) return;
    setProcessingId(id);
    try {
      await expenseApi.approveClaim(id);
      fetchClaims();
    } catch (err) {
      alert(err.response?.data?.message || 'Approval failed');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    setProcessingId(rejectModal.claimId);
    try {
      await expenseApi.rejectClaim(rejectModal.claimId, rejectModal.reason);
      setRejectModal({ show: false, claimId: '', reason: '' });
      fetchClaims();
    } catch (err) {
      alert(err.response?.data?.message || 'Rejection failed');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    /* ERP Page Wrapper: Responsive padding (px-3 px-md-4 py-3 py-md-4) */
    <div className="container-fluid px-3 px-md-4 py-3 py-md-4 bg-light min-vh-100">
      {/* Page Header: Stacks on mobile, aligns horizontally on tablet/desktop */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4 pb-3 border-bottom bg-white p-3 p-md-4 rounded-3 shadow-sm">
        <div>
          <h4 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
            <span>✅</span> Expense Approvals
          </h4>
          <p className="text-muted small mb-0">
            Review, verify, and settle team expense claims in real time.
          </p>
        </div>

        {/* Filter Dropdown: Full-width on mobile, auto-width on desktop */}
        <div className="d-flex align-items-center gap-2 w-100 w-sm-auto">
          <label htmlFor="statusFilter" className="small fw-semibold text-muted text-nowrap d-none d-md-inline">
            Status:
          </label>
          <select
            id="statusFilter"
            className="form-select form-select-sm fw-semibold shadow-none border-secondary-subtle w-100 w-sm-auto"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending Approvals</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="card border-0 shadow-sm rounded-3 overflow-hidden">
        <div className="card-body p-0">
          {loading ? (
            <div className="py-5 text-center">
              <LoadingSpinner text="Loading claims..." />
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 text-nowrap">
                <thead className="table-light border-bottom">
                  <tr className="text-uppercase fs-7 text-secondary fw-semibold">
                    <th scope="col" className="ps-3 ps-md-4 py-3">Claim ID</th>
                    <th scope="col" className="py-3">Employee</th>
                    <th scope="col" className="py-3">Submitted Date</th>
                    <th scope="col" className="py-3 text-center">Items</th>
                    <th scope="col" className="py-3">Total Amount</th>
                    <th scope="col" className="py-3">Status</th>
                    <th scope="col" className="pe-3 pe-md-4 py-3 text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-5 text-muted">
                        <div className="d-flex flex-column align-items-center justify-content-center">
                          <span className="fs-1 mb-2">📄</span>
                          <span className="fw-semibold">No claims found</span>
                          <small className="text-muted">There are no records matching your selected filter.</small>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    claims.map((claim) => (
                      <tr key={claim._id} className="transition-all">
                        {/* Claim ID */}
                        <td className="ps-3 ps-md-4 py-3">
                          <span className="font-monospace fw-semibold text-primary bg-primary-subtle px-2 py-1 rounded small">
                            #{claim._id.slice(-6).toUpperCase()}
                          </span>
                        </td>

                        {/* Employee Details */}
                        <td className="py-3">
                          <div className="fw-bold text-dark text-truncate" style={{ maxWidth: '180px' }}>
                            {claim.userId?.name || 'Unknown'}
                          </div>
                          <div className="small text-muted text-truncate" style={{ maxWidth: '180px' }}>
                            {claim.userId?.email || 'N/A'}
                          </div>
                        </td>

                        {/* Submitted Date */}
                        <td className="py-3 text-muted small">
                          {new Date(claim.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>

                        {/* Items Badge */}
                        <td className="py-3 text-center">
                          <span className="badge bg-light text-dark border px-2 py-1 rounded-pill fw-medium">
                            {claim.items.length} {claim.items.length === 1 ? 'item' : 'items'}
                          </span>
                        </td>

                        {/* Total Amount */}
                        <td className="py-3 fw-bold text-dark">
                          ₹{claim.totalClaimAmount?.toLocaleString() || 0}
                        </td>

                        {/* Status */}
                        <td className="py-3">
                          <span
                            className={`badge px-2 py-1 rounded-pill ${
                              claim.status === 'Approved'
                                ? 'bg-success-subtle text-success border border-success-subtle'
                                : claim.status === 'Rejected'
                                ? 'bg-danger-subtle text-danger border border-danger-subtle'
                                : 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'
                            }`}
                          >
                            ● {claim.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="pe-3 pe-md-4 py-3 text-end">
                          {claim.status === 'Pending' ? (
                            <div className="d-inline-flex gap-2">
                              <button
                                type="button"
                                className="btn btn-sm btn-success px-3 fw-semibold shadow-sm"
                                onClick={() => handleApprove(claim._id)}
                                disabled={processingId === claim._id}
                              >
                                {processingId === claim._id ? 'Processing...' : 'Approve'}
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger px-3 fw-semibold"
                                onClick={() => setRejectModal({ show: true, claimId: claim._id, reason: '' })}
                                disabled={processingId === claim._id}
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted small fst-italic">
                              By {claim.approvedBy?.name || 'Admin'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer with responsive spacing */}
        <div className="card-footer bg-white border-top px-3 px-md-4 py-3 d-flex justify-content-center justify-content-md-end">
          <Pagination pagination={pagination} onPageChange={setPage} />
        </div>
      </div>

      {/* Reject Modal */}
      <Modal
        show={rejectModal.show}
        title="Reject Expense Claim"
        onClose={() => setRejectModal({ show: false, claimId: '', reason: '' })}
      >
        <form onSubmit={handleReject} className="p-1">
          <div className="mb-3">
            <label className="form-label fw-semibold text-dark small">Reason for Rejection</label>
            <textarea
              className="form-control shadow-none"
              rows="3"
              value={rejectModal.reason}
              onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
              required
              placeholder="Provide a clear explanation for the employee..."
            ></textarea>
          </div>
          <div className="d-flex justify-content-end gap-2 pt-2 border-top">
            <button
              type="button"
              className="btn btn-light px-3 fw-semibold border"
              onClick={() => setRejectModal({ show: false, claimId: '', reason: '' })}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-danger px-3 fw-semibold shadow-sm"
              disabled={processingId === rejectModal.claimId}
            >
              Confirm Rejection
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ExpenseApprovalPage;