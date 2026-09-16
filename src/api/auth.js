import { api } from "./client";

export const authApi = {
  register: ({ name, email, phoneNumber, password }) =>
    api.post("/auth/register", { name, email, phoneNumber, password }, { auth: false }),
  login: ({ email, password }) => api.post("/auth/login", { email, password }, { auth: false }),
};
