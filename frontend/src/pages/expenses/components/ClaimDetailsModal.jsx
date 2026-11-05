import React from 'react';
import {
  FileText,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Receipt,
  Download,
  ExternalLink,
  CreditCard,
  Building,
  Check,
  X,
  ShieldAlert,
} from 'lucide-react';
import Modal from '../../../components/common/Modal';
import StatusBadge from '../../../components/common/StatusBadge';

const ClaimDetailsModal = ({
  show,
  claim,
  onClose,
  onSettle,
  canApprove,
}) => {
  if (!show || !claim) return null;

  const totalAmount = claim.totalClaimAmount || 0;
  const approvedAmount = claim.approvedAmount !== null && claim.approvedAmount !== undefined
    ? claim.approvedAmount
    : totalAmount;

  return (
    <Modal
      show={show}
      title={`Expense Claim Details — #${claim._id?.slice(-6).toUpperCase()}`}
      onClose={onClose}
      size="lg"
      icon={Receipt}
    >
      <div>
        {/* ── Top Header Strip ── */}
        <div className="d-flex flex-wrap align-items-center justify-content-between p-3 rounded-3 bg-light border mb-3">
          <div>
            <div className="d-flex align-items-center gap-2">
              <span className="font-monospace fw-bold text-primary fs-6">
                #{claim._id?.slice(-6).toUpperCase()}
              </span>
              <StatusBadge status={claim.status} size="sm" />
              <span
                className={`badge px-2 py-0.5 rounded-pill small ${
                  claim.settlementStatus === 'SETTLED_ADVANCE'
                    ? 'bg-success-subtle text-success border border-success-subtle'
                    : claim.settlementStatus === 'REIMBURSED'
                    ? 'bg-primary-subtle text-primary border border-primary-subtle'
                    : 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'
                }`}
              >
                {claim.settlementStatus === 'SETTLED_ADVANCE'
                  ? 'Adjusted Against Advance'
                  : claim.settlementStatus === 'REIMBURSED'
                  ? 'Reimbursed / Paid'
                  : 'Settlement Pending'}
              </span>
            </div>
            <div className="text-muted small mt-1">
              Logged on {new Date(claim.createdAt).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })} by <span className="fw-semibold text-dark">{claim.userId?.name || 'Staff Member'}</span> ({claim.userId?.employeeId || claim.userId?.email || '—'})
            </div>
          </div>

          <div className="text-end mt-2 mt-sm-0">
            <span className="text-muted small d-block">Claim Total</span>
            <div className="fs-4 fw-bold font-monospace text-dark">
              ₹{totalAmount.toLocaleString()}
            </div>
            {claim.status === 'Approved' && claim.approvedAmount && (
              <small className="text-success fw-semibold">
                Approved: ₹{claim.approvedAmount.toLocaleString()}
              </small>
            )}
          </div>
        </div>

        {/* ── Itemized Expenses Table ── */}
        <h6 className="fw-bold text-dark mb-2 d-flex align-items-center gap-1.5 fs-6">
          <FileText size={15} className="text-primary" /> Itemized Expense Entries ({claim.items?.length || 0})
        </h6>

        <div className="table-responsive border rounded-3 mb-3">
          <table className="erp-table mb-0 table-sm">
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th className="text-end">Amount</th>
                <th>Receipts</th>
              </tr>
            </thead>
            <tbody>
              {claim.items?.map((item, idx) => {
                const rawUrls = [];
                if (Array.isArray(item.receiptUrls)) rawUrls.push(...item.receiptUrls);
                if (item.receiptUrl && !rawUrls.includes(item.receiptUrl)) rawUrls.push(item.receiptUrl);
                const itemReceipts = Array.from(new Set(rawUrls.filter(Boolean)));

                return (
                  <tr key={idx}>
                    <td className="text-muted small">{idx + 1}</td>
                    <td className="small text-nowrap">
                      {new Date(item.date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td>
                      <span className="badge bg-secondary-subtle text-secondary small">
                        {item.category}
                      </span>
                    </td>
                    <td className="small" style={{ maxWidth: '240px' }}>
                      {item.description || '—'}
                    </td>
                    <td className="text-end font-monospace fw-semibold text-dark">
                      ₹{Number(item.amount || 0).toLocaleString()}
                    </td>
                    <td>
                      {itemReceipts.length > 0 ? (
                        <div className="d-flex align-items-center gap-1.5 flex-wrap">
                          {itemReceipts.map((url, rIdx) => (
                            <a
                              key={rIdx}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="erp-btn erp-btn-secondary erp-btn-sm p-1 px-2 d-inline-flex align-items-center gap-1 text-decoration-none"
                              title={`Open Receipt #${rIdx + 1} in new tab`}
                            >
                              <ExternalLink size={11} />
                              <span style={{ fontSize: '11px', fontWeight: 600 }}>
                                {itemReceipts.length > 1 ? `Bill #${rIdx + 1}` : 'View Bill'}
                              </span>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted small">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Rejection Reason Banner (if Rejected) ── */}
        {claim.status === 'Rejected' && (
          <div className="alert alert-danger p-3 mb-3 d-flex align-items-start gap-2">
            <XCircle size={18} className="text-danger flex-shrink-0 mt-0.5" />
            <div>
              <div className="fw-bold">Claim Rejected</div>
              <div className="small mt-0.5">
                {claim.rejectionReason || 'No specific remarks entered.'}
              </div>
              <small className="text-muted d-block mt-1">
                Rejected by {claim.approvedBy?.name || 'Reviewer'}
              </small>
            </div>
          </div>
        )}

        {/* ── Settlement & Approval Information ── */}
        <div className="row g-2 mb-3">
          {/* Approval Details */}
          <div className="col-12 col-md-6">
            <div className="p-3 rounded-3 border bg-white h-100">
              <span className="text-muted small fw-semibold text-uppercase d-block mb-1">
                Approval Status
              </span>
              <div className="d-flex align-items-center gap-2">
                {claim.status === 'Approved' ? (
                  <CheckCircle2 size={16} className="text-success" />
                ) : claim.status === 'Rejected' ? (
                  <XCircle size={16} className="text-danger" />
                ) : (
                  <Clock size={16} className="text-warning" />
                )}
                <span className="fw-bold text-dark">{claim.status}</span>
              </div>
              {claim.approvedBy && (
                <small className="text-muted d-block mt-1">
                  Reviewed by: <span className="text-dark fw-medium">{claim.approvedBy.name}</span>
                </small>
              )}
              {claim.approvedAt && (
                <small className="text-muted d-block">
                  Timestamp: {new Date(claim.approvedAt).toLocaleString('en-IN')}
                </small>
              )}
            </div>
          </div>

          {/* Settlement Details */}
          <div className="col-12 col-md-6">
            <div className="p-3 rounded-3 border bg-white h-100">
              <span className="text-muted small fw-semibold text-uppercase d-block mb-1">
                Financial Settlement
              </span>
              <div className="fw-bold text-dark">
                {claim.settlementStatus === 'SETTLED_ADVANCE'
                  ? 'Adjusted Against Advance'
                  : claim.settlementStatus === 'REIMBURSED'
                  ? 'Reimbursed / Paid'
                  : 'Unsettled'}
              </div>
              {claim.settlementDetails?.paymentMethod && (
                <small className="text-muted d-block mt-1">
                  Method: {claim.settlementDetails.paymentMethod}{' '}
                  {claim.settlementDetails.transactionReference && `(Ref: ${claim.settlementDetails.transactionReference})`}
                </small>
              )}
              {claim.settlementDetails?.settledAt && (
                <small className="text-muted d-block">
                  Settled on: {new Date(claim.settlementDetails.settledAt).toLocaleDateString('en-IN')}
                </small>
              )}
              {claim.settlementDetails?.settledBy && (
                <small className="text-muted d-block">
                  Processed by: {claim.settlementDetails.settledBy?.name || 'Finance'}
                </small>
              )}
            </div>
          </div>
        </div>

        {/* ── Timeline Audit History ── */}
        {claim.history && claim.history.length > 0 && (
          <div className="p-3 rounded-3 bg-light border mb-3">
            <span className="text-muted small fw-semibold text-uppercase d-block mb-2">
              Claim Audit Trail
            </span>
            <div className="d-flex flex-column gap-1.5">
              {claim.history.map((hist, hIdx) => (
                <div key={hIdx} className="d-flex align-items-center justify-content-between small">
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-secondary text-white rounded-pill" style={{ fontSize: '9px' }}>
                      {hist.action}
                    </span>
                    <span className="text-dark fw-medium">
                      {hist.notes || hist.action}
                    </span>
                  </div>
                  <span className="text-muted font-monospace" style={{ fontSize: '11px' }}>
                    {new Date(hist.timestamp).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Bottom Action Footer ── */}
        <div className="d-flex justify-content-end gap-2 pt-2 border-top">
          <button type="button" className="erp-btn erp-btn-secondary" onClick={onClose}>
            Close
          </button>

          {canApprove && claim.status === 'Approved' && claim.settlementStatus === 'UNSETTLED' && onSettle && (
            <button
              type="button"
              className="erp-btn erp-btn-primary d-inline-flex align-items-center gap-1.5"
              onClick={() => onSettle(claim)}
            >
              <CreditCard size={15} />
              <span>Settle Claim</span>
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ClaimDetailsModal;
