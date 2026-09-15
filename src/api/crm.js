import { api } from "./client";

export const clientsApi = {
  list: (businessId) => api.get(`/businesses/${businessId}/clients`),
  create: (businessId, payload) => api.post(`/businesses/${businessId}/clients`, payload),
};

export const providersApi = {
  list: (businessId) => api.get(`/businesses/${businessId}/providers`),
  create: (businessId, payload) => api.post(`/businesses/${businessId}/providers`, payload),
};
