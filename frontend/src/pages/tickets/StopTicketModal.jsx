import React, { useState, useEffect } from 'react';
import {
  Square,
  Clock,
  MapPin,
  Upload,
  X,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  FileText,
  ExternalLink,
  Navigation,
} from 'lucide-react';
import Modal from '../../components/common/Modal';
import { erpApi } from '../../api/erpApi';
import { getCurrentGPSLocation, calculateWorkingDuration, getMapUrl } from '../../utils/geoUtils';

const StopTicketModal = ({ show, ticket, onClose, onStopped }) => {
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsLocation, setGpsLocation] = useState(null);
  const [gpsError, setGpsError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [serviceCompletionRemarks, setServiceCompletionRemarks] = useState('');
  const [afterServiceImages, setAfterServiceImages] = useState([]);
  const [durationPreview, setDurationPreview] = useState(null);

  useEffect(() => {
    if (show && ticket) {
      fetchGPS();
      setServiceCompletionRemarks('');
      setAfterServiceImages([]);
      // Calculate preview of duration
      if (ticket.startTime) {
        setDurationPreview(calculateWorkingDuration(ticket.startTime, null, Date.now()));
      }
    } else {
      setGpsLocation(null);
      setGpsError('');
      setErrorMsg('');
      setDurationPreview(null);
    }
  }, [show, ticket]);

  const fetchGPS = async () => {
    setGpsLoading(true);
    setGpsError('');
    setErrorMsg('');
    try {
      const loc = await getCurrentGPSLocation();
      setGpsLocation(loc);
    } catch (err) {
      setGpsError(err.message || 'Failed to detect ending GPS location. Please check device permissions.');
    } finally {
      setGpsLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const validFiles = [];
    for (const file of files) {
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype || file.type)) {
        setErrorMsg(`"${file.name}" is not a supported format. Please upload JPG, PNG, or WEBP.`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg(`"${file.name}" exceeds the 10MB limit.`);
        return;
      }
      validFiles.push(file);
    }

    setUploadingImage(true);
    setErrorMsg('');

    try {
      const uploadedUrls = [];
      for (const file of validFiles) {
        const data = new FormData();
        data.append('image', file);
        const res = await erpApi.uploadTicketImage(data);
        const url = res?.data?.data?.url || res?.data?.url;
        if (url) uploadedUrls.push(url);
      }
      setAfterServiceImages((prev) => [...prev, ...uploadedUrls]);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setAfterServiceImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleStop = async (e) => {
    e.preventDefault();
    if (!gpsLocation) {
      setErrorMsg('Ending GPS coordinates are required before completing the ticket.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      await erpApi.stopTicket(ticket._id, {
        location: {
          lat: gpsLocation.lat,
          lng: gpsLocation.lng,
          address: gpsLocation.address,
          accuracy: gpsLocation.accuracy,
        },
        serviceCompletionRemarks: serviceCompletionRemarks.trim(),
        afterServiceImages,
      });

      onStopped();
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to complete ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!ticket) return null;

  return (
    <Modal
      show={show}
      title={`Complete & Stop Service: ${ticket.ticketNo}`}
      onClose={onClose}
      size="lg"
      icon={Square}
    >
      <form onSubmit={handleStop}>
        {errorMsg && (
          <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 mb-3 small" role="alert">
            <AlertCircle size={16} className="flex-shrink-0" />
            <div>{errorMsg}</div>
          </div>
        )}

        {/* ── Duration & Ticket Summary Card ── */}
        <div className="p-3 bg-light rounded-3 border mb-3">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
            <div>
              <span className="badge bg-warning-subtle text-warning border border-warning small px-2 py-0.5 mb-1">
                Status: In Progress
              </span>
              <h6 className="mb-0 fw-bold">{ticket.subject || ticket.ticketNo}</h6>
              <small className="text-muted">
                Client: {ticket.companyId?.company || ticket.companyName} • Unit: {ticket.unit}
              </small>
            </div>

            {durationPreview && (
              <div className="text-end p-2 bg-white rounded-2 border">
                <small className="text-muted d-block" style={{ fontSize: '0.72rem' }}>
                  Elapsed Working Duration
                </small>
                <div className="fw-bold text-primary font-monospace" style={{ fontSize: '1.05rem' }}>
                  {durationPreview.formatted}
                </div>
                <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                  ({durationPreview.timerDisplay})
                </small>
              </div>
            )}
          </div>

          <div className="row g-2 pt-2 border-top mt-2 small text-muted">
            <div className="col-12 col-md-6">
              <span>Service Started At: </span>
              <strong className="text-dark">
                {ticket.startTime ? new Date(ticket.startTime).toLocaleString() : '—'}
              </strong>
            </div>
            <div className="col-12 col-md-6">
              <span>Started By: </span>
              <strong className="text-dark">
                {ticket.startedByName || ticket.startedBy?.name || 'Technician'}
              </strong>
            </div>
            {ticket.startLocation && (
              <div className="col-12">
                <span>Start Location: </span>
                <strong className="text-dark">{ticket.startLocation.address || 'Location logged'}</strong>
              </div>
            )}
          </div>
        </div>

        {/* ── Ending GPS Verification ── */}
        <div className="mb-3">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <label className="erp-label mb-0 fw-semibold">
              <Navigation size={14} className="me-1 inline text-primary" />
              Service Completion GPS Location <span className="text-danger">*</span>
            </label>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm py-0.5 px-2"
              onClick={fetchGPS}
              disabled={gpsLoading}
              style={{ fontSize: '0.75rem' }}
            >
              <RefreshCw size={12} className={gpsLoading ? 'erp-spin me-1' : 'me-1'} />
              {gpsLoading ? 'Detecting...' : 'Retry GPS'}
            </button>
          </div>

          {gpsLoading && (
            <div className="p-3 bg-light rounded-3 border text-center text-muted small">
              <RefreshCw size={18} className="erp-spin text-primary mb-1 d-block mx-auto" />
              Acquiring destination/stop GPS coordinates...
            </div>
          )}

          {!gpsLoading && gpsError && (
            <div className="p-3 rounded-3 border border-danger bg-danger-subtle text-danger small">
              <div className="d-flex align-items-start gap-2 mb-2">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <div>
                  <strong>GPS Location Required:</strong>
                  <div className="mt-0.5">{gpsError}</div>
                </div>
              </div>
              <div className="d-flex justify-content-end">
                <button
                  type="button"
                  className="btn btn-danger btn-sm py-1 px-3"
                  onClick={fetchGPS}
                  style={{ fontSize: '0.78rem' }}
                >
                  <RefreshCw size={12} className="me-1 inline" /> Retry Location Request
                </button>
              </div>
            </div>
          )}

          {!gpsLoading && gpsLocation && (
            <div className="p-3 rounded-3 border border-success bg-success-subtle small">
              <div className="d-flex align-items-start gap-2">
                <CheckCircle2 size={18} className="text-success flex-shrink-0 mt-0.5" />
                <div className="flex-grow-1">
                  <div className="fw-bold text-success mb-0.5">Ending GPS Location Locked</div>
                  <div className="text-dark fw-medium">{gpsLocation.address}</div>
                  <div className="text-muted font-monospace mt-1" style={{ fontSize: '0.73rem' }}>
                    Lat: {gpsLocation.lat.toFixed(5)}, Lng: {gpsLocation.lng.toFixed(5)}
                    {gpsLocation.accuracy ? ` (Accuracy: ±${gpsLocation.accuracy}m)` : ''}
                  </div>
                </div>
                {getMapUrl(gpsLocation.lat, gpsLocation.lng) && (
                  <a
                    href={getMapUrl(gpsLocation.lat, gpsLocation.lng)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline-success btn-sm py-1 px-2 d-inline-flex align-items-center gap-1"
                    style={{ fontSize: '0.72rem' }}
                  >
                    <ExternalLink size={12} /> View Map
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── AFTER SERVICE IMAGE UPLOADS ── */}
        <div className="mb-3">
          <label className="erp-label d-flex align-items-center justify-content-between">
            <span>After Service Images</span>
            <span className="text-muted" style={{ fontSize: '0.72rem' }}>
              Upload completed service/repaired equipment photos (JPG, PNG, WEBP)
            </span>
          </label>

          <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
            <label
              className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1.5"
              style={{ cursor: uploadingImage ? 'not-allowed' : 'pointer' }}
            >
              <Upload size={14} />
              <span>{uploadingImage ? 'Uploading Photos...' : '+ Upload After-Service Photos'}</span>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/jpg"
                onChange={handleImageUpload}
                disabled={uploadingImage}
                style={{ display: 'none' }}
              />
            </label>

            {afterServiceImages.length > 0 && (
              <span className="text-muted small">
                {afterServiceImages.length} after-service image(s) attached
              </span>
            )}
          </div>

          {/* Thumbnail Gallery Preview */}
          {afterServiceImages.length > 0 && (
            <div className="d-flex flex-wrap gap-2 mt-2">
              {afterServiceImages.map((imgUrl, idx) => (
                <div
                  key={idx}
                  className="position-relative rounded-2 border overflow-hidden"
                  style={{ width: '70px', height: '70px', backgroundColor: '#f8fafc' }}
                >
                  <img
                    src={imgUrl}
                    alt={`After Preview ${idx + 1}`}
                    className="w-100 h-100"
                    style={{ objectFit: 'cover' }}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="btn btn-danger btn-sm p-0 position-absolute top-0 end-0 rounded-circle d-flex align-items-center justify-content-center m-1"
                    style={{ width: '18px', height: '18px' }}
                    title="Remove image"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── SERVICE COMPLETION REMARKS ── */}
        <div className="mb-3">
          <label className="erp-label">
            Service Completion Remarks
          </label>
          <textarea
            className="erp-textarea"
            rows={3}
            placeholder="Document work performed, replaced parts, testing conducted, customer sign-off or recommendations..."
            value={serviceCompletionRemarks}
            onChange={(e) => setServiceCompletionRemarks(e.target.value)}
          />
        </div>

        <div className="d-flex justify-content-end gap-2 pt-3 border-top">
          <button type="button" className="erp-btn erp-btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="submit"
            className="erp-btn erp-btn-danger"
            disabled={submitting || gpsLoading || !gpsLocation || uploadingImage}
          >
            <Square size={14} fill="currentColor" /> {submitting ? 'Stopping Service...' : 'Confirm & Complete Ticket'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default StopTicketModal;
