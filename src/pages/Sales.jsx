import { useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import { catalogApi } from "../api/catalog";
import { clientsApi } from "../api/crm";
import { salesApi } from "../api/sales";
import { financeApi } from "../api/finance";
import { useBusiness } from "../context/BusinessContext";
import { useBusinessData } from "../hooks/useBusinessData";
import { useToast } from "../context/ToastContext";
import {
  Button, Card, EmptyState, Field, Input, Select, PageLoading, Badge, Modal, SearchIcon,
} from "../components/ui";
import PaymentModal from "../components/PaymentModal";
import { formatMoney, formatDateTime, errorMessage, resolveImageUrl } from "../utils/format";
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
  const [submitting, setSubmitting] = useState(false);

  const total = useMemo(
    () => cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
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

  function resetForm() {
    setCart([]);
    setClientId("");
    setPaidAmount("");
    setPaymentMethod("CASH");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (cart.length === 0) {
      notify.error("Agrega al menos un producto.");
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
        saleItems: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        paymentMethod,
        paidAmount: paid,
        clientId: clientId ? Number(clientId) : undefined,
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
                  <div style={{ fontSize: 11.5, color: "var(--color-text-muted)" }}>
                    {formatMoney(i.unitPrice, currency)} c/u
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

function SalesHistory({ businessId, currency, refreshKey }) {
  const notify = useToast();
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

  async function openDetail(saleId) {
    try {
      const res = await salesApi.get(businessId, saleId);
      setDetail(res);
    } catch (err) {
      notify.error(errorMessage(err));
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
            onClose={() => setDetail(null)}
            footer={
              detail.sale.status !== "CANCELLED" && (
                <>
                  {canPay && (
                    <Button variant="primary" onClick={() => setShowPay(true)}>Registrar abono</Button>
                  )}
                  <Button variant="danger" loading={cancelling} onClick={handleCancel}>
                    Cancelar venta
                  </Button>
                </>
              )
            }
          >
            <div style={{ marginBottom: 10 }}>
              <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
            </div>
            <table className="table">
              <thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr></thead>
              <tbody>
                {detail.items.map((i) => (
                  <tr key={i.id}>
                    <td>#{i.productId}</td>
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
          <SalesHistory businessId={activeBusinessId} currency={activeBusiness?.currency} refreshKey={refreshKey} />
        )}
      </div>
    </>
  );
}
