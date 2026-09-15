import { useState } from "react";
import PageHeader from "../components/PageHeader";
import { financeApi } from "../api/finance";
import { useBusiness } from "../context/BusinessContext";
import { useBusinessData } from "../hooks/useBusinessData";
import { Card, PageLoading, Input, Field, Button } from "../components/ui";
import { formatMoney, todayISO, errorMessage } from "../utils/format";
import { useToast } from "../context/ToastContext";

function firstDayOfMonthISO() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export default function Overview() {
  const { activeBusiness } = useBusiness();
  const notify = useToast();
  const [range, setRange] = useState({ from: firstDayOfMonthISO(), to: todayISO() });

  const { data, loading, reload, error } = useBusinessData(
    (businessId) => financeApi.balanceReport(businessId, range),
    [range.from, range.to]
  );

  function applyRange(e) {
    e.preventDefault();
    reload();
  }

  return (
    <>
      <PageHeader
        title={`Resumen · ${activeBusiness?.name || ""}`}
        subtitle="Balance de ingresos, gastos y ganancia del negocio"
      />
      <div className="page-content">
        <Card>
          <form onSubmit={applyRange} className="filters-row" style={{ marginBottom: 0 }}>
            <Field label="Desde">
              <Input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
            </Field>
            <Field label="Hasta">
              <Input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
            </Field>
            <Button type="submit" variant="secondary" style={{ marginTop: 20 }}>
              Aplicar
            </Button>
          </form>
        </Card>

        <div style={{ height: 18 }} />

        {loading ? (
          <PageLoading />
        ) : error ? (
          <div className="alert alert-error">{errorMessage(error)}</div>
        ) : (
          <div className="stat-grid">
            <div className="stat-card">
              <div className="label">Ventas totales</div>
              <div className="value">{formatMoney(data?.totalSales, activeBusiness?.currency)}</div>
            </div>
            <div className="stat-card">
              <div className="label">Gastos totales</div>
              <div className="value">{formatMoney(data?.totalExpenses, activeBusiness?.currency)}</div>
            </div>
            <div className="stat-card accent-secondary">
              <div className="label">Ganancia</div>
              <div className="value">{formatMoney(data?.profit, activeBusiness?.currency)}</div>
            </div>
            <div className="stat-card">
              <div className="label"># Ventas</div>
              <div className="value">{data?.salesCount ?? 0}</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
