import { useState } from "react";
import PageHeader from "../components/PageHeader";
import { auditApi } from "../api/finance";
import { useBusinessData } from "../hooks/useBusinessData";
import { Card, EmptyState, Input, Select, PageLoading } from "../components/ui";
import { formatDateTime, errorMessage } from "../utils/format";

const ACTIONS = [
  "BUSINESS_CREATED", "PRODUCT_STOCK_ADJUSTED", "SALE_CREATED", "SALE_CANCELLED",
  "EXPENSE_CREATED", "CASH_CLOSED", "DEBT_PAYMENT_REGISTERED",
];

export default function AuditLogs() {
  const [filters, setFilters] = useState({ from: "", to: "", action: "" });
  const { data, loading, error } = useBusinessData(
    (id) => auditApi.list(id, { ...filters, from: filters.from || undefined, to: filters.to || undefined, action: filters.action || undefined, size: 50 }),
    [filters.from, filters.to, filters.action]
  );

  return (
    <>
      <PageHeader title="Auditoría" subtitle="Historial de operaciones sensibles del negocio" />
      <div className="page-content">
        <div className="filters-row">
          <Input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
          <Input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
          <Select value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })}>
            <option value="">Todas las acciones</option>
            {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </Select>
        </div>
        <Card>
          {loading ? (
            <PageLoading />
          ) : error ? (
            <div className="alert alert-error">{errorMessage(error)}</div>
          ) : !data?.content || data.content.length === 0 ? (
            <EmptyState title="Sin registros" />
          ) : (
            <table className="table">
              <thead><tr><th>Acción</th><th>Entidad</th><th>Detalle</th><th>Fecha</th></tr></thead>
              <tbody>
                {data.content.map((log, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{log.action}</td>
                    <td>{log.entity ? `${log.entity} #${log.entityId}` : "—"}</td>
                    <td>{log.details || "—"}</td>
                    <td>{formatDateTime(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  );
}
