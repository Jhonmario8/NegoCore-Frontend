import { api } from "./client";

export const ordersApi = {
  list: (businessId, { status } = {}) =>
    api.get(`/businesses/${businessId}/orders`, { status }),
  get: (businessId, orderId) => api.get(`/businesses/${businessId}/orders/${orderId}`),
  create: (businessId) => api.post(`/businesses/${businessId}/orders`, {}),
  addItem: (businessId, orderId, payload) =>
    api.post(`/businesses/${businessId}/orders/${orderId}/items`, payload),
  removeItem: (businessId, orderId, itemId) =>
    api.del(`/businesses/${businessId}/orders/${orderId}/items/${itemId}`),
  cancel: (businessId, orderId) =>
    api.patch(`/businesses/${businessId}/orders/${orderId}/cancel`, {}),
  convert: (businessId, orderId, payload) =>
    api.post(`/businesses/${businessId}/orders/${orderId}/convert`, payload),
  convertItemToSale: (businessId, orderId, itemId, payload) =>
    api.post(`/businesses/${businessId}/orders/${orderId}/items/${itemId}/convert-to-sale`, payload),
};
