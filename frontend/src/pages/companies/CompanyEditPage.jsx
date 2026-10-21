import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCompanyById, updateCompany, uploadCompanyFile } from '../../api/companyApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { COUNTRY_LIST, statesOf, districtsOf, regionLabel, districtLabel } from '../../utils/geo';

const blankMachine = () => ({
  id: `m_${Math.random().toString(36).substring(2, 9)}`,
  machineType: 'Color Sorter',
  model: '',
  version: '',
  numberOfChutes: '',
  serialNumber: '',
  stdOrExp: 'Std',
  manufactureDate: new Date().toISOString().substring(0, 10),
  installationDate: new Date().toISOString().substring(0, 10),
  contract: {
    type: 'Warranty',
    startDate: new Date().toISOString().substring(0, 10),
    endDate: '',
    duration: '1 Year',
    amount: 0,
    visits: 4,
  },
});

const CompanyEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    company: '',
    businessType: '',
    website: '',
    contactPerson: '',
    contactEmail: '',
    contactNumber: '',
    alternatePhone: '',
    country: 'India',
    state: '',
    area: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    pincode: '',
    status: 'Active',
    machines: [],
  });

  const [logo, setLogo] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  useEffect(() => {
    const fetchCompanyData = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await getCompanyById(id);
        if (res.success && res.data) {
          const c = res.data;
          setForm({
            company: c.company || '',
            businessType: c.businessType || '',
            website: c.website || '',
            contactPerson: c.contactPerson || '',
            contactEmail: c.contactEmail || '',
            contactNumber: c.contactNumber || '',
            alternatePhone: c.alternatePhone || '',
            country: c.country || 'India',
            state: c.state || '',
            area: c.area || '',
            addressLine1: c.addressLine1 || '',
            addressLine2: c.addressLine2 || '',
            city: c.city || '',
            pincode: c.pincode || '',
            status: c.status || 'Active',
            machines: c.machines || [],
          });
          setLogo(c.logo || null);
          setDocuments(c.documents || []);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch company profile for editing');
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyData();
  }, [id]);

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

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    setError('');
    try {
      const res = await uploadCompanyFile(file, id, 'logo');
      if (res.success) {
        setLogo(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingDoc(true);
    setError('');
    try {
      const res = await uploadCompanyFile(file, id, 'documents');
      if (res.success) {
        setDocuments((prev) => [...prev, res.data]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploadingDoc(false);
    }
  };

  const addMachine = () => {
    setForm((prev) => ({ ...prev, machines: [...prev.machines, blankMachine()] }));
  };

  const removeMachine = (mid) => {
    setForm((prev) => ({ ...prev, machines: prev.machines.filter((m) => m.id !== mid) }));
  };

  const updateMachine = (mid, field, value) => {
    setForm((prev) => ({
      ...prev,
      machines: prev.machines.map((m) => {
        if (m.id !== mid) return m;
        if (field.startsWith('contract.')) {
          const subField = field.split('.')[1];
          return { ...m, contract: { ...m.contract, [subField]: value } };
        }
        return { ...m, [field]: value };
      }),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.company.trim()) return setError('Company Name is required');
    if (!form.contactPerson.trim()) return setError('Contact Person is required');
    if (!form.contactNumber.trim()) return setError('Contact Number is required');
    if (!form.contactEmail.trim()) return setError('Contact Email is required');

    setSaving(true);
    setError('');

    try {
      const payload = { ...form, logo, documents };
      const res = await updateCompany(id, payload);
      if (res.success) {
        navigate('/companies');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update company profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-5 text-center">
        <LoadingSpinner text="Retrieving company profile..." />
      </div>
    );
  }

  return (
    <div className="erp-form-wrapper">
      <style>{`
        .erp-form-wrapper {
          background-color: #F4F7FB;
          min-height: 100vh;
          padding: 1.25rem 1rem 3rem;
          color: #1E293B;
        }
        @media (min-width: 768px) {
          .erp-form-wrapper { padding: 1.5rem 1.5rem 3.5rem; }
        }
        .erp-card-elevated {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(7, 26, 51, 0.04);
        }
        .erp-section-title {
          font-weight: 700;
          color: #071A33;
          font-size: 1rem;
          border-bottom: 1px solid #E2E8F0;
          padding-bottom: 0.75rem;
          margin-bottom: 1rem;
        }
        .erp-input {
          border-radius: 8px;
          border: 1px solid #E2E8F0;
          height: 38px;
          font-size: 0.875rem;
        }
        .erp-input:focus {
          border-color: #087FF5;
          box-shadow: 0 0 0 3px rgba(8, 127, 245, 0.15);
          outline: none;
        }
        .btn-erp-brand {
          background-color: #087FF5;
          border: 1px solid #087FF5;
          color: #FFFFFF;
          font-weight: 600;
          border-radius: 8px;
          height: 40px;
          padding: 0 1.5rem;
          transition: all 0.2s ease;
        }
        .btn-erp-brand:hover {
          background-color: #1D4ED8;
          transform: translateY(-1px);
        }
      `}</style>

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1" style={{ color: '#071A33' }}>✏️ Edit Company Profile</h3>
          <p className="small mb-0" style={{ color: '#64748B' }}>
            Modify enterprise profile data, contacts, locations, uploaded documents, and machinery fleet.
          </p>
        </div>
        <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate('/companies')}>
          <i className="bi bi-arrow-left me-1"></i> Back
        </button>
      </div>

      {error && (
        <div className="alert p-3 mb-4 rounded-3 d-flex justify-content-between align-items-center" style={{ backgroundColor: '#FEE2E2', color: '#DC2626', borderColor: '#FCA5A5' }}>
          <div><i className="bi bi-exclamation-triangle-fill me-2"></i>{error}</div>
          <button type="button" className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* 1. Company Information */}
        <div className="erp-card-elevated p-3 p-md-4 mb-4">
          <div className="erp-section-title">1. Company Information</div>
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="form-label fw-semibold small">Company Name <span className="text-danger">*</span></label>
              <input type="text" name="company" className="form-control erp-input" value={form.company} onChange={handleChange} required />
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label fw-semibold small">Business Type</label>
              <input type="text" name="businessType" className="form-control erp-input" value={form.businessType} onChange={handleChange} />
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label fw-semibold small">Website</label>
              <input type="url" name="website" className="form-control erp-input" value={form.website} onChange={handleChange} />
            </div>
          </div>
        </div>

        {/* 2. Contact Information */}
        <div className="erp-card-elevated p-3 p-md-4 mb-4">
          <div className="erp-section-title">2. Primary Contact Information</div>
          <div className="row g-3">
            <div className="col-12 col-md-3">
              <label className="form-label fw-semibold small">Contact Person <span className="text-danger">*</span></label>
              <input type="text" name="contactPerson" className="form-control erp-input" value={form.contactPerson} onChange={handleChange} required />
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label fw-semibold small">Contact Email <span className="text-danger">*</span></label>
              <input type="email" name="contactEmail" className="form-control erp-input" value={form.contactEmail} onChange={handleChange} required />
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label fw-semibold small">Contact Phone <span className="text-danger">*</span></label>
              <input type="text" name="contactNumber" className="form-control erp-input" value={form.contactNumber} onChange={handleChange} required />
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label fw-semibold small">Alternate Phone</label>
              <input type="text" name="alternatePhone" className="form-control erp-input" value={form.alternatePhone} onChange={handleChange} />
            </div>
          </div>
        </div>

        {/* 3. Address & Geolocation */}
        <div className="erp-card-elevated p-3 p-md-4 mb-4">
          <div className="erp-section-title">3. Address & Location</div>
          <div className="row g-3">
            <div className="col-12 col-md-4">
              <label className="form-label fw-semibold small">Country</label>
              <select className="form-select erp-input" name="country" value={form.country} onChange={handleCountryChange}>
                {COUNTRY_LIST.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label fw-semibold small">{regionLabel(form.country)}</label>
              <select className="form-select erp-input" name="state" value={form.state} onChange={handleStateChange}>
                <option value="">Select {regionLabel(form.country)}...</option>
                {statesOf(form.country).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label fw-semibold small">{districtLabel(form.country)}</label>
              <select className="form-select erp-input" name="area" value={form.area} onChange={handleChange}>
                <option value="">Select {districtLabel(form.country)}...</option>
                {districtsOf(form.country, form.state).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label fw-semibold small">Address Line 1</label>
              <input type="text" name="addressLine1" className="form-control erp-input" value={form.addressLine1} onChange={handleChange} />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label fw-semibold small">Address Line 2</label>
              <input type="text" name="addressLine2" className="form-control erp-input" value={form.addressLine2} onChange={handleChange} />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label fw-semibold small">City</label>
              <input type="text" name="city" className="form-control erp-input" value={form.city} onChange={handleChange} />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label fw-semibold small">Pincode</label>
              <input type="text" name="pincode" className="form-control erp-input" value={form.pincode} onChange={handleChange} />
            </div>
          </div>
        </div>

        {/* 4. Files & Cloudinary */}
        <div className="erp-card-elevated p-3 p-md-4 mb-4">
          <div className="erp-section-title">4. Logo & Documentation</div>
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="form-label fw-semibold small">Company Logo</label>
              <input type="file" className="form-control erp-input" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} />
              {uploadingLogo && <small className="text-primary d-block mt-1">Uploading logo to Cloudinary...</small>}
              {logo?.url && (
                <div className="mt-2 d-flex align-items-center gap-2">
                  <img src={logo.url} alt="Logo" style={{ maxHeight: '50px' }} className="img-thumbnail" />
                  <small className="text-success fw-semibold">✓ Current Active Logo</small>
                </div>
              )}
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label fw-semibold small">Upload Documents</label>
              <input type="file" className="form-control erp-input" accept=".pdf,.doc,.docx,.xls,.xlsx" onChange={handleDocumentUpload} disabled={uploadingDoc} />
              {uploadingDoc && <small className="text-primary d-block mt-1">Uploading document...</small>}
              {documents.length > 0 && (
                <div className="mt-2">
                  <small className="fw-semibold text-success">{documents.length} document(s) attached</small>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 5. Machines Section */}
        <div className="erp-card-elevated p-3 p-md-4 mb-4">
          <div className="d-flex justify-content-between align-items-center erp-section-title">
            <span>5. Machine Fleet ({form.machines.length})</span>
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={addMachine}>
              + Add Machine
            </button>
          </div>
          {form.machines.length === 0 ? (
            <p className="text-muted small mb-0">No machines registered.</p>
          ) : (
            <div className="d-flex flex-column gap-3">
              {form.machines.map((m, idx) => (
                <div key={m.id} className="border rounded-3 p-3 bg-light position-relative">
                  <button type="button" className="btn-close position-absolute top-0 end-0 m-2.5" onClick={() => removeMachine(m.id)} title="Remove"></button>
                  <h6 className="fw-bold mb-3" style={{ color: '#071A33' }}>Machine #{idx + 1}</h6>
                  <div className="row g-2.5">
                    <div className="col-12 col-md-3">
                      <label className="form-label small fw-semibold">Machine Type</label>
                      <select className="form-select form-select-sm" value={m.machineType} onChange={(e) => updateMachine(m.id, 'machineType', e.target.value)}>
                        <option value="Color Sorter">Color Sorter</option>
                        <option value="Grain Sorter">Grain Sorter</option>
                        <option value="Cleaner">Cleaner</option>
                        <option value="Packer">Packer</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="col-12 col-md-3">
                      <label className="form-label small fw-semibold">Model</label>
                      <input type="text" className="form-control form-control-sm" value={m.model} onChange={(e) => updateMachine(m.id, 'model', e.target.value)} />
                    </div>
                    <div className="col-12 col-md-3">
                      <label className="form-label small fw-semibold">Serial Number</label>
                      <input type="text" className="form-control form-control-sm font-monospace" value={m.serialNumber} onChange={(e) => updateMachine(m.id, 'serialNumber', e.target.value)} />
                    </div>
                    <div className="col-12 col-md-3">
                      <label className="form-label small fw-semibold">Contract Type</label>
                      <select className="form-select form-select-sm" value={m.contract?.type || 'Warranty'} onChange={(e) => updateMachine(m.id, 'contract.type', e.target.value)}>
                        <option value="Warranty">Warranty</option>
                        <option value="AMC">AMC</option>
                        <option value="Out of Warranty">Out of Warranty</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div className="d-flex justify-content-end gap-2">
          <button type="button" className="btn btn-light px-3" onClick={() => navigate('/companies')}>
            Cancel
          </button>
          <button type="submit" className="btn btn-erp-brand" disabled={saving}>
            {saving ? 'Saving Changes...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CompanyEditPage;