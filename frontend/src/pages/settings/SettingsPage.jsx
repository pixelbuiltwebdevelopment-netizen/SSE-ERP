import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../api/authApi';
import { userApi } from '../../api/userApi';
import { useDispatch } from 'react-redux';
import { fetchCurrentUser } from '../../store/slices/authSlice';

const SettingsPage = () => {
  const { user, token } = useAuth();
  const dispatch = useDispatch();

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
      const res = await authApi.updateProfile({ name, email, phone });
      setProfileMessage('Profile updated successfully!');
      // Update local state if the backend returns updated user or just patch it
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

    setPasswordLoading(true);
    setPasswordError('');
    setPasswordMessage('');

    try {
      const res = await authApi.changePassword({ oldPassword, newPassword });
      setPasswordMessage(res.data?.message || 'Password changed successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="container-fluid py-2">
      <h4 className="fw-bold text-dark mb-4">Account Settings</h4>
      
      <div className="row">
        {/* Profile Settings */}
        <div className="col-12 col-xl-6 mb-4">
          <div className="custom-card h-100">
            <div className="card-header bg-white border-bottom py-3">
              <h5 className="mb-0 fw-bold d-flex align-items-center">
                <i className="bi bi-person-circle text-primary me-2"></i> Profile Information
              </h5>
            </div>
            <div className="card-body p-4">
              {profileError && <div className="alert alert-danger py-2 small">{profileError}</div>}
              {profileMessage && <div className="alert alert-success py-2 small">{profileMessage}</div>}

              <form onSubmit={handleProfileSubmit}>
                <div className="mb-3">
                  <label className="form-label fw-semibold text-secondary small">Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold text-secondary small">Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="form-label fw-semibold text-secondary small">Phone Number</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 234 567 8900"
                  />
                </div>
                <button type="submit" className="btn btn-primary fw-bold" disabled={profileLoading}>
                  {profileLoading ? (
                    <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="col-12 col-xl-6 mb-4">
          <div className="custom-card h-100">
            <div className="card-header bg-white border-bottom py-3">
              <h5 className="mb-0 fw-bold d-flex align-items-center">
                <i className="bi bi-shield-lock-fill text-danger me-2"></i> Security (Change Password)
              </h5>
            </div>
            <div className="card-body p-4">
              {passwordError && <div className="alert alert-danger py-2 small">{passwordError}</div>}
              {passwordMessage && <div className="alert alert-success py-2 small">{passwordMessage}</div>}

              <form onSubmit={handlePasswordSubmit}>
                <div className="mb-3">
                  <label className="form-label fw-semibold text-secondary small">Current Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold text-secondary small">New Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div className="mb-4">
                  <label className="form-label fw-semibold text-secondary small">Confirm New Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-danger fw-bold" disabled={passwordLoading}>
                  {passwordLoading ? (
                    <><span className="spinner-border spinner-border-sm me-2"></span>Updating...</>
                  ) : (
                    'Update Password'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
