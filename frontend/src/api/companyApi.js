import axiosClient from './axiosClient';

export const getCompanies = async (params = {}) => {
  const response = await axiosClient.get('/companies', { params });
  return response.data;
};

export const getCompanyById = async (id) => {
  const response = await axiosClient.get(`/companies/${id}`);
  return response.data;
};

export const createCompany = async (companyData) => {
  const response = await axiosClient.post('/companies', companyData);
  return response.data;
};

export const updateCompany = async (id, companyData) => {
  const response = await axiosClient.put(`/companies/${id}`, companyData);
  return response.data;
};

export const updateCompanyStatus = async (id, status) => {
  const response = await axiosClient.patch(`/companies/${id}/status`, { status });
  return response.data;
};

export const deleteCompany = async (id) => {
  const response = await axiosClient.delete(`/companies/${id}`);
  return response.data;
};

export const uploadCompanyFile = async (file, companyId = 'temp', subfolder = 'documents') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('companyId', companyId);
  formData.append('subfolder', subfolder);

  const response = await axiosClient.post('/companies/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const deleteCompanyFile = async (publicId, resourceType = 'image') => {
  const response = await axiosClient.delete('/companies/files', {
    data: { publicId, resourceType },
  });
  return response.data;
};

export const getLocationData = async (country = 'India', state = '') => {
  const response = await axiosClient.get('/companies/locations/data', {
    params: { country, state },
  });
  return response.data;
};
