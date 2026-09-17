import { useRef, useState } from "react";
import PageHeader from "../components/PageHeader";
import { catalogApi } from "../api/catalog";
import { useBusiness } from "../context/BusinessContext";
import { useBusinessData } from "../hooks/useBusinessData";
import { useToast } from "../context/ToastContext";
import {
  Button, Card, EmptyState, Field, Input, Select, Modal, PageLoading, Badge, IconButton,
  PlusIcon, EditIcon, BoxIcon, ImageIcon, UploadIcon,
} from "../components/ui";
import { errorMessage, formatMoney, resolveImageUrl } from "../utils/format";

const emptyProduct = {
  name: "", categoryId: "", sku: "", costPrice: "", salePrice: "", stock: "0", minStockAlert: "0",
};

function ProductThumb({ url, size = 40 }) {
  const resolved = resolveImageUrl(url);
  if (resolved) {
    return <img src={resolved} alt="" className="product-thumb" style={{ width: size, height: size }} />;
  }
  return (
    <div className="product-thumb-placeholder" style={{ width: size, height: size }}>
      <ImageIcon width={size * 0.45} height={size * 0.45} />
    </div>
  );
}

export default function Products() {
  const { activeBusiness } = useBusiness();
  const notify = useToast();
  const [filters, setFilters] = useState({ categoryId: "", lowStock: false });

  const { data: categories } = useBusinessData((id) => catalogApi.listCategories(id));
  const { data: products, loading, reload, businessId } = useBusinessData(
    (id) => catalogApi.listProducts(id, {
      categoryId: filters.categoryId || undefined,
      lowStock: filters.lowStock || undefined,
    }),
    [filters.categoryId, filters.lowStock]
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyProduct);
  const [saving, setSaving] = useState(false);

  const [stockTarget, setStockTarget] = useState(null);
  const [stockForm, setStockForm] = useState({ quantity: "", reason: "" });
  const [adjusting, setAdjusting] = useState(false);

  const [infoTarget, setInfoTarget] = useState(null);
  const [infoForm, setInfoForm] = useState({ name: "", salePrice: "", categoryId: "" });
  const [savingInfo, setSavingInfo] = useState(false);

  const [imageTarget, setImageTarget] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  function categoryName(id) {
    return categories?.find((c) => c.id === id)?.name || "—";
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await catalogApi.createProduct(businessId, {
        name: form.name,
        categoryId: form.categoryId ? Number(form.categoryId) : undefined,
        sku: form.sku || undefined,
        costPrice: Number(form.costPrice),
        salePrice: Number(form.salePrice),
        stock: Number(form.stock),
        minStockAlert: Number(form.minStockAlert),
      });
      notify.success("Producto creado.");
      setForm(emptyProduct);
      setCreateOpen(false);
      reload();
    } catch (err) {
      notify.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleAdjustStock(e) {
    e.preventDefault();
    setAdjusting(true);
    try {
      await catalogApi.adjustStock(businessId, stockTarget.id, {
        quantity: Number(stockForm.quantity),
        reason: stockForm.reason || undefined,
      });
      notify.success("Stock actualizado.");
      setStockTarget(null);
      setStockForm({ quantity: "", reason: "" });
      reload();
    } catch (err) {
      notify.error(errorMessage(err));
    } finally {
      setAdjusting(false);
    }
  }

  function openInfoModal(product) {
    setInfoTarget(product);
    setInfoForm({ name: product.name, salePrice: String(product.salePrice), categoryId: product.categoryId ? String(product.categoryId) : "" });
  }

  async function handleUpdateInfo(e) {
    e.preventDefault();
    setSavingInfo(true);
    try {
      await catalogApi.updateProduct(businessId, infoTarget.id, {
        name: infoForm.name,
        salePrice: Number(infoForm.salePrice),
        categoryId: infoForm.categoryId ? Number(infoForm.categoryId) : undefined,
      });
      notify.success("Producto actualizado.");
      setInfoTarget(null);
      reload();
    } catch (err) {
      notify.error(errorMessage(err));
    } finally {
      setSavingInfo(false);
    }
  }

  function openImageModal(product) {
    setImageTarget(product);
    setImageFile(null);
    setImagePreview(product.imageUrl ? resolveImageUrl(product.imageUrl) : null);
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      notify.error("Formato no soportado. Usa PNG, JPG o WEBP.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      notify.error("La imagen no puede superar 3 MB.");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleUploadImage() {
    if (!imageFile) return;
    setUploading(true);
    try {
      await catalogApi.uploadImage(businessId, imageTarget.id, imageFile);
      notify.success("Foto actualizada.");
      setImageTarget(null);
      reload();
    } catch (err) {
      notify.error(errorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Productos"
        subtitle="Catálogo e inventario del negocio"
        action={
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <PlusIcon width={15} height={15} /> Nuevo producto
          </Button>
        }
      />
      <div className="page-content">
        <div className="filters-row">
          <Select value={filters.categoryId} onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}>
            <option value="">Todas las categorías</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5 }}>
            <input
              type="checkbox"
              checked={filters.lowStock}
              onChange={(e) => setFilters({ ...filters, lowStock: e.target.checked })}
            />
            Solo stock bajo
          </label>
        </div>

        <Card>
          {loading ? (
            <PageLoading />
          ) : !products || products.length === 0 ? (
            <EmptyState title="Sin productos" description="Crea tu primer producto para empezar a vender." />
          ) : (
            <>
              <table className="table products-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Precio venta</th>
                    <th>Stock</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const low = p.stock <= p.minStockAlert;
                    return (
                      <tr key={p.id}>
                        <td>
                          <button
                            onClick={() => openImageModal(p)}
                            style={{ border: "none", background: "none", cursor: "pointer", padding: 0 }}
                            title="Cambiar foto"
                          >
                            <ProductThumb url={p.imageUrl} />
                          </button>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{p.name}</div>
                          {p.sku && <div style={{ fontSize: 11.5, color: "var(--color-text-muted)" }}>SKU: {p.sku}</div>}
                        </td>
                        <td>{categoryName(p.categoryId)}</td>
                        <td>{formatMoney(p.salePrice, activeBusiness?.currency)}</td>
                        <td>
                          {p.stock} {low && <Badge tone="warning">Stock bajo</Badge>}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 4 }}>
                            <IconButton onClick={() => openInfoModal(p)} title="Editar producto">
                              <EditIcon width={15} height={15} />
                            </IconButton>
                            <IconButton onClick={() => { setStockTarget(p); setStockForm({ quantity: "", reason: "" }); }} title="Ajustar stock">
                              <BoxIcon width={15} height={15} />
                            </IconButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="product-cards">
                {products.map((p) => {
                  const low = p.stock <= p.minStockAlert;
                  return (
                    <div className="product-card-row" key={p.id}>
                      <button
                        onClick={() => openImageModal(p)}
                        className="product-card-thumb-btn"
                        title="Cambiar foto"
                      >
                        <ProductThumb url={p.imageUrl} size={56} />
                      </button>
                      <div className="product-card-info">
                        <div className="product-card-top">
                          <span className="name">{p.name}</span>
                          <div style={{ display: "flex", gap: 4 }}>
                            <IconButton onClick={() => openInfoModal(p)} title="Editar producto">
                              <EditIcon width={14} height={14} />
                            </IconButton>
                            <IconButton
                              onClick={() => { setStockTarget(p); setStockForm({ quantity: "", reason: "" }); }}
                              title="Ajustar stock"
                            >
                              <BoxIcon width={14} height={14} />
                            </IconButton>
                          </div>
                        </div>
                        <div className="meta">
                          {p.sku ? `SKU: ${p.sku} · ` : ""}{categoryName(p.categoryId)}
                        </div>
                        <div className="product-card-bottom">
                          <span className="price">{formatMoney(p.salePrice, activeBusiness?.currency)}</span>
                          <span className="stock-info">
                            {low ? <Badge tone="warning">Stock bajo</Badge> : `${p.stock} disponibles`}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>
      </div>

      {createOpen && (
        <Modal
          title="Nuevo producto"
          wide
          onClose={() => setCreateOpen(false)}
          footer={
            <>
              <Button variant="outlined" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button variant="primary" loading={saving} onClick={handleCreate}>Guardar producto</Button>
            </>
          }
        >
          <form onSubmit={handleCreate}>
            <Field label="Nombre">
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
            </Field>
            <div className="form-row">
              <Field label="Categoría (opcional)">
                <Select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                  <option value="">Sin categoría</option>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="SKU (opcional)">
                <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              </Field>
            </div>
            <div className="form-row">
              <Field label="Precio de costo">
                <Input type="number" min="0" step="0.01" required value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
              </Field>
              <Field label="Precio de venta">
                <Input type="number" min="1" step="0.01" required value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} />
              </Field>
            </div>
            <div className="form-row">
              <Field label="Stock inicial">
                <Input type="number" min="0" required value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
              </Field>
              <Field label="Alerta de stock bajo">
                <Input type="number" min="0" required value={form.minStockAlert} onChange={(e) => setForm({ ...form, minStockAlert: e.target.value })} />
              </Field>
            </div>
            <p style={{ fontSize: 12.5, color: "var(--color-text-muted)" }}>
              Podrás agregar la foto del producto después de crearlo, desde la lista.
            </p>
          </form>
        </Modal>
      )}

      {stockTarget && (
        <Modal
          title={`Ajustar stock · ${stockTarget.name}`}
          onClose={() => setStockTarget(null)}
          footer={
            <>
              <Button variant="outlined" onClick={() => setStockTarget(null)}>Cancelar</Button>
              <Button variant="primary" loading={adjusting} onClick={handleAdjustStock}>Aplicar ajuste</Button>
            </>
          }
        >
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 0 }}>
            Stock actual: <strong>{stockTarget.stock}</strong>. Usa un número positivo para entradas y negativo para salidas o mermas.
          </p>
          <form onSubmit={handleAdjustStock}>
            <Field label="Cantidad a ajustar">
              <Input
                type="number"
                required
                value={stockForm.quantity}
                onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                placeholder="Ej: 10 o -3"
              />
            </Field>
            <Field label="Motivo (opcional)">
              <Input
                maxLength={200}
                value={stockForm.reason}
                onChange={(e) => setStockForm({ ...stockForm, reason: e.target.value })}
                placeholder="Ej: llegada de pedido, merma, conteo físico"
              />
            </Field>
          </form>
        </Modal>
      )}

      {infoTarget && (
        <Modal
          title={`Editar producto`}
          onClose={() => setInfoTarget(null)}
          footer={
            <>
              <Button variant="outlined" onClick={() => setInfoTarget(null)}>Cancelar</Button>
              <Button variant="primary" loading={savingInfo} onClick={handleUpdateInfo}>Guardar cambios</Button>
            </>
          }
        >
          <form onSubmit={handleUpdateInfo}>
            <Field label="Nombre">
              <Input required value={infoForm.name} onChange={(e) => setInfoForm({ ...infoForm, name: e.target.value })} autoFocus />
            </Field>
            <Field label="Precio de venta">
              <Input type="number" min="1" step="0.01" required value={infoForm.salePrice} onChange={(e) => setInfoForm({ ...infoForm, salePrice: e.target.value })} />
            </Field>
            <Field label="Categoría">
              <Select value={infoForm.categoryId} onChange={(e) => setInfoForm({ ...infoForm, categoryId: e.target.value })}>
                <option value="">Sin categoría</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </Field>
          </form>
        </Modal>
      )}

      {imageTarget && (
        <Modal
          title={`Foto · ${imageTarget.name}`}
          onClose={() => setImageTarget(null)}
          footer={
            <>
              <Button variant="outlined" onClick={() => setImageTarget(null)}>Cancelar</Button>
              <Button variant="primary" loading={uploading} disabled={!imageFile} onClick={handleUploadImage}>
                Guardar foto
              </Button>
            </>
          }
        >
          <div className="image-upload-box">
            {imagePreview ? (
              <img src={imagePreview} alt="" className="image-upload-preview" />
            ) : (
              <div className="product-thumb-placeholder" style={{ width: 64, height: 64 }}>
                <ImageIcon width={26} height={26} />
              </div>
            )}
            <div>
              <Button variant="outlined" size="sm" type="button" onClick={() => fileInputRef.current?.click()}>
                <UploadIcon width={14} height={14} /> Elegir imagen
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
              <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 6 }}>
                PNG, JPG o WEBP. Máximo 3 MB.
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
