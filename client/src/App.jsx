import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";
import Layout from "./components/Layout.jsx";
import PremiumHome from "./pages/PremiumHome.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Goals from "./pages/Goals.jsx";
import Approvals from "./pages/Approvals.jsx";
import CheckIns from "./pages/CheckIns.jsx";
import Admin from "./pages/Admin.jsx";
import Reports from "./pages/Reports.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PremiumHome />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="goals" element={<Goals />} />
        <Route
          path="approvals"
          element={
            <RoleRoute roles={["manager", "admin"]}>
              <Approvals />
            </RoleRoute>
          }
        />
        <Route path="check-ins" element={<CheckIns />} />
        <Route path="reports" element={<Reports />} />
        <Route
          path="admin"
          element={
            <RoleRoute roles={["admin"]}>
              <Admin />
            </RoleRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function RoleRoute({ roles, children }) {
  const { user } = useAuth();
  return roles.includes(user?.role) ? children : <Navigate to="/app/dashboard" replace />;
}
