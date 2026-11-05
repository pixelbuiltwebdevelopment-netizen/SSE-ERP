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

export const getTeamAttendanceRoster = async (params) => {
  const response = await api.get('/attendance/team-roster', { params });
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

// Shifts & Policies
export const getShifts = async () => {
  const response = await api.get('/attendance/shifts');
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
