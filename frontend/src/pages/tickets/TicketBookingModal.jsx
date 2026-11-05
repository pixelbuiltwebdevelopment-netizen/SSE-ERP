import React, { useState, useEffect, useMemo } from 'react';
import {
  Ticket as TicketIcon,
  Building2,
  Phone,
  User as UserIcon,
  Layers,
  FileText,
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Zap,
  RotateCw,
  Compass,
  FileSpreadsheet,
  Cpu,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import Modal from '../../components/common/Modal';
import { erpApi } from '../../api/erpApi';

const TICKET_TYPES = [
  {
    id: 'Normal Ticket',
    name: 'Normal Ticket',
    description: 'Standard on-site routine diagnostics & general servicing',
    icon: TicketIcon,
    color: '#0284c7',
    bg: '#f0f9ff',
  },
  {
    id: 'Rewinding Ticket',
    name: 'Rewinding Ticket',
    description: 'Motor coil rewinding, HP/RPM diagnostics & rebuilds',
    icon: RotateCw,
    color: '#d97706',
    bg: '#fffbeb',
  },
  {
    id: 'Out Door Ticket',
    name: 'Out Door Ticket',
    description: 'External field callouts for mills, outdoor client installations',
    icon: Compass,
    color: '#0d9488',
    bg: '#f0fdfa',
  },
  {
    id: 'AMC Ticket',
    name: 'AMC Ticket',
    description: 'Annual Maintenance Contract scheduled service & inspection',
    icon: FileSpreadsheet,
    color: '#7c3aed',
    bg: '#f5f3ff',
  },
  {
    id: 'Panel Board Ticket',
    name: 'Panel Board Ticket',
    description: 'Control panel, switchgear wiring & mill automation issues',
    icon: Cpu,
    color: '#4f46e5',
    bg: '#eef2ff',
  },
];

const UNITS = ['Round Silo', 'Mill', 'Plant', 'Boiler'];

const HP_OPTIONS = [
  '1', '1.5', '2', '3', '5', '7.5', '10', '12.5', '15', '20',
  '25', '30', '40', '50', '60', '75', '100', '120', '150', '180', '200'
];

const RPM_OPTIONS = ['720', '960', '1440', '2800'];

const TicketBookingModal = ({ show, onClose, onCreated, companies = [], initialCompanyId = null }) => {
  const [selectedType, setSelectedType] = useState(null);
  const [companySearch, setCompanySearch] = useState('');
  const [formData, setFormData] = useState({
    companyId: '',
    contactPerson: '',
    phoneNumber: '',
    unit: 'Plant',
    priority: 'Medium',
    subject: '',
    description: '',
    hp: '',
    rpm: '',
    millName: '',
    beforeServiceImages: [],
  });

  const [selectedCompany, setSelectedCompany] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Handle pre-selection of company if opened with initialCompanyId
  useEffect(() => {
    if (show && initialCompanyId && companies.length > 0) {
      const comp = companies.find((c) => c._id === initialCompanyId);
      if (comp) {
        setSelectedCompany(comp);
        setFormData((prev) => ({
          ...prev,
          companyId: comp._id,
          contactPerson: comp.contactPerson || prev.contactPerson,
          phoneNumber: comp.contactNumber || prev.phoneNumber,
        }));
      }
    }
  }, [show, initialCompanyId, companies]);

  // Filter companies by search
  const filteredCompanies = useMemo(() => {
    if (!companySearch.trim()) return companies;
    const q = companySearch.toLowerCase();
    return companies.filter(
      (c) =>
        (c.company && c.company.toLowerCase().includes(q)) ||
        (c.profileCode && c.profileCode.toLowerCase().includes(q)) ||
        (c.city && c.city.toLowerCase().includes(q))
    );
  }, [companies, companySearch]);

  const handleSelectCompany = (companyId) => {
    const comp = companies.find((c) => c._id === companyId);
    if (comp) {
      setSelectedCompany(comp);
      setFormData((prev) => ({
        ...prev,
        companyId: comp._id,
        contactPerson: comp.contactPerson || prev.contactPerson,
        phoneNumber: comp.contactNumber || prev.phoneNumber,
      }));
    } else {
      setSelectedCompany(null);
      setFormData((prev) => ({ ...prev, companyId: '' }));
    }
  };

  const handleSelectType = (typeId) => {
    setSelectedType(typeId);
    setErrorMsg('');
  };

  // Image Upload Handler
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    // Validate mime types and sizes
    const validFiles = [];
    for (const file of files) {
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype || file.type)) {
        setErrorMsg(`"${file.name}" is not a supported format. Please upload JPG, PNG, or WEBP.`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg(`"${file.name}" exceeds the 10MB size limit.`);
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
      setFormData((prev) => ({
        ...prev,
        beforeServiceImages: [...prev.beforeServiceImages, ...uploadedUrls],
      }));
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
      // Reset input value so same file can be re-selected if desired
      e.target.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      beforeServiceImages: prev.beforeServiceImages.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedType) {
      setErrorMsg('Please select a ticket type first.');
      return;
    }
    if (!formData.companyId) {
      setErrorMsg('Please select a client company profile.');
      return;
    }
    if (!formData.contactPerson.trim()) {
      setErrorMsg('Contact person name is required.');
      return;
    }
    if (!formData.phoneNumber.trim()) {
      setErrorMsg('Phone number is required.');
      return;
    }
    if (!formData.unit) {
      setErrorMsg('Unit selection is required.');
      return;
    }

    // Dynamic Validations
    if (selectedType === 'Rewinding Ticket' || selectedType === 'AMC Ticket') {
      if (!formData.hp) {
        setErrorMsg(`HP (Horsepower) is mandatory for ${selectedType}.`);
        return;
      }
      if (!formData.rpm) {
        setErrorMsg(`RPM is mandatory for ${selectedType}.`);
        return;
      }
    }

    if (selectedType === 'Out Door Ticket' || selectedType === 'Panel Board Ticket') {
      if (!formData.millName.trim()) {
        setErrorMsg(`Mill Name is mandatory for ${selectedType}.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      await erpApi.createTicket({
        ticketType: selectedType,
        ...formData,
      });

      // Reset Form
      setSelectedType(null);
      setSelectedCompany(null);
      setFormData({
        companyId: '',
        contactPerson: '',
        phoneNumber: '',
        unit: 'Plant',
        priority: 'Medium',
        subject: '',
        description: '',
        hp: '',
        rpm: '',
        millName: '',
        beforeServiceImages: [],
      });
      onCreated();
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to create ticket. Please check input fields.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetModal = () => {
    setSelectedType(null);
    setSelectedCompany(null);
    setErrorMsg('');
    onClose();
  };

  return (
    <Modal
      show={show}
      title="Book Service Ticket"
      onClose={handleResetModal}
      size="lg"
      icon={TicketIcon}
    >
      <div>
        {errorMsg && (
          <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 mb-3 small" role="alert">
            <AlertCircle size={16} className="flex-shrink-0" />
            <div>{errorMsg}</div>
          </div>
        )}

        {/* ── STEP 1: Ticket Type Selection ── */}
        <div className="mb-4">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <label className="erp-label mb-0 fw-bold" style={{ fontSize: '0.85rem' }}>
              Step 1: Select Ticket Type <span className="text-danger">*</span>
            </label>
            {selectedType && (
              <span className="badge bg-primary-subtle text-primary border border-primary small px-2 py-1">
                Selected: {selectedType}
              </span>
            )}
          </div>

          <div className="row g-2">
            {TICKET_TYPES.map((t) => {
              const Icon = t.icon;
              const isSelected = selectedType === t.id;
              return (
                <div key={t.id} className="col-12 col-sm-6 col-md-4">
                  <div
                    onClick={() => handleSelectType(t.id)}
                    className="p-2.5 rounded-3 border transition-all h-100"
                    style={{
                      cursor: 'pointer',
                      borderColor: isSelected ? t.color : 'var(--erp-border-color, #e2e8f0)',
                      backgroundColor: isSelected ? t.bg : '#ffffff',
                      boxShadow: isSelected ? `0 0 0 2px ${t.color}30` : 'none',
                    }}
                  >
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <div
                        className="rounded-2 p-1.5 d-flex align-items-center justify-content-center"
                        style={{ backgroundColor: `${t.color}18`, color: t.color }}
                      >
                        <Icon size={16} />
                      </div>
                      <div className="fw-bold small" style={{ color: isSelected ? t.color : 'inherit' }}>
                        {t.name}
                      </div>
                      {isSelected && <CheckCircle size={14} className="ms-auto" style={{ color: t.color }} />}
                    </div>
                    <p className="text-muted small mb-0" style={{ fontSize: '0.72rem', lineHeight: 1.3 }}>
                      {t.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── STEP 2: Dynamic Form Fields ── */}
        {!selectedType ? (
          <div className="text-center py-4 bg-light rounded-3 border-0 text-muted small">
            <Zap size={22} className="text-primary mb-1 d-block mx-auto opacity-50" />
            Please select a <strong>Ticket Type</strong> above to display the corresponding service form fields.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="erp-fade-in">
            <div className="p-3 bg-light rounded-3 border-0 mb-3">
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="fw-bold small text-primary">Step 2: Service Ticket Specifications</span>
                <span className="text-muted small">({selectedType})</span>
              </div>

              <div className="row g-3">
                {/* 1. Company Profile Searchable Dropdown */}
                <div className="col-12 col-md-6">
                  <label className="erp-label">
                    Company Profile <span className="text-danger">*</span>
                  </label>
                  <div className="mb-1">
                    <input
                      type="text"
                      className="erp-input mb-1"
                      placeholder="Quick filter companies..."
                      value={companySearch}
                      onChange={(e) => setCompanySearch(e.target.value)}
                      style={{ fontSize: '0.8rem' }}
                    />
                  </div>
                  <select
                    className="erp-select"
                    value={formData.companyId}
                    onChange={(e) => handleSelectCompany(e.target.value)}
                    required
                  >
                    <option value="">Choose Company Profile ({filteredCompanies.length})...</option>
                    {filteredCompanies.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.company || c.name} {c.city ? `(${c.city})` : ''} {c.profileCode ? `[${c.profileCode}]` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Unit Dropdown (Common: Round Silo, Mill, Plant, Boiler) */}
                <div className="col-12 col-md-6">
                  <label className="erp-label">
                    Unit <span className="text-danger">*</span>
                  </label>
                  <select
                    className="erp-select"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    required
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority Selection */}
                <div className="col-12 col-md-6">
                  <label className="erp-label">
                    Priority
                  </label>
                  <select
                    className="erp-select"
                    value={formData.priority || 'Medium'}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                {/* Display Company Profile Information Card when selected */}
                {selectedCompany && (
                  <div className="col-12">
                    <div
                      className="p-2.5 rounded-2 border d-flex flex-wrap align-items-center justify-content-between gap-2 small"
                      style={{ backgroundColor: '#ffffff', fontSize: '0.75rem' }}
                    >
                      <div>
                        <span className="text-muted">Selected Profile: </span>
                        <strong>{selectedCompany.company}</strong>{' '}
                        {selectedCompany.profileCode && (
                          <span className="badge bg-secondary-subtle text-secondary font-monospace">
                            {selectedCompany.profileCode}
                          </span>
                        )}
                      </div>
                      <div className="text-muted">
                        <Building2 size={13} className="me-1 inline" />
                        {[selectedCompany.addressLine1, selectedCompany.area, selectedCompany.city, selectedCompany.state]
                          .filter(Boolean)
                          .join(', ') || 'No address logged'}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Contact Person Name */}
                <div className="col-12 col-md-6">
                  <label className="erp-label">
                    Contact Person Name <span className="text-danger">*</span>
                  </label>
                  <div className="erp-input-group">
                    <input
                      type="text"
                      className="erp-input"
                      placeholder="Contact person at client site"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* 4. Phone Number */}
                <div className="col-12 col-md-6">
                  <label className="erp-label">
                    Phone Number <span className="text-danger">*</span>
                  </label>
                  <input
                    type="tel"
                    className="erp-input"
                    placeholder="Mobile number for dispatch"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    required
                  />
                </div>

                {/* ── CONDITIONAL FIELDS BASED ON TICKET TYPE ── */}

                {/* Rewinding Ticket & AMC Ticket: HP and RPM */}
                {(selectedType === 'Rewinding Ticket' || selectedType === 'AMC Ticket') && (
                  <>
                    <div className="col-12 col-md-6">
                      <label className="erp-label">
                        HP (Horsepower) <span className="text-danger">*</span>
                      </label>
                      <select
                        className="erp-select"
                        value={formData.hp}
                        onChange={(e) => setFormData({ ...formData, hp: e.target.value })}
                        required
                      >
                        <option value="">Select Motor HP...</option>
                        {HP_OPTIONS.map((hpVal) => (
                          <option key={hpVal} value={hpVal}>
                            {hpVal} HP
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="erp-label">
                        RPM <span className="text-danger">*</span>
                      </label>
                      <select
                        className="erp-select"
                        value={formData.rpm}
                        onChange={(e) => setFormData({ ...formData, rpm: e.target.value })}
                        required
                      >
                        <option value="">Select Motor RPM...</option>
                        {RPM_OPTIONS.map((rpmVal) => (
                          <option key={rpmVal} value={rpmVal}>
                            {rpmVal} RPM
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* Out Door Ticket & Panel Board Ticket: Mill Name */}
                {(selectedType === 'Out Door Ticket' || selectedType === 'Panel Board Ticket') && (
                  <div className="col-12">
                    <label className="erp-label">
                      Mill Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="erp-input"
                      placeholder="e.g. Hyderabad Modern Rice Mill #2"
                      value={formData.millName}
                      onChange={(e) => setFormData({ ...formData, millName: e.target.value })}
                      required
                    />
                  </div>
                )}

                {/* Subject / Fault Overview */}
                <div className="col-12">
                  <label className="erp-label">Fault / Service Issue Subject</label>
                  <input
                    type="text"
                    className="erp-input"
                    placeholder={`e.g. ${selectedType} inspection on ${formData.unit}`}
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  />
                  <small className="text-muted" style={{ fontSize: '0.72rem' }}>
                    Optional: If left blank, automatically generated as &quot;{selectedType} - {formData.unit}&quot;
                  </small>
                </div>

                {/* Description */}
                <div className="col-12">
                  <label className="erp-label">Issue Description & Symptoms</label>
                  <textarea
                    className="erp-textarea"
                    rows={3}
                    placeholder="Enter detailed fault symptoms, breakdown observations, or service checklist requirements..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                {/* ── BEFORE SERVICE IMAGE UPLOAD ── */}
                <div className="col-12">
                  <label className="erp-label d-flex align-items-center justify-content-between">
                    <span>Before Service Images (Optional)</span>
                    <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                      JPG, JPEG, PNG, WEBP (Max 10MB)
                    </span>
                  </label>

                  <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
                    <label
                      className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1.5"
                      style={{ cursor: uploadingImage ? 'not-allowed' : 'pointer' }}
                    >
                      <Upload size={14} />
                      <span>{uploadingImage ? 'Uploading Photos...' : 'Upload Photos'}</span>
                      <input
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp,image/jpg"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                        style={{ display: 'none' }}
                      />
                    </label>

                    {formData.beforeServiceImages.length > 0 && (
                      <span className="text-muted small">
                        {formData.beforeServiceImages.length} image(s) attached
                      </span>
                    )}
                  </div>

                  {/* Thumbnail Gallery Preview */}
                  {formData.beforeServiceImages.length > 0 && (
                    <div className="d-flex flex-wrap gap-2 mt-2">
                      {formData.beforeServiceImages.map((imgUrl, idx) => (
                        <div
                          key={idx}
                          className="position-relative rounded-2 border overflow-hidden"
                          style={{ width: '70px', height: '70px', backgroundColor: '#f8fafc' }}
                        >
                          <img
                            src={imgUrl}
                            alt={`Preview ${idx + 1}`}
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
              </div>
            </div>

            {/* Modal Action Buttons */}
            <div className="d-flex justify-content-between align-items-center pt-2 border-top">
              <button
                type="button"
                className="erp-btn erp-btn-secondary"
                onClick={() => setSelectedType(null)}
              >
                <ArrowLeft size={14} /> Back to Types
              </button>

              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="erp-btn erp-btn-ghost"
                  onClick={handleResetModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="erp-btn erp-btn-primary"
                  disabled={submitting || uploadingImage}
                >
                  {submitting ? 'Creating Ticket...' : 'Confirm & Book Ticket'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};

export default TicketBookingModal;
