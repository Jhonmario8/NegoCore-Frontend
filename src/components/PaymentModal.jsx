import { useState } from "react";
import { Button, Field, Input, Modal, Select } from "./ui";
import { formatMoney } from "../utils/format";

export default function PaymentModal({ title, pendingAmount, currency, saving, onClose, onSubmit }) {
  const [form, setForm] = useState({ amount: "", paymentMethod: "CASH" });

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ amount: Number(form.amount), paymentMethod: form.paymentMethod });
  }

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="outlined" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" loading={saving} onClick={handleSubmit}>Registrar abono</Button>
        </>
      }
    >
      <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 0 }}>
        Saldo pendiente: <strong>{formatMoney(pendingAmount, currency)}</strong>
      </p>
      <form onSubmit={handleSubmit}>
        <Field label="Monto del abono">
          <Input
            type="number"
            min="0.01"
            step="0.01"
            max={pendingAmount}
            required
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
        </Field>
        <Field label="Método de pago">
          <Select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
            <option value="CASH">Efectivo</option>
            <option value="TRANSFER">Transferencia</option>
            <option value="CARD">Tarjeta</option>
          </Select>
        </Field>
      </form>
    </Modal>
  );
}
