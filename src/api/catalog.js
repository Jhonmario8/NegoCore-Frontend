import { api, getToken } from "./client";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export const catalogApi = {
  listCategories: (businessId) => api.get(`/businesses/${businessId}/categories`),
  createCategory: (businessId, { name }) =>
    api.post(`/businesses/${businessId}/categories`, { name }),

  listProducts: (businessId, { categoryId, lowStock } = {}) =>
    api.get(`/businesses/${businessId}/products`, { categoryId, lowStock }),
  getProduct: (businessId, productId) =>
    api.get(`/businesses/${businessId}/products/${productId}`),
  createProduct: (businessId, payload) =>
    api.post(`/businesses/${businessId}/products`, payload),
  adjustStock: (businessId, productId, { quantity, reason }) =>
    api.patch(`/businesses/${businessId}/products/${productId}/stock`, {
      quantity,
      reason,
    }),
  updateProduct: (businessId, productId, payload) =>
    api.patch(`/businesses/${businessId}/products/${productId}`, payload),
  deleteProduct: (businessId, productId) =>
    api.del(`/businesses/${businessId}/products/${productId}`),

  uploadImage: async (businessId, productId, file) => {
    const formData = new FormData();
    formData.append("file", file);
    const token = getToken();
    const res = await fetch(
      `${BASE_URL}/businesses/${businessId}/products/${productId}/image`,
      {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      }
    );
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const message = (data && (data.message || data.error)) || `Error ${res.status}`;
      const err = new Error(message);
      err.status = res.status;
      throw err;
    }
    return data;
  },
};
