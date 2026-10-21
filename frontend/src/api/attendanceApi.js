import api from './axiosClient';

// Punch In/Out
export const punchIn = async (locationData) => {
  const response = await api.post('/attendance/punch-in', locationData);
  return response.data;
};

export const punchOut = async (locationData) => {
  const response = await api.post('/attendance/punch-out', locationData);
  return response.data;
};

// Employee Self APIs
export const getMyToday = async () => {
  const response = await api.get('/attendance/me/today');
  return response.data;
};

export const getMyAttendanceHistory = async (params) => {
  const response = await api.get('/attendance/me/history', { params });
  return response.data;
};

export const getMyAttendance = async (params) => {
  const response = await api.get('/attendance/my-records', { params });
  return response.data;
};

export const getMyCalendar = async (params) => {
  const response = await api.get('/attendance/me/calendar', { params });
  return response.data;
};

// Admin & Team APIs
export const getAttendanceSummaryKPIs = async (params) => {
  const response = await api.get('/attendance/summary', { params });
  return response.data;
};

export const getAllAttendance = async (params) => {
  const response = await api.get('/attendance', { params });
  return response.data;
};

export const getMissingPunchOuts = async (params) => {
  const response = await api.get('/attendance/missing-punch-outs', { params });
  return response.data;
};

export const runAutoPunchOutNow = async () => {
  const response = await api.post('/attendance/auto-punch-out/run');
  return response.data;
};

export const correctAttendanceRecord = async (attendanceId, data) => {
  const response = await api.patch(`/attendance/${attendanceId}/correction`, data);
  return response.data;
};

export const getDailyReport = async (params) => {
  const response = await api.get('/attendance/reports/daily', { params });
  return response.data;
};

export const getAttendanceAnalytics = async (params) => {
  const response = await api.get('/attendance/analytics', { params });
  return response.data;
};

// Shifts & Policies
export const getShifts = async () => {
  const response = await api.get('/attendance/shifts');
  return response.data;
};

export const createShift = async (shiftData) => {
  const response = await api.post('/attendance/shifts', shiftData);
  return response.data;
};

export const updateShift = async (shiftId, shiftData) => {
  const response = await api.patch(`/attendance/shifts/${shiftId}`, shiftData);
  return response.data;
};

export const deleteShift = async (shiftId) => {
  const response = await api.delete(`/attendance/shifts/${shiftId}`);
  return response.data;
};

export const getAttendancePolicy = async () => {
  const response = await api.get('/attendance/policies');
  return response.data;
};

export const updateAttendancePolicy = async (policyData) => {
  const response = await api.patch('/attendance/policies', policyData);
  return response.data;
};

// Overtime
export const getOvertimeRequests = async (params) => {
  const response = await api.get('/attendance/overtime/requests', { params });
  return response.data;
};

export const requestOvertime = async (data) => {
  const response = await api.post('/attendance/overtime/requests', data);
  return response.data;
};

export const approveOvertime = async (requestId, data) => {
  const response = await api.patch(`/attendance/overtime/${requestId}/approve`, data);
  return response.data;
};

export const rejectOvertime = async (requestId, data) => {
  const response = await api.patch(`/attendance/overtime/${requestId}/reject`, data);
  return response.data;
};

// Corrections Workflow
export const getCorrections = async (params) => {
  const response = await api.get('/attendance/corrections', { params });
  return response.data;
};

export const requestCorrection = async (data) => {
  const response = await api.post('/attendance/corrections', data);
  return response.data;
};

export const approveCorrection = async (id, data) => {
  const response = await api.patch(`/attendance/corrections/${id}/approve`, data);
  return response.data;
};

export const rejectCorrection = async (id, data) => {
  const response = await api.patch(`/attendance/corrections/${id}/reject`, data);
  return response.data;
};

// Notifications
export const getNotifications = async (params) => {
  const response = await api.get('/notifications', { params });
  return response.data;
};

export const markNotificationAsRead = async (id) => {
  const response = await api.patch(`/notifications/${id}/read`);
  return response.data;
};

export const markAsRead = markNotificationAsRead;

export const markAllNotificationsAsRead = async () => {
  const response = await api.patch('/notifications/read-all');
  return response.data;
};

export const markAllAsRead = markAllNotificationsAsRead;
