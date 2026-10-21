import React, { useState, useEffect } from 'react';
import { expenseApi } from '../../api/expenseApi';
import { userApi } from '../../api/userApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';

const AdvanceManagementPage = () => {
  const [balances, setBalances] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [modal, setModal] = useState({ show: false, userId: '', amount: '', notes: '' });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const userRes = await userApi.getUsers({ limit: 500 });
      if (userRes.data.success) {
        setUsers(userRes.data.data.users.filter(u => u.isActive));
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('Could not fetch employees. Do you have permission to view users?');
    }

    try {
      const balRes = await expenseApi.getAllBalances();
      if (balRes.data.success) {
        setBalances(balRes.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch balances:', err);
      if (!error) setError('Could not fetch ledger balances.');
    } finally {
      setLoading(false);
    }
  };

  const handleIssueAdvance = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setError('');
    try {
      await expenseApi.issueAdvance({ 
        userId: modal.userId, 
        amount: Number(modal.amount), 
        notes: modal.notes 
      });
      setModal({ show: false, userId: '', amount: '', notes: '' });
      fetchData(); // Refresh the ledger table
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to issue advance');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="container-fluid py-2">
      <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3">
        <div>
          <h3 className="fw-bold text-dark mb-1">🏦 Advance Management</h3>
          <p className="text-muted small mb-0">Issue advance funds and view employee ledger balances.</p>
        </div>
        <button 
          className="btn btn-primary fw-bold shadow-sm"
          onClick={() => setModal({ show: true, userId: '', amount: '', notes: '' })}
        >
          <i className="bi bi-plus-circle me-2"></i>Issue Advance
        </button>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {loading ? (
            <LoadingSpinner text="Loading ledger balances..." />
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-dark">
                  <tr>
                    <th>Employee</th>
                    <th>Employee ID</th>
                    <th className="text-end">Total Received (₹)</th>
                    <th className="text-end text-danger">Total Deducted (₹)</th>
                    <th className="text-end text-success fs-6">Current Balance (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {balances.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-muted">
                        No advance records found. Issue an advance to get started.
                      </td>
                    </tr>
                  ) : (
                    balances.map(record => (
                      <tr key={record._id}>
                        <td>
                          <div className="fw-bold text-dark">{record.userId?.name}</div>
                          <small className="text-muted">{record.userId?.email}</small>
                        </td>
                        <td>{record.userId?.employeeId || '-'}</td>
                        <td className="text-end fw-semibold text-muted">
                          {record.totalAdvanceReceived.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="text-end fw-semibold text-danger">
                          -{record.totalExpensesDeducted.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="text-end fw-bold text-success fs-6 bg-light">
                          {record.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Issue Advance Modal */}
      <Modal show={modal.show} title="Issue Advance to Employee" onClose={() => setModal({ ...modal, show: false })}>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        <form onSubmit={handleIssueAdvance}>
          <div className="mb-3">
            <label className="form-label fw-semibold">Select Employee</label>
            <select
              className="form-select"
              value={modal.userId}
              onChange={(e) => setModal({ ...modal, userId: e.target.value })}
              required
            >
              <option value="">-- Choose an employee --</option>
              {users.map(u => (
                <option key={u._id} value={u._id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label fw-semibold">Advance Amount (₹)</label>
            <input
              type="number"
              min="1"
              step="0.01"
              className="form-control fw-bold fs-5 text-success"
              value={modal.amount}
              onChange={(e) => setModal({ ...modal, amount: e.target.value })}
              required
              placeholder="0.00"
            />
          </div>
          <div className="mb-4">
            <label className="form-label fw-semibold">Notes / Reason (Optional)</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Travel advance for Q3 Summit..."
              value={modal.notes}
              onChange={(e) => setModal({ ...modal, notes: e.target.value })}
            />
          </div>
          <div className="d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setModal({ ...modal, show: false })}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary fw-bold" disabled={processing || !modal.userId}>
              {processing ? 'Processing...' : 'Issue Advance'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdvanceManagementPage;
