import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BarChart3,
  ClipboardCheck,
  FileDown,
  Gauge,
  LogOut,
  Shield,
  Target,
  Users
} from "lucide-react";
import { useAuth } from "../auth/AuthContext.jsx";

// Navigation items per role
const NAV_BY_ROLE = {
  employee: [
    { to: "/app/dashboard", label: "My Dashboard", icon: Gauge },
    { to: "/app/goals",     label: "My Goals",      icon: Target },
    { to: "/app/check-ins", label: "My Check-ins",  icon: ClipboardCheck }
  ],
  manager: [
    { to: "/app/dashboard", label: "Team Dashboard", icon: Gauge },
    { to: "/app/goals",     label: "Team Goals",      icon: Target },
    { to: "/app/approvals", label: "Approvals",       icon: BarChart3 },
    { to: "/app/check-ins", label: "Team Check-ins",  icon: ClipboardCheck }
  ],
  admin: [
    { to: "/app/dashboard", label: "Org Dashboard", icon: Gauge },
    { to: "/app/goals",     label: "All Goals",      icon: Target },
    { to: "/app/approvals", label: "Approvals",      icon: BarChart3 },
    { to: "/app/check-ins", label: "Check-ins",      icon: ClipboardCheck },
    { to: "/app/admin",     label: "HR Admin",       icon: Shield },
    { to: "/app/reports",   label: "Reports",        icon: FileDown }
  ]
};

const ROLE_COLORS = {
  employee: { bg: "rgba(99,102,241,0.15)", border: "rgba(99,102,241,0.5)", text: "#a5b4fc" },
  manager:  { bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.45)", text: "#86efac" },
  admin:    { bg: "rgba(214,168,79,0.15)", border: "rgba(214,168,79,0.5)", text: "#f2c96d" }
};

const ROLE_LABELS = { employee: "Employee", manager: "Manager", admin: "HR Admin" };

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const nav = NAV_BY_ROLE[user?.role] ?? NAV_BY_ROLE.employee;
  const colors = ROLE_COLORS[user?.role] ?? ROLE_COLORS.employee;

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink to="/" className="brand">
          <span className="brand-mark">AQ</span>
          <span>
            <strong>AtomQuest</strong>
            <small>Goal Portal</small>
          </span>
        </NavLink>

        {/* Role badge */}
        <div
          className="role-badge"
          style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}
        >
          <Users size={13} />
          {ROLE_LABELS[user?.role] ?? "User"}
        </div>

        <nav className="nav-list">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} className="nav-item">
                <Icon size={18} aria-hidden="true" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-user">
          <strong>{user.name}</strong>
          <small>{user.title}</small>
          <small style={{ opacity: 0.6 }}>{user.department}</small>
          <button className="icon-button" type="button" onClick={handleLogout} title="Sign out" style={{ marginTop: 10 }}>
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
