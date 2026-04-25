import axios from "axios";
import { useAppStore } from "../../store/useAppStore";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000
});

apiClient.interceptors.request.use((config) => {
  const token = useAppStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const createDonation = async (payload) => {
  const { data } = await apiClient.post("/donations/create", payload);
  return data;
};

export const getNearbyDonations = async (lat, lng, radiusKm = 5) => {
  const { data } = await apiClient.get("/donations/nearby", {
    params: { lat, lng, radiusKm }
  });
  return data;
};

export const acceptDonation = async (payload) => {
  const { data } = await apiClient.post("/donations/accept", payload);
  return data;
};

export const getDonations = async (filters = {}) => {
  const { data } = await apiClient.get("/donations/list", { params: filters });
  return data;
};

export const getDashboardStats = async () => {
  const { data } = await apiClient.get("/dashboard");
  return data;
};

export const getUsers = async (filters = {}) => {
  const { data } = await apiClient.get("/users", { params: filters });
  return data;
};

export const moderateUser = async (userId, payload) => {
  const { data } = await apiClient.patch(`/users/${userId}`, payload);
  return data;
};

export const registerUser = async (payload) => {
  const { data } = await apiClient.post("/auth/register", payload);
  return data;
};

export const loginWithPhonePassword = async (payload) => {
  const { data } = await apiClient.post("/auth/login", payload);
  return data;
};

export const getAdminStats = async () => {
  const { data } = await apiClient.get("/admin/stats");
  return data;
};

export const getAdminUsers = async (role = "") => {
  const { data } = await apiClient.get("/admin/users", { params: role ? { role } : {} });
  return data;
};

export const deleteAdminUser = async (userId) => {
  const { data } = await apiClient.delete(`/admin/users/${userId}`);
  return data;
};

export const getAdminDonations = async () => {
  const { data } = await apiClient.get("/admin/donations");
  return data;
};

export const getAdminActivity = async () => {
  const { data } = await apiClient.get("/admin/activity");
  return data;
};

export const updateDeliveryStatus = async (payload) => {
  const { data } = await apiClient.post("/delivery/update-status", payload);
  return data;
};

export const acceptVolunteerTask = async (payload) => {
  const { data } = await apiClient.post("/delivery/accept-task", payload);
  return data;
};

export const rejectVolunteerTask = async (payload) => {
  const { data } = await apiClient.post("/delivery/reject-task", payload);
  return data;
};

export const getOptimizedRoute = async (ngoId = "") => {
  const { data } = await apiClient.get("/delivery/optimize-route", {
    params: ngoId ? { ngoId } : {}
  });
  return data;
};
