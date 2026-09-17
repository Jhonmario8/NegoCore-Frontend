import { api } from "./client";

export const clientsApi = {
  list: (businessId) => api.get(`/businesses/${businessId}/clients`),
  create: (businessId, payload) => api.post(`/businesses/${businessId}/clients`, payload),
  update: (businessId, clientId, payload) =>
    api.patch(`/businesses/${businessId}/clients/${clientId}`, payload),
};

export const providersApi = {
  list: (businessId) => api.get(`/businesses/${businessId}/providers`),
  create: (businessId, payload) => api.post(`/businesses/${businessId}/providers`, payload),
  update: (businessId, providerId, payload) =>
    api.patch(`/businesses/${businessId}/providers/${providerId}`, payload),
};
