import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useBusiness } from "../context/BusinessContext";
import {
  HomeIcon, BoxIcon, TagIcon, UsersIcon, TruckIcon, CartIcon,
  ReceiptIcon, AlertIcon, HistoryIcon, LogoutIcon, WalletIcon, IconButton,
} from "./ui";

const NAV = [
  { to: "/app", end: true, label: "Resumen", icon: HomeIcon },
  { to: "/app/products", label: "Productos", icon: BoxIcon },
  { to: "/app/categories", label: "Categorías", icon: TagIcon },
  { to: "/app/clients", label: "Clientes", icon: UsersIcon },
  { to: "/app/providers", label: "Proveedores", icon: TruckIcon },
  { to: "/app/sales", label: "Ventas", icon: CartIcon },
  { to: "/app/purchases", label: "Compras", icon: WalletIcon },
  { to: "/app/expenses", label: "Gastos", icon: ReceiptIcon },
  { to: "/app/debts", label: "Cuentas", icon: AlertIcon },
  { to: "/app/audit-logs", label: "Auditoría", icon: HistoryIcon },
];

function initials(name) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { businesses, activeBusinessId, setActiveBusinessId, activeBusiness } = useBusiness();
  const navigate = useNavigate();

  if (businesses.length === 0) {
    navigate("/app/businesses");
  }

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="app-topbar-left">
          <div className="app-brand">
            <img src="/logo.png" alt="NegoCore" />
            <span>NegoCore</span>
          </div>

          <div className="business-switcher">
            <select
              value={activeBusinessId || ""}
              onChange={(e) => setActiveBusinessId(Number(e.target.value))}
            >
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="app-topbar-right">
          <div className="user-menu">
            <div className="user-avatar">{initials(user?.name)}</div>
            <div>
              <div className="user-name">{user?.name}</div>
              <div className="user-currency">{activeBusiness?.currency}</div>
            </div>
          </div>
          <IconButton title="Cerrar sesión" onClick={() => { logout(); navigate("/login"); }}>
            <LogoutIcon width={15} height={15} />
          </IconButton>
        </div>
      </header>

      <nav className="app-subnav">
        {NAV.map(({ to, end, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `nav-pill ${isActive ? "active" : ""}`}
          >
            <Icon width={15} height={15} />
            {label}
          </NavLink>
        ))}
        <button className="nav-pill" style={{ marginLeft: "auto" }} onClick={() => navigate("/app/businesses")}>
          <UsersIcon width={15} height={15} />
          Mis negocios
        </button>
      </nav>

      <div className="main-area">
        <Outlet />
      </div>
    </div>
  );
}
