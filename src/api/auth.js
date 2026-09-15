import { api } from "./client";

export const authApi = {
  register: ({ name, email, phoneNumber, password }) =>
    api.post("/auth/register", { name, email, phoneNumber, password }),
  login: ({ email, password }) => api.post("/auth/login", { email, password }),
};
