import { useState } from "react";
import PageHeader from "../components/PageHeader";
import { clientsApi } from "../api/crm";
import { useBusinessData } from "../hooks/useBusinessData";
import { useToast } from "../context/ToastContext";
import { Button, Card, EmptyState, Field, Input, Modal, PageLoading, PlusIcon, ChevronRightIcon } from "../components/ui";
import { errorMessage } from "../utils/format";

const empty = { name: "", phone: "", email: "", address: "" };

export default function Clients() {
  const { data, loading, reload, businessId } = useBusinessData((id) => clientsApi.list(id));
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
      await clientsApi.create(businessId, payload);
      notify.success("Cliente registrado.");
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
        title="Clientes"
        subtitle="Personas a las que les vendes"
        action={
          <Button variant="primary" onClick={() => setOpen(true)}>
            <PlusIcon width={15} height={15} /> Nuevo cliente
          </Button>
        }
      />
      <div className="page-content">
        <Card>
          {loading ? (
            <PageLoading />
          ) : !data || data.length === 0 ? (
            <EmptyState title="Sin clientes" description="Registra tu primer cliente para poder venderle a crédito." />
          ) : (
            <>
              <table className="table data-table">
                <thead>
                  <tr><th>Nombre</th><th>Teléfono</th><th>Correo</th><th>Dirección</th></tr>
                </thead>
                <tbody>
                  {data.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td>{c.phone || "—"}</td>
                      <td>{c.email || "—"}</td>
                      <td>{c.address || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="list-cards">
                {data.map((c) => (
                  <div className="list-card-row tappable" key={c.id} onClick={() => setViewTarget(c)}>
                    <div className="list-card-main">
                      <div className="list-card-title">{c.name}</div>
                      <div className="list-card-meta">{c.phone || "Sin teléfono"}</div>
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
          title="Nuevo cliente"
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
            <Field label="Teléfono (opcional)" hint="10 dígitos">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="3001234567" />
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
