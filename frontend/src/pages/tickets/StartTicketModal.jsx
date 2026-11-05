import React, { useState, useEffect } from 'react';
import {
  Play,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Navigation,
  ExternalLink,
} from 'lucide-react';
import Modal from '../../components/common/Modal';
import { erpApi } from '../../api/erpApi';
import { getCurrentGPSLocation, getMapUrl } from '../../utils/geoUtils';

const StartTicketModal = ({ show, ticket, onClose, onStarted }) => {
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsLocation, setGpsLocation] = useState(null);
  const [gpsError, setGpsError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Automatically request GPS when modal opens
  useEffect(() => {
    if (show && ticket) {
      fetchGPS();
    } else {
      setGpsLocation(null);
      setGpsError('');
      setErrorMsg('');
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
      setGpsError(err.message || 'Failed to detect GPS location. Please check device permissions.');
    } finally {
      setGpsLoading(false);
    }
  };

  const handleStart = async () => {
    if (!gpsLocation) {
      setErrorMsg('A verified GPS location is required before service can be started.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      await erpApi.startTicket(ticket._id, {
        location: {
          lat: gpsLocation.lat,
          lng: gpsLocation.lng,
          address: gpsLocation.address,
          accuracy: gpsLocation.accuracy,
        },
      });
      onStarted();
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to start ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!ticket) return null;

  return (
    <Modal
      show={show}
      title={`Start Service: ${ticket.ticketNo}`}
      onClose={onClose}
      size="md"
      icon={Play}
    >
      <div>
        {errorMsg && (
          <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 mb-3 small" role="alert">
            <AlertCircle size={16} className="flex-shrink-0" />
            <div>{errorMsg}</div>
          </div>
        )}

        <div className="p-3 bg-light rounded-3 border mb-3">
          <div className="d-flex justify-content-between align-items-start mb-2">
            <div>
              <span className="badge bg-primary-subtle text-primary border border-primary small px-2 py-0.5 mb-1">
                {ticket.ticketType}
              </span>
              <h6 className="mb-0 fw-bold">{ticket.subject || ticket.ticketNo}</h6>
              <small className="text-muted">
                {ticket.companyId?.company || ticket.companyName || 'Client Site'} • Unit: {ticket.unit}
              </small>
            </div>
          </div>

          <div className="row g-2 pt-2 border-top mt-2 small text-muted">
            <div className="col-6">
              <span>Contact: </span>
              <strong className="text-dark">{ticket.contactPerson || '—'}</strong>
            </div>
            <div className="col-6">
              <span>Phone: </span>
              <strong className="text-dark">{ticket.phoneNumber || '—'}</strong>
            </div>
            {ticket.hp && (
              <div className="col-6">
                <span>Motor HP: </span>
                <strong className="text-dark">{ticket.hp} HP</strong>
              </div>
            )}
            {ticket.rpm && (
              <div className="col-6">
                <span>Motor RPM: </span>
                <strong className="text-dark">{ticket.rpm} RPM</strong>
              </div>
            )}
            {ticket.millName && (
              <div className="col-12">
                <span>Mill: </span>
                <strong className="text-dark">{ticket.millName}</strong>
              </div>
            )}
          </div>
        </div>

        {/* ── GPS Location Verification Section ── */}
        <div className="mb-3">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <label className="erp-label mb-0 fw-semibold">
              <Navigation size={14} className="me-1 inline text-primary" />
              Field Technician GPS Location <span className="text-danger">*</span>
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
              Acquiring high-accuracy GPS coordinates from your device...
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
                  <div className="fw-bold text-success mb-0.5">GPS Location Locked</div>
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

        <div className="alert alert-info py-2 px-3 small d-flex align-items-center gap-2 mb-0">
          <Clock size={15} className="flex-shrink-0 text-primary" />
          <span>
            Clicking <strong>Start Service</strong> captures the official server timestamp and initiates the live service
            duration timer.
          </span>
        </div>

        <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
          <button type="button" className="erp-btn erp-btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="button"
            className="erp-btn erp-btn-success"
            onClick={handleStart}
            disabled={submitting || gpsLoading || !gpsLocation}
          >
            <Play size={14} fill="currentColor" /> {submitting ? 'Starting Service...' : 'Confirm & Start Service'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default StartTicketModal;
