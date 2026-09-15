import { useState } from "react";
import PageHeader from "../components/PageHeader";
import { financeApi } from "../api/finance";
import { providersApi } from "../api/crm";
import { useBusiness } from "../context/BusinessContext";
import { useBusinessData } from "../hooks/useBusinessData";
import { useToast } from "../context/ToastContext";
import { Button, Card, EmptyState, Field, Input, Select, Modal, PageLoading, Badge, PlusIcon } from "../components/ui";
import { formatMoney, formatDateTime, errorMessage } from "../utils/format";

const empty = {
  description: "", category: "", amount: "",
  paid: true, payeeType: "PROVIDER", providerId: "", payeeName: "", dueDate: "",
};

export default function Expenses() {
  const { activeBusiness } = useBusiness();
  const notify = useToast();
  const { data: providers } = useBusinessData((id) => providersApi.list(id));
  const [range, setRange] = useState({ from: "", to: "" });
  const { data, loading, reload, businessId } = useBusinessData(
    (id) => financeApi.listExpenses(id, { from: range.from || undefined, to: range.to || undefined }),
    [range.from, range.to]
  );

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.paid) {
      if (form.payeeType === "PROVIDER" && !form.providerId) {
        notify.error("Selecciona un proveedor.");
        return;
      }
      if (form.payeeType === "OTHER" && !form.payeeName.trim()) {
        notify.error("Escribe a quién le debes.");
        return;
      }
    }
    setSaving(true);
    try {
      const payload = {
        description: form.description,
        category: form.category || undefined,
        amount: Number(form.amount),
        paid: form.paid,
      };
      if (!form.paid) {
        payload.payeeType = form.payeeType;
        if (form.payeeType === "PROVIDER") payload.providerId = Number(form.providerId);
        else payload.payeeName = form.payeeName;
        if (form.dueDate) payload.dueDate = form.dueDate;
      }
      await financeApi.registerExpense(businessId, payload);
      notify.success(form.paid ? "Gasto registrado." : "Gasto registrado y agregado a 'Debo'.");
      setForm(empty);
      setOpen(false);
      reload();
    } catch (err) {
      notify.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Gastos"
        subtitle="Egresos del negocio"
        action={
          <Button variant="primary" onClick={() => setOpen(true)}>
            <PlusIcon width={15} height={15} /> Nuevo gasto
          </Button>
        }
      />
      <div className="page-content">
        <div className="filters-row">
          <Input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
          <Input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
        </div>
        <Card>
          {loading ? (
            <PageLoading />
          ) : !data || data.length === 0 ? (
            <EmptyState title="Sin gastos registrados" />
          ) : (
            <table className="table">
              <thead><tr><th>Descripción</th><th>Categoría</th><th>Monto</th><th>Estado</th><th>Fecha</th></tr></thead>
              <tbody>
                {data.map((e) => (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 600 }}>{e.description}</td>
                    <td>{e.category || "—"}</td>
                    <td>{formatMoney(e.amount, activeBusiness?.currency)}</td>
                    <td>{e.paid === false ? <Badge tone="warning">A crédito</Badge> : <Badge tone="success">Pagado</Badge>}</td>
                    <td>{formatDateTime(e.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {open && (
        <Modal
          title="Nuevo gasto"
          onClose={() => setOpen(false)}
          footer={
            <>
              <Button variant="outlined" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button variant="primary" loading={saving} onClick={handleCreate}>Guardar</Button>
            </>
          }
        >
          <form onSubmit={handleCreate}>
            <Field label="Descripción">
              <Input required maxLength={200} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} autoFocus />
            </Field>
            <Field label="Categoría (opcional)">
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Servicios, transporte…" />
            </Field>
            <Field label="Monto">
              <Input type="number" min="0.01" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </Field>

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, margin: "14px 0" }}>
              <input type="checkbox" checked={!form.paid} onChange={(e) => setForm({ ...form, paid: !e.target.checked })} />
              Este gasto quedó pendiente de pago (es una deuda mía)
            </label>

            {!form.paid && (
              <>
                <Field label="¿A quién le debo?">
                  <Select value={form.payeeType} onChange={(e) => setForm({ ...form, payeeType: e.target.value })}>
                    <option value="PROVIDER">Un proveedor</option>
                    <option value="OTHER">Otro (texto libre)</option>
                  </Select>
                </Field>
                {form.payeeType === "PROVIDER" ? (
                  <Field label="Proveedor">
                    <Select required value={form.providerId} onChange={(e) => setForm({ ...form, providerId: e.target.value })}>
                      <option value="">Selecciona…</option>
                      {providers?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </Select>
                  </Field>
                ) : (
                  <Field label="Nombre">
                    <Input required value={form.payeeName} onChange={(e) => setForm({ ...form, payeeName: e.target.value })} placeholder="Ej: Préstamo de Juan" />
                  </Field>
                )}
                <Field label="Fecha límite (opcional)">
                  <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                </Field>
              </>
            )}
          </form>
        </Modal>
      )}
    </>
  );
}
