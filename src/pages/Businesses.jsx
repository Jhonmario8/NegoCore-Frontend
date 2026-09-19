import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "../context/BusinessContext";
import { useAuth } from "../context/AuthContext";
import { businessApi } from "../api/business";
import { useToast } from "../context/ToastContext";
import { Button, Field, Input, Select, Card, EmptyState, PageLoading, Modal, EditIcon, IconButton, RefreshIcon } from "../components/ui";
import { errorMessage } from "../utils/format";

export default function Businesses() {
  const { businesses, loading, error, refresh, setActiveBusinessId } = useBusiness();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const notify = useToast();

  const [form, setForm] = useState({ name: "", currency: "COP" });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", currency: "COP", address: "", phone: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    try {
      const created = await businessApi.create(form);
      await refresh();
      setActiveBusinessId(created.id);
      notify.success(`Negocio "${created.name}" creado.`);
      setForm({ name: "", currency: "COP" });
    } catch (err) {
      notify.error(errorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  function openEdit(business, e) {
    e.stopPropagation();
    setEditing(business);
    setEditForm({
      name: business.name || "",
      currency: business.currency || "COP",
      address: business.address || "",
      phone: business.phone || "",
      email: business.email || "",
    });
  }

  async function handleUpdate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await businessApi.update(editing.id, editForm);
      await refresh();
      notify.success("Negocio actualizado.");
      setEditing(null);
    } catch (err) {
      notify.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function enterBusiness(id) {
    setActiveBusinessId(id);
    navigate("/app");
  }

  return (
    <div className="auth-screen" style={{ alignItems: "flex-start", paddingTop: 60 }}>
      <div style={{ width: "100%", maxWidth: 760 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h1 style={{ color: "var(--color-text)", margin: 0, fontSize: 22 }}>Tus negocios</h1>
            <p style={{ color: "var(--color-text-muted)", margin: "4px 0 0", fontSize: 13.5 }}>
              Elige un negocio para administrar o crea uno nuevo
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <IconButton title="Actualizar" onClick={handleRefresh}>
              <RefreshIcon width={15} height={15} className={refreshing ? "spin" : undefined} />
            </IconButton>
            <Button variant="outlined" onClick={() => { logout(); navigate("/login"); }}>
              Cerrar sesión
            </Button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 18 }}>
          <Card title="Negocios existentes">
            {loading ? (
              <PageLoading />
            ) : error && businesses.length === 0 ? (
              <EmptyState
                title="No se pudieron cargar tus negocios"
                description={errorMessage(error)}
                action={
                  <Button variant="primary" loading={refreshing} onClick={handleRefresh}>
                    Reintentar
                  </Button>
                }
              />
            ) : businesses.length === 0 ? (
              <EmptyState
                title="Aún no tienes negocios"
                description="Crea el primero para empezar a registrar ventas, productos y más."
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {businesses.map((b) => (
                  <div
                    key={b.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => enterBusiness(b.id)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && enterBusiness(b.id)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 14px",
                      border: "1px solid var(--color-border)",
                      borderRadius: 10,
                      background: "var(--color-surface)",
                      color: "var(--color-text)",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{b.name}</div>
                      <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{b.currency}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <IconButton title="Editar negocio" onClick={(e) => openEdit(b, e)}>
                        <EditIcon width={14} height={14} />
                      </IconButton>
                      <span style={{ color: "var(--color-secondary)", fontWeight: 600, fontSize: 13 }}>Entrar →</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Crear negocio">
            <form onSubmit={handleCreate}>
              <Field label="Nombre del negocio">
                <Input
                  required
                  minLength={3}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Mi Tienda"
                />
              </Field>
              <Field label="Moneda">
                <Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                  <option value="COP">COP — Peso colombiano</option>
                  <option value="USD">USD — Dólar</option>
                  <option value="EUR">EUR — Euro</option>
                </Select>
              </Field>
              <Button type="submit" variant="primary" loading={creating} style={{ width: "100%" }}>
                Crear negocio
              </Button>
            </form>
          </Card>
        </div>
      </div>

      {editing && (
        <Modal
          title={`Editar ${editing.name}`}
          onClose={() => setEditing(null)}
          footer={
            <>
              <Button variant="outlined" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button variant="primary" loading={saving} onClick={handleUpdate}>Guardar</Button>
            </>
          }
        >
          <form onSubmit={handleUpdate}>
            <Field label="Nombre del negocio">
              <Input
                required
                minLength={3}
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </Field>
            <Field label="Moneda">
              <Select value={editForm.currency} onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })}>
                <option value="COP">COP — Peso colombiano</option>
                <option value="USD">USD — Dólar</option>
                <option value="EUR">EUR — Euro</option>
              </Select>
            </Field>
            <Field label="Dirección">
              <Input
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                placeholder="Calle 123 #45-67"
              />
            </Field>
            <Field label="Teléfono">
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="3001234567"
              />
            </Field>
            <Field label="Correo">
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="contacto@minegocio.com"
              />
            </Field>
            <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
              Estos datos se usan como encabezado en las cotizaciones que generes.
            </p>
          </form>
        </Modal>
      )}
    </div>
  );
}
