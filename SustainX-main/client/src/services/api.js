import axios from 'axios';

const API = axios.create({
  baseURL: "https://waste-management-3c1c.onrender.com/api"
});

// Attach token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('wms_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const loginUser = (data) => API.post('/auth/login', data);
export const registerUser = (data) => API.post('/auth/register', data);
export const getMe = () => API.get('/auth/me');

// Users
export const getUsers = (role) => API.get('/users', { params: role ? { role } : {} });
export const getUserById = (id) => API.get(`/users/${id}`);
export const createUser = (data) => API.post('/users', data);
export const updateUser = (id, data) => API.put(`/users/${id}`, data);
export const changePassword = (id, data) => API.put(`/users/${id}/password`, data);
export const deleteUserApi = (id) => API.delete(`/users/${id}`);

// Complaints
export const getComplaints = (params) => API.get('/complaints', { params });
export const getComplaintById = (id) => API.get(`/complaints/${id}`);
export const submitComplaint = (data) => {
  // If data is FormData (with image), let browser set Content-Type with boundary
  if (data instanceof FormData) {
    return API.post('/complaints', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }
  return API.post('/complaints', data);
};
export const updateComplaintStatus = (id, data) => API.put(`/complaints/${id}/status`, data);

// Rewards
export const getRewards = (params) => API.get('/rewards', { params });
export const addReward = (data) => API.post('/rewards', data);

// Stats
export const getDashboardStats = () => API.get('/stats/dashboard');

// Store
export const getStoreItems = () => API.get('/store');
export const redeemStoreItem = (itemId) => API.post('/store/redeem', { itemId });

// Orders
export const getOrders = (params) => API.get('/orders', { params });
export const updateOrderStatus = (id, data) => API.put(`/orders/${id}`, data);

export default API;
