import { api } from "./client";

export const purchasesApi = {
  list: (businessId, { providerId, status, from, to } = {}) =>
    api.get(`/businesses/${businessId}/purchases`, { providerId, status, from, to }),
  get: (businessId, purchaseId) => api.get(`/businesses/${businessId}/purchases/${purchaseId}`),
  register: (businessId, payload) => api.post(`/businesses/${businessId}/purchases`, payload),
  update: (businessId, purchaseId, payload) => api.put(`/businesses/${businessId}/purchases/${purchaseId}`, payload),
  updateDate: (businessId, purchaseId, createdAt) =>
    api.patch(`/businesses/${businessId}/purchases/${purchaseId}/date`, { createdAt }),
};
