import React, { useState } from 'react';
import {
  Ticket as TicketIcon,
  Building2,
  Phone,
  User as UserIcon,
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  RotateCw,
  Cpu,
  Compass,
  Upload,
  X,
  Maximize2,
} from 'lucide-react';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import { getMapUrl } from '../../utils/geoUtils';
import { erpApi } from '../../api/erpApi';

const TicketDetailModal = ({ show, ticket, onClose, onRefresh }) => {
  const [activeImage, setActiveImage] = useState(null);
  const [uploadingAfterImage, setUploadingAfterImage] = useState(false);
  const [remarksEdit, setRemarksEdit] = useState('');
  const [isEditingRemarks, setIsEditingRemarks] = useState(false);
  const [savingRemarks, setSavingRemarks] = useState(false);

  if (!ticket) return null;

  const isCompleted = ticket.status === 'Completed' || ticket.status === 'Resolved';
  const isInProgress = ticket.status === 'In Progress';

  const company = ticket.companyId || {};
  const duration = ticket.workingDuration || {};

  // Upload additional after-service images if completed
  const handleAddAfterServiceImages = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setUploadingAfterImage(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('image', file);
        const res = await erpApi.uploadTicketImage(formData);
        const url = res?.data?.data?.url || res?.data?.url;
        if (url) uploadedUrls.push(url);
      }

      if (uploadedUrls.length > 0) {
        const updatedImages = [...(ticket.afterServiceImages || []), ...uploadedUrls];
        await erpApi.updateTicket(ticket._id, { afterServiceImages: updatedImages });
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to upload additional photos');
    } finally {
      setUploadingAfterImage(false);
      e.target.value = '';
    }
  };

  const handleSaveRemarks = async () => {
    setSavingRemarks(true);
    try {
      await erpApi.updateTicket(ticket._id, {
        serviceCompletionRemarks: remarksEdit,
      });
      setIsEditingRemarks(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update remarks');
    } finally {
      setSavingRemarks(false);
    }
  };

  const startMapUrl = ticket.startLocation ? getMapUrl(ticket.startLocation.lat, ticket.startLocation.lng) : null;
  const stopMapUrl = ticket.stopLocation ? getMapUrl(ticket.stopLocation.lat, ticket.stopLocation.lng) : null;

  return (
    <>
      <Modal
        show={show}
        title={`Service Ticket Audit: ${ticket.ticketNo || ticket._id}`}
        onClose={onClose}
        size="xl"
        icon={TicketIcon}
      >
        <div className="d-flex flex-column gap-3">
          {/* ── 1. TICKET INFORMATION HEADER ── */}
          <div className="p-3 bg-light rounded-3 border">
            <div className="row g-2 align-items-center">
              <div className="col-12 col-md-7">
                <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                  <span className="fw-bold font-monospace text-primary" style={{ fontSize: '1.1rem' }}>
                    {ticket.ticketNo}
                  </span>
                  <StatusBadge status={ticket.ticketType || 'Normal Ticket'} size="md" />
                  <StatusBadge status={ticket.status || 'Pending'} size="md" />
                  <span
                    className={`badge rounded-pill fw-semibold ${
                      ticket.priority === 'Urgent'
                        ? 'bg-danger text-white'
                        : ticket.priority === 'High'
                        ? 'bg-warning-subtle text-warning border border-warning'
                        : 'bg-light text-muted border'
                    }`}
                    style={{ fontSize: '0.74rem', padding: '4px 9px' }}
                  >
                    Priority: {ticket.priority || 'Medium'}
                  </span>
                </div>
                <h6 className="fw-bold mb-1 text-dark">{ticket.subject || `${ticket.ticketType} - ${ticket.unit}`}</h6>
                <div className="d-flex flex-wrap align-items-center gap-2 text-muted small">
                  <div>
                    Created by <strong>{ticket.createdBy?.name || ticket.createdByName || 'Authorized User'}</strong>
                    {ticket.createdBy?.employeeId ? ` (${ticket.createdBy.employeeId})` : ''} on{' '}
                    {new Date(ticket.createdAt).toLocaleString()}
                  </div>
                  <div>
                    • Assigned Technician:{' '}
                    <strong className="text-dark">
                      {ticket.assignedTo?.name || ticket.startedByName || ticket.startedBy?.name || 'Unassigned'}
                    </strong>
                    {ticket.assignedTo?.employeeId ? ` (${ticket.assignedTo.employeeId})` : ''}
                  </div>
                </div>
              </div>

              {/* Working Hours Summary Pill */}
              <div className="col-12 col-md-5 text-md-end">
                <div className="p-2.5 bg-white rounded-2 border d-inline-block text-start text-md-end w-100 w-md-auto">
                  <small className="text-muted d-block" style={{ fontSize: '0.72rem' }}>
                    Total Working Duration
                  </small>
                  <div className="fw-bold text-success font-monospace" style={{ fontSize: '1.1rem' }}>
                    {duration.formatted || (isCompleted ? 'Calculated on stop' : isInProgress ? 'Live in progress' : 'Not started')}
                  </div>
                  {duration.totalHours !== undefined && (
                    <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                      ({duration.totalHours} hr {duration.totalMinutes || 0} min logged)
                    </small>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3">
            {/* ── 2. COMPANY INFORMATION ── */}
            <div className="col-12 col-md-6">
              <div className="card h-100 shadow-none border-0 bg-light rounded-3">
                <div className="card-header bg-transparent border-0 py-2 px-3 fw-bold small d-flex align-items-center gap-2 text-primary">
                  <Building2 size={15} /> Company & Site Information
                </div>
                <div className="card-body p-3 small">
                  <div className="mb-2">
                    <span className="text-muted d-block">Company Name:</span>
                    <strong className="text-dark fs-6">{company.company || ticket.companyName || '—'}</strong>
                    {company.profileCode && (
                      <span className="badge bg-secondary-subtle text-secondary font-monospace ms-2">
                        {company.profileCode}
                      </span>
                    )}
                  </div>

                  <div className="mb-2">
                    <span className="text-muted d-block">Site Contact Person:</span>
                    <strong className="text-dark">{ticket.contactPerson || company.contactPerson || '—'}</strong>
                  </div>

                  <div className="mb-2">
                    <span className="text-muted d-block">Contact Phone:</span>
                    <strong className="text-dark">{ticket.phoneNumber || company.contactNumber || '—'}</strong>
                  </div>

                  <div>
                    <span className="text-muted d-block">Site Address:</span>
                    <span className="text-dark">
                      {[company.addressLine1, company.area, company.city, company.state, company.pincode]
                        .filter(Boolean)
                        .join(', ') || 'Not logged'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 3 & 4. SERVICE DETAILS & TECHNICAL SPECIFICATIONS ── */}
            <div className="col-12 col-md-6">
              <div className="card h-100 shadow-none border-0 bg-light rounded-3">
                <div className="card-header bg-transparent border-0 py-2 px-3 fw-bold small d-flex align-items-center gap-2 text-primary">
                  <FileText size={15} /> Service & Technical Specifications
                </div>
                <div className="card-body p-3 small">
                  <div className="row g-2 mb-2">
                    <div className="col-6">
                      <span className="text-muted d-block">Operational Unit:</span>
                      <span className="badge bg-light text-dark border px-2 py-1 font-monospace">
                        {ticket.unit || 'Plant'}
                      </span>
                    </div>

                    <div className="col-6">
                      <span className="text-muted d-block">Ticket Category:</span>
                      <strong>{ticket.ticketType}</strong>
                    </div>
                  </div>

                  {/* Dynamic Technical Specs: HP & RPM */}
                  {(ticket.hp || ticket.rpm) && (
                    <div className="p-2.5 rounded-2 bg-light border mb-2">
                      <div className="fw-semibold text-primary mb-1 d-flex align-items-center gap-1">
                        <RotateCw size={13} /> Motor Technical Parameters:
                      </div>
                      <div className="row g-2">
                        {ticket.hp && (
                          <div className="col-6">
                            <span className="text-muted">Horsepower: </span>
                            <strong className="text-dark">{ticket.hp} HP</strong>
                          </div>
                        )}
                        {ticket.rpm && (
                          <div className="col-6">
                            <span className="text-muted">RPM: </span>
                            <strong className="text-dark">{ticket.rpm} RPM</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Dynamic Mill Name */}
                  {ticket.millName && (
                    <div className="mb-2">
                      <span className="text-muted d-block">Associated Mill Name:</span>
                      <strong className="text-dark">{ticket.millName}</strong>
                    </div>
                  )}

                  <div>
                    <span className="text-muted d-block">Symptoms / Description:</span>
                    <p className="text-dark mb-0 bg-light p-2 rounded-2 border" style={{ whiteSpace: 'pre-line' }}>
                      {ticket.description || 'No specific fault description provided.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 5. START TRACKING DETAILS ── */}
            <div className="col-12 col-md-6">
              <div className="card h-100 shadow-none border-0 bg-light rounded-3">
                <div className="card-header bg-transparent border-0 py-2 px-3 fw-bold small d-flex align-items-center justify-content-between text-success">
                  <div className="d-flex align-items-center gap-2">
                    <MapPin size={15} /> Start Service Telemetry
                  </div>
                  {startMapUrl && (
                    <a
                      href={startMapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline-success btn-sm py-0 px-2 d-inline-flex align-items-center gap-1"
                      style={{ fontSize: '0.7rem' }}
                    >
                      <ExternalLink size={11} /> Open Map
                    </a>
                  )}
                </div>
                <div className="card-body p-3 small">
                  {ticket.startTime ? (
                    <>
                      <div className="mb-2">
                        <span className="text-muted d-block">Started At:</span>
                        <strong className="text-dark">{new Date(ticket.startTime).toLocaleString()}</strong>
                      </div>
                      <div className="mb-2">
                        <span className="text-muted d-block">Field Employee:</span>
                        <strong className="text-dark">
                          {ticket.startedByName || ticket.startedBy?.name || 'Technician'}
                        </strong>{' '}
                        {ticket.startedBy?.employeeId && (
                          <span className="text-muted">({ticket.startedBy.employeeId})</span>
                        )}
                      </div>
                      {ticket.startLocation && (
                        <div>
                          <span className="text-muted d-block">Start GPS Location:</span>
                          <span className="text-dark fw-medium d-block">{ticket.startLocation.address || '—'}</span>
                          <span className="text-muted font-monospace" style={{ fontSize: '0.72rem' }}>
                            Lat: {ticket.startLocation.lat?.toFixed(5)}, Lng: {ticket.startLocation.lng?.toFixed(5)}
                            {ticket.startLocation.accuracy ? ` (±${ticket.startLocation.accuracy}m)` : ''}
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-muted text-center py-3">Service has not been started yet.</div>
                  )}
                </div>
              </div>
            </div>

            {/* ── 6. STOP TRACKING DETAILS ── */}
            <div className="col-12 col-md-6">
              <div className="card h-100 shadow-none border-0 bg-light rounded-3">
                <div className="card-header bg-transparent border-0 py-2 px-3 fw-bold small d-flex align-items-center justify-content-between text-danger">
                  <div className="d-flex align-items-center gap-2">
                    <MapPin size={15} /> Stop Service Telemetry
                  </div>
                  {stopMapUrl && (
                    <a
                      href={stopMapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline-danger btn-sm py-0 px-2 d-inline-flex align-items-center gap-1"
                      style={{ fontSize: '0.7rem' }}
                    >
                      <ExternalLink size={11} /> Open Map
                    </a>
                  )}
                </div>
                <div className="card-body p-3 small">
                  {ticket.stopTime ? (
                    <>
                      <div className="mb-2">
                        <span className="text-muted d-block">Stopped At:</span>
                        <strong className="text-dark">{new Date(ticket.stopTime).toLocaleString()}</strong>
                      </div>
                      <div className="mb-2">
                        <span className="text-muted d-block">Stopped By:</span>
                        <strong className="text-dark">
                          {ticket.stoppedByName || ticket.stoppedBy?.name || 'Technician'}
                        </strong>{' '}
                        {ticket.stoppedBy?.employeeId && (
                          <span className="text-muted">({ticket.stoppedBy.employeeId})</span>
                        )}
                      </div>
                      {ticket.stopLocation && (
                        <div>
                          <span className="text-muted d-block">Stop GPS Location:</span>
                          <span className="text-dark fw-medium d-block">{ticket.stopLocation.address || '—'}</span>
                          <span className="text-muted font-monospace" style={{ fontSize: '0.72rem' }}>
                            Lat: {ticket.stopLocation.lat?.toFixed(5)}, Lng: {ticket.stopLocation.lng?.toFixed(5)}
                            {ticket.stopLocation.accuracy ? ` (±${ticket.stopLocation.accuracy}m)` : ''}
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-muted text-center py-3">
                      {isInProgress ? 'Service currently running' : 'Awaiting start'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── 7 & 10. WORKING HOURS & SERVICE COMPLETION REMARKS ── */}
            <div className="col-12">
              <div className="card shadow-none border-0 bg-light rounded-3">
                <div className="card-header bg-transparent border-0 py-2 px-3 fw-bold small d-flex align-items-center justify-content-between text-primary">
                  <div className="d-flex align-items-center gap-2">
                    <Clock size={15} /> Working Hours & Completion Remarks
                  </div>
                  {isCompleted && !isEditingRemarks && (
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 text-primary text-decoration-none"
                      style={{ fontSize: '0.75rem' }}
                      onClick={() => {
                        setRemarksEdit(ticket.serviceCompletionRemarks || ticket.resolutionNotes || '');
                        setIsEditingRemarks(true);
                      }}
                    >
                      Edit Remarks
                    </button>
                  )}
                </div>
                <div className="card-body p-3 small">
                  <div className="row g-3">
                    <div className="col-12 col-md-4">
                      <div className="p-3 bg-light rounded-2 border text-center">
                        <span className="text-muted d-block mb-1">Official Working Duration</span>
                        <span className="fw-bold text-success font-monospace fs-5">
                          {duration.formatted || (isCompleted ? 'N/A' : 'Pending completion')}
                        </span>
                        <div className="text-muted mt-1" style={{ fontSize: '0.72rem' }}>
                          Total Hours: {duration.totalHours || 0} • Total Minutes: {duration.totalMinutes || 0}
                        </div>
                      </div>
                    </div>

                    <div className="col-12 col-md-8">
                      <span className="text-muted d-block mb-1">Field Service Remarks:</span>
                      {isEditingRemarks ? (
                        <div>
                          <textarea
                            className="erp-textarea mb-2"
                            rows={3}
                            value={remarksEdit}
                            onChange={(e) => setRemarksEdit(e.target.value)}
                            placeholder="Enter completion remarks..."
                          />
                          <div className="d-flex justify-content-end gap-2">
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm"
                              onClick={() => setIsEditingRemarks(false)}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={handleSaveRemarks}
                              disabled={savingRemarks}
                            >
                              {savingRemarks ? 'Saving...' : 'Save Remarks'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-2 bg-light border text-dark" style={{ minHeight: '80px', whiteSpace: 'pre-line' }}>
                          {ticket.serviceCompletionRemarks || ticket.resolutionNotes || 'No completion remarks logged yet.'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 8. BEFORE SERVICE IMAGES ── */}
            <div className="col-12 col-md-6">
              <div className="card h-100 shadow-none border-0 bg-light rounded-3">
                <div className="card-header bg-transparent border-0 py-2 px-3 fw-bold small d-flex align-items-center gap-2 text-primary">
                  <ImageIcon size={15} /> Before Service Images ({ticket.beforeServiceImages?.length || 0})
                </div>
                <div className="card-body p-3">
                  {ticket.beforeServiceImages && ticket.beforeServiceImages.length > 0 ? (
                    <div className="d-flex flex-wrap gap-2">
                      {ticket.beforeServiceImages.map((imgUrl, idx) => (
                        <div
                          key={idx}
                          className="position-relative rounded-2 border overflow-hidden"
                          style={{ width: '85px', height: '85px', cursor: 'pointer', backgroundColor: '#f8fafc' }}
                          onClick={() => setActiveImage(imgUrl)}
                          title="Click to zoom image"
                        >
                          <img
                            src={imgUrl}
                            alt={`Before Service ${idx + 1}`}
                            className="w-100 h-100"
                            style={{ objectFit: 'cover' }}
                          />
                          <div
                            className="position-absolute bottom-0 end-0 p-0.5 bg-dark bg-opacity-50 text-white rounded-start"
                            style={{ fontSize: '0.65rem' }}
                          >
                            <Maximize2 size={10} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-muted text-center py-4 small">No before-service images uploaded.</div>
                  )}
                </div>
              </div>
            </div>

            {/* ── 9. AFTER SERVICE IMAGES ── */}
            <div className="col-12 col-md-6">
              <div className="card h-100 shadow-none border-0 bg-light rounded-3">
                <div className="card-header bg-transparent border-0 py-2 px-3 fw-bold small d-flex align-items-center justify-content-between text-primary">
                  <div className="d-flex align-items-center gap-2">
                    <ImageIcon size={15} /> After Service Images ({ticket.afterServiceImages?.length || 0})
                  </div>
                  {isCompleted && (
                    <label
                      className="btn btn-outline-primary btn-sm py-0 px-2 d-inline-flex align-items-center gap-1"
                      style={{ fontSize: '0.72rem', cursor: uploadingAfterImage ? 'not-allowed' : 'pointer' }}
                    >
                      <Upload size={11} />
                      <span>{uploadingAfterImage ? 'Uploading...' : '+ Add Photos'}</span>
                      <input
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp,image/jpg"
                        onChange={handleAddAfterServiceImages}
                        disabled={uploadingAfterImage}
                        style={{ display: 'none' }}
                      />
                    </label>
                  )}
                </div>
                <div className="card-body p-3">
                  {ticket.afterServiceImages && ticket.afterServiceImages.length > 0 ? (
                    <div className="d-flex flex-wrap gap-2">
                      {ticket.afterServiceImages.map((imgUrl, idx) => (
                        <div
                          key={idx}
                          className="position-relative rounded-2 border overflow-hidden"
                          style={{ width: '85px', height: '85px', cursor: 'pointer', backgroundColor: '#f8fafc' }}
                          onClick={() => setActiveImage(imgUrl)}
                          title="Click to zoom image"
                        >
                          <img
                            src={imgUrl}
                            alt={`After Service ${idx + 1}`}
                            className="w-100 h-100"
                            style={{ objectFit: 'cover' }}
                          />
                          <div
                            className="position-absolute bottom-0 end-0 p-0.5 bg-dark bg-opacity-50 text-white rounded-start"
                            style={{ fontSize: '0.65rem' }}
                          >
                            <Maximize2 size={10} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-muted text-center py-4 small">
                      {isCompleted ? 'No after-service images uploaded.' : 'Uploadable upon service completion.'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="d-flex justify-content-end pt-2 border-top">
            <button type="button" className="erp-btn erp-btn-secondary" onClick={onClose}>
              Close Audit
            </button>
          </div>
        </div>
      </Modal>

      {/* ── IMAGE LIGHTBOX MODAL ── */}
      {activeImage && (
        <Modal
          show={!!activeImage}
          title="Inspect Service Photo"
          onClose={() => setActiveImage(null)}
          size="lg"
        >
          <div className="text-center p-2">
            <img
              src={activeImage}
              alt="Enlarged view"
              className="img-fluid rounded-2 shadow"
              style={{ maxHeight: '70vh', objectFit: 'contain' }}
            />
            <div className="d-flex justify-content-center gap-2 mt-3">
              <a
                href={activeImage}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1"
              >
                <ExternalLink size={13} /> Open Original in New Tab
              </a>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setActiveImage(null)}
              >
                Close Preview
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default TicketDetailModal;
