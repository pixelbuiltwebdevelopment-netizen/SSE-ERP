import React, { useState, useRef, useMemo } from 'react';
import {
  Plus,
  Wallet,
  UploadCloud,
  FileText,
  Image,
  X,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Search,
} from 'lucide-react';
import Modal from '../../../components/common/Modal';
import { expenseApi } from '../../../api/expenseApi';

const IssueAdvanceModal = ({ show, onClose, users = [], onSuccess }) => {
  const fileInputRef = useRef(null);

  const [searchEmployee, setSearchEmployee] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [purpose, setPurpose] = useState('Travel & Transport');
  const [otherPurpose, setOtherPurpose] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [transactionReference, setTransactionReference] = useState('');
  const [notes, setNotes] = useState('');

  // Attachments state: [{ url, name, size, type }]
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Filtered employees for dropdown
  const filteredUsers = useMemo(() => {
    if (!searchEmployee.trim()) return users;
    const q = searchEmployee.toLowerCase();
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.employeeId?.toLowerCase().includes(q)
    );
  }, [users, searchEmployee]);

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);

    // Validate size (5MB per file)
    for (const file of fileList) {
      if (file.size > 5 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds the 5MB limit. Please upload files under 5MB.`);
        return;
      }
    }

    setUploading(true);
    try {
      const uploadedList = [];

      for (const file of fileList) {
        const formData = new FormData();
        formData.append('receipt', file);

        const res = await expenseApi.uploadReceipt(formData);
        const url = res.data?.data?.url || res.data?.url;
        if (url) {
          uploadedList.push({
            url,
            name: file.name,
            size: file.size,
            type: file.type,
          });
        }
      }

      setAttachments((prev) => [...prev, ...uploadedList]);
    } catch (err) {
      console.error('Attachment upload failed:', err);
      alert(err.response?.data?.message || 'Failed to upload one or more attachments.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedUserId) {
      setError('Please select an employee.');
      return;
    }

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Advance amount must be greater than zero.');
      return;
    }

    if (uploading) {
      alert('Please wait for document uploads to finish.');
      return;
    }

    setSubmitting(true);
    try {
      const finalPurpose = purpose === 'Other' && otherPurpose.trim() ? otherPurpose.trim() : purpose;

      const payload = {
        userId: selectedUserId,
        amount: numAmount,
        issueDate,
        purpose: finalPurpose,
        paymentMethod,
        transactionReference: transactionReference.trim(),
        notes: notes.trim(),
        attachments,
      };

      const res = await expenseApi.issueAdvance(payload);
      if (res.data?.success || res.status === 200) {
        // Reset form
        setSelectedUserId('');
        setAmount('');
        setNotes('');
        setTransactionReference('');
        setAttachments([]);
        setSearchEmployee('');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setError(res.data?.message || 'Failed to issue advance.');
      }
    } catch (err) {
      console.error('Issue Advance Error:', err);
      setError(err.response?.data?.message || 'Failed to issue advance to employee.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!show) return null;

  return (
    <Modal
      show={show}
      title="Issue Corporate Advance"
      onClose={onClose}
      size="lg"
      icon={Wallet}
    >
      <form onSubmit={handleSubmit}>
        {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}

        <div className="row g-3 mb-3">
          {/* ── Employee Selection (Searchable) ── */}
          <div className="col-12 col-md-6">
            <label className="erp-label">Select Employee *</label>
            <div className="mb-1">
              <input
                type="text"
                className="erp-input erp-search-input mb-1"
                placeholder="Search by name, ID, or email..."
                value={searchEmployee}
                onChange={(e) => setSearchEmployee(e.target.value)}
              />
            </div>
            <select
              className="erp-select"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              required
            >
              <option value="">-- Choose an employee ({filteredUsers.length} available) --</option>
              {filteredUsers.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} ({u.employeeId || 'No ID'} • {u.email})
                </option>
              ))}
            </select>
          </div>

          {/* ── Advance Amount ── */}
          <div className="col-12 col-md-6">
            <label className="erp-label">Advance Amount (₹) *</label>
            <input
              type="number"
              min="1"
              step="0.01"
              className="erp-input font-monospace fw-bold fs-5 text-primary"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          {/* ── Issue Date ── */}
          <div className="col-12 col-md-6">
            <label className="erp-label">Issue Date *</label>
            <input
              type="date"
              className="erp-input"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              required
            />
          </div>

          {/* ── Purpose / Reason ── */}
          <div className="col-12 col-md-6">
            <label className="erp-label">Purpose / Category *</label>
            <select
              className="erp-select"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              required
            >
              <option value="Travel & Transport">✈️ Travel & Transport</option>
              <option value="Site Operations">🏗️ Site Operations</option>
              <option value="Material Purchase">📦 Material Purchase</option>
              <option value="Client Meeting / Entertainment">🤝 Client Meeting & Entertainment</option>
              <option value="Project Advance">💼 Project Advance</option>
              <option value="Emergency Advance">🚨 Emergency Advance</option>
              <option value="Other">📝 Other Purpose</option>
            </select>
            {purpose === 'Other' && (
              <input
                type="text"
                className="erp-input mt-1.5"
                placeholder="Specify purpose..."
                value={otherPurpose}
                onChange={(e) => setOtherPurpose(e.target.value)}
                required
              />
            )}
          </div>

          {/* ── Payment Method ── */}
          <div className="col-12 col-md-6">
            <label className="erp-label">Payment Method *</label>
            <select
              className="erp-select"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              required
            >
              <option value="Bank Transfer">Bank Transfer (NEFT / RTGS / IMPS)</option>
              <option value="UPI">UPI Transfer</option>
              <option value="Cheque">Company Cheque</option>
              <option value="Cash">Cash in Hand</option>
              <option value="Corporate Card">Corporate Card</option>
              <option value="Other">Other Method</option>
            </select>
          </div>

          {/* ── Transaction Reference Number ── */}
          <div className="col-12 col-md-6">
            <label className="erp-label">Transaction Reference No. (Optional)</label>
            <input
              type="text"
              className="erp-input font-monospace"
              placeholder="e.g. UTR-982189421, Cheque #00491"
              value={transactionReference}
              onChange={(e) => setTransactionReference(e.target.value)}
            />
          </div>

          {/* ── Additional Notes ── */}
          <div className="col-12">
            <label className="erp-label">Additional Notes / Remarks (Optional)</label>
            <textarea
              className="erp-textarea"
              rows={2}
              placeholder="Provide context or authorization details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* ── Upload Supporting Documents (Phase 4) ── */}
          <div className="col-12">
            <label className="erp-label d-flex align-items-center justify-content-between">
              <span>Supporting Documents (Bank Screenshot, Payment Voucher, Slip)</span>
              <span className="text-muted small">JPG, PNG, PDF (Up to 5MB each)</span>
            </label>

            {/* Clickable Dropzone */}
            <div
              className="p-3 text-center rounded-3 border border-2 border-dashed bg-light cursor-pointer"
              style={{ borderColor: 'var(--erp-border, #E2E8F0)', cursor: 'pointer' }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.pdf"
                className="d-none"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
              <UploadCloud size={24} className="text-primary mb-1" />
              <div className="fw-semibold small text-dark">
                {uploading ? 'Uploading documents to Cloudinary...' : 'Click to select or drag & drop payment documents'}
              </div>
              <small className="text-muted">
                Bank transfer acknowledgement, payment voucher, or cash receipt
              </small>
            </div>

            {/* Attachments Preview Grid */}
            {attachments.length > 0 && (
              <div className="row g-2 mt-2">
                {attachments.map((att, aIdx) => {
                  const isPdf = /\.pdf($|\?)/i.test(att.url);
                  const displaySize = att.size ? `${(att.size / 1024).toFixed(0)} KB` : '';

                  return (
                    <div key={aIdx} className="col-12 col-sm-6">
                      <div className="p-2 rounded-2 border bg-white d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-2 overflow-hidden">
                          {isPdf ? (
                            <FileText size={20} className="text-danger flex-shrink-0" />
                          ) : (
                            <img
                              src={att.url}
                              alt="Attachment"
                              className="rounded flex-shrink-0 border"
                              style={{ width: 32, height: 32, objectFit: 'cover' }}
                            />
                          )}
                          <div className="text-truncate">
                            <div className="small fw-semibold text-truncate" title={att.name}>
                              {att.name || `Attachment #${aIdx + 1}`}
                            </div>
                            {displaySize && (
                              <small className="text-muted font-monospace">{displaySize}</small>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          className="erp-btn erp-btn-danger-outline erp-btn-sm p-1"
                          onClick={() => handleRemoveAttachment(aIdx)}
                          title="Remove attachment"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Bottom Submit Actions ── */}
        <div className="d-flex justify-content-end gap-2 pt-3 border-top">
          <button type="button" className="erp-btn erp-btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="submit"
            className="erp-btn erp-btn-primary fw-bold d-inline-flex align-items-center gap-1.5"
            disabled={submitting || uploading || !selectedUserId || !amount}
          >
            <Plus size={15} />
            <span>{submitting ? 'Issuing Advance...' : 'Confirm & Issue Advance'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default IssueAdvanceModal;
