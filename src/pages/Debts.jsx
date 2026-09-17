import { useState } from "react";
import PageHeader from "../components/PageHeader";
import { financeApi } from "../api/finance";
import { clientsApi, providersApi } from "../api/crm";
import { useBusiness } from "../context/BusinessContext";
import { useBusinessData } from "../hooks/useBusinessData";
import { useToast } from "../context/ToastContext";
import { Button, Card, EmptyState, Field, Input, Select, Modal, PageLoading, Badge, PlusIcon } from "../components/ui";
import { formatMoney, formatDate, errorMessage } from "../utils/format";

const STATUS_TONE = { PENDING: "warning", PARTIAL: "info", PAID: "success", CANCELLED: "danger" };
const STATUS_LABEL = { PENDING: "Pendiente", PARTIAL: "Parcial", PAID: "Pagada", CANCELLED: "Cancelada" };

function Receivables() {
  const { activeBusiness } = useBusiness();
  const notify = useToast();
  const [filters, setFilters] = useState({ status: "", clientId: "" });
  const { data: clients } = useBusinessData((id) => clientsApi.list(id));
  const { data: debts, loading, reload, businessId } = useBusinessData(
    (id) => financeApi.listDebts(id, { status: filters.status || undefined, clientId: filters.clientId || undefined }),
    [filters.status, filters.clientId]
  );

  const [payTarget, setPayTarget] = useState(null);
  const [payForm, setPayForm] = useState({ amount: "", paymentMethod: "CASH" });
  const [paying, setPaying] = useState(false);

  const [loanOpen, setLoanOpen] = useState(false);
  const [loanForm, setLoanForm] = useState({ amount: "", clientId: "", debtorName: "", dueDate: "" });
  const [savingLoan, setSavingLoan] = useState(false);

  function clientName(id) {
    return clients?.find((c) => c.id === id)?.name || `#${id}`;
  }
  function debtorLabel(d) {
    return d.clientId ? clientName(d.clientId) : d.debtorName || "—";
  }

  const totalPending = (debts || [])
    .filter((d) => d.status === "PENDING" || d.status === "PARTIAL")
    .reduce((sum, d) => sum + (d.totalAmount - d.paidAmount), 0);

  async function handlePay(e) {
    e.preventDefault();
    setPaying(true);
    try {
      await financeApi.payDebt(businessId, payTarget.id, {
        amount: Number(payForm.amount),
        paymentMethod: payForm.paymentMethod,
      });
      notify.success("Abono registrado.");
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
          <option value="PENDING">Pendiente</option>
          <option value="PARTIAL">Parcial</option>
          <option value="PAID">Pagada</option>
          <option value="CANCELLED">Cancelada</option>
        </Select>
        <Select value={filters.clientId} onChange={(e) => setFilters({ ...filters, clientId: e.target.value })}>
          <option value="">Todos los clientes</option>
          {clients?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
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
        ) : (
          <>
            <table className="table data-table">
              <thead><tr><th>Cliente</th><th>Total</th><th>Abonado</th><th>Saldo</th><th>Vence</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {debts.map((d) => {
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
                        {canPay && (
                          <Button variant="secondary" size="sm" onClick={() => { setPayTarget(d); setPayForm({ amount: "", paymentMethod: "CASH" }); }}>
                            Registrar abono
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="list-cards">
              {debts.map((d) => {
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
    </>
  );
}

function Payables() {
  const { activeBusiness } = useBusiness();
  const notify = useToast();
  const [filters, setFilters] = useState({ status: "", payeeType: "" });
  const { data: providers } = useBusinessData((id) => providersApi.list(id));
  const { data: payables, loading, reload, businessId } = useBusinessData(
    (id) => financeApi.listPayables(id, { status: filters.status || undefined, payeeType: filters.payeeType || undefined }),
    [filters.status, filters.payeeType]
  );

  const [payTarget, setPayTarget] = useState(null);
  const [payForm, setPayForm] = useState({ amount: "", paymentMethod: "CASH" });
  const [paying, setPaying] = useState(false);

  function providerName(id) {
    return providers?.find((p) => p.id === id)?.name || `#${id}`;
  }
  function payeeLabel(p) {
    return p.payeeType === "PROVIDER" ? providerName(p.providerId) : p.payeeName;
  }

  const totalPending = (payables || [])
    .filter((p) => p.status === "PENDING" || p.status === "PARTIAL")
    .reduce((sum, p) => sum + (p.totalAmount - p.paidAmount), 0);

  async function handlePay(e) {
    e.preventDefault();
    setPaying(true);
    try {
      await financeApi.payPayable(businessId, payTarget.id, {
        amount: Number(payForm.amount),
        paymentMethod: payForm.paymentMethod,
      });
      notify.success("Pago registrado.");
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
      </div>

      <Card>
        {loading ? (
          <PageLoading />
        ) : !payables || payables.length === 0 ? (
          <EmptyState title="No debes nada" description="Las cuentas por pagar se crean desde una compra a crédito o un gasto marcado como no pagado." />
        ) : (
          <>
            <table className="table data-table">
              <thead><tr><th>A quién</th><th>Origen</th><th>Total</th><th>Abonado</th><th>Saldo</th><th>Vence</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {payables.map((p) => {
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
                        {canPay && (
                          <Button variant="secondary" size="sm" onClick={() => { setPayTarget(p); setPayForm({ amount: "", paymentMethod: "CASH" }); }}>
                            Registrar pago
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="list-cards">
              {payables.map((p) => {
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
