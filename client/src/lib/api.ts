import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
});

// Dashboard API
export const createDashboard = (name: string, description?: string) =>
  api.post('/dashboards', { name, description });
export const getDashboards = () => api.get('/dashboards');
export const getDashboardById = (id: number) => api.get(`/dashboards/${id}`);
export const updateDashboard = (id: number, name: string, description?: string) =>
  api.put(`/dashboards/${id}`, { name, description });
export const deleteDashboard = (id: number) => api.delete(`/dashboards/${id}`);

// Data Source API (placeholders for now)
export const uploadFileDataSource = (dashboardId: number, name: string, file: File) => {
  const formData = new FormData();
  formData.append('dashboardId', String(dashboardId));
  formData.append('name', name);
  formData.append('file', file);
  return api.post('/connect', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const connectDbDataSource = (dashboardId: number, name: string, connectionDetails: any) => {
  return api.post('/connect', { dashboardId, name, ...connectionDetails });
};

export const getDataSourcesByDashboardId = (dashboardId: number) =>
  api.get(`/dashboards/${dashboardId}/data-sources`);
export const deleteDataSource = (id: number) => api.delete(`/data-sources/${id}`);

export const getDataSourcePreview = (id: number) => api.get(`/data-sources/${id}/preview`);
export const transformDataSource = (id: number, transformations: any) =>
  api.post(`/data-sources/${id}/transform`, { transformations });

export default api;
