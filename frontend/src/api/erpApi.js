import axiosClient from './axiosClient';

export const erpApi = {

  getTickets: (params) => axiosClient.get('/tickets', { params }),
  createTicket: (data) => axiosClient.post('/tickets', data),
  updateTicket: (id, data) => axiosClient.put(`/tickets/${id}`, data),
  deleteTicket: (id) => axiosClient.delete(`/tickets/${id}`),
  startTicket: (id, data) => axiosClient.post(`/tickets/${id}/start`, data),
  stopTicket: (id, data) => axiosClient.post(`/tickets/${id}/stop`, data),
  getCompaniesForTicket: () => axiosClient.get('/tickets/companies'),

  // ── SALARY: Admin APIs ──────────────────────────────────────────
  // Issue salary advance to employee (admin)
  issueAdvance: (data) => axiosClient.post('/salary/advance', data),
  // Get all advances (admin view)
  getAllAdvances: (params) => axiosClient.get('/salary/advance', { params }),
  // Employee salary + advance overview (admin)
  getEmployeeSalaryOverview: () => axiosClient.get('/salary/employees-overview'),
  // Preview salary calc
  previewSalary: (params) => axiosClient.get('/salary/preview', { params }),
  // Generate salary
  generateSalary: (data) => axiosClient.post('/salary/generate', data),
  // All salary records (admin)
  getSalaries: (params) => axiosClient.get('/salary', { params }),
  // Mark salary paid
  updateSalaryStatus: (id, data) => axiosClient.put(`/salary/${id}`, data),

  // ── SALARY: Employee-facing APIs ───────────────────────────────
  // Employee's own advances
  getMyAdvances: () => axiosClient.get('/salary/my-advances'),
  // Employee's own salary slips
  getMySalaries: () => axiosClient.get('/salary/my-salaries'),
};
