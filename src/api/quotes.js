import { api } from "./client";

export const quotesApi = {
  create: (businessId, payload) => api.post(`/businesses/${businessId}/quotes`, payload),
};
