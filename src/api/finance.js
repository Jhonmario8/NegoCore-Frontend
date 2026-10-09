import { api } from "./client";

export const financeApi = {
  listExpenses: (businessId, { from, to } = {}) =>
    api.get(`/businesses/${businessId}/expenses`, { from, to }),
  registerExpense: (businessId, payload) =>
    api.post(`/businesses/${businessId}/expenses`, payload),

  listDebts: (businessId, { status, clientId } = {}) =>
    api.get(`/businesses/${businessId}/debts`, { status, clientId }),
  registerLoan: (businessId, payload) =>
    api.post(`/businesses/${businessId}/debts`, payload),
  payDebt: (businessId, debtId, { amount, paymentMethod }) =>
    api.post(`/businesses/${businessId}/debts/${debtId}/payments`, {
      amount,
      paymentMethod,
    }),
  listDebtPayments: (businessId, debtId) =>
    api.get(`/businesses/${businessId}/debts/${debtId}/payments`),
  updateDebtPayment: (businessId, debtId, paymentId, { amount, paymentMethod }) =>
    api.patch(`/businesses/${businessId}/debts/${debtId}/payments/${paymentId}`, {
      amount,
      paymentMethod,
    }),

  listPayables: (businessId, { status, payeeType, providerId } = {}) =>
    api.get(`/businesses/${businessId}/payables`, { status, payeeType, providerId }),
  payPayable: (businessId, payableId, { amount, paymentMethod }) =>
    api.post(`/businesses/${businessId}/payables/${payableId}/payments`, {
      amount,
      paymentMethod,
    }),
  listPayablePayments: (businessId, payableId) =>
    api.get(`/businesses/${businessId}/payables/${payableId}/payments`),
  updatePayablePayment: (businessId, payableId, paymentId, { amount, paymentMethod }) =>
    api.patch(`/businesses/${businessId}/payables/${payableId}/payments/${paymentId}`, {
      amount,
      paymentMethod,
    }),

  balanceReport: (businessId, { from, to } = {}) =>
    api.get(`/businesses/${businessId}/reports/balance`, { from, to }),
};
