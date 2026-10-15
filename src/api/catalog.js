import { api, getToken, API_BASE_URL, ApiError, buildErrorMessage, NETWORK_ERROR_MESSAGE } from "./client";

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

    let res;
    try {
      res = await fetch(
        `${API_BASE_URL}/businesses/${businessId}/products/${productId}/image`,
        {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        }
      );
    } catch {
      throw new ApiError(NETWORK_ERROR_MESSAGE, 0, null);
    }

    let data = null;
    const text = await res.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }
    if (!res.ok) {
      throw new ApiError(buildErrorMessage(res.status, data), res.status, data);
    }
    return data;
  },
};
