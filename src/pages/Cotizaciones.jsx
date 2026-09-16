import { useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import PageHeader from "../components/PageHeader";
import { catalogApi } from "../api/catalog";
import { quotesApi } from "../api/quotes";
import { useBusiness } from "../context/BusinessContext";
import { useBusinessData } from "../hooks/useBusinessData";
import { useToast } from "../context/ToastContext";
import {
  Button, Card, EmptyState, Field, Input, PageLoading, SearchIcon, ImageIcon,
} from "../components/ui";
import { formatMoney, errorMessage, resolveImageUrl } from "../utils/format";

function formatQuoteDate(value) {
  if (!value) return "—";
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function Cotizaciones() {
  const { activeBusinessId, activeBusiness } = useBusiness();
  const currency = activeBusiness?.currency;
  const notify = useToast();
  const { data: products } = useBusinessData((id) => catalogApi.listProducts(id));

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]); // {productId, name, sku, imageUrl, unitPrice, quantity, stock}
  const [clientName, setClientName] = useState("");
  const [validityDays, setValidityDays] = useState("15");
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [quote, setQuote] = useState(null);
  const receiptRef = useRef(null);

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
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          imageUrl: product.imageUrl,
          unitPrice: product.salePrice,
          quantity: 1,
        },
      ];
    });
  }

  function changeQty(productId, delta) {
    setCart((prev) =>
      prev
        .map((i) => (i.productId === productId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  }

  function changePrice(productId, value) {
    setCart((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, unitPrice: value } : i))
    );
  }

  function removeFromCart(productId) {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }

  async function handleGenerate() {
    if (cart.length === 0) {
      notify.error("Agrega al menos un producto.");
      return;
    }
    setGenerating(true);
    try {
      const res = await quotesApi.create(activeBusinessId, {
        clientName: clientName || undefined,
        validityDays: validityDays === "" ? undefined : Number(validityDays),
        items: cart.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice === "" ? undefined : Number(i.unitPrice),
        })),
      });
      setQuote(res);
    } catch (err) {
      notify.error(errorMessage(err));
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownload() {
    if (!receiptRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(receiptRef.current, { pixelRatio: 2, backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.download = `cotizacion-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      notify.error("No se pudo generar la imagen.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <PageHeader title="Cotizaciones" subtitle="Arma una cotización y descárgala como imagen" />
      <div className="page-content">
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
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Cotización actual">
            {cart.length === 0 ? (
              <EmptyState title="Sin productos" description="Selecciona productos de la izquierda." />
            ) : (
              <div style={{ marginBottom: 14 }}>
                {cart.map((i) => (
                  <div key={i.productId} className="cart-row">
                    <div>
                      <div style={{ fontWeight: 600 }}>{i.name}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={i.unitPrice}
                          onChange={(e) => changePrice(i.productId, e.target.value)}
                          style={{ width: 110 }}
                        />
                        <span style={{ fontSize: 11.5, color: "var(--color-text-muted)" }}>c/u</span>
                      </div>
                    </div>
                    <div className="qty-control">
                      <button type="button" onClick={() => changeQty(i.productId, -1)}>−</button>
                      <span>{i.quantity}</span>
                      <button type="button" onClick={() => changeQty(i.productId, 1)}>+</button>
                    </div>
                    <button type="button" className="icon-btn danger" onClick={() => removeFromCart(i.productId)}>×</button>
                  </div>
                ))}
              </div>
            )}

            <Field label="Nombre del cliente">
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nombre del cliente" />
            </Field>
            <Field label="Días de validez">
              <Input type="number" min="1" value={validityDays} onChange={(e) => setValidityDays(e.target.value)} />
            </Field>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700, margin: "14px 0" }}>
              <span>Total</span>
              <span>{formatMoney(total, currency)}</span>
            </div>

            <Button variant="primary" loading={generating} style={{ width: "100%" }} onClick={handleGenerate}>
              Generar cotización
            </Button>
          </Card>
        </div>

        {quote && (
          <div style={{ marginTop: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ fontSize: 15, margin: 0 }}>Vista previa</h2>
              <Button variant="primary" loading={exporting} onClick={handleDownload}>
                Descargar imagen
              </Button>
            </div>
            <div style={{ display: "flex", justifyContent: "center", background: "var(--color-bg)", padding: 20, borderRadius: 12, overflowX: "auto" }}>
              <div
                ref={receiptRef}
                style={{
                  width: 640,
                  flexShrink: 0,
                  background: "#ffffff",
                  color: "#1a1a1a",
                  padding: "36px 40px",
                  fontFamily: "Arial, sans-serif",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                }}
              >
                <div style={{ textAlign: "right", fontSize: 13, color: "#555" }}>
                  {formatQuoteDate(quote.quoteDate)}
                </div>

                <h1 style={{ fontSize: 24, margin: "6px 0 10px", color: "#111" }}>{quote.businessName}</h1>

                <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 13, color: "#444", marginBottom: 18 }}>
                  {quote.address && <span>📍 {quote.address}</span>}
                  {quote.phone && <span>📞 {quote.phone}</span>}
                  {quote.email && <span>✉️ {quote.email}</span>}
                </div>

                <div style={{ borderTop: "1px solid #e2e2e2", paddingTop: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 8 }}>
                    <span style={{ color: "#555" }}>Nombre del cliente</span>
                    <strong>{quote.clientName || "—"}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 8 }}>
                    <span style={{ color: "#555" }}>Fecha de expiración</span>
                    <strong>{formatQuoteDate(quote.expirationDate)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                    <span style={{ color: "#555" }}>Vendedor</span>
                    <strong>{quote.sellerName}</strong>
                  </div>
                </div>

                <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 24 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e2e2e2", textAlign: "left", fontSize: 12.5, color: "#555" }}>
                      <th style={{ padding: "0 0 10px" }}>Productos</th>
                      <th style={{ padding: "0 0 10px", textAlign: "right" }}>Código</th>
                      <th style={{ padding: "0 0 10px", textAlign: "right" }}>Cantidad</th>
                      <th style={{ padding: "0 0 10px", textAlign: "right" }}>Precio unitario</th>
                      <th style={{ padding: "0 0 10px", textAlign: "right" }}>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quote.items.map((item) => (
                      <tr key={item.productId} style={{ borderBottom: "1px solid #f0f0f0" }}>
                        <td style={{ padding: "10px 0" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {resolveImageUrl(item.imageUrl) ? (
                              <img
                                src={resolveImageUrl(item.imageUrl)}
                                alt=""
                                crossOrigin="anonymous"
                                style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6 }}
                              />
                            ) : (
                              <div style={{ width: 48, height: 48, borderRadius: 6, background: "#f2f2f2" }} />
                            )}
                            <span style={{ fontWeight: 600, fontSize: 13.5 }}>{item.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: "10px 0", textAlign: "right", fontSize: 13 }}>{item.sku || "—"}</td>
                        <td style={{ padding: "10px 0", textAlign: "right", fontSize: 13 }}>{item.quantity}</td>
                        <td style={{ padding: "10px 0", textAlign: "right", fontSize: 13 }}>{formatMoney(item.unitPrice, currency)}</td>
                        <td style={{ padding: "10px 0", textAlign: "right", fontSize: 13, fontWeight: 600 }}>{formatMoney(item.subtotal, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 26 }}>
                  <span style={{ fontSize: 20, fontWeight: 700 }}>Total:</span>
                  <span style={{ fontSize: 26, fontWeight: 800 }}>{formatMoney(quote.total, currency)}</span>
                </div>

                <p style={{ textAlign: "center", fontSize: 11, color: "#888", marginTop: 30, lineHeight: 1.5 }}>
                  Este documento es una cotización formal y está sujeto a cambios. Para más información, por favor contáctenos.
                  <br />
                  Gracias por considerar nuestros servicios. Estamos aquí para ayudar.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
