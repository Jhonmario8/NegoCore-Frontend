import { useState } from "react";
import PageHeader from "../components/PageHeader";
import { providersApi } from "../api/crm";
import { useBusinessData } from "../hooks/useBusinessData";
import { useToast } from "../context/ToastContext";
import { Button, Card, EmptyState, Field, Input, Modal, PageLoading, PlusIcon, ChevronRightIcon } from "../components/ui";
import { errorMessage } from "../utils/format";

const empty = { name: "", phone: "", email: "", address: "" };

export default function Providers() {
  const { data, loading, reload, businessId } = useBusinessData((id) => providersApi.list(id));
  const notify = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [viewTarget, setViewTarget] = useState(null);

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { name: form.name };
      if (form.phone) payload.phone = form.phone;
      if (form.email) payload.email = form.email;
      if (form.address) payload.address = form.address;
      await providersApi.create(businessId, payload);
      notify.success("Proveedor registrado.");
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
        title="Proveedores"
        subtitle="Personas o empresas que te abastecen"
        action={
          <Button variant="primary" onClick={() => setOpen(true)}>
            <PlusIcon width={15} height={15} /> Nuevo proveedor
          </Button>
        }
      />
      <div className="page-content">
        <Card>
          {loading ? (
            <PageLoading />
          ) : !data || data.length === 0 ? (
            <EmptyState title="Sin proveedores" description="Registra tu primer proveedor." />
          ) : (
            <>
              <table className="table data-table">
                <thead>
                  <tr><th>Nombre</th><th>Teléfono</th><th>Correo</th><th>Dirección</th></tr>
                </thead>
                <tbody>
                  {data.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td>{p.phone || "—"}</td>
                      <td>{p.email || "—"}</td>
                      <td>{p.address || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="list-cards">
                {data.map((p) => (
                  <div className="list-card-row tappable" key={p.id} onClick={() => setViewTarget(p)}>
                    <div className="list-card-main">
                      <div className="list-card-title">{p.name}</div>
                      <div className="list-card-meta">{p.phone || "Sin teléfono"}</div>
                    </div>
                    <ChevronRightIcon width={18} height={18} className="list-card-chevron" />
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {open && (
        <Modal
          title="Nuevo proveedor"
          onClose={() => setOpen(false)}
          footer={
            <>
              <Button variant="outlined" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button variant="primary" loading={saving} onClick={handleCreate}>Guardar</Button>
            </>
          }
        >
          <form onSubmit={handleCreate}>
            <Field label="Nombre">
              <Input required minLength={2} maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
            </Field>
            <Field label="Teléfono (opcional)">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Correo (opcional)">
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Dirección (opcional)">
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
          </form>
        </Modal>
      )}

      {viewTarget && (
        <Modal title={viewTarget.name} onClose={() => setViewTarget(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13.5 }}>
            <div><strong>Teléfono:</strong> {viewTarget.phone || "—"}</div>
            <div><strong>Correo:</strong> {viewTarget.email || "—"}</div>
            <div><strong>Dirección:</strong> {viewTarget.address || "—"}</div>
          </div>
        </Modal>
      )}
    </>
  );
}
