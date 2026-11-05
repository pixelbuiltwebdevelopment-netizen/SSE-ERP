import React, { useState } from 'react';
import { User, Lock, Shield, Mail, Phone, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../api/authApi';
import { useDispatch } from 'react-redux';
import { fetchCurrentUser } from '../../store/slices/authSlice';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';

const SettingsPage = () => {
  const { user } = useAuth();
  const dispatch = useDispatch();

  const [activeTab, setActiveTab] = useState('profile');

  // Profile Form State
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileMessage, setProfileMessage] = useState('');

  // Password Form State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError('');
    setProfileMessage('');

    try {
      await authApi.updateProfile({ name, email, phone });
      setProfileMessage('Profile information updated successfully!');
      dispatch(fetchCurrentUser());
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return;
    }

    setPasswordLoading(true);
    setPasswordError('');
    setPasswordMessage('');

    try {
      const res = await authApi.changePassword({ oldPassword, newPassword });
      setPasswordMessage(res.data?.message || 'Security password changed successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password. Verify your current password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="erp-fade-in pb-4">
      {/* ── Page Header ── */}
      <PageHeader
        title="Enterprise Account Settings"
        subtitle="Manage your personal profile details, contact preferences, and cryptographic credentials"
        breadcrumbs={[{ label: 'Workspace' }, { label: 'Settings' }]}
      />

      {/* ── User Identity Capsule ── */}
      <div className="erp-card p-4 mb-4">
        <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-3">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-sm"
              style={{
                width: '54px',
                height: '54px',
                backgroundColor: 'var(--erp-primary)',
                fontSize: '1.25rem',
              }}
            >
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <h5 className="fw-bold mb-1" style={{ color: 'var(--erp-text-main)' }}>
                {user?.name || 'Administrator'}
              </h5>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <span className="text-muted small">{user?.email}</span>
                <span className="text-muted small">•</span>
                <StatusBadge status={user?.roleId?.name || 'Authorized Staff'} size="sm" />
                <StatusBadge status={user?.isActive ? 'Active' : 'Inactive'} size="sm" />
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-3 bg-light text-muted small border-0" style={{ fontSize: '0.75rem' }}>
            <div><strong>Emp ID:</strong> {user?.employeeId || 'EMP-001'}</div>
            <div><strong>Department:</strong> {user?.departmentId?.name || 'Sales Department'}</div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="erp-tabs-nav mb-4">
        <button
          type="button"
          className={`erp-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <User size={16} />
          <span>Profile Information</span>
        </button>
        <button
          type="button"
          className={`erp-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <Lock size={16} />
          <span>Security & Password</span>
        </button>
      </div>

      {/* ── Tab 1: Profile Form ── */}
      {activeTab === 'profile' && (
        <div className="erp-card p-4 erp-fade-in" style={{ maxWidth: '720px' }}>
          <h5 className="fw-bold mb-3" style={{ color: 'var(--erp-text-main)', fontSize: '1rem' }}>
            Personal Details
          </h5>

          {profileMessage && (
            <div className="alert alert-success small py-2 px-3 mb-3 border-0 d-flex align-items-center gap-2">
              <CheckCircle2 size={16} /> <span>{profileMessage}</span>
            </div>
          )}

          {profileError && (
            <div className="alert alert-danger small py-2 px-3 mb-3 border-0 d-flex align-items-center gap-2">
              <AlertCircle size={16} /> <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleProfileSubmit}>
            <div className="mb-3">
              <label className="erp-label">Full Name</label>
              <input
                type="text"
                className="erp-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="mb-3">
              <label className="erp-label">Corporate Email</label>
              <input
                type="email"
                className="erp-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="mb-4">
              <label className="erp-label">Phone Number</label>
              <input
                type="text"
                className="erp-input"
                placeholder="e.g. 9848012345"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="d-flex justify-content-end">
              <button
                type="submit"
                className="erp-btn erp-btn-primary"
                disabled={profileLoading}
              >
                {profileLoading ? 'Saving Changes...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Tab 2: Security & Password Form ── */}
      {activeTab === 'security' && (
        <div className="erp-card p-4 erp-fade-in" style={{ maxWidth: '720px' }}>
          <h5 className="fw-bold mb-3" style={{ color: 'var(--erp-text-main)', fontSize: '1rem' }}>
            Change Account Password
          </h5>

          {passwordMessage && (
            <div className="alert alert-success small py-2 px-3 mb-3 border-0 d-flex align-items-center gap-2">
              <CheckCircle2 size={16} /> <span>{passwordMessage}</span>
            </div>
          )}

          {passwordError && (
            <div className="alert alert-danger small py-2 px-3 mb-3 border-0 d-flex align-items-center gap-2">
              <AlertCircle size={16} /> <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit}>
            <div className="mb-3">
              <label className="erp-label">Current Password</label>
              <input
                type="password"
                className="erp-input"
                placeholder="Enter existing password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
              />
            </div>

            <div className="mb-3">
              <label className="erp-label">New Password</label>
              <input
                type="password"
                className="erp-input"
                placeholder="Min 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div className="mb-4">
              <label className="erp-label">Confirm New Password</label>
              <input
                type="password"
                className="erp-input"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <div className="d-flex justify-content-end">
              <button
                type="submit"
                className="erp-btn erp-btn-primary"
                disabled={passwordLoading}
              >
                {passwordLoading ? 'Updating Password...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
