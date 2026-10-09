import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import { financeApi } from "../api/finance";
import { clientsApi, providersApi } from "../api/crm";
import { useBusiness } from "../context/BusinessContext";
import { useBusinessData } from "../hooks/useBusinessData";
import { useToast } from "../context/ToastContext";
import { Button, Card, EmptyState, Field, Input, Select, Modal, PageLoading, Badge, PlusIcon, IconButton, HistoryIcon } from "../components/ui";
import { formatMoney, formatDate, formatDateTime, errorMessage } from "../utils/format";

const STATUS_TONE = { PENDING: "warning", PARTIAL: "info", PAID: "success", CANCELLED: "danger" };
const STATUS_LABEL = { PENDING: "Pendiente", PARTIAL: "Parcial", PAID: "Pagada", CANCELLED: "Cancelada" };

const PAYMENT_METHOD_LABEL = { CASH: "Efectivo", TRANSFER: "Transferencia", CARD: "Tarjeta" };

function PaymentHistoryModal({ title, currency, fetchPayments, onUpdatePayment, onClose, onChanged }) {
  const notify = useToast();
  const [payments, setPayments] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ amount: "", paymentMethod: "CASH" });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setPayments(await fetchPayments());
    } catch (err) {
      notify.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startEdit(p) {
    setEditTarget(p);
    setEditForm({ amount: String(p.amount), paymentMethod: p.paymentMethod });
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onUpdatePayment(editTarget.id, {
        amount: Number(editForm.amount),
        paymentMethod: editForm.paymentMethod,
      });
      notify.success("Abono actualizado.");
      setEditTarget(null);
      await load();
      onChanged?.();
    } catch (err) {
      notify.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      {loading ? (
        <PageLoading />
      ) : !payments || payments.length === 0 ? (
        <EmptyState title="Sin abonos registrados" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {payments.map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 0", borderBottom: "1px solid var(--color-border)",
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{formatMoney(p.amount, currency)}</div>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                  {PAYMENT_METHOD_LABEL[p.paymentMethod] || p.paymentMethod} · {formatDateTime(p.createdAt)}
                </div>
              </div>
              <Button variant="outlined" size="sm" onClick={() => startEdit(p)}>Editar</Button>
            </div>
          ))}
        </div>
      )}

      {editTarget && (
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--color-border)" }}>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 0 }}>
            Editando abono del {formatDateTime(editTarget.createdAt)}
          </p>
          <form onSubmit={handleSaveEdit}>
            <Field label="Monto">
              <Input
                type="number" min="0.01" step="0.01" required
                value={editForm.amount}
                onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
              />
            </Field>
            <Field label="Método de pago">
              <Select value={editForm.paymentMethod} onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })}>
                <option value="CASH">Efectivo</option>
                <option value="TRANSFER">Transferencia</option>
                <option value="CARD">Tarjeta</option>
              </Select>
            </Field>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Button type="button" variant="outlined" onClick={() => setEditTarget(null)}>Cancelar</Button>
              <Button type="submit" variant="primary" loading={saving}>Guardar</Button>
            </div>
          </form>
        </div>
      )}
    </Modal>
  );
}

function Receivables() {
  const { activeBusiness } = useBusiness();
  const notify = useToast();
  const [filters, setFilters] = useState({ status: "UNPAID", clientSearch: "" });
  const { data: clients } = useBusinessData((id) => clientsApi.list(id));
  const { data: debts, loading, reload, businessId } = useBusinessData(
    (id) => financeApi.listGroupedDebts(id, { status: filters.status && filters.status !== "UNPAID" ? filters.status : undefined }),
    [filters.status]
  );

  const [payTarget, setPayTarget] = useState(null);
  const [payForm, setPayForm] = useState({ amount: "", paymentMethod: "CASH" });
  const [paying, setPaying] = useState(false);

  const [loanOpen, setLoanOpen] = useState(false);
  const [loanForm, setLoanForm] = useState({ amount: "", clientId: "", debtorName: "", dueDate: "" });
  const [savingLoan, setSavingLoan] = useState(false);

  const [historyTarget, setHistoryTarget] = useState(null);

  function clientName(id) {
    return clients?.find((c) => c.id === id)?.name || `#${id}`;
  }
  function debtorLabel(d) {
    return d.clientId ? clientName(d.clientId) : d.debtorName || "—";
  }

  const filteredDebts = useMemo(() => {
    const search = filters.clientSearch.trim().toLowerCase();
    return (debts || [])
      .filter((d) => filters.status !== "UNPAID" || d.status === "PENDING" || d.status === "PARTIAL")
      .filter((d) => !search || debtorLabel(d).toLowerCase().includes(search));
  }, [debts, filters.clientSearch, filters.status, clients]);

  const totalPending = (debts || [])
    .filter((d) => d.status === "PENDING" || d.status === "PARTIAL")
    .reduce((sum, d) => sum + (d.totalAmount - d.paidAmount), 0);

  async function handlePay(e) {
    e.preventDefault();
    setPaying(true);
    try {
      if (payTarget.clientId) {
        await financeApi.payClientDebt(businessId, payTarget.clientId, {
          amount: Number(payForm.amount),
          paymentMethod: payForm.paymentMethod,
        });
        notify.success("El abono se aplicó a la(s) venta(s) más antigua(s).");
      } else {
        await financeApi.payDebt(businessId, payTarget.id, {
          amount: Number(payForm.amount),
          paymentMethod: payForm.paymentMethod,
        });
        notify.success("Abono registrado.");
      }
      setPayTarget(null);
      reload();
    } catch (err) {
      notify.error(errorMessage(err));
    } finally {
      setPaying(false);
    }
  }

  async function handleRegisterLoan(e) {
    e.preventDefault();
    if (!loanForm.clientId && !loanForm.debtorName.trim()) {
      notify.error("Selecciona un cliente o escribe el nombre de la persona.");
      return;
    }
    setSavingLoan(true);
    try {
      await financeApi.registerLoan(businessId, {
        amount: Number(loanForm.amount),
        clientId: loanForm.clientId ? Number(loanForm.clientId) : undefined,
        debtorName: loanForm.clientId ? undefined : loanForm.debtorName,
        dueDate: loanForm.dueDate || undefined,
      });
      notify.success("Préstamo registrado.");
      setLoanOpen(false);
      setLoanForm({ amount: "", clientId: "", debtorName: "", dueDate: "" });
      reload();
    } catch (err) {
      notify.error(errorMessage(err));
    } finally {
      setSavingLoan(false);
    }
  }

  return (
    <>
      <div className="stat-grid" style={{ marginBottom: 18 }}>
        <div className="stat-card accent-secondary">
          <div className="label">Total que te deben</div>
          <div className="value">{formatMoney(totalPending, activeBusiness?.currency)}</div>
        </div>
      </div>

      <div className="filters-row" style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8 }}>
        <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">Todos los estados</option>
          <option value="UNPAID">No pagados</option>
          <option value="PENDING">Pendiente</option>
          <option value="PARTIAL">Parcial</option>
          <option value="PAID">Pagada</option>
          <option value="CANCELLED">Cancelada</option>
        </Select>
        <Input
          placeholder="Buscar cliente…"
          value={filters.clientSearch}
          onChange={(e) => setFilters({ ...filters, clientSearch: e.target.value })}
          style={{ maxWidth: 220 }}
        />
        </div>
        <Button variant="primary" onClick={() => setLoanOpen(true)}>
          <PlusIcon width={15} height={15} /> Registrar préstamo
        </Button>
      </div>

      <Card>
        {loading ? (
          <PageLoading />
        ) : !debts || debts.length === 0 ? (
          <EmptyState title="Nadie te debe nada" description="Las deudas se crean automáticamente al vender a crédito." />
        ) : filteredDebts.length === 0 ? (
          <EmptyState title="Sin resultados" description="Ningún cliente coincide con la búsqueda." />
        ) : (
          <>
            <table className="table data-table">
              <thead><tr><th>Cliente</th><th>Total</th><th>Abonado</th><th>Saldo</th><th>Vence</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {filteredDebts.map((d) => {
                  const pending = d.totalAmount - d.paidAmount;
                  const canPay = d.status === "PENDING" || d.status === "PARTIAL";
                  return (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 600 }}>{debtorLabel(d)}</td>
                      <td>{formatMoney(d.totalAmount, activeBusiness?.currency)}</td>
                      <td>{formatMoney(d.paidAmount, activeBusiness?.currency)}</td>
                      <td>{formatMoney(pending, activeBusiness?.currency)}</td>
                      <td>{formatDate(d.dueDate)}</td>
                      <td><Badge tone={STATUS_TONE[d.status]}>{STATUS_LABEL[d.status]}</Badge></td>
                      <td>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <IconButton title="Historial de abonos" onClick={() => setHistoryTarget(d)}>
                            <HistoryIcon width={15} height={15} />
                          </IconButton>
                          {canPay && (
                            <Button variant="secondary" size="sm" onClick={() => { setPayTarget(d); setPayForm({ amount: "", paymentMethod: "CASH" }); }}>
                              Registrar abono
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="list-cards">
              {filteredDebts.map((d) => {
                const pending = d.totalAmount - d.paidAmount;
                const canPay = d.status === "PENDING" || d.status === "PARTIAL";
                return (
                  <div
                    className={`list-card-row ${canPay ? "tappable" : ""}`}
                    key={d.id}
                    onClick={canPay ? () => { setPayTarget(d); setPayForm({ amount: "", paymentMethod: "CASH" }); } : undefined}
                  >
                    <div className="list-card-main">
                      <div className="list-card-title">{debtorLabel(d)}</div>
                      <div className="list-card-meta">Vence: {formatDate(d.dueDate)} · Abonado {formatMoney(d.paidAmount, activeBusiness?.currency)}</div>
                    </div>
                    <div className="list-card-side">
                      <span className="list-card-value">{formatMoney(pending, activeBusiness?.currency)}</span>
                      <Badge tone={STATUS_TONE[d.status]}>{STATUS_LABEL[d.status]}</Badge>
                    </div>
                    <IconButton title="Historial de abonos" onClick={(e) => { e.stopPropagation(); setHistoryTarget(d); }}>
                      <HistoryIcon width={15} height={15} />
                    </IconButton>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {payTarget && (
        <Modal
          title={`Abono de ${debtorLabel(payTarget)}`}
          onClose={() => setPayTarget(null)}
          footer={
            <>
              <Button variant="outlined" onClick={() => setPayTarget(null)}>Cancelar</Button>
              <Button variant="primary" loading={paying} onClick={handlePay}>Registrar abono</Button>
            </>
          }
        >
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 0 }}>
            Saldo pendiente: <strong>{formatMoney(payTarget.totalAmount - payTarget.paidAmount, activeBusiness?.currency)}</strong>
          </p>
          <form onSubmit={handlePay}>
            <Field label="Monto del abono">
              <Input type="number" min="0.01" step="0.01" max={payTarget.totalAmount - payTarget.paidAmount} required value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} />
            </Field>
            <Field label="Método de pago">
              <Select value={payForm.paymentMethod} onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}>
                <option value="CASH">Efectivo</option>
                <option value="TRANSFER">Transferencia</option>
                <option value="CARD">Tarjeta</option>
              </Select>
            </Field>
          </form>
        </Modal>
      )}

      {loanOpen && (
        <Modal
          title="Registrar préstamo"
          onClose={() => setLoanOpen(false)}
          footer={
            <>
              <Button variant="outlined" onClick={() => setLoanOpen(false)}>Cancelar</Button>
              <Button variant="primary" loading={savingLoan} onClick={handleRegisterLoan}>Registrar</Button>
            </>
          }
        >
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 0 }}>
            Registra dinero que le prestas a un cliente o a cualquier persona; te quedará reflejado en "Me deben".
          </p>
          <form onSubmit={handleRegisterLoan}>
            <Field label="Monto prestado">
              <Input type="number" min="0.01" step="0.01" required value={loanForm.amount} onChange={(e) => setLoanForm({ ...loanForm, amount: e.target.value })} />
            </Field>
            <Field label="Cliente (opcional)">
              <Select value={loanForm.clientId} onChange={(e) => setLoanForm({ ...loanForm, clientId: e.target.value, debtorName: "" })}>
                <option value="">Persona sin registrar</option>
                {clients?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            {!loanForm.clientId && (
              <Field label="Nombre de la persona">
                <Input value={loanForm.debtorName} onChange={(e) => setLoanForm({ ...loanForm, debtorName: e.target.value })} placeholder="Ej: Juan (amigo)" />
              </Field>
            )}
            <Field label="Fecha de vencimiento (opcional)" hint="Si no indicas nada, se usan 30 días">
              <Input type="date" value={loanForm.dueDate} onChange={(e) => setLoanForm({ ...loanForm, dueDate: e.target.value })} />
            </Field>
          </form>
        </Modal>
      )}

      {historyTarget && (
        <PaymentHistoryModal
          title={`Historial de abonos de ${debtorLabel(historyTarget)}`}
          currency={activeBusiness?.currency}
          fetchPayments={() => (historyTarget.clientId
            ? financeApi.listClientDebtPayments(businessId, historyTarget.clientId)
            : financeApi.listDebtPayments(businessId, historyTarget.id))}
          onUpdatePayment={(paymentId, payload) => (historyTarget.clientId
            ? financeApi.updateClientDebtPayment(businessId, historyTarget.clientId, paymentId, payload)
            : financeApi.updateDebtPayment(businessId, historyTarget.id, paymentId, payload))}
          onClose={() => setHistoryTarget(null)}
          onChanged={reload}
        />
      )}
    </>
  );
}

function Payables() {
  const { activeBusiness } = useBusiness();
  const notify = useToast();
  const [filters, setFilters] = useState({ status: "UNPAID", payeeType: "", search: "" });
  const { data: providers } = useBusinessData((id) => providersApi.list(id));
  const { data: payables, loading, reload, businessId } = useBusinessData(
    (id) => financeApi.listGroupedPayables(id, {
      status: filters.status && filters.status !== "UNPAID" ? filters.status : undefined,
    }),
    [filters.status]
  );

  const [payTarget, setPayTarget] = useState(null);
  const [payForm, setPayForm] = useState({ amount: "", paymentMethod: "CASH" });
  const [paying, setPaying] = useState(false);

  const [historyTarget, setHistoryTarget] = useState(null);

  function providerName(id) {
    return providers?.find((p) => p.id === id)?.name || `#${id}`;
  }
  function payeeLabel(p) {
    return p.payeeType === "PROVIDER" ? providerName(p.providerId) : p.payeeName;
  }

  const filteredPayables = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return (payables || [])
      .filter((p) => filters.status !== "UNPAID" || p.status === "PENDING" || p.status === "PARTIAL")
      .filter((p) => !filters.payeeType || p.payeeType === filters.payeeType)
      .filter((p) => !search || payeeLabel(p).toLowerCase().includes(search));
  }, [payables, filters.search, filters.payeeType, filters.status, providers]);

  const totalPending = (payables || [])
    .filter((p) => p.status === "PENDING" || p.status === "PARTIAL")
    .reduce((sum, p) => sum + (p.totalAmount - p.paidAmount), 0);

  async function handlePay(e) {
    e.preventDefault();
    setPaying(true);
    try {
      if (payTarget.payeeType === "PROVIDER" && payTarget.providerId) {
        await financeApi.payProviderPayable(businessId, payTarget.providerId, {
          amount: Number(payForm.amount),
          paymentMethod: payForm.paymentMethod,
        });
        notify.success("El pago se aplicó a la(s) compra(s) más antigua(s).");
      } else {
        await financeApi.payPayable(businessId, payTarget.id, {
          amount: Number(payForm.amount),
          paymentMethod: payForm.paymentMethod,
        });
        notify.success("Pago registrado.");
      }
      setPayTarget(null);
      reload();
    } catch (err) {
      notify.error(errorMessage(err));
    } finally {
      setPaying(false);
    }
  }

  return (
    <>
      <div className="stat-grid" style={{ marginBottom: 18 }}>
        <div className="stat-card accent-secondary">
          <div className="label">Total que debes</div>
          <div className="value">{formatMoney(totalPending, activeBusiness?.currency)}</div>
        </div>
      </div>

      <div className="filters-row">
        <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">Todos los estados</option>
          <option value="UNPAID">No pagados</option>
          <option value="PENDING">Pendiente</option>
          <option value="PARTIAL">Parcial</option>
          <option value="PAID">Pagada</option>
          <option value="CANCELLED">Cancelada</option>
        </Select>
        <Select value={filters.payeeType} onChange={(e) => setFilters({ ...filters, payeeType: e.target.value })}>
          <option value="">Proveedores y otros</option>
          <option value="PROVIDER">Solo proveedores</option>
          <option value="OTHER">Solo otros</option>
        </Select>
        <Input
          placeholder="Buscar proveedor…"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
      </div>

      <Card>
        {loading ? (
          <PageLoading />
        ) : !payables || payables.length === 0 ? (
          <EmptyState title="No debes nada" description="Las cuentas por pagar se crean desde una compra a crédito o un gasto marcado como no pagado." />
        ) : filteredPayables.length === 0 ? (
          <EmptyState title="Sin resultados" description="Ningún proveedor coincide con la búsqueda." />
        ) : (
          <>
            <table className="table data-table">
              <thead><tr><th>A quién</th><th>Origen</th><th>Total</th><th>Abonado</th><th>Saldo</th><th>Vence</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {filteredPayables.map((p) => {
                  const pending = p.totalAmount - p.paidAmount;
                  const canPay = p.status === "PENDING" || p.status === "PARTIAL";
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{payeeLabel(p)}</td>
                      <td>{p.source === "PURCHASE" ? "Compra" : "Gasto"}</td>
                      <td>{formatMoney(p.totalAmount, activeBusiness?.currency)}</td>
                      <td>{formatMoney(p.paidAmount, activeBusiness?.currency)}</td>
                      <td>{formatMoney(pending, activeBusiness?.currency)}</td>
                      <td>{formatDate(p.dueDate)}</td>
                      <td><Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge></td>
                      <td>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <IconButton title="Historial de pagos" onClick={() => setHistoryTarget(p)}>
                            <HistoryIcon width={15} height={15} />
                          </IconButton>
                          {canPay && (
                            <Button variant="secondary" size="sm" onClick={() => { setPayTarget(p); setPayForm({ amount: "", paymentMethod: "CASH" }); }}>
                              Registrar pago
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="list-cards">
              {filteredPayables.map((p) => {
                const pending = p.totalAmount - p.paidAmount;
                const canPay = p.status === "PENDING" || p.status === "PARTIAL";
                return (
                  <div
                    className={`list-card-row ${canPay ? "tappable" : ""}`}
                    key={p.id}
                    onClick={canPay ? () => { setPayTarget(p); setPayForm({ amount: "", paymentMethod: "CASH" }); } : undefined}
                  >
                    <div className="list-card-main">
                      <div className="list-card-title">{payeeLabel(p)}</div>
                      <div className="list-card-meta">{p.source === "PURCHASE" ? "Compra" : "Gasto"} · Vence: {formatDate(p.dueDate)}</div>
                    </div>
                    <div className="list-card-side">
                      <span className="list-card-value">{formatMoney(pending, activeBusiness?.currency)}</span>
                      <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                    </div>
                    <IconButton title="Historial de pagos" onClick={(e) => { e.stopPropagation(); setHistoryTarget(p); }}>
                      <HistoryIcon width={15} height={15} />
                    </IconButton>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {payTarget && (
        <Modal
          title={`Pago a ${payeeLabel(payTarget)}`}
          onClose={() => setPayTarget(null)}
          footer={
            <>
              <Button variant="outlined" onClick={() => setPayTarget(null)}>Cancelar</Button>
              <Button variant="primary" loading={paying} onClick={handlePay}>Registrar pago</Button>
            </>
          }
        >
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 0 }}>
            Saldo pendiente: <strong>{formatMoney(payTarget.totalAmount - payTarget.paidAmount, activeBusiness?.currency)}</strong>
          </p>
          <form onSubmit={handlePay}>
            <Field label="Monto a pagar">
              <Input type="number" min="0.01" step="0.01" max={payTarget.totalAmount - payTarget.paidAmount} required value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} />
            </Field>
            <Field label="Método de pago">
              <Select value={payForm.paymentMethod} onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}>
                <option value="CASH">Efectivo</option>
                <option value="TRANSFER">Transferencia</option>
                <option value="CARD">Tarjeta</option>
              </Select>
            </Field>
          </form>
        </Modal>
      )}

      {historyTarget && (
        <PaymentHistoryModal
          title={`Historial de pagos a ${payeeLabel(historyTarget)}`}
          currency={activeBusiness?.currency}
          fetchPayments={() => (historyTarget.payeeType === "PROVIDER" && historyTarget.providerId
            ? financeApi.listProviderPayablePayments(businessId, historyTarget.providerId)
            : financeApi.listPayablePayments(businessId, historyTarget.id))}
          onUpdatePayment={(paymentId, payload) => (historyTarget.payeeType === "PROVIDER" && historyTarget.providerId
            ? financeApi.updateProviderPayablePayment(businessId, historyTarget.providerId, paymentId, payload)
            : financeApi.updatePayablePayment(businessId, historyTarget.id, paymentId, payload))}
          onClose={() => setHistoryTarget(null)}
          onChanged={reload}
        />
      )}
    </>
  );
}

export default function Debts() {
  const [tab, setTab] = useState("receivables");
  return (
    <>
      <PageHeader title="Cuentas" subtitle="Lo que te deben y lo que debes" />
      <div className="page-content">
        <div className="tabs">
          <button className={`tab ${tab === "receivables" ? "active" : ""}`} onClick={() => setTab("receivables")}>Me deben</button>
          <button className={`tab ${tab === "payables" ? "active" : ""}`} onClick={() => setTab("payables")}>Debo</button>
        </div>
        {tab === "receivables" ? <Receivables /> : <Payables />}
      </div>
    </>
  );
}
