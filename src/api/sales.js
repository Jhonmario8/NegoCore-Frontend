import { api } from "./client";

export const salesApi = {
  list: (businessId, { status, clientId, from, to } = {}) =>
    api.get(`/businesses/${businessId}/sales`, { status, clientId, from, to }),
  get: (businessId, saleId) => api.get(`/businesses/${businessId}/sales/${saleId}`),
  register: (businessId, payload) => api.post(`/businesses/${businessId}/sales`, payload),
  cancel: (businessId, saleId) => api.post(`/businesses/${businessId}/sales/${saleId}/cancel`),
  updateDate: (businessId, saleId, createdAt) =>
    api.patch(`/businesses/${businessId}/sales/${saleId}/date`, { createdAt }),
};
