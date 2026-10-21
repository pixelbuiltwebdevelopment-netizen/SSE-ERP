import React, { useState, useEffect } from 'react';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { getCompanyById } from '../../api/companyApi';

const CompanyDetailPage = ({ companyId, show, onClose }) => {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    if (!companyId) return;

    const fetchDetails = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await getCompanyById(companyId);
        if (res.success) {
          setCompany(res.data);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load company profile details');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [companyId]);

  if (!show) return null;

  return (
    <Modal
      show={show}
      title={company ? `🏢 ${company.company} (${company.profileCode || 'COMP'})` : 'Company Details'}
      onClose={onClose}
      size="lg"
    >
      {loading ? (
        <div className="py-5 text-center">
          <LoadingSpinner text="Retrieving profile records..." />
        </div>
      ) : error ? (
        <div className="alert alert-danger p-2 small">{error}</div>
      ) : !company ? (
        <div className="text-muted text-center py-4 small">No data found</div>
      ) : (
        <div>
          {/* Header Summary */}
          <div
            className="d-flex justify-content-between align-items-center p-2.5 rounded-3 mb-2.5"
            style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}
          >
            <div>
              <h6 className="fw-bold mb-0 text-dark" style={{ fontSize: '0.94rem' }}>{company.company}</h6>
              <span className="small text-muted" style={{ fontSize: '0.72rem' }}>
                Contact: <strong className="text-dark">{company.contactPerson}</strong> | Phone:{' '}
                <strong className="font-monospace text-primary">{company.contactNumber}</strong>
              </span>
            </div>
            <span
              className={`badge rounded-pill fw-bold ${
                company.status === 'Disabled' ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success'
              }`}
              style={{ fontSize: '0.68rem', border: '1px solid currentColor' }}
            >
              {company.status}
            </span>
          </div>

          {/* Navigation Pill Bar */}
          <div className="d-flex gap-1 mb-3 bg-light p-1 rounded-2">
            {[
              { id: 'info', label: 'Company Info' },
              { id: 'site_photos', label: `Site Photos (${company.siteVisitImages?.length || 0})` },
              { id: 'machines', label: `Machines & Feedback (${company.machines?.length || 0})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className="btn btn-sm flex-fill fw-bold rounded-2"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  fontSize: '0.74rem',
                  backgroundColor: activeTab === tab.id ? '#087FF5' : 'transparent',
                  color: activeTab === tab.id ? '#FFFFFF' : '#64748B',
                  border: 'none',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: General Info & Address */}
          {activeTab === 'info' && (
            <div className="p-2.5 rounded-2 border bg-white" style={{ borderColor: '#E2E8F0' }}>
              <div className="row g-2 small text-dark" style={{ fontSize: '0.78rem' }}>
                <div className="col-6 col-md-4">
                  <span className="text-muted d-block" style={{ fontSize: '0.68rem' }}>Contact Person</span>
                  <span className="fw-semibold">{company.contactPerson}</span>
                </div>
                <div className="col-6 col-md-4">
                  <span className="text-muted d-block" style={{ fontSize: '0.68rem' }}>Primary Phone</span>
                  <span className="font-monospace fw-semibold">{company.contactNumber}</span>
                </div>
                <div className="col-6 col-md-4">
                  <span className="text-muted d-block" style={{ fontSize: '0.68rem' }}>Alternate Phone</span>
                  <span className="font-monospace">{company.alternatePhone || '—'}</span>
                </div>
                <div className="col-12 col-md-6">
                  <span className="text-muted d-block" style={{ fontSize: '0.68rem' }}>Email Address</span>
                  <span className="fw-semibold text-primary">{company.contactEmail}</span>
                </div>
                <div className="col-12 col-md-6">
                  <span className="text-muted d-block" style={{ fontSize: '0.68rem' }}>District & State</span>
                  <span>{[company.area, company.state, company.country].filter(Boolean).join(', ')}</span>
                </div>
                <div className="col-12">
                  <span className="text-muted d-block" style={{ fontSize: '0.68rem' }}>Full Address</span>
                  <span>{[company.addressLine1, company.city, company.pincode].filter(Boolean).join(', ') || '—'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Site Visit Photos */}
          {activeTab === 'site_photos' && (
            <div>
              {!company.siteVisitImages || company.siteVisitImages.length === 0 ? (
                <div className="text-center py-4 text-muted small" style={{ fontSize: '0.76rem' }}>
                  No plant/premises visit photos uploaded.
                </div>
              ) : (
                <div className="d-flex flex-wrap gap-2">
                  {company.siteVisitImages.map((img, i) => (
                    <a
                      key={img.publicId || i}
                      href={img.url}
                      target="_blank"
                      rel="noreferrer"
                      className="border rounded-2 overflow-hidden shadow-sm d-inline-block"
                      style={{ width: '100px', height: '100px', backgroundColor: '#F8FAFC' }}
                    >
                      <img src={img.url} alt="Site Visit" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Machines & Feedback */}
          {activeTab === 'machines' && (
            <div>
              {!company.machines || company.machines.length === 0 ? (
                <div className="text-center py-4 text-muted small" style={{ fontSize: '0.76rem' }}>
                  No machines recorded for this customer.
                </div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {company.machines.map((m, idx) => (
                    <div
                      key={m.id || idx}
                      className="border rounded-3 p-2.5"
                      style={{ backgroundColor: '#FBFDFF', borderColor: '#E2E8F0' }}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-1.5">
                        <h6 className="fw-bold mb-0 text-dark" style={{ fontSize: '0.82rem' }}>
                          #{idx + 1} {m.machineType} {m.model && `· ${m.model}`}
                        </h6>
                        <span className="badge bg-primary" style={{ fontSize: '0.64rem' }}>
                          {m.contractType || 'Warranty'}
                        </span>
                      </div>

                      <div className="row g-1 text-muted small mb-2" style={{ fontSize: '0.72rem' }}>
                        <div className="col-6">
                          Serial No: <strong className="text-dark font-monospace">{m.serialNumber || 'N/A'}</strong>
                        </div>
                        <div className="col-6">
                          Condition: <strong className="text-dark">{m.feedback?.condition || 'Good'}</strong>
                        </div>
                      </div>

                      {/* Feedback Remarks */}
                      {m.feedback && (
                        <div className="bg-light p-2 rounded-2 border small" style={{ fontSize: '0.74rem' }}>
                          <div className="d-flex justify-content-between mb-1">
                            <span className="fw-bold text-dark">Rating: {'⭐'.repeat(m.feedback.rating || 5)}</span>
                          </div>
                          {m.feedback.operatorFeedback && (
                            <div className="mb-0.5">
                              <span className="text-muted">Operator:</span> {m.feedback.operatorFeedback}
                            </div>
                          )}
                          {m.feedback.remarks && (
                            <div>
                              <span className="text-muted">Engineer Remarks:</span> {m.feedback.remarks}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Machine Photos */}
                      {m.visitImages && m.visitImages.length > 0 && (
                        <div className="d-flex flex-wrap gap-1.5 mt-2">
                          {m.visitImages.map((img, i) => (
                            <a
                              key={img.publicId || i}
                              href={img.url}
                              target="_blank"
                              rel="noreferrer"
                              className="border rounded overflow-hidden"
                              style={{ width: '50px', height: '50px' }}
                            >
                              <img src={img.url} alt="Machine" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default CompanyDetailPage;