import { useState } from "react";
import PageHeader from "../components/PageHeader";
import { catalogApi } from "../api/catalog";
import { useBusinessData } from "../hooks/useBusinessData";
import { useToast } from "../context/ToastContext";
import { Button, Card, EmptyState, Field, Input, Modal, PageLoading } from "../components/ui";
import { errorMessage, formatDate } from "../utils/format";
import { PlusIcon } from "../components/ui";

export default function Categories() {
  const { data, loading, reload, businessId } = useBusinessData((id) => catalogApi.listCategories(id));
  const notify = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await catalogApi.createCategory(businessId, { name });
      notify.success("Categoría creada.");
      setName("");
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
        title="Categorías"
        subtitle="Organiza tus productos por categoría"
        action={
          <Button variant="primary" onClick={() => setOpen(true)}>
            <PlusIcon width={15} height={15} /> Nueva categoría
          </Button>
        }
      />
      <div className="page-content">
        <Card>
          {loading ? (
            <PageLoading />
          ) : !data || data.length === 0 ? (
            <EmptyState title="Sin categorías todavía" description="Crea la primera para empezar a organizar tu catálogo." />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Estado</th>
                  <th>Creada</th>
                </tr>
              </thead>
              <tbody>
                {data.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td>{c.active ? "Activa" : "Inactiva"}</td>
                    <td>{formatDate(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {open && (
        <Modal
          title="Nueva categoría"
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
              <Input required minLength={2} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </Field>
          </form>
        </Modal>
      )}
    </>
  );
}
