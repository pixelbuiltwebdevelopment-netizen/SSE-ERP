import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Wallet,
  Building,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import Modal from '../../../components/common/Modal';
import { expenseApi } from '../../../api/expenseApi';

const ClaimSettlementModal = ({ show, claim, onClose, onSuccess }) => {
  const [settlementType, setSettlementType] = useState('ADVANCE_ADJUSTMENT');
  const [settledAmount, setSettledAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [transactionReference, setTransactionReference] = useState('');
  const [notes, setNotes] = useState('');
  const [employeeBalance, setEmployeeBalance] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!show || !claim) return;

    const initialAmount = claim.approvedAmount || claim.totalClaimAmount || 0;
    setSettledAmount(initialAmount.toString());
    setSettlementType('ADVANCE_ADJUSTMENT');
    setPaymentMethod('Bank Transfer');
    setTransactionReference('');
    setNotes('');
    setError('');

    // Fetch employee's current advance balance to show live balance context
    if (claim.userId?._id) {
      fetchEmployeeBalance(claim.userId._id);
    }
  }, [show, claim]);

  const fetchEmployeeBalance = async (userId) => {
    setLoadingBalance(true);
    try {
      const res = await expenseApi.getEmployeeStatement(userId);
      if (res.data?.success) {
        setEmployeeBalance(res.data.data.summary?.totalOutstandingAdvanceBalance ?? 0);
      }
    } catch (err) {
      console.warn('Could not load advance balance preview:', err);
    } finally {
      setLoadingBalance(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const numAmount = Number(settledAmount);
    if (!numAmount || numAmount <= 0) {
      setError('Settlement amount must be greater than zero.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        settlementType,
        settledAmount: numAmount,
        paymentMethod: settlementType === 'ADVANCE_ADJUSTMENT' ? 'Corporate Advance' : paymentMethod,
        transactionReference: transactionReference.trim(),
        notes: notes.trim(),
      };

      const res = await expenseApi.settleClaim(claim._id, payload);
      if (res.data?.success || res.status === 200) {
        onSuccess();
        onClose();
      } else {
        setError(res.data?.message || 'Settlement failed. Please check inputs.');
      }
    } catch (err) {
      console.error('Settlement Error:', err);
      setError(err.response?.data?.message || 'Failed to settle expense claim.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!show || !claim) return null;

  const currentAdvBalance = employeeBalance ?? 0;
  const numSettled = Number(settledAmount) || 0;
  const projectedBalance = currentAdvBalance - numSettled;

  return (
    <Modal
      show={show}
      title={`Financial Settlement — Claim #${claim._id?.slice(-6).toUpperCase()}`}
      onClose={onClose}
      size="md"
      icon={CreditCard}
    >
      <form onSubmit={handleSubmit}>
        {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}

        {/* Claim Info Header */}
        <div className="p-3 rounded-3 bg-light border mb-3">
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <small className="text-muted text-uppercase fw-semibold">Employee</small>
              <div className="fw-bold text-dark">{claim.userId?.name}</div>
              <small className="text-muted">{claim.userId?.email}</small>
            </div>
            <div className="text-end">
              <small className="text-muted text-uppercase fw-semibold">Approved Amount</small>
              <div className="fs-5 fw-bold font-monospace text-primary">
                ₹{(claim.approvedAmount || claim.totalClaimAmount || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Settlement Type Selector */}
        <div className="mb-3">
          <label className="erp-label mb-2">Select Settlement Method *</label>
          <div className="row g-2">
            <div className="col-6">
              <div
                className={`p-3 rounded-3 border cursor-pointer transition-all ${
                  settlementType === 'ADVANCE_ADJUSTMENT'
                    ? 'border-primary bg-primary-subtle shadow-sm'
                    : 'bg-white hover-bg-light'
                }`}
                onClick={() => setSettlementType('ADVANCE_ADJUSTMENT')}
                style={{ cursor: 'pointer' }}
              >
                <div className="d-flex align-items-center gap-2 mb-1">
                  <Wallet size={16} className={settlementType === 'ADVANCE_ADJUSTMENT' ? 'text-primary' : 'text-muted'} />
                  <span className="fw-bold small">Adjust Advance</span>
                </div>
                <small className="text-muted d-block" style={{ fontSize: '11px' }}>
                  Deduct from employee's available corporate advance
                </small>
              </div>
            </div>

            <div className="col-6">
              <div
                className={`p-3 rounded-3 border cursor-pointer transition-all ${
                  settlementType === 'REIMBURSEMENT'
                    ? 'border-primary bg-primary-subtle shadow-sm'
                    : 'bg-white hover-bg-light'
                }`}
                onClick={() => setSettlementType('REIMBURSEMENT')}
                style={{ cursor: 'pointer' }}
              >
                <div className="d-flex align-items-center gap-2 mb-1">
                  <CreditCard size={16} className={settlementType === 'REIMBURSEMENT' ? 'text-primary' : 'text-muted'} />
                  <span className="fw-bold small">Reimburse / Pay</span>
                </div>
                <small className="text-muted d-block" style={{ fontSize: '11px' }}>
                  Pay out from company funds (does not reduce advance)
                </small>
              </div>
            </div>
          </div>
        </div>

        {/* Advance Balance Preview (Option 1) */}
        {settlementType === 'ADVANCE_ADJUSTMENT' && (
          <div className="p-3 rounded-3 border bg-white mb-3">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small">Current Available Advance:</span>
              <span className="fw-bold font-monospace text-dark">
                {loadingBalance ? 'Checking...' : `₹${currentAdvBalance.toLocaleString()}`}
              </span>
            </div>

            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small">Amount to Deduct:</span>
              <span className="fw-bold font-monospace text-danger">
                -₹{numSettled.toLocaleString()}
              </span>
            </div>

            <div className="d-flex align-items-center justify-content-between pt-2 border-top">
              <span className="fw-semibold small">Projected Balance:</span>
              <span
                className={`fw-bold font-monospace fs-6 ${
                  projectedBalance >= 0 ? 'text-success' : 'text-danger'
                }`}
              >
                ₹{projectedBalance.toLocaleString()}
              </span>
            </div>

            {projectedBalance < 0 && (
              <div className="alert alert-warning py-1.5 px-2.5 mt-2 mb-0 small d-flex align-items-center gap-1.5">
                <AlertCircle size={14} className="flex-shrink-0 text-warning" />
                <span>
                  Notice: Deducting this will result in a negative advance balance requiring future recovery or advance issuance.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Settlement Amount */}
        <div className="mb-3">
          <label className="erp-label">Settlement Amount (₹) *</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            className="erp-input font-monospace fw-bold fs-6"
            value={settledAmount}
            onChange={(e) => setSettledAmount(e.target.value)}
            required
          />
        </div>

        {/* Reimbursement Payment Details (Option 2) */}
        {settlementType === 'REIMBURSEMENT' && (
          <div className="p-3 rounded-3 border bg-light mb-3">
            <h6 className="fw-bold small text-dark mb-2">Payment Details</h6>
            <div className="row g-2">
              <div className="col-12 col-md-6">
                <label className="erp-label small">Payment Method *</label>
                <select
                  className="erp-select"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  required
                >
                  <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                  <option value="UPI">UPI Payment</option>
                  <option value="Cheque">Company Cheque</option>
                  <option value="Cash">Cash in Hand</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="col-12 col-md-6">
                <label className="erp-label small">Transaction Reference / UTR</label>
                <input
                  type="text"
                  className="erp-input font-monospace"
                  placeholder="e.g. UTR9283109283"
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="mb-3">
          <label className="erp-label">Settlement Remarks / Notes (Optional)</label>
          <input
            type="text"
            className="erp-input"
            placeholder="e.g. Settled against Q3 travel ledger..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="d-flex justify-content-end gap-2 pt-3 border-top">
          <button type="button" className="erp-btn erp-btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="erp-btn erp-btn-primary fw-bold" disabled={submitting}>
            {submitting ? 'Processing...' : 'Confirm Settlement'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ClaimSettlementModal;
