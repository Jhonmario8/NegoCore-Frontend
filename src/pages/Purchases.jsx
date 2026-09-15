import { useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import { catalogApi } from "../api/catalog";
import { providersApi } from "../api/crm";
import { purchasesApi } from "../api/purchases";
import { useBusiness } from "../context/BusinessContext";
import { useBusinessData } from "../hooks/useBusinessData";
import { useToast } from "../context/ToastContext";
import {
  Button, Card, EmptyState, Field, Select, Input, PageLoading, Badge, Modal, PlusIcon,
} from "../components/ui";
import { formatMoney, formatDateTime, errorMessage } from "../utils/format";

const STATUS_TONE = { PAID: "success", PARTIAL: "warning", CANCELLED: "danger" };
const STATUS_LABEL = { PAID: "Pagada", PARTIAL: "Parcial", CANCELLED: "Cancelada" };

export default function Purchases() {
  const { activeBusinessId, activeBusiness } = useBusiness();
  const notify = useToast();
  const currency = activeBusiness?.currency;

  const { data: providers } = useBusinessData((id) => providersApi.list(id));
  const { data: products } = useBusinessData((id) => catalogApi.listProducts(id));
  const [filters, setFilters] = useState({ providerId: "", status: "" });
  const { data: purchases, loading, reload } = useBusinessData(
    (id) => purchasesApi.list(id, { providerId: filters.providerId || undefined, status: filters.status || undefined }),
    [filters.providerId, filters.status]
  );

  const [open, setOpen] = useState(false);
  const [providerId, setProviderId] = useState("");
  const [items, setItems] = useState([{ productId: "", quantity: "1", unitCost: "" }]);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paidAmount, setPaidAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState(null);

  const total = useMemo(
    () => items.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unitCost) || 0), 0),
    [items]
  );

  function updateItem(idx, field, value) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  }
  function addItem() {
    setItems((prev) => [...prev, { productId: "", quantity: "1", unitCost: "" }]);
  }
  function removeItem(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }
  function resetForm() {
    setProviderId("");
    setItems([{ productId: "", quantity: "1", unitCost: "" }]);
    setPaymentMethod("CASH");
    setPaidAmount("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validItems = items.filter((i) => i.productId && Number(i.quantity) > 0);
    if (!providerId) {
      notify.error("Selecciona un proveedor.");
      return;
    }
    if (validItems.length === 0) {
      notify.error("Agrega al menos un producto.");
      return;
    }
    setSaving(true);
    try {
      await purchasesApi.register(activeBusinessId, {
        providerId: Number(providerId),
        purchaseItems: validItems.map((i) => ({
          productId: Number(i.productId),
          quantity: Number(i.quantity),
          unitCost: Number(i.unitCost),
        })),
        paymentMethod,
        paidAmount: paidAmount === "" ? total : Number(paidAmount),
      });
      notify.success("Compra registrada. El stock ya se actualizó.");
      resetForm();
      setOpen(false);
      reload();
    } catch (err) {
      notify.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function providerName(id) {
    return providers?.find((p) => p.id === id)?.name || `#${id}`;
  }

  async function openDetail(purchaseId) {
    try {
      const res = await purchasesApi.get(activeBusinessId, purchaseId);
      setDetail(res);
    } catch (err) {
      notify.error(errorMessage(err));
    }
  }

  return (
    <>
      <PageHeader
        title="Compras"
        subtitle="Registra lo que compras a tus proveedores"
        action={
          <Button variant="primary" onClick={() => setOpen(true)}>
            <PlusIcon width={15} height={15} /> Nueva compra
          </Button>
        }
      />
      <div className="page-content">
        <div className="filters-row">
          <Select value={filters.providerId} onChange={(e) => setFilters({ ...filters, providerId: e.target.value })}>
            <option value="">Todos los proveedores</option>
            {providers?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">Todos los estados</option>
            <option value="PAID">Pagada</option>
            <option value="PARTIAL">Parcial</option>
            <option value="CANCELLED">Cancelada</option>
          </Select>
        </div>

        <Card>
          {loading ? (
            <PageLoading />
          ) : !purchases || purchases.length === 0 ? (
            <EmptyState title="Sin compras registradas" description="Registra tu primera compra a un proveedor." />
          ) : (
            <table className="table">
              <thead><tr><th>Fecha</th><th>Proveedor</th><th>Total</th><th>Pagado</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => openDetail(p.id)}>
                    <td>{formatDateTime(p.createdAt)}</td>
                    <td>{providerName(p.providerId)}</td>
                    <td>{formatMoney(p.total, currency)}</td>
                    <td>{formatMoney(p.paidAmount, currency)}</td>
                    <td><Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge></td>
                    <td style={{ color: "var(--color-secondary)", fontWeight: 600, fontSize: 12.5 }}>Ver</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {open && (
        <Modal
          title="Nueva compra"
          wide
          onClose={() => setOpen(false)}
          footer={
            <>
              <Button variant="outlined" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button variant="primary" loading={saving} onClick={handleSubmit}>Registrar compra</Button>
            </>
          }
        >
          <form onSubmit={handleSubmit}>
            <Field label="Proveedor">
              <Select required value={providerId} onChange={(e) => setProviderId(e.target.value)}>
                <option value="">Selecciona un proveedor</option>
                {providers?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>

            <label style={{ fontSize: 12.5, fontWeight: 600 }}>Productos</label>
            {items.map((it, idx) => (
              <div key={idx} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 8, marginTop: 8, alignItems: "center" }}>
                <Select value={it.productId} onChange={(e) => updateItem(idx, "productId", e.target.value)}>
                  <option value="">Producto…</option>
                  {products?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
                <Input type="number" min="1" placeholder="Cant." value={it.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} />
                <Input type="number" min="0" step="0.01" placeholder="Costo unit." value={it.unitCost} onChange={(e) => updateItem(idx, "unitCost", e.target.value)} />
                <Button type="button" variant="outlined" size="sm" onClick={() => removeItem(idx)} disabled={items.length === 1}>×</Button>
              </div>
            ))}
            <Button type="button" variant="secondary" size="sm" style={{ marginTop: 10 }} onClick={addItem}>
              + Agregar producto
            </Button>

            <div className="form-row" style={{ marginTop: 16 }}>
              <Field label="Método de pago">
                <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="CASH">Efectivo</option>
                  <option value="TRANSFER">Transferencia</option>
                  <option value="CARD">Tarjeta</option>
                  <option value="MIXED">Mixto</option>
                </Select>
              </Field>
              <Field label={`Monto pagado (total: ${formatMoney(total, currency)})`}>
                <Input type="number" min="0" step="0.01" placeholder={String(total)} value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
              </Field>
            </div>
            <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
              Si pagas menos del total, se crea automáticamente una cuenta por pagar al proveedor.
            </p>
          </form>
        </Modal>
      )}

      {detail && (
        <Modal title={`Compra #${detail.purchase.id}`} onClose={() => setDetail(null)}>
          <div style={{ marginBottom: 10 }}>
            <Badge tone={STATUS_TONE[detail.purchase.status]}>{STATUS_LABEL[detail.purchase.status]}</Badge>
          </div>
          <table className="table">
            <thead><tr><th>Producto</th><th>Cant.</th><th>Costo</th><th>Subtotal</th></tr></thead>
            <tbody>
              {detail.items.map((i) => (
                <tr key={i.id}>
                  <td>#{i.productId}</td>
                  <td>{i.quantity}</td>
                  <td>{formatMoney(i.unitCost, currency)}</td>
                  <td>{formatMoney(i.subtotal, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, marginTop: 12 }}>
            <span>Total</span>
            <span>{formatMoney(detail.purchase.total, currency)}</span>
          </div>
        </Modal>
      )}
    </>
  );
}
