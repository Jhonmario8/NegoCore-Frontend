import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button, Field, Input } from "../components/ui";
import { errorMessage } from "../utils/format";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phoneNumber: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/logo.png" alt="NegoCore" />
          <h1>Crea tu cuenta</h1>
          <p>Empieza a administrar tu negocio</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">Cuenta creada. Redirigiendo a iniciar sesión…</div>}

        <form onSubmit={handleSubmit}>
          <Field label="Nombre completo">
            <Input
              required
              minLength={3}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Juana Pérez"
            />
          </Field>
          <Field label="Correo electrónico">
            <Input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="tucorreo@ejemplo.com"
            />
          </Field>
          <Field label="Teléfono">
            <Input
              required
              value={form.phoneNumber}
              onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
              placeholder="3001234567"
            />
          </Field>
          <Field label="Contraseña" hint="Mínimo 8 caracteres, una mayúscula y un número">
            <Input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
            />
          </Field>
          <Button type="submit" variant="primary" loading={loading} style={{ width: "100%" }}>
            Crear cuenta
          </Button>
        </form>

        <div className="auth-switch">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" style={{ color: "var(--color-secondary)", fontWeight: 600 }}>
            Inicia sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
