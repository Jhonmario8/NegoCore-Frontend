import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "../context/BusinessContext";
import { useAuth } from "../context/AuthContext";
import { businessApi } from "../api/business";
import { useToast } from "../context/ToastContext";
import { Button, Field, Input, Select, Card, EmptyState, PageLoading } from "../components/ui";
import { errorMessage } from "../utils/format";

export default function Businesses() {
  const { businesses, loading, refresh, setActiveBusinessId } = useBusiness();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const notify = useToast();

  const [form, setForm] = useState({ name: "", currency: "COP" });
  const [creating, setCreating] = useState(false);

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
          <Button variant="outlined" onClick={() => { logout(); navigate("/login"); }}>
            Cerrar sesión
          </Button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 18 }}>
          <Card title="Negocios existentes">
            {loading ? (
              <PageLoading />
            ) : businesses.length === 0 ? (
              <EmptyState
                title="Aún no tienes negocios"
                description="Crea el primero para empezar a registrar ventas, productos y más."
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {businesses.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => enterBusiness(b.id)}
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
                    <span style={{ color: "var(--color-secondary)", fontWeight: 600, fontSize: 13 }}>Entrar →</span>
                  </button>
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
    </div>
  );
}
