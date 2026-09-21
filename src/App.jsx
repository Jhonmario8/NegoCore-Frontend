import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { BusinessProvider } from "./context/BusinessContext";
import { ToastProvider } from "./context/ToastContext";
import RequireAuth from "./components/RequireAuth";
import DashboardLayout from "./components/DashboardLayout";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Businesses from "./pages/Businesses";
import Overview from "./pages/Overview";
import Categories from "./pages/Categories";
import Products from "./pages/Products";
import Clients from "./pages/Clients";
import Providers from "./pages/Providers";
import Sales from "./pages/Sales";
import Purchases from "./pages/Purchases";
import Orders from "./pages/Orders";
import Cotizaciones from "./pages/Cotizaciones";
import Expenses from "./pages/Expenses";
import Debts from "./pages/Debts";

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BusinessProvider>
          <HashRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              <Route
                path="/app/businesses"
                element={
                  <RequireAuth>
                    <Businesses />
                  </RequireAuth>
                }
              />

              <Route
                path="/app"
                element={
                  <RequireAuth>
                    <DashboardLayout />
                  </RequireAuth>
                }
              >
                <Route index element={<Overview />} />
                <Route path="categories" element={<Categories />} />
                <Route path="products" element={<Products />} />
                <Route path="clients" element={<Clients />} />
                <Route path="providers" element={<Providers />} />
                <Route path="sales" element={<Sales />} />
                <Route path="purchases" element={<Purchases />} />
                <Route path="orders" element={<Orders />} />
                <Route path="cotizaciones" element={<Cotizaciones />} />
                <Route path="expenses" element={<Expenses />} />
                <Route path="debts" element={<Debts />} />
              </Route>

              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </HashRouter>
        </BusinessProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
