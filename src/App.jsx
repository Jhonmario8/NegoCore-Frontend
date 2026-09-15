import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import Expenses from "./pages/Expenses";
import Debts from "./pages/Debts";
import AuditLogs from "./pages/AuditLogs";

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BusinessProvider>
          <BrowserRouter>
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
                <Route path="expenses" element={<Expenses />} />
                <Route path="debts" element={<Debts />} />
                <Route path="audit-logs" element={<AuditLogs />} />
              </Route>

              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </BrowserRouter>
        </BusinessProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
