import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { LockKeyhole, LogIn, Target, Users, Shield } from "lucide-react";
import { useAuth } from "../auth/AuthContext.jsx";

const DEMO_ROLES = [
  {
    email: "employee@atomquest.dev",
    label: "Employee",
    icon: Target,
    name: "Priya Sharma",
    title: "Software Engineer",
    dept: "Engineering",
    description: "Set & submit personal goals, log quarterly check-ins, track own progress.",
    color: "#a5b4fc",
    bg: "rgba(99,102,241,0.12)",
    border: "rgba(99,102,241,0.4)"
  },
  {
    email: "manager@atomquest.dev",
    label: "Manager",
    icon: Users,
    name: "Rahul Mehta",
    title: "Engineering Manager",
    dept: "Engineering",
    description: "Approve team goals, review quarterly check-ins, flag blockers, monitor team performance.",
    color: "#86efac",
    bg: "rgba(34,197,94,0.12)",
    border: "rgba(34,197,94,0.4)"
  },
  {
    email: "admin@atomquest.dev",
    label: "HR Admin",
    icon: Shield,
    name: "Sneha Gupta",
    title: "Head of HR",
    dept: "HR",
    description: "Configure cycles, manage org hierarchy, push shared KPIs, view audit trail, export reports.",
    color: "#f2c96d",
    bg: "rgba(214,168,79,0.12)",
    border: "rgba(214,168,79,0.45)"
  }
];

export default function Login() {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(DEMO_ROLES[0]);
  const [email, setEmail] = useState(DEMO_ROLES[0].email);
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState("");

  if (user) return <Navigate to="/app/dashboard" replace />;

  function pickRole(role) {
    setSelected(role);
    setEmail(role.email);
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    try {
      await login(email, password);
      navigate("/app/dashboard");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel" style={{ width: "min(520px, 100%)" }}>
        <div className="auth-icon" style={{ borderColor: selected.border, color: selected.color, background: selected.bg }}>
          <LockKeyhole size={28} />
        </div>
        <h1>Sign in to AtomQuest</h1>
        <p style={{ color: "#b8b8b8", lineHeight: 1.6 }}>Select a role to experience the full workflow for that persona.</p>

        {/* Role picker cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, margin: "22px 0" }}>
          {DEMO_ROLES.map((role) => {
            const Icon = role.icon;
            const isActive = selected.email === role.email;
            return (
              <button
                key={role.email}
                type="button"
                onClick={() => pickRole(role)}
                style={{
                  display: "grid", gap: 8, padding: "14px 10px", textAlign: "center",
                  border: `1px solid ${isActive ? role.border : "rgba(255,255,255,0.1)"}`,
                  borderRadius: 10, background: isActive ? role.bg : "rgba(255,255,255,0.03)",
                  color: isActive ? role.color : "#b8b8b8",
                  cursor: "pointer", transition: "all 180ms ease"
                }}
              >
                <Icon size={20} style={{ margin: "0 auto" }} />
                <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>{role.label}</span>
              </button>
            );
          })}
        </div>

        {/* Selected role info card */}
        <div style={{
          padding: "14px 16px", borderRadius: 10, marginBottom: 20,
          background: selected.bg, border: `1px solid ${selected.border}`
        }}>
          <div style={{ color: selected.color, fontWeight: 800, fontSize: "0.82rem", textTransform: "uppercase", marginBottom: 4 }}>
            {selected.name} · {selected.title}
          </div>
          <div style={{ color: "#e5e7eb", fontSize: "0.88rem", lineHeight: 1.55 }}>{selected.description}</div>
        </div>

        <form className="form-stack" onSubmit={handleSubmit}>
          <label>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button
            className="button button-gold full-width"
            disabled={loading}
            type="submit"
            style={{ background: `linear-gradient(180deg, ${selected.color}, ${selected.color}bb)`, color: "#111" }}
          >
            <LogIn size={18} />
            {loading ? "Signing in…" : `Sign in as ${selected.label}`}
          </button>
        </form>
      </section>
    </main>
  );
}
