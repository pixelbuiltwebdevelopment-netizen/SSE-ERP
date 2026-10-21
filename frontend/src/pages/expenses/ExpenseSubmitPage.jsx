import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { expenseApi } from '../../api/expenseApi';

// Official ERP Design System Palette
const ERP_COLORS = {
  primary: '#087FF5',       // Electric Blue
  sidebar: '#071A33',       // Deep Navy
  secondaryBlue: '#0057B8', // Royal Blue
  blueHover: '#1D4ED8',     // Blue Hover
  silver: '#C5CED8',        // Metallic Silver
  mainBg: '#F4F7FB',        // Ice White
  cardBg: '#FFFFFF',        // Pure White
  textPrimary: '#1E293B',   // Slate
  textSecondary: '#64748B', // Gray
  border: '#E2E8F0',        // Light Gray
  success: '#16A34A',       // Green
  warning: '#D97706',       // Amber
  error: '#DC2626',         // Red
};

const ExpenseSubmitPage = () => {
  const navigate = useNavigate();
  const fileInputRefs = useRef({});

  // Retrieve current user / employee ID from localStorage or auth state
  const getCurrentUser = () => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse user session:', e);
    }
    return null;
  };
  const currentUser = getCurrentUser();
  const employeeIdentifier = currentUser?.employeeId || currentUser?.empId || currentUser?._id?.slice(-6) || 'EMP';

  const [items, setItems] = useState([
    {
      date: new Date().toISOString().split('T')[0],
      category: '',
      otherCategory: '',
      amount: '',
      description: '',
      receiptUrls: [], // Supports multiple uploaded images/PDFs
      uploading: false,
    },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitBtnHover, setSubmitBtnHover] = useState(false);
  const [addBtnHover, setAddBtnHover] = useState(false);

  // Add a new expense entry item
  const handleAddItem = () => {
    setItems([
      ...items,
      {
        date: new Date().toISOString().split('T')[0],
        category: '',
        otherCategory: '',
        amount: '',
        description: '',
        receiptUrls: [],
        uploading: false,
      },
    ]);
  };

  // Remove an expense entry item
  const handleRemoveItem = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  // Update item field value
  const handleChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  // Remove single receipt from gallery
  const handleRemoveReceipt = (itemIndex, receiptIndex, e) => {
    if (e) e.stopPropagation();
    const updated = [...items];
    updated[itemIndex].receiptUrls = updated[itemIndex].receiptUrls.filter((_, rIdx) => rIdx !== receiptIndex);
    setItems(updated);
  };

  // File Upload handling
  const handleFileUpload = async (index, files) => {
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);

    // Validate size (5MB per file)
    for (const file of fileList) {
      if (file.size > 5 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds the 5MB limit. Please upload files under 5MB.`);
        return;
      }
    }

    const updated = [...items];
    updated[index].uploading = true;
    setItems([...updated]);

    try {
      const uploadedUrls = [];

      for (const file of fileList) {
        const formData = new FormData();
        formData.append('receipt', file);

        const res = await expenseApi.uploadReceipt(formData);
        if (res.data?.success && res.data?.data?.url) {
          uploadedUrls.push(res.data.data.url);
        } else if (res.data?.url) {
          uploadedUrls.push(res.data.url);
        }
      }

      if (uploadedUrls.length > 0) {
        updated[index].receiptUrls = [...updated[index].receiptUrls, ...uploadedUrls];
      }
    } catch (err) {
      console.error('Receipt Upload Error:', err);
      alert(err.response?.data?.message || 'One or more receipts failed to upload.');
    } finally {
      updated[index].uploading = false;
      setItems([...updated]);
      if (fileInputRefs.current[index]) {
        fileInputRefs.current[index].value = '';
      }
    }
  };

  // DOWNLOAD FUNCTION: Saves with format `${EmployeeID}_${Date}_Receipt_${Number}.pdf`
  const handleDownloadFile = async (e, fileUrl, itemDate, rIdx) => {
    if (e) e.stopPropagation();
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      // Determine extension
      const isPdf = /\.pdf($|\?)/i.test(fileUrl) || blob.type.includes('pdf');
      const ext = isPdf ? 'pdf' : (fileUrl.split('.').pop().split('?')[0] || 'jpg');

      // Formulate custom name: EMPLOYEEID_DATE_Receipt_INDEX.ext
      const customFileName = `${employeeIdentifier}_${itemDate || new Date().toISOString().split('T')[0]}_Receipt_${rIdx + 1}.${ext}`;

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = customFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download failed, opening directly:', err);
      window.open(fileUrl, '_blank');
    }
  };

  // Compute live total claim value
  const totalAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  // Submit claim handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (items.some((it) => it.uploading)) {
      alert('Please wait for receipt uploads to complete before submitting.');
      return;
    }

    const payload = items.map((item) => {
      const finalCategory =
        item.category === 'Other' && item.otherCategory.trim()
          ? `Other: ${item.otherCategory.trim()}`
          : item.category;

      return {
        date: item.date,
        category: finalCategory,
        amount: Number(item.amount),
        description: item.description.trim(),
        receiptUrls: item.receiptUrls,
        receiptUrl: item.receiptUrls[0] || null,
      };
    });

    setSubmitting(true);

    try {
      const res = await expenseApi.submitClaim({ items: payload });
      if (res.data?.success || res.status === 200 || res.status === 201) {
        navigate('/expenses');
      } else {
        setError(res.data?.message || 'Submission failed. Please verify the inputs.');
      }
    } catch (err) {
      console.error('Submit Claim Error:', err);
      setError(
        err.response?.data?.message ||
        (Array.isArray(err.response?.data?.errors)
          ? err.response.data.errors.map((e) => e.msg).join(', ')
          : 'Failed to submit expense claim.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none !important; 
          margin: 0 !important; 
        }
        input[type=number] {
          -moz-appearance: textfield !important;
        }
        .erp-hover-btn {
          transition: all 0.18s ease-in-out;
        }
        .erp-hover-btn:hover {
          transform: translateY(-1px);
          filter: brightness(1.04);
        }
        .erp-upload-dropzone {
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1.5px dashed ${ERP_COLORS.silver};
        }
        .erp-upload-dropzone:hover {
          border-color: ${ERP_COLORS.primary} !important;
          background-color: #F0F7FF !important;
        }
        .erp-receipt-card {
          transition: all 0.2s ease;
        }
        .erp-receipt-card:hover {
          border-color: ${ERP_COLORS.primary} !important;
          box-shadow: 0 4px 12px rgba(8, 127, 245, 0.08);
        }
      `}</style>

      {/* Main Page Container with Balanced Padding */}
      <div
        className="w-100 px-3 px-sm-4 px-xl-5 py-4"
        style={{
          backgroundColor: ERP_COLORS.mainBg,
          minHeight: '100vh',
          color: ERP_COLORS.textPrimary,
        }}
      >
        <div className="mx-auto" style={{ maxWidth: '1100px' }}>
          
          {/* Top Header Banner */}
          <div
            className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 rounded-4 shadow-sm mb-4 p-3.5 p-sm-4"
            style={{
              backgroundColor: ERP_COLORS.cardBg,
              border: `1px solid ${ERP_COLORS.border}`,
            }}
          >
            <div className="d-flex align-items-center gap-3">
              <button
                type="button"
                className="btn btn-outline-secondary rounded-circle d-flex align-items-center justify-content-center p-0 flex-shrink-0"
                style={{ width: '40px', height: '40px', fontSize: '1.4rem', fontWeight: 700 }}
                onClick={() => navigate('/expenses')}
                title="Back to Expenses"
              >
                ‹
              </button>

              <div>
                <div className="d-flex align-items-center gap-2 mb-1.5">
                  <span
                    className="badge px-2.5 py-1 fw-bold rounded-pill"
                    style={{
                      backgroundColor: '#EBF4FE',
                      color: ERP_COLORS.primary,
                      fontSize: '0.68rem',
                      letterSpacing: '0.5px',
                    }}
                  >
                    FINANCE & CLAIMS
                  </span>
                </div>
                <h3 className="fw-bold mb-1" style={{ color: ERP_COLORS.sidebar, fontSize: '1.35rem', letterSpacing: '-0.2px' }}>
                  Submit Expense Claim
                </h3>
                <p className="small mb-0 text-muted" style={{ fontSize: '0.80rem' }}>
                  Upload bills, itemize business expenses, and download receipts with auto-formatted employee IDs.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-light fw-semibold px-4 py-2.5 w-100 w-sm-auto text-nowrap erp-hover-btn"
              onClick={() => navigate('/expenses')}
              style={{
                borderRadius: '8px',
                border: `1px solid ${ERP_COLORS.silver}`,
                backgroundColor: ERP_COLORS.cardBg,
                color: ERP_COLORS.textPrimary,
                fontSize: '0.84rem',
              }}
            >
              Cancel / Dashboard
            </button>
          </div>

          {/* Error Alert Box */}
          {error && (
            <div
              className="alert d-flex align-items-center gap-2 rounded-3 shadow-sm mb-4 p-3 px-md-3.5"
              style={{
                backgroundColor: '#FEF2F2',
                border: `1px solid #FECACA`,
                color: ERP_COLORS.error,
              }}
            >
              <span className="fw-bold">Notice:</span>
              <span className="small fw-semibold">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {items.map((item, index) => (
              <div
                key={index}
                className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden"
                style={{
                  backgroundColor: ERP_COLORS.cardBg,
                  border: `1px solid ${ERP_COLORS.border}`,
                }}
              >
                {/* Line Item Header */}
                <div
                  className="d-flex justify-content-between align-items-center px-3.5 px-md-4 py-3"
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderBottom: `1px solid ${ERP_COLORS.border}`,
                  }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <span
                      className="badge rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                      style={{
                        width: '28px',
                        height: '28px',
                        backgroundColor: ERP_COLORS.primary,
                        fontSize: '0.80rem',
                      }}
                    >
                      {index + 1}
                    </span>
                    <span className="fw-bold" style={{ color: ERP_COLORS.sidebar, fontSize: '0.92rem' }}>
                      Expense Entry #{index + 1}
                    </span>
                  </div>

                  {items.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-sm fw-semibold px-3 py-1.5"
                      onClick={() => handleRemoveItem(index)}
                      style={{
                        borderRadius: '6px',
                        border: `1px solid #FECACA`,
                        color: ERP_COLORS.error,
                        backgroundColor: '#FEF2F2',
                        fontSize: '0.76rem',
                      }}
                    >
                      Remove Item
                    </button>
                  )}
                </div>

                {/* Form Input Fields */}
                <div className="p-3.5 p-md-4">
                  <div className="row g-3 g-md-3.5">
                    
                    {/* Date */}
                    <div className="col-12 col-sm-6 col-lg-3">
                      <label className="form-label fw-bold small mb-1.5 d-block" style={{ color: ERP_COLORS.textSecondary, fontSize: '0.76rem' }}>
                        Date of Expense <span style={{ color: ERP_COLORS.error }}>*</span>
                      </label>
                      <input
                        type="date"
                        className="form-control shadow-none"
                        value={item.date}
                        onChange={(e) => handleChange(index, 'date', e.target.value)}
                        required
                        style={{
                          borderRadius: '8px',
                          borderColor: ERP_COLORS.border,
                          color: ERP_COLORS.textPrimary,
                          fontSize: '0.84rem',
                          padding: '10px 14px',
                        }}
                      />
                    </div>

                    {/* Category Selector */}
                    <div className="col-12 col-sm-6 col-lg-3">
                      <label className="form-label fw-bold small mb-1.5 d-block" style={{ color: ERP_COLORS.textSecondary, fontSize: '0.76rem' }}>
                        Category <span style={{ color: ERP_COLORS.error }}>*</span>
                      </label>
                      <select
                        className="form-select shadow-none"
                        value={item.category}
                        onChange={(e) => handleChange(index, 'category', e.target.value)}
                        required
                        style={{
                          borderRadius: '8px',
                          borderColor: ERP_COLORS.border,
                          color: ERP_COLORS.textPrimary,
                          fontSize: '0.84rem',
                          padding: '10px 14px',
                        }}
                      >
                        <option value="">Select Category...</option>
                        <option value="Travel">🚗 Travel & Transport</option>
                        <option value="Meals">🍔 Meals & Boarding</option>
                        <option value="Accommodation">🏨 Hotel Accommodation</option>
                        <option value="Office Supplies">📎 Office Supplies</option>
                        <option value="Client Entertainment">🎉 Client Meeting / Dinner</option>
                        <option value="Other">📦 Other (Specify Below)</option>
                      </select>

                      {item.category === 'Other' && (
                        <div className="mt-2.5 p-2 rounded-2 bg-light border">
                          <input
                            type="text"
                            className="form-control shadow-none"
                            placeholder="Specify category..."
                            value={item.otherCategory}
                            onChange={(e) => handleChange(index, 'otherCategory', e.target.value)}
                            required
                            autoFocus
                            style={{
                              borderRadius: '6px',
                              borderColor: ERP_COLORS.primary,
                              backgroundColor: '#FFFFFF',
                              fontSize: '0.80rem',
                              padding: '8px 12px',
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Amount */}
                    <div className="col-12 col-sm-6 col-lg-3">
                      <label className="form-label fw-bold small mb-1.5 d-block" style={{ color: ERP_COLORS.textSecondary, fontSize: '0.76rem' }}>
                        Claim Amount (₹) <span style={{ color: ERP_COLORS.error }}>*</span>
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        className="form-control fw-bold shadow-none"
                        placeholder="0.00"
                        value={item.amount}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^\d*\.?\d*$/.test(val)) {
                            handleChange(index, 'amount', val);
                          }
                        }}
                        required
                        style={{
                          borderRadius: '8px',
                          borderColor: ERP_COLORS.border,
                          color: ERP_COLORS.success,
                          fontSize: '0.92rem',
                          padding: '10px 14px',
                        }}
                      />
                    </div>

                    {/* Description */}
                    <div className="col-12 col-sm-6 col-lg-3">
                      <label className="form-label fw-bold small mb-1.5 d-block" style={{ color: ERP_COLORS.textSecondary, fontSize: '0.76rem' }}>
                        Description / Reason <span style={{ color: ERP_COLORS.error }}>*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control shadow-none"
                        placeholder="e.g., Client visit taxi fare"
                        value={item.description}
                        onChange={(e) => handleChange(index, 'description', e.target.value)}
                        required
                        style={{
                          borderRadius: '8px',
                          borderColor: ERP_COLORS.border,
                          color: ERP_COLORS.textPrimary,
                          fontSize: '0.84rem',
                          padding: '10px 14px',
                        }}
                      />
                    </div>

                    {/* ========================================================= */}
                    {/* CLICKABLE RECEIPTS / BILL VOUCHERS UPLOAD ZONE            */}
                    {/* ========================================================= */}
                    <div className="col-12 mt-3 pt-3" style={{ borderTop: `1px dashed ${ERP_COLORS.border}` }}>
                      
                      {/* Hidden File Input */}
                      <input
                        type="file"
                        multiple
                        accept="image/*,application/pdf"
                        ref={(el) => (fileInputRefs.current[index] = el)}
                        className="d-none"
                        onChange={(e) => handleFileUpload(index, e.target.files)}
                        disabled={item.uploading}
                      />

                      {/* Clickable Area: Launches File Dialog directly */}
                      <div
                        className="rounded-3 p-3 p-md-3.5 erp-upload-dropzone"
                        style={{ backgroundColor: '#F8FAFC' }}
                        onClick={() => fileInputRefs.current[index]?.click()}
                        title="Click to select and upload photos or PDF files"
                      >
                        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3">
                          <div className="d-flex align-items-center gap-2.5">
                            <span className="fs-4">📷</span>
                            <div>
                              <span className="fw-bold small d-block mb-0.5" style={{ color: ERP_COLORS.sidebar, fontSize: '0.86rem' }}>
                                Receipts / Bill Vouchers ({item.receiptUrls.length} Attached)
                              </span>
                              <small className="text-muted" style={{ fontSize: '0.76rem' }}>
                                <strong>Click anywhere in this box</strong> to select multiple photos or PDF bills (up to 5MB each).
                              </small>
                            </div>
                          </div>

                          <button
                            type="button"
                            className="btn btn-sm btn-primary fw-bold px-3.5 py-2 rounded-2 shadow-sm erp-hover-btn text-nowrap"
                            onClick={(e) => {
                              e.stopPropagation();
                              fileInputRefs.current[index]?.click();
                            }}
                            disabled={item.uploading}
                            style={{ fontSize: '0.80rem', backgroundColor: ERP_COLORS.primary }}
                          >
                            {item.receiptUrls.length === 0 ? '+ Upload Photos/PDF' : '+ Add More Files'}
                          </button>
                        </div>
                      </div>

                      {/* Uploading Status Progress Bar */}
                      {item.uploading && (
                        <div
                          className="p-3 rounded-2 d-flex align-items-center gap-2 mt-3"
                          style={{
                            backgroundColor: '#EBF4FE',
                            border: `1px solid ${ERP_COLORS.silver}`,
                          }}
                        >
                          <span
                            className="spinner-border spinner-border-sm"
                            role="status"
                            aria-hidden="true"
                            style={{ color: ERP_COLORS.primary }}
                          ></span>
                          <span className="small fw-semibold" style={{ color: ERP_COLORS.primary, fontSize: '0.80rem' }}>
                            Uploading and processing files securely...
                          </span>
                        </div>
                      )}

                      {/* Uploaded Receipts Gallery with PDF Download feature */}
                      {item.receiptUrls.length > 0 && (
                        <div className="row g-2.5 mt-2">
                          {item.receiptUrls.map((url, rIdx) => {
                            const isPdf = /\.pdf($|\?)/i.test(url);
                            return (
                              <div key={rIdx} className="col-12 col-sm-6 col-md-4">
                                <div
                                  className="p-2.5 rounded-2 bg-white border d-flex align-items-center justify-content-between erp-receipt-card"
                                  style={{ padding: '10px 14px' }}
                                >
                                  <div className="d-flex align-items-center gap-2.5 text-truncate me-2">
                                    {isPdf ? (
                                      <div
                                        className="rounded-2 d-flex align-items-center justify-content-center bg-danger-subtle text-danger fw-bold"
                                        style={{ width: '40px', height: '40px', fontSize: '0.75rem', flexShrink: 0 }}
                                      >
                                        PDF
                                      </div>
                                    ) : (
                                      <img
                                        src={url}
                                        alt={`Receipt ${rIdx + 1}`}
                                        style={{
                                          width: '40px',
                                          height: '40px',
                                          objectFit: 'cover',
                                          borderRadius: '6px',
                                          border: `1px solid ${ERP_COLORS.border}`,
                                          flexShrink: 0,
                                        }}
                                        onError={(e) => {
                                          e.target.style.display = 'none';
                                        }}
                                      />
                                    )}

                                    <div className="text-truncate">
                                      <span className="badge bg-light text-dark border small d-inline-block" style={{ fontSize: '0.66rem', padding: '3px 6px' }}>
                                        Bill #{rIdx + 1}
                                      </span>
                                      
                                      <div className="d-flex gap-2 align-items-center mt-1">
                                        {/* View File */}
                                        <a
                                          href={url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="small fw-bold text-decoration-none"
                                          style={{ color: ERP_COLORS.primary, fontSize: '0.74rem' }}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          View ↗
                                        </a>

                                        {/* Download with Employee ID + Date */}
                                        <button
                                          type="button"
                                          className="btn btn-link p-0 text-success fw-bold text-decoration-none small"
                                          style={{ fontSize: '0.74rem' }}
                                          title={`Download as ${employeeIdentifier}_${item.date}_Receipt_${rIdx + 1}`}
                                          onClick={(e) => handleDownloadFile(e, url, item.date, rIdx)}
                                        >
                                          📥 Save
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    className="btn btn-sm text-danger p-1 fw-bold"
                                    onClick={(e) => handleRemoveReceipt(index, rIdx, e)}
                                    title="Remove this receipt"
                                    style={{ fontSize: '0.86rem', lineHeight: 1 }}
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                    </div>

                  </div>
                </div>
              </div>
            ))}

            {/* Add Entry Row & Total Summary Bar */}
            <div
              className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-3 rounded-4 shadow-sm mb-4 p-3.5 p-sm-4"
              style={{
                backgroundColor: ERP_COLORS.cardBg,
                border: `1px solid ${ERP_COLORS.border}`,
              }}
            >
              <button
                type="button"
                className="btn fw-bold px-4 py-2.5 w-100 w-sm-auto erp-hover-btn"
                onClick={handleAddItem}
                onMouseEnter={() => setAddBtnHover(true)}
                onMouseLeave={() => setAddBtnHover(false)}
                style={{
                  borderRadius: '8px',
                  border: `1.5px solid ${ERP_COLORS.primary}`,
                  backgroundColor: addBtnHover ? '#EBF4FE' : ERP_COLORS.cardBg,
                  color: ERP_COLORS.primary,
                  fontSize: '0.86rem',
                }}
              >
                + Add Another Expense Entry
              </button>

              <div className="text-center text-sm-end w-100 w-sm-auto">
                <span className="fw-semibold me-2 small d-block d-sm-inline" style={{ color: ERP_COLORS.textSecondary, fontSize: '0.80rem' }}>
                  Total Claim Amount:
                </span>
                <span
                  className="fw-bold"
                  style={{
                    color: ERP_COLORS.success,
                    fontSize: '1.55rem',
                    fontFamily: 'monospace',
                  }}
                >
                  ₹{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Form Action Buttons */}
            <div className="d-flex flex-column flex-sm-row justify-content-end gap-2.5 gap-sm-3 pb-5">
              <button
                type="button"
                className="btn fw-semibold px-4 py-2.5 order-2 order-sm-1 erp-hover-btn"
                onClick={() => navigate('/expenses')}
                style={{
                  borderRadius: '8px',
                  border: `1px solid ${ERP_COLORS.silver}`,
                  backgroundColor: ERP_COLORS.cardBg,
                  color: ERP_COLORS.textSecondary,
                  fontSize: '0.86rem',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn text-white fw-bold px-5 py-2.5 shadow-sm order-1 order-sm-2 erp-hover-btn"
                disabled={submitting || items.length === 0}
                onMouseEnter={() => setSubmitBtnHover(true)}
                onMouseLeave={() => setSubmitBtnHover(false)}
                style={{
                  borderRadius: '8px',
                  backgroundColor: submitting
                    ? ERP_COLORS.secondaryBlue
                    : submitBtnHover
                    ? ERP_COLORS.blueHover
                    : ERP_COLORS.primary,
                  border: 'none',
                  fontSize: '0.92rem',
                }}
              >
                {submitting ? (
                  <span>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Submitting to Ledger...
                  </span>
                ) : (
                  'Submit Expense Claim'
                )}
              </button>
            </div>
          </form>

        </div>
      </div>
    </>
  );
};

export default ExpenseSubmitPage;