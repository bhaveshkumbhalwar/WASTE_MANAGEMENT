import axios from 'axios';

// ✅ Use Vite environment variable
const baseURL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api` 
  : '/api';

const API = axios.create({
  baseURL,
});

// ✅ Attach token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('wms_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ================= AUTH =================
export const loginUser = (data) => {
  console.log("Login API:", `${import.meta.env.VITE_API_URL}/api/auth/login`);
  return API.post('/auth/login', data);
};

export const registerUser = (data) => API.post('/auth/register', data);
export const getMe = () => API.get('/auth/me');
export const forgotPasswordApi = (data) => API.post('/auth/forgot-password', data);

// ================= USERS =================
export const getUsers = (role) =>
  API.get('/users', { params: role ? { role } : {} });

export const getUserById = (id) => API.get(`/users/${id}`);
export const createUser = (data) => API.post('/users', data);
export const updateUser = (id, data) => API.put(`/users/${id}`, data);
export const changePassword = (id, data) =>
  API.put(`/users/${id}/password`, data);
export const deleteUserApi = (id) => API.delete(`/users/${id}`);

// ================= COMPLAINTS =================
export const getComplaints = (params) =>
  API.get('/complaints', { params });

export const getComplaintById = (id) =>
  API.get(`/complaints/${id}`);

export const submitComplaint = (data) => {
  if (data instanceof FormData) {
    return API.post('/complaints', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }
  return API.post('/complaints', data);
};

export const updateComplaintStatus = (id, data) =>
  API.put(`/complaints/${id}/status`, data);

export const completeComplaintApi = (id, data) =>
  API.post(`/complaints/complete/${id}`, data);

// ================= REWARDS =================
export const getRewards = (params) =>
  API.get('/rewards', { params });

export const addReward = (data) =>
  API.post('/rewards', data);

// ================= STATS =================
export const getDashboardStats = () =>
  API.get('/stats/dashboard');

// ================= STORE =================
export const getStoreItems = () => API.get('/store');

export const redeemStoreItem = (itemId) =>
  API.post('/store/redeem', { itemId });

// ================= ORDERS =================
export const getOrders = (params) =>
  API.get('/orders', { params });

export const getOrderById = (id) =>
  API.get(`/orders/${id}`);

export const updateOrderStatus = (id, data) =>
  API.put(`/orders/${id}`, data);

export const assignOrderApi = (id) =>
  API.post(`/orders/assign/${id}`);

// ================= NOTIFICATIONS =================
export const getNotifications = () => API.get('/notifications');
export const markNotificationRead = (id) => API.put(`/notifications/read/${id}`);

export default API;