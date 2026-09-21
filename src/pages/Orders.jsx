import { useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import { catalogApi } from "../api/catalog";
import { clientsApi, providersApi } from "../api/crm";
import { ordersApi } from "../api/orders";
import { useBusiness } from "../context/BusinessContext";
import { useBusinessData } from "../hooks/useBusinessData";
import { useToast } from "../context/ToastContext";
import {
  Button, Card, EmptyState, Field, Select, Input, PageLoading, Badge, Modal, PlusIcon, TrashIcon, ImageIcon,
} from "../components/ui";
import { formatMoney, formatDateTime, errorMessage, resolveImageUrl } from "../utils/format";

const STATUS_TONE = { OPEN: "warning", CONVERTED: "success", CANCELLED: "danger" };
const STATUS_LABEL = { OPEN: "Abierto", CONVERTED: "Convertido", CANCELLED: "Cancelado" };

const emptyItemForm = { productId: "", productName: "", quantity: "1", clientId: "", requesterName: "", unitCost: "", salePrice: "" };

export default function Orders() {
  const { activeBusinessId, activeBusiness } = useBusiness();
  const notify = useToast();
  const currency = activeBusiness?.currency;

  const { data: products } = useBusinessData((id) => catalogApi.listProducts(id));
  const { data: clients } = useBusinessData((id) => clientsApi.list(id));
  const { data: providers } = useBusinessData((id) => providersApi.list(id));

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

  const [filters, setFilters] = useState({ status: "OPEN" });
  const { data: orders, loading, reload } = useBusinessData(
    (id) => ordersApi.list(id, { status: filters.status || undefined }),
    [filters.status]
  );

  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState(null);
  const [itemForm, setItemForm] = useState(emptyItemForm);
  const [addingItem, setAddingItem] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertForm, setConvertForm] = useState({ providerId: "", paymentMethod: "CASH", paidAmount: "", shippingCost: "" });
  const [unitCosts, setUnitCosts] = useState({});
  const [converting, setConverting] = useState(false);

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await ordersApi.create(activeBusinessId);
      notify.success(`Pedido #${res.order.orderNumber} creado.`);
      reload();
      setDetail(res);
      setItemForm(emptyItemForm);
    } catch (err) {
      notify.error(errorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  async function openDetail(orderId) {
    try {
      const res = await ordersApi.get(activeBusinessId, orderId);
      setDetail(res);
      setItemForm(emptyItemForm);
    } catch (err) {
      notify.error(errorMessage(err));
    }
  }

  function selectProductByName(name) {
    const match = products?.find((p) => p.name.toLowerCase() === name.toLowerCase());
    if (match) {
      setItemForm((prev) => ({
        ...prev,
        productId: String(match.id),
        productName: match.name,
        unitCost: String(match.costPrice ?? ""),
        salePrice: String(match.salePrice ?? ""),
      }));
    } else {
      setItemForm((prev) => ({ ...prev, productId: "", productName: name, unitCost: "", salePrice: "" }));
    }
  }

  async function handleAddItem(e) {
    e.preventDefault();
    if (!itemForm.productId) {
      notify.error("Selecciona un producto válido.");
      return;
    }
    if (!Number(itemForm.quantity) || Number(itemForm.quantity) <= 0) {
      notify.error("La cantidad debe ser mayor a 0.");
      return;
    }
    setAddingItem(true);
    try {
      const res = await ordersApi.addItem(activeBusinessId, detail.order.id, {
        productId: Number(itemForm.productId),
        quantity: Number(itemForm.quantity),
        clientId: itemForm.clientId ? Number(itemForm.clientId) : undefined,
        requesterName: itemForm.requesterName || undefined,
        unitCost: itemForm.unitCost !== "" ? Number(itemForm.unitCost) : undefined,
        salePrice: itemForm.salePrice !== "" ? Number(itemForm.salePrice) : undefined,
      });
      setDetail(res);
      setItemForm(emptyItemForm);
    } catch (err) {
      notify.error(errorMessage(err));
    } finally {
      setAddingItem(false);
    }
  }

  async function handleRemoveItem(itemId) {
    try {
      const res = await ordersApi.removeItem(activeBusinessId, detail.order.id, itemId);
      setDetail(res);
    } catch (err) {
      notify.error(errorMessage(err));
    }
  }

  async function handleCancelOrder() {
    setCancelling(true);
    try {
      await ordersApi.cancel(activeBusinessId, detail.order.id);
      notify.success("Pedido cancelado.");
      setDetail(null);
      reload();
    } catch (err) {
      notify.error(errorMessage(err));
    } finally {
      setCancelling(false);
    }
  }

  const groupedItems = useMemo(() => {
    if (!detail) return [];
    const map = new Map();
    detail.items.forEach((i) => {
      map.set(i.productId, (map.get(i.productId) || 0) + i.quantity);
    });
    return Array.from(map.entries()).map(([productId, quantity]) => ({ productId, quantity }));
  }, [detail]);

  function openConvertModal() {
    const initialCosts = {};
    groupedItems.forEach((g) => {
      const lastItemWithCost = [...detail.items].reverse().find((i) => i.productId === g.productId && i.unitCost != null);
      const product = productsById.get(g.productId);
      initialCosts[g.productId] = lastItemWithCost
        ? String(lastItemWithCost.unitCost)
        : (product ? String(product.costPrice) : "");
    });
    setUnitCosts(initialCosts);
    setConvertForm({ providerId: "", paymentMethod: "CASH", paidAmount: "", shippingCost: "" });
    setConvertOpen(true);
  }

  const convertTotal = useMemo(() => {
    const itemsTotal = groupedItems.reduce(
      (sum, g) => sum + g.quantity * (Number(unitCosts[g.productId]) || 0),
      0
    );
    return itemsTotal + (Number(convertForm.shippingCost) || 0);
  }, [groupedItems, unitCosts, convertForm.shippingCost]);

  async function handleConvert(e) {
    e.preventDefault();
    if (!convertForm.providerId) {
      notify.error("Selecciona un proveedor.");
      return;
    }
    if (groupedItems.some((g) => !unitCosts[g.productId] || Number(unitCosts[g.productId]) < 0)) {
      notify.error("Completa el costo unitario de todos los productos.");
      return;
    }
    setConverting(true);
    try {
      await ordersApi.convert(activeBusinessId, detail.order.id, {
        providerId: Number(convertForm.providerId),
        unitCosts: groupedItems.map((g) => ({
          productId: g.productId,
          unitCost: Number(unitCosts[g.productId]),
        })),
        paymentMethod: convertForm.paymentMethod,
        paidAmount: convertForm.paidAmount === "" ? convertTotal : Number(convertForm.paidAmount),
        shippingCost: Number(convertForm.shippingCost) || 0,
      });
      notify.success("Pedido convertido en compra. El stock ya se actualizó.");
      setConvertOpen(false);
      setDetail(null);
      reload();
    } catch (err) {
      notify.error(errorMessage(err));
    } finally {
      setConverting(false);
    }
  }

  function requesterLabel(item) {
    if (item.clientId) return clientsById.get(item.clientId)?.name || `Cliente #${item.clientId}`;
    if (item.requesterName) return item.requesterName;
    return "—";
  }

  return (
    <>
      <PageHeader
        title="Pedidos"
        subtitle="Lista de productos que van pidiendo, lista para convertir en una compra"
        action={
          <Button variant="primary" loading={creating} onClick={handleCreate}>
            <PlusIcon width={15} height={15} /> Nuevo pedido
          </Button>
        }
      />
      <div className="page-content">
        <div className="filters-row">
          <Select value={filters.status} onChange={(e) => setFilters({ status: e.target.value })}>
            <option value="OPEN">Abiertos</option>
            <option value="CONVERTED">Convertidos</option>
            <option value="CANCELLED">Cancelados</option>
            <option value="">Todos</option>
          </Select>
        </div>

        <Card>
          {loading ? (
            <PageLoading />
          ) : !orders || orders.length === 0 ? (
            <EmptyState title="Sin pedidos" description="Crea un pedido nuevo y ve agregando productos a medida que los pidan." />
          ) : (
            <>
              <table className="table data-table">
                <thead><tr><th>Pedido</th><th>Fecha</th><th>Estado</th><th></th></tr></thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} style={{ cursor: "pointer" }} onClick={() => openDetail(o.id)}>
                      <td style={{ fontWeight: 600 }}>#{o.orderNumber}</td>
                      <td>{formatDateTime(o.createdAt)}</td>
                      <td><Badge tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge></td>
                      <td style={{ color: "var(--color-secondary)", fontWeight: 600, fontSize: 12.5 }}>Ver</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="list-cards">
                {orders.map((o) => (
                  <div className="list-card-row tappable" key={o.id} onClick={() => openDetail(o.id)}>
                    <div className="list-card-main">
                      <div className="list-card-title">Pedido #{o.orderNumber}</div>
                      <div className="list-card-meta">{formatDateTime(o.createdAt)}</div>
                    </div>
                    <div className="list-card-side">
                      <Badge tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {detail && (
        <Modal
          title={`Pedido #${detail.order.orderNumber}`}
          wide={760}
          onClose={() => setDetail(null)}
          footer={
            detail.order.status === "OPEN" ? (
              <>
                <Button variant="danger" loading={cancelling} onClick={handleCancelOrder}>Cancelar pedido</Button>
                <Button
                  variant="primary"
                  disabled={detail.items.length === 0}
                  onClick={openConvertModal}
                >
                  Convertir a compra
                </Button>
              </>
            ) : null
          }
        >
          <div style={{ marginBottom: 12 }}>
            <Badge tone={STATUS_TONE[detail.order.status]}>{STATUS_LABEL[detail.order.status]}</Badge>
            {detail.order.status === "CONVERTED" && (
              <span style={{ marginLeft: 8, fontSize: 12.5, color: "var(--color-text-muted)" }}>
                Convertido en compra #{detail.order.convertedPurchaseId}
              </span>
            )}
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ minWidth: 560 }}>
              <thead><tr><th></th><th>Producto</th><th>Cant.</th><th>Costo</th><th>Venta</th><th>Solicitado por</th>{detail.order.status === "OPEN" && <th></th>}</tr></thead>
              <tbody>
                {detail.items.length === 0 ? (
                  <tr><td colSpan={detail.order.status === "OPEN" ? 7 : 6} style={{ color: "var(--color-text-muted)", textAlign: "center" }}>Sin productos todavía.</td></tr>
                ) : (
                  detail.items.map((i) => {
                    const product = productsById.get(i.productId);
                    const imgUrl = resolveImageUrl(product?.imageUrl);
                    return (
                      <tr key={i.id}>
                        <td>
                          {imgUrl ? (
                            <img src={imgUrl} alt="" style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 6 }} />
                          ) : (
                            <div className="product-thumb-placeholder" style={{ width: 32, height: 32 }}>
                              <ImageIcon width={14} height={14} />
                            </div>
                          )}
                        </td>
                        <td>{product?.name || `#${i.productId}`}</td>
                        <td>{i.quantity}</td>
                        <td>{i.unitCost != null ? formatMoney(i.unitCost, currency) : "—"}</td>
                        <td>{i.salePrice != null ? formatMoney(i.salePrice, currency) : "—"}</td>
                        <td>{requesterLabel(i)}</td>
                        {detail.order.status === "OPEN" && (
                          <td>
                            <Button variant="outlined" size="sm" onClick={() => handleRemoveItem(i.id)}>
                              <TrashIcon width={13} height={13} />
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {detail.order.status === "OPEN" && (
            <form onSubmit={handleAddItem} style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--color-border)" }}>
              <label style={{ fontSize: 12.5, fontWeight: 600 }}>Agregar producto</label>
              <datalist id="order-products-list">
                {products?.map((p) => <option key={p.id} value={p.name} />)}
              </datalist>
              <div style={{ display: "flex", gap: 10, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
                {(() => {
                  const selected = itemForm.productId ? productsById.get(Number(itemForm.productId)) : null;
                  const imgUrl = resolveImageUrl(selected?.imageUrl);
                  return imgUrl ? (
                    <img src={imgUrl} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
                  ) : (
                    <div className="product-thumb-placeholder" style={{ width: 40, height: 40, flexShrink: 0 }}>
                      <ImageIcon width={18} height={18} />
                    </div>
                  );
                })()}
                <Input
                  list="order-products-list"
                  placeholder="Buscar producto…"
                  value={itemForm.productName}
                  onChange={(e) => selectProductByName(e.target.value)}
                  style={{ flex: "1 1 200px" }}
                />
                <Input
                  type="number"
                  min="1"
                  placeholder="Cantidad"
                  value={itemForm.quantity}
                  onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
                  style={{ flex: "1 1 90px" }}
                />
              </div>
              <div className="form-row" style={{ marginTop: 10 }}>
                <Field label="Precio de costo">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={itemForm.unitCost}
                    onChange={(e) => setItemForm({ ...itemForm, unitCost: e.target.value })}
                  />
                </Field>
                <Field label="Precio de venta">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={itemForm.salePrice}
                    onChange={(e) => setItemForm({ ...itemForm, salePrice: e.target.value })}
                  />
                </Field>
              </div>
              <div className="form-row" style={{ marginTop: 10 }}>
                <Select
                  value={itemForm.clientId}
                  onChange={(e) => setItemForm({ ...itemForm, clientId: e.target.value, requesterName: e.target.value ? "" : itemForm.requesterName })}
                >
                  <option value="">Sin cliente</option>
                  {clients?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
                <Input
                  placeholder="O escribe un nombre…"
                  value={itemForm.requesterName}
                  disabled={!!itemForm.clientId}
                  onChange={(e) => setItemForm({ ...itemForm, requesterName: e.target.value })}
                />
              </div>
              <Button type="submit" variant="primary" loading={addingItem} style={{ marginTop: 14, width: "100%" }}>
                <PlusIcon width={15} height={15} /> Agregar al pedido
              </Button>
            </form>
          )}
        </Modal>
      )}

      {convertOpen && detail && (
        <Modal
          title={`Convertir pedido #${detail.order.orderNumber} en compra`}
          wide={760}
          onClose={() => setConvertOpen(false)}
          footer={
            <>
              <Button variant="outlined" onClick={() => setConvertOpen(false)}>Cancelar</Button>
              <Button variant="primary" loading={converting} onClick={handleConvert}>Registrar compra</Button>
            </>
          }
        >
          <form onSubmit={handleConvert}>
            <Field label="Proveedor">
              <Select required value={convertForm.providerId} onChange={(e) => setConvertForm({ ...convertForm, providerId: e.target.value })}>
                <option value="">Selecciona un proveedor</option>
                {providers?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>

            <label style={{ fontSize: 12.5, fontWeight: 600 }}>Costo unitario por producto</label>
            {groupedItems.map((g) => {
              const product = productsById.get(g.productId);
              const imgUrl = resolveImageUrl(product?.imageUrl);
              return (
                <div key={g.productId} style={{ display: "grid", gridTemplateColumns: "auto 2fr 1fr 1fr", gap: 8, marginTop: 8, alignItems: "center" }}>
                  {imgUrl ? (
                    <img src={imgUrl} alt="" style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 6 }} />
                  ) : (
                    <div className="product-thumb-placeholder" style={{ width: 32, height: 32 }}>
                      <ImageIcon width={14} height={14} />
                    </div>
                  )}
                  <span>{product?.name || `#${g.productId}`}</span>
                  <span style={{ color: "var(--color-text-muted)", fontSize: 13 }}>{g.quantity} unidades</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Costo unit."
                    value={unitCosts[g.productId] || ""}
                    onChange={(e) => setUnitCosts({ ...unitCosts, [g.productId]: e.target.value })}
                  />
                </div>
              );
            })}

            <div className="form-row" style={{ marginTop: 16 }}>
              <Field label="Método de pago">
                <Select value={convertForm.paymentMethod} onChange={(e) => setConvertForm({ ...convertForm, paymentMethod: e.target.value })}>
                  <option value="CASH">Efectivo</option>
                  <option value="TRANSFER">Transferencia</option>
                  <option value="CARD">Tarjeta</option>
                  <option value="MIXED">Mixto</option>
                </Select>
              </Field>
              <Field label="Costo de envío">
                <Input type="number" min="0" step="0.01" placeholder="0" value={convertForm.shippingCost} onChange={(e) => setConvertForm({ ...convertForm, shippingCost: e.target.value })} />
              </Field>
              <Field label={`Monto pagado (total: ${formatMoney(convertTotal, currency)})`}>
                <Input type="number" min="0" step="0.01" placeholder={String(convertTotal)} value={convertForm.paidAmount} onChange={(e) => setConvertForm({ ...convertForm, paidAmount: e.target.value })} />
              </Field>
            </div>
            <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
              Si pagas menos del total, se crea automáticamente una cuenta por pagar al proveedor.
            </p>
          </form>
        </Modal>
      )}
    </>
  );
}
