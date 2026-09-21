import { useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import PageHeader from "../components/PageHeader";
import { catalogApi } from "../api/catalog";
import { providersApi } from "../api/crm";
import { purchasesApi } from "../api/purchases";
import { financeApi } from "../api/finance";
import { useBusiness } from "../context/BusinessContext";
import { useAuth } from "../context/AuthContext";
import { useBusinessData } from "../hooks/useBusinessData";
import { useToast } from "../context/ToastContext";
import {
  Button, Card, EmptyState, Field, Select, Input, PageLoading, Badge, Modal, PlusIcon,
} from "../components/ui";
import PaymentModal from "../components/PaymentModal";
import { formatMoney, formatDateTime, errorMessage, nowDateTimeLocal, toDateTimeLocalValue } from "../utils/format";

const STATUS_TONE = { PAID: "success", PARTIAL: "warning", CANCELLED: "danger" };
const STATUS_LABEL = { PAID: "Pagada", PARTIAL: "Parcial", CANCELLED: "Cancelada" };

export default function Purchases() {
  const { activeBusinessId, activeBusiness } = useBusiness();
  const { user } = useAuth();
  const notify = useToast();
  const currency = activeBusiness?.currency;

  const { data: providers } = useBusinessData((id) => providersApi.list(id));
  const { data: products } = useBusinessData((id) => catalogApi.listProducts(id));
  const productsById = useMemo(() => {
    const map = new Map();
    (products || []).forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);
  const [filters, setFilters] = useState({ providerId: "", status: "" });
  const { data: purchases, loading, reload } = useBusinessData(
    (id) => purchasesApi.list(id, { providerId: filters.providerId || undefined, status: filters.status || undefined }),
    [filters.providerId, filters.status]
  );
  const { data: payables, reload: reloadPayables } = useBusinessData((id) => financeApi.listPayables(id));
  const payablesByPurchaseId = useMemo(() => {
    const map = new Map();
    (payables || []).forEach((p) => {
      if (p.source === "PURCHASE") map.set(p.sourceId, p);
    });
    return map;
  }, [payables]);

  function effectivePaidAmount(purchase) {
    const payable = payablesByPurchaseId.get(purchase.id);
    return purchase.paidAmount + (payable?.paidAmount || 0);
  }
  function effectiveStatus(purchase) {
    if (purchase.status === "CANCELLED") return "CANCELLED";
    return effectivePaidAmount(purchase) >= purchase.total ? "PAID" : "PARTIAL";
  }

  const [open, setOpen] = useState(false);
  const [providerId, setProviderId] = useState("");
  const [items, setItems] = useState([{ productId: "", productName: "", quantity: "1", unitCost: "" }]);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paidAmount, setPaidAmount] = useState("");
  const [shippingCost, setShippingCost] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(nowDateTimeLocal());
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState(null);
  const [showPay, setShowPay] = useState(false);
  const [paying, setPaying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  const [dateForm, setDateForm] = useState("");
  const [savingDate, setSavingDate] = useState(false);
  const receiptRef = useRef(null);

  const itemsTotal = useMemo(
    () => items.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unitCost) || 0), 0),
    [items]
  );
  const total = itemsTotal + (Number(shippingCost) || 0);

  function updateItem(idx, field, value) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  }
  function selectProductByName(idx, name) {
    const match = products?.find((p) => p.name.toLowerCase() === name.toLowerCase());
    setItems((prev) => prev.map((it, i) => {
      if (i !== idx) return it;
      if (match) {
        return { ...it, productId: String(match.id), productName: match.name, unitCost: String(match.costPrice) };
      }
      return { ...it, productId: "", productName: name };
    }));
  }
  function addItem() {
    setItems((prev) => [...prev, { productId: "", productName: "", quantity: "1", unitCost: "" }]);
  }
  function removeItem(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }
  function resetForm() {
    setProviderId("");
    setItems([{ productId: "", productName: "", quantity: "1", unitCost: "" }]);
    setPaymentMethod("CASH");
    setPaidAmount("");
    setShippingCost("");
    setPurchaseDate(nowDateTimeLocal());
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
        shippingCost: Number(shippingCost) || 0,
        createdAt: purchaseDate || undefined,
      });
      notify.success("Compra registrada. El stock ya se actualizó.");
      resetForm();
      setOpen(false);
      reload();
      reloadPayables();
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
      setEditingDate(false);
    } catch (err) {
      notify.error(errorMessage(err));
    }
  }

  function openEditDate() {
    setDateForm(toDateTimeLocalValue(new Date(detail.purchase.createdAt)));
    setEditingDate(true);
  }

  async function handleSaveDate() {
    setSavingDate(true);
    try {
      await purchasesApi.updateDate(activeBusinessId, detail.purchase.id, dateForm);
      notify.success("Fecha actualizada.");
      setEditingDate(false);
      reload();
      openDetail(detail.purchase.id);
    } catch (err) {
      notify.error(errorMessage(err));
    } finally {
      setSavingDate(false);
    }
  }

  async function handlePay({ amount, paymentMethod: method }) {
    const payable = payablesByPurchaseId.get(detail.purchase.id);
    setPaying(true);
    try {
      await financeApi.payPayable(activeBusinessId, payable.id, { amount, paymentMethod: method });
      notify.success("Abono registrado.");
      setShowPay(false);
      reload();
      reloadPayables();
      openDetail(detail.purchase.id);
    } catch (err) {
      notify.error(errorMessage(err));
    } finally {
      setPaying(false);
    }
  }

  async function handleDownloadReceipt() {
    if (!receiptRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(receiptRef.current, { pixelRatio: 2, backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.download = `recibo-compra-${detail.purchase.id}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      notify.error("No se pudo generar el recibo.");
    } finally {
      setExporting(false);
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
            <>
              <table className="table data-table">
                <thead><tr><th>Fecha</th><th>Proveedor</th><th>Total</th><th>Pagado</th><th>Estado</th><th></th></tr></thead>
                <tbody>
                  {purchases.map((p) => (
                    <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => openDetail(p.id)}>
                      <td>{formatDateTime(p.createdAt)}</td>
                      <td>{providerName(p.providerId)}</td>
                      <td>{formatMoney(p.total, currency)}</td>
                      <td>{formatMoney(effectivePaidAmount(p), currency)}</td>
                      <td><Badge tone={STATUS_TONE[effectiveStatus(p)]}>{STATUS_LABEL[effectiveStatus(p)]}</Badge></td>
                      <td style={{ color: "var(--color-secondary)", fontWeight: 600, fontSize: 12.5 }}>Ver</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="list-cards">
                {purchases.map((p) => (
                  <div className="list-card-row tappable" key={p.id} onClick={() => openDetail(p.id)}>
                    <div className="list-card-main">
                      <div className="list-card-title">{providerName(p.providerId)}</div>
                      <div className="list-card-meta">{formatDateTime(p.createdAt)}</div>
                    </div>
                    <div className="list-card-side">
                      <span className="list-card-value">{formatMoney(p.total, currency)}</span>
                      <Badge tone={STATUS_TONE[effectiveStatus(p)]}>{STATUS_LABEL[effectiveStatus(p)]}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </>
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
            <datalist id="purchase-products-list">
              {products?.map((p) => <option key={p.id} value={p.name} />)}
            </datalist>
            {items.map((it, idx) => (
              <div key={idx} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 8, marginTop: 8, alignItems: "center" }}>
                <Input
                  list="purchase-products-list"
                  placeholder="Buscar producto…"
                  value={it.productName}
                  onChange={(e) => selectProductByName(idx, e.target.value)}
                />
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
              <Field label="Costo de envío">
                <Input type="number" min="0" step="0.01" placeholder="0" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} />
              </Field>
              <Field label="Fecha de la compra">
                <Input
                  type="datetime-local"
                  value={purchaseDate}
                  max={nowDateTimeLocal()}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                />
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

      {detail && (() => {
        const status = effectiveStatus(detail.purchase);
        const paid = effectivePaidAmount(detail.purchase);
        const pending = detail.purchase.total - paid;
        const canPay = (status === "PENDING" || status === "PARTIAL") && pending > 0;
        return (
          <Modal
            title={`Compra #${detail.purchase.id}`}
            onClose={() => { setDetail(null); setEditingDate(false); }}
            footer={
              <>
                <Button variant="outlined" loading={exporting} onClick={handleDownloadReceipt}>
                  Descargar recibo
                </Button>
                {canPay && (
                  <Button variant="primary" onClick={() => setShowPay(true)}>Registrar abono</Button>
                )}
              </>
            }
          >
            <div style={{ marginBottom: 10 }}>
              <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, fontSize: 13 }}>
              <span style={{ color: "var(--color-text-muted)" }}>Fecha:</span>
              {editingDate ? (
                <>
                  <Input
                    type="datetime-local"
                    value={dateForm}
                    max={nowDateTimeLocal()}
                    onChange={(e) => setDateForm(e.target.value)}
                    style={{ width: 210 }}
                  />
                  <Button size="sm" variant="primary" loading={savingDate} onClick={handleSaveDate}>Guardar</Button>
                  <Button size="sm" variant="outlined" onClick={() => setEditingDate(false)}>Cancelar</Button>
                </>
              ) : (
                <>
                  <span>{formatDateTime(detail.purchase.createdAt)}</span>
                  <Button size="sm" variant="outlined" onClick={openEditDate}>Editar fecha</Button>
                </>
              )}
            </div>
            <table className="table">
              <thead><tr><th>Producto</th><th>Cant.</th><th>Costo</th><th>Subtotal</th></tr></thead>
              <tbody>
                {detail.items.map((i) => (
                  <tr key={i.id}>
                    <td>{productsById.get(i.productId)?.name || `#${i.productId}`}</td>
                    <td>{i.quantity}</td>
                    <td>{formatMoney(i.unitCost, currency)}</td>
                    <td>{formatMoney(i.subtotal, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {detail.purchase.shippingCost > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, color: "var(--color-text-muted)", fontSize: 13 }}>
                <span>Costo de envío</span>
                <span>{formatMoney(detail.purchase.shippingCost, currency)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, marginTop: 12 }}>
              <span>Total</span>
              <span>{formatMoney(detail.purchase.total, currency)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, color: "var(--color-text-muted)", fontSize: 13 }}>
              <span>Pagado</span>
              <span>{formatMoney(paid, currency)}</span>
            </div>
          </Modal>
        );
      })()}

      {detail && (
        <div style={{ position: "fixed", top: -99999, left: -99999 }} aria-hidden="true">
          <div
            ref={receiptRef}
            style={{
              width: 420,
              background: "#ffffff",
              color: "#1a1a1a",
              padding: "28px 30px",
              fontFamily: "Arial, sans-serif",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: 14 }}>
              <h1 style={{ fontSize: 19, margin: "0 0 6px", color: "#111" }}>{activeBusiness?.name}</h1>
              <div style={{ fontSize: 11.5, color: "#555", lineHeight: 1.5 }}>
                {activeBusiness?.address && <div>{activeBusiness.address}</div>}
                {activeBusiness?.phone && <div>Tel: {activeBusiness.phone}</div>}
              </div>
            </div>

            <div style={{ borderTop: "1px dashed #ccc", borderBottom: "1px dashed #ccc", padding: "10px 0", fontSize: 12, color: "#333" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Recibo de compra</span>
                <span>#{detail.purchase.id}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Fecha</span>
                <span>{formatDateTime(detail.purchase.createdAt)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Proveedor</span>
                <span>{providerName(detail.purchase.providerId)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Registrado por</span>
                <span>{user?.name || "—"}</span>
              </div>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 14, fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #ddd", textAlign: "left", color: "#555" }}>
                  <th style={{ padding: "0 0 6px" }}>Producto</th>
                  <th style={{ padding: "0 0 6px", textAlign: "center" }}>Cant.</th>
                  <th style={{ padding: "0 0 6px", textAlign: "right" }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {detail.items.map((i) => (
                  <tr key={i.id} style={{ borderBottom: "1px solid #f2f2f2" }}>
                    <td style={{ padding: "6px 0" }}>{productsById.get(i.productId)?.name || `#${i.productId}`}</td>
                    <td style={{ padding: "6px 0", textAlign: "center" }}>{i.quantity}</td>
                    <td style={{ padding: "6px 0", textAlign: "right" }}>{formatMoney(i.subtotal, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {detail.purchase.shippingCost > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#555", marginTop: 8 }}>
                <span>Costo de envío</span>
                <span>{formatMoney(detail.purchase.shippingCost, currency)}</span>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700, marginTop: 14, paddingTop: 10, borderTop: "1px dashed #ccc" }}>
              <span>Total</span>
              <span>{formatMoney(detail.purchase.total, currency)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "#666", marginTop: 4 }}>
              <span>Pagado</span>
              <span>{formatMoney(effectivePaidAmount(detail.purchase), currency)}</span>
            </div>

            <p style={{ textAlign: "center", fontSize: 10.5, color: "#888", marginTop: 20 }}>
              Gracias por tu confianza.
            </p>
          </div>
        </div>
      )}

      {showPay && detail && (
        <PaymentModal
          title={`Abono a compra #${detail.purchase.id}`}
          pendingAmount={detail.purchase.total - effectivePaidAmount(detail.purchase)}
          currency={currency}
          saving={paying}
          onClose={() => setShowPay(false)}
          onSubmit={handlePay}
        />
      )}
    </>
  );
}
