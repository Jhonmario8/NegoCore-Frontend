import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button, Field, Input } from "../components/ui";
import { errorMessage } from "../utils/format";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form);
      navigate("/app");
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
          <h1>NegoCore</h1>
          <p>Gestiona tu negocio en un solo lugar</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <Field label="Correo electrónico">
            <Input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="tucorreo@ejemplo.com"
            />
          </Field>
          <Field label="Contraseña">
            <Input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
            />
          </Field>
          <Button type="submit" variant="primary" loading={loading} style={{ width: "100%" }}>
            Iniciar sesión
          </Button>
        </form>

        <div className="auth-switch">
          ¿No tienes cuenta?{" "}
          <Link to="/register" style={{ color: "var(--color-secondary)", fontWeight: 600 }}>
            Regístrate
          </Link>
        </div>
      </div>
    </div>
  );
}
