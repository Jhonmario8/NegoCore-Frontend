import { api } from "./client";

export const businessApi = {
  list: () => api.get("/businesses"),
  create: ({ name, currency }) => api.post("/businesses", { name, currency }),
  update: (businessId, payload) => api.patch(`/businesses/${businessId}`, payload),
};
