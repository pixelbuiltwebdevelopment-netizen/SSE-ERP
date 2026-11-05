import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCompany, uploadCompanyFile } from '../../api/companyApi';
import { COUNTRY_LIST, statesOf, districtsOf, regionLabel, districtLabel } from '../../utils/geo';
import PageHeader from '../../components/common/PageHeader';

// Clean inline SVG Icons (no external icon fonts or CDN required)
const UI_ICONS = {
  Camera: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
      <circle cx="12" cy="13" r="4"></circle>
    </svg>
  ),
  Trash: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
  ),
  CloudCheck: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  ),
  Plus: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  )
};

const CompanyCreatePage = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    contactPerson: '',
    company: '',
    country: 'India',
    state: '',
    area: '',
    city: '',
    addressLine1: '',
    pincode: '',
    contactNumber: '',
    alternatePhone: '',
    contactEmail: '',
    status: 'Active',
  });

  const [siteVisitImages, setSiteVisitImages] = useState([]);
  const [uploadingSiteImg, setUploadingSiteImg] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCountryChange = (e) => {
    const val = e.target.value;
    setForm((prev) => ({ ...prev, country: val, state: '', area: '' }));
  };

  const handleStateChange = (e) => {
    const val = e.target.value;
    setForm((prev) => ({ ...prev, state: val, area: '' }));
  };

  // Upload site photos directly to Cloudinary via backend
  const handleSiteImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setUploadingSiteImg(true);
    setError('');
    try {
      for (const file of files) {
        const res = await uploadCompanyFile(file, 'temp', 'site_visits');
        if (res.success && res.data) {
          setSiteVisitImages((prev) => [...prev, res.data]);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload photo to Cloudinary');
    } finally {
      setUploadingSiteImg(false);
      e.target.value = '';
    }
  };

  const removeSiteImage = (index) => {
    setSiteVisitImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.company.trim()) return setError('Company name is required');
    if (!form.contactPerson.trim()) return setError('Contact person name is required');
    if (!form.contactNumber.trim()) return setError('Primary contact phone is required');
    if (!form.contactEmail.trim()) return setError('Contact email address is required');

    setSaving(true);
    setError('');

    try {
      const payload = {
        ...form,
        siteVisitImages,
      };

      const res = await createCompany(payload);
      if (res.success) {
        navigate('/companies');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving company registration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#F4F7FB', minHeight: '100vh', padding: '10px 10px 40px' }}>
      <div className="container-fluid p-0" style={{ maxWidth: '960px', margin: '0 auto' }}>
        
        {/* Page Header with Back Navigation */}
        <PageHeader
          title="Register Company Profile"
          subtitle="Add commercial client and factory locations"
          breadcrumbs={[
            { label: 'Organization' },
            { label: 'Company Profiles', path: '/companies' },
            { label: 'Register Company' },
          ]}
          showBackButton={true}
          backFallback="/companies"
        />

        {/* Global Error Banner */}
        {error && (
          <div
            className="alert d-flex justify-content-between align-items-center p-2.5 mb-2.5 rounded-3 shadow-sm"
            style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', color: '#DC2626', fontSize: '0.80rem' }}
          >
            <div>⚠️ {error}</div>
            <button type="button" className="btn-close btn-close-sm" onClick={() => setError('')}></button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          
          {/* SECTION 1: Client & Company Information */}
          <div
            className="card border-0 shadow-sm rounded-3 p-3 mb-2.5 bg-white"
            style={{ border: '1px solid #E2E8F0' }}
          >
            <div
              className="fw-bold pb-2 mb-2.5 text-uppercase d-flex align-items-center gap-1.5"
              style={{ color: '#087FF5', borderBottom: '1px solid #F1F5F9', fontSize: '0.74rem', letterSpacing: '0.5px' }}
            >
              <span>1. Contact & Company Profile</span>
            </div>

            <div className="row g-2">
              <div className="col-12 col-md-6">
                <label className="form-label fw-bold small text-muted mb-1" style={{ fontSize: '0.72rem' }}>
                  Contact Person Name *
                </label>
                <input
                  type="text"
                  name="contactPerson"
                  className="form-control"
                  placeholder="e.g. Ramesh Kumar"
                  value={form.contactPerson}
                  onChange={handleChange}
                  required
                  style={{ fontSize: '0.84rem', height: '38px', borderRadius: '7px' }}
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label fw-bold small text-muted mb-1" style={{ fontSize: '0.72rem' }}>
                  Company Name *
                </label>
                <input
                  type="text"
                  name="company"
                  className="form-control"
                  placeholder="e.g. Sri Lakshmi Agro Industries"
                  value={form.company}
                  onChange={handleChange}
                  required
                  style={{ fontSize: '0.84rem', height: '38px', borderRadius: '7px' }}
                />
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label fw-bold small text-muted mb-1" style={{ fontSize: '0.72rem' }}>
                  Primary Phone *
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  name="contactNumber"
                  className="form-control font-monospace"
                  placeholder="98480 12345"
                  value={form.contactNumber}
                  onChange={handleChange}
                  required
                  style={{ fontSize: '0.84rem', height: '38px', borderRadius: '7px' }}
                />
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label fw-bold small text-muted mb-1" style={{ fontSize: '0.72rem' }}>
                  Alternate Phone
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  name="alternatePhone"
                  className="form-control font-monospace"
                  placeholder="Optional landline / phone"
                  value={form.alternatePhone}
                  onChange={handleChange}
                  style={{ fontSize: '0.84rem', height: '38px', borderRadius: '7px' }}
                />
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label fw-bold small text-muted mb-1" style={{ fontSize: '0.72rem' }}>
                  Email Address 
                </label>
                <input
                  type="email"
                  inputMode="email"
                  name="contactEmail"
                  className="form-control"
                  placeholder="client@domain.com"
                  value={form.contactEmail}
                  onChange={handleChange}
                  required
                  style={{ fontSize: '0.84rem', height: '38px', borderRadius: '7px' }}
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Address & Geolocation */}
          <div
            className="card border-0 shadow-sm rounded-3 p-3 mb-2.5 bg-white"
            style={{ border: '1px solid #E2E8F0' }}
          >
            <div
              className="fw-bold pb-2 mb-2.5 text-uppercase d-flex align-items-center gap-1.5"
              style={{ color: '#087FF5', borderBottom: '1px solid #F1F5F9', fontSize: '0.74rem', letterSpacing: '0.5px' }}
            >
              <span>2. Address & Plant Location</span>
            </div>

            <div className="row g-2">
              <div className="col-12 col-md-4">
                <label className="form-label fw-bold small text-muted mb-1" style={{ fontSize: '0.72rem' }}>Country</label>
                <select
                  className="form-select"
                  name="country"
                  value={form.country}
                  onChange={handleCountryChange}
                  style={{ fontSize: '0.82rem', height: '38px', borderRadius: '7px' }}
                >
                  {COUNTRY_LIST.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="col-6 col-md-4">
                <label className="form-label fw-bold small text-muted mb-1" style={{ fontSize: '0.72rem' }}>
                  {regionLabel(form.country)} (State)
                </label>
                <select
                  className="form-select"
                  name="state"
                  value={form.state}
                  onChange={handleStateChange}
                  style={{ fontSize: '0.82rem', height: '38px', borderRadius: '7px' }}
                >
                  <option value="">Select State...</option>
                  {statesOf(form.country).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="col-6 col-md-4">
                <label className="form-label fw-bold small text-muted mb-1" style={{ fontSize: '0.72rem' }}>
                  {districtLabel(form.country)} (District)
                </label>
                <select
                  className="form-select"
                  name="area"
                  value={form.area}
                  onChange={handleChange}
                  disabled={!form.state}
                  style={{ fontSize: '0.82rem', height: '38px', borderRadius: '7px' }}
                >
                  <option value="">{form.state ? 'Select District...' : 'Pick State first'}</option>
                  {districtsOf(form.country, form.state).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label fw-bold small text-muted mb-1" style={{ fontSize: '0.72rem' }}>City / Town</label>
                <input
                  type="text"
                  name="city"
                  className="form-control"
                  placeholder="e.g. Warangal"
                  value={form.city}
                  onChange={handleChange}
                  style={{ fontSize: '0.84rem', height: '38px', borderRadius: '7px' }}
                />
              </div>

              <div className="col-8 col-md-5">
                <label className="form-label fw-bold small text-muted mb-1" style={{ fontSize: '0.72rem' }}>Street Address</label>
                <input
                  type="text"
                  name="addressLine1"
                  className="form-control"
                  placeholder="Plot No, Industrial Estate, Survey No."
                  value={form.addressLine1}
                  onChange={handleChange}
                  style={{ fontSize: '0.84rem', height: '38px', borderRadius: '7px' }}
                />
              </div>

              <div className="col-4 col-md-3">
                <label className="form-label fw-bold small text-muted mb-1" style={{ fontSize: '0.72rem' }}>Pincode</label>
                <input
                  type="text"
                  inputMode="numeric"
                  name="pincode"
                  className="form-control font-monospace"
                  placeholder="506001"
                  value={form.pincode}
                  onChange={handleChange}
                  style={{ fontSize: '0.84rem', height: '38px', borderRadius: '7px' }}
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: On-Site Visit Photos (Cloudinary Upload) */}
          <div
            className="card border-0 shadow-sm rounded-3 p-3 mb-2.5 bg-white"
            style={{ border: '1px solid #E2E8F0' }}
          >
            <div
              className="fw-bold pb-2 mb-2 text-uppercase d-flex justify-content-between align-items-center"
              style={{ color: '#087FF5', borderBottom: '1px solid #F1F5F9', fontSize: '0.74rem', letterSpacing: '0.5px' }}
            >
              <span>3. On-Site Inspection Photos ({siteVisitImages.length})</span>
              <span className="badge rounded-pill bg-light text-secondary border fw-normal" style={{ fontSize: '0.65rem' }}>
                Stored to Cloudinary
              </span>
            </div>

            <p className="text-muted small mb-2" style={{ fontSize: '0.72rem' }}>
              Capture the client factory front, machine room, electrical setup, or site overview.
            </p>

            {/* Upload Button */}
            <div className="d-flex align-items-center gap-2">
              <label
                htmlFor="siteCameraUpload"
                className="btn btn-outline-primary d-inline-flex align-items-center justify-content-center gap-1.5 fw-bold px-3 py-2 rounded-2"
                style={{ fontSize: '0.78rem', cursor: uploadingSiteImg ? 'not-allowed' : 'pointer' }}
              >
                <UI_ICONS.Camera />
                <span>{uploadingSiteImg ? 'Uploading...' : 'Take / Upload Photos'}</span>
              </label>
              <input
                id="siteCameraUpload"
                type="file"
                multiple
                accept="image/*"
                capture="environment"
                className="d-none"
                onChange={handleSiteImageUpload}
                disabled={uploadingSiteImg}
              />
              {uploadingSiteImg && (
                <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
              )}
            </div>

            {/* Cloudinary Uploaded Thumbnails Preview */}
            {siteVisitImages.length > 0 && (
              <div className="d-flex flex-wrap gap-2 mt-2.5 pt-2 border-top">
                {siteVisitImages.map((img, i) => (
                  <div
                    key={img.publicId || i}
                    className="position-relative rounded-2 border overflow-hidden shadow-sm"
                    style={{ width: '74px', height: '74px', backgroundColor: '#F8FAFC' }}
                  >
                    <img src={img.url} alt="Site Visit" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => removeSiteImage(i)}
                      className="btn btn-danger p-0 position-absolute top-0 end-0 m-1 rounded-circle d-flex align-items-center justify-content-center"
                      style={{ width: '18px', height: '18px', fontSize: '0.65rem' }}
                      title="Delete Photo"
                    >
                      ✕
                    </button>
                    <div
                      className="position-absolute bottom-0 start-0 w-100 px-1 text-center"
                      style={{ backgroundColor: 'rgba(255,255,255,0.85)', fontSize: '0.55rem', fontWeight: 700 }}
                    >
                      Cloudinary
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions Footer */}
          <div
            className="d-flex justify-content-end gap-2 p-2.5 rounded-3 shadow-sm bg-white"
            style={{ border: '1px solid #E2E8F0' }}
          >
            <button
              type="button"
              className="btn btn-light btn-sm fw-semibold px-3 py-1.5"
              style={{ fontSize: '0.80rem' }}
              onClick={() => navigate('/companies')}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm fw-bold px-4 py-1.5 shadow-sm"
              disabled={saving || uploadingSiteImg}
              style={{ backgroundColor: '#087FF5', borderColor: '#087FF5', fontSize: '0.80rem' }}
            >
              {saving ? 'Saving to Database...' : 'Register Company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanyCreatePage;