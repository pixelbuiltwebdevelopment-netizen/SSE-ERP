import axiosClient from './axiosClient';

export const calendarApi = {
  createEvent: (data) => axiosClient.post('/calendar/events', data),
  getEvents: (params) => axiosClient.get('/calendar/events', { params }),
  deleteEvent: (id) => axiosClient.delete(`/calendar/events/${id}`),
};
