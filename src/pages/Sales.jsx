import { useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import PageHeader from "../components/PageHeader";
import { catalogApi } from "../api/catalog";
import { clientsApi } from "../api/crm";
import { salesApi } from "../api/sales";
import { financeApi } from "../api/finance";
import { useBusiness } from "../context/BusinessContext";
import { useAuth } from "../context/AuthContext";
import { useBusinessData } from "../hooks/useBusinessData";
import { useToast } from "../context/ToastContext";
import {
  Button, Card, EmptyState, Field, Input, Select, PageLoading, Badge, Modal, SearchIcon,
} from "../components/ui";
import PaymentModal from "../components/PaymentModal";
import { formatMoney, formatDateTime, errorMessage, resolveImageUrl, nowDateTimeLocal, toDateTimeLocalValue } from "../utils/format";
import { ImageIcon } from "../components/ui";

const STATUS_TONE = { PAID: "success", PARTIAL: "warning", CANCELLED: "danger" };
const STATUS_LABEL = { PAID: "Pagada", PARTIAL: "Parcial", CANCELLED: "Cancelada" };

function Pos({ currency, businessId, onSold }) {
  const { data: products } = useBusinessData((id) => catalogApi.listProducts(id));
  const { data: clients } = useBusinessData((id) => clientsApi.list(id));
  const notify = useToast();

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]); // {productId, name, unitPrice, quantity, stock}
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [clientId, setClientId] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [saleDate, setSaleDate] = useState(nowDateTimeLocal());
  const [submitting, setSubmitting] = useState(false);

  const total = useMemo(
    () => cart.reduce((sum, i) => sum + (Number(i.unitPrice) || 0) * i.quantity, 0),
    [cart]
  );

  const filtered = (products || []).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  function addToCart(product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        if (existing.quantity + 1 > product.stock) {
          notify.error(`Sin stock suficiente de ${product.name}.`);
          return prev;
        }
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      if (product.stock < 1) {
        notify.error(`${product.name} no tiene stock disponible.`);
        return prev;
      }
      return [...prev, { productId: product.id, name: product.name, unitPrice: product.salePrice, quantity: 1, stock: product.stock }];
    });
  }

  function changeQty(productId, delta) {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.productId !== productId) return i;
          const next = i.quantity + delta;
          if (next > i.stock) {
            notify.error("No hay más stock disponible.");
            return i;
          }
          return { ...i, quantity: next };
        })
        .filter((i) => i.quantity > 0)
    );
  }

  function changePrice(productId, value) {
    setCart((prev) =>
      prev.map((i) =>
        i.productId === productId ? { ...i, unitPrice: value === "" ? "" : Number(value) } : i
      )
    );
  }

  function resetForm() {
    setCart([]);
    setClientId("");
    setPaidAmount("");
    setPaymentMethod("CASH");
    setSaleDate(nowDateTimeLocal());
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (cart.length === 0) {
      notify.error("Agrega al menos un producto.");
      return;
    }
    if (cart.some((i) => !i.unitPrice || Number(i.unitPrice) <= 0)) {
      notify.error("El precio de cada producto debe ser mayor a 0.");
      return;
    }
    const paid = paidAmount === "" ? total : Number(paidAmount);
    if (paid < total && !clientId) {
      notify.error("Para una venta con saldo pendiente debes seleccionar un cliente.");
      return;
    }
    setSubmitting(true);
    try {
      await salesApi.register(businessId, {
        saleItems: cart.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
        })),
        paymentMethod,
        paidAmount: paid,
        clientId: clientId ? Number(clientId) : undefined,
        createdAt: saleDate || undefined,
      });
      notify.success("Venta registrada.");
      resetForm();
      onSold();
    } catch (err) {
      notify.error(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pos-layout">
      <Card title="Productos">
        <div className="search-input" style={{ marginBottom: 14, maxWidth: "100%" }}>
          <SearchIcon width={16} height={16} />
          <input placeholder="Buscar producto…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {!products ? (
          <PageLoading />
        ) : filtered.length === 0 ? (
          <EmptyState title="No hay productos" description="Crea productos primero en la sección Productos." />
        ) : (
          <div className="product-pick-grid">
            {filtered.map((p) => (
              <div key={p.id} className="product-pick-card" onClick={() => addToCart(p)}>
                {resolveImageUrl(p.imageUrl) ? (
                  <img
                    src={resolveImageUrl(p.imageUrl)}
                    alt=""
                    style={{ width: "100%", height: 70, objectFit: "cover", borderRadius: 8, marginBottom: 8 }}
                  />
                ) : (
                  <div style={{ width: "100%", height: 70, borderRadius: 8, marginBottom: 8, background: "var(--color-primary-50)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-tertiary)" }}>
                    <ImageIcon width={22} height={22} />
                  </div>
                )}
                <div className="name">{p.name}</div>
                <div className="price">{formatMoney(p.salePrice, currency)}</div>
                <div className="stock">{p.stock} disponibles</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Venta actual">
        {cart.length === 0 ? (
          <EmptyState title="Carrito vacío" description="Selecciona productos de la izquierda." />
        ) : (
          <div style={{ marginBottom: 14 }}>
            {cart.map((i) => (
              <div key={i.productId} className="cart-row">
                <div>
                  <div style={{ fontWeight: 600 }}>{i.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={i.unitPrice}
                      onChange={(e) => changePrice(i.productId, e.target.value)}
                      style={{ width: 100, height: 28, fontSize: 12.5, padding: "2px 6px" }}
                    />
                    <span style={{ fontSize: 11.5, color: "var(--color-text-muted)" }}>c/u</span>
                  </div>
                </div>
                <div className="qty-control">
                  <button type="button" onClick={() => changeQty(i.productId, -1)}>−</button>
                  <span>{i.quantity}</span>
                  <button type="button" onClick={() => changeQty(i.productId, 1)}>+</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Field label="Cliente (opcional, requerido si es a crédito)">
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Sin cliente</option>
              {clients?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Método de pago">
            <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="CASH">Efectivo</option>
              <option value="TRANSFER">Transferencia</option>
              <option value="CARD">Tarjeta</option>
              <option value="MIXED">Mixto</option>
            </Select>
          </Field>
          <Field label="Fecha de la venta">
            <Input
              type="datetime-local"
              value={saleDate}
              max={nowDateTimeLocal()}
              onChange={(e) => setSaleDate(e.target.value)}
            />
          </Field>
          <Field label={`Monto pagado (total: ${formatMoney(total, currency)})`}>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder={String(total)}
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
            />
          </Field>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700, margin: "14px 0" }}>
            <span>Total</span>
            <span>{formatMoney(total, currency)}</span>
          </div>

          <Button type="submit" variant="primary" loading={submitting} style={{ width: "100%" }}>
            Registrar venta
          </Button>
        </form>
      </Card>
    </div>
  );
}

function SalesHistory({ businessId, currency, activeBusiness, refreshKey }) {
  const notify = useToast();
  const { user } = useAuth();
  const [filters, setFilters] = useState({ status: "", clientId: "", from: "", to: "" });
  const { data: sales, loading, reload } = useBusinessData(
    (id) => salesApi.list(id, {
      status: filters.status || undefined,
      clientId: filters.clientId || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
    }),
    [filters.status, filters.clientId, filters.from, filters.to, refreshKey]
  );
  const { data: debts, reload: reloadDebts } = useBusinessData((id) => financeApi.listDebts(id), [refreshKey]);
  const { data: products } = useBusinessData((id) => catalogApi.listProducts(id));
  const { data: clients } = useBusinessData((id) => clientsApi.list(id));
  const productsById = useMemo(() => {
    const map = new Map();
    (products || []).forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);
  const clientsById = useMemo(() => {
    const map = new Map();
    (clients || []).forEach((c) => map.set(c.id, c));
    return map;
  }, [clients]);
  const debtsBySaleId = useMemo(() => {
    const map = new Map();
    (debts || []).forEach((d) => {
      if (d.saleId) map.set(d.saleId, d);
    });
    return map;
  }, [debts]);

  function effectivePaidAmount(sale) {
    const debt = debtsBySaleId.get(sale.id);
    return debt ? debt.paidAmount : sale.paidAmount;
  }
  function effectiveStatus(sale) {
    if (sale.status === "CANCELLED") return "CANCELLED";
    return effectivePaidAmount(sale) >= sale.total ? "PAID" : "PARTIAL";
  }

  const [detail, setDetail] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [paying, setPaying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  const [dateForm, setDateForm] = useState("");
  const [savingDate, setSavingDate] = useState(false);
  const receiptRef = useRef(null);

  async function openDetail(saleId) {
    try {
      const res = await salesApi.get(businessId, saleId);
      setDetail(res);
      setEditingDate(false);
    } catch (err) {
      notify.error(errorMessage(err));
    }
  }

  function openEditDate() {
    setDateForm(toDateTimeLocalValue(new Date(detail.sale.createdAt)));
    setEditingDate(true);
  }

  async function handleSaveDate() {
    setSavingDate(true);
    try {
      await salesApi.updateDate(businessId, detail.sale.id, dateForm);
      notify.success("Fecha actualizada.");
      setEditingDate(false);
      reload();
      openDetail(detail.sale.id);
    } catch (err) {
      notify.error(errorMessage(err));
    } finally {
      setSavingDate(false);
    }
  }

  async function handlePay({ amount, paymentMethod: method }) {
    const debt = debtsBySaleId.get(detail.sale.id);
    setPaying(true);
    try {
      await financeApi.payDebt(businessId, debt.id, { amount, paymentMethod: method });
      notify.success("Abono registrado.");
      setShowPay(false);
      reload();
      reloadDebts();
      openDetail(detail.sale.id);
    } catch (err) {
      notify.error(errorMessage(err));
    } finally {
      setPaying(false);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      await salesApi.cancel(businessId, detail.sale.id);
      notify.success("Venta cancelada.");
      setDetail(null);
      reload();
    } catch (err) {
      notify.error(errorMessage(err));
    } finally {
      setCancelling(false);
    }
  }

  async function handleDownloadReceipt() {
    if (!receiptRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(receiptRef.current, { pixelRatio: 2, backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.download = `recibo-venta-${detail.sale.id}.png`;
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
      <div className="filters-row">
        <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">Todos los estados</option>
          <option value="PAID">Pagada</option>
          <option value="PARTIAL">Parcial</option>
          <option value="CANCELLED">Cancelada</option>
        </Select>
        <Input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
        <Input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
      </div>

      <Card>
        {loading ? (
          <PageLoading />
        ) : !sales || sales.length === 0 ? (
          <EmptyState title="Sin ventas registradas" description="Las ventas que registres aparecerán aquí." />
        ) : (
          <table className="table">
            <thead>
              <tr><th>Fecha</th><th>Total</th><th>Pagado</th><th>Método</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id} style={{ cursor: "pointer" }} onClick={() => openDetail(s.id)}>
                  <td>{formatDateTime(s.createdAt)}</td>
                  <td>{formatMoney(s.total, currency)}</td>
                  <td>{formatMoney(effectivePaidAmount(s), currency)}</td>
                  <td>{s.paymentMethod}</td>
                  <td><Badge tone={STATUS_TONE[effectiveStatus(s)]}>{STATUS_LABEL[effectiveStatus(s)]}</Badge></td>
                  <td style={{ color: "var(--color-secondary)", fontWeight: 600, fontSize: 12.5 }}>Ver</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {detail && (() => {
        const status = effectiveStatus(detail.sale);
        const paid = effectivePaidAmount(detail.sale);
        const pending = detail.sale.total - paid;
        const canPay = status === "PARTIAL" && pending > 0;
        return (
          <Modal
            title={`Venta #${detail.sale.id}`}
            onClose={() => { setDetail(null); setEditingDate(false); }}
            footer={
              <>
                <Button variant="outlined" loading={exporting} onClick={handleDownloadReceipt}>
                  Descargar recibo
                </Button>
                {detail.sale.status !== "CANCELLED" && (
                  <>
                    {canPay && (
                      <Button variant="primary" onClick={() => setShowPay(true)}>Registrar abono</Button>
                    )}
                    <Button variant="danger" loading={cancelling} onClick={handleCancel}>
                      Cancelar venta
                    </Button>
                  </>
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
                  <span>{formatDateTime(detail.sale.createdAt)}</span>
                  <Button size="sm" variant="outlined" onClick={openEditDate}>Editar fecha</Button>
                </>
              )}
            </div>
            <table className="table">
              <thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr></thead>
              <tbody>
                {detail.items.map((i) => (
                  <tr key={i.id}>
                    <td>{productsById.get(i.productId)?.name || `#${i.productId}`}</td>
                    <td>{i.quantity}</td>
                    <td>{formatMoney(i.unitPrice, currency)}</td>
                    <td>{formatMoney(i.subtotal, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, marginTop: 12 }}>
              <span>Total</span>
              <span>{formatMoney(detail.sale.total, currency)}</span>
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
                <span>Recibo de venta</span>
                <span>#{detail.sale.id}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Fecha</span>
                <span>{formatDateTime(detail.sale.createdAt)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Cliente</span>
                <span>{clientsById.get(detail.sale.clientId)?.name || "Consumidor final"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Atendido por</span>
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

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700, marginTop: 14, paddingTop: 10, borderTop: "1px dashed #ccc" }}>
              <span>Total</span>
              <span>{formatMoney(detail.sale.total, currency)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "#666", marginTop: 4 }}>
              <span>Pagado</span>
              <span>{formatMoney(effectivePaidAmount(detail.sale), currency)}</span>
            </div>

            <p style={{ textAlign: "center", fontSize: 10.5, color: "#888", marginTop: 20 }}>
              ¡Gracias por tu compra!
            </p>
          </div>
        </div>
      )}

      {showPay && detail && (
        <PaymentModal
          title={`Abono a venta #${detail.sale.id}`}
          pendingAmount={detail.sale.total - effectivePaidAmount(detail.sale)}
          currency={currency}
          saving={paying}
          onClose={() => setShowPay(false)}
          onSubmit={handlePay}
        />
      )}
    </>
  );
}

export default function Sales() {
  const { activeBusinessId, activeBusiness } = useBusiness();
  const [tab, setTab] = useState("pos");
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <>
      <PageHeader title="Ventas" subtitle="Punto de venta e historial" />
      <div className="page-content">
        <div className="tabs">
          <button className={`tab ${tab === "pos" ? "active" : ""}`} onClick={() => setTab("pos")}>Nueva venta</button>
          <button className={`tab ${tab === "history" ? "active" : ""}`} onClick={() => setTab("history")}>Historial</button>
        </div>

        {tab === "pos" ? (
          <Pos
            currency={activeBusiness?.currency}
            businessId={activeBusinessId}
            onSold={() => setRefreshKey((k) => k + 1)}
          />
        ) : (
          <SalesHistory businessId={activeBusinessId} currency={activeBusiness?.currency} activeBusiness={activeBusiness} refreshKey={refreshKey} />
        )}
      </div>
    </>
  );
}
