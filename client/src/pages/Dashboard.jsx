import { useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Clock, PieChart, TrendingUp, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import MetricCard from "../components/MetricCard.jsx";

// ── Mock data per role (no real API needed) ──────────────────────────────────
const EMPLOYEE_DATA = {
  metrics: [
    { label: "My Goals",       value: "4",   detail: "In active cycle" },
    { label: "Approved",       value: "2",   detail: "Locked & ready" },
    { label: "Pending Review", value: "1",   detail: "Submitted to manager" },
    { label: "Avg Progress",   value: "72%", detail: "Across Q1 check-ins" }
  ],
  goals: [
    { title: "Ship API v2",         status: "approved",  progress: 65, thrust: "Delivery" },
    { title: "Reduce Bug Backlog",  status: "approved",  progress: 80, thrust: "Quality" },
    { title: "AWS Certification",   status: "submitted", progress: 0,  thrust: "Learning" },
    { title: "Mentor 2 Interns",    status: "draft",     progress: 0,  thrust: "Mentoring" }
  ],
  qoq: [
    { quarter: "Q1", progress: 72 },
    { quarter: "Q2", progress: 0 },
    { quarter: "Q3", progress: 0 },
    { quarter: "Q4", progress: 0 }
  ]
};

const MANAGER_DATA = {
  metrics: [
    { label: "Team Members",   value: "3",   detail: "Direct reports" },
    { label: "Pending Approval", value: "3", detail: "Goals awaiting review" },
    { label: "Blockers Flagged", value: "1", detail: "Needs immediate attention" },
    { label: "Team Progress",  value: "58%", detail: "Average Q1 check-in score" }
  ],
  teamGoals: [
    { employee: "Priya Sharma",  approved: 2, pending: 1, draft: 1 },
    { employee: "Arjun Nair",    approved: 0, pending: 2, draft: 0 },
    { employee: "Fatima Khan",   approved: 1, pending: 0, draft: 0 }
  ],
  blockers: [
    { employee: "Fatima Khan", goal: "NPS Score 70+", comment: "Detractor feedback needs analysis" }
  ],
  pendingGoals: [
    { employee: "Priya Sharma", title: "AWS Certification",  dept: "Engineering" },
    { employee: "Arjun Nair",   title: "Launch Design System", dept: "Engineering" },
    { employee: "Arjun Nair",   title: "Core Web Vitals",    dept: "Engineering" }
  ]
};

const ADMIN_DATA = {
  metrics: [
    { label: "Employees",      value: "5",   detail: "Across all departments" },
    { label: "Total Goals",    value: "7",   detail: "In FY2026 cycle" },
    { label: "Check-in Rate",  value: "86%", detail: "Q1 submitted" },
    { label: "Org Progress",   value: "68%", detail: "Average Q1 score" }
  ],
  goalStatus: [
    { status: "approved",  count: 3 },
    { status: "submitted", count: 3 },
    { status: "draft",     count: 1 }
  ],
  managers: [
    { name: "Rahul Mehta", avgProgress: 68, reports: 3 }
  ],
  departments: [
    { name: "Engineering",       headcount: 3, avgProgress: 75 },
    { name: "Customer Success",  headcount: 1, avgProgress: 58 },
    { name: "HR",                headcount: 1, avgProgress: 0  }
  ]
};

// ── Status colours ────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  approved:  { color: "#86efac", bg: "rgba(34,197,94,0.12)",   border: "rgba(34,197,94,0.3)"  },
  submitted: { color: "#93c5fd", bg: "rgba(59,130,246,0.12)",  border: "rgba(59,130,246,0.3)" },
  draft:     { color: "#9ca3af", bg: "rgba(156,163,175,0.1)",  border: "rgba(156,163,175,0.2)"},
  locked:    { color: "#f2c96d", bg: "rgba(214,168,79,0.12)",  border: "rgba(214,168,79,0.3)" }
};

function StatusPill({ status }) {
  const s = STATUS_COLORS[status] ?? STATUS_COLORS.draft;
  return (
    <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: "0.75rem", fontWeight: 700,
      color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
      {status}
    </span>
  );
}

function Panel({ title, icon: Icon, children }) {
  return (
    <section className="panel">
      <header className="panel-header">
        <Icon size={18} />
        <h2>{title}</h2>
      </header>
      {children}
    </section>
  );
}

// ── Employee Dashboard ────────────────────────────────────────────────────────
function EmployeeDashboard({ user, navigate }) {
  return (
    <section className="page-stack">
      <div className="page-header">
        <span>My Performance</span>
        <h1>Welcome back, {user.name.split(" ")[0]} 👋</h1>
        <p>Track your personal goals and quarterly achievements for FY2026.</p>
      </div>

      <div className="metrics-grid">
        {EMPLOYEE_DATA.metrics.map((m) => (
          <MetricCard key={m.label} label={m.label} value={m.value} detail={m.detail} />
        ))}
      </div>

      <div className="dashboard-grid">
        <Panel title="My Goal Set" icon={CheckCircle2}>
          <div className="item-list">
            {EMPLOYEE_DATA.goals.map((g) => (
              <div key={g.title} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div>
                  <div style={{ fontSize: "0.78rem", color: "#f2c96d", fontWeight: 700, textTransform: "uppercase" }}>{g.thrust}</div>
                  <div style={{ fontWeight: 600, marginTop: 2 }}>{g.title}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {g.progress > 0 && <span style={{ color: "#f2c96d", fontSize: "0.85rem" }}>{g.progress}%</span>}
                  <StatusPill status={g.status} />
                </div>
              </div>
            ))}
          </div>
          <button className="button button-gold full-width" style={{ marginTop: 16 }} onClick={() => navigate("/app/goals")}>
            Manage My Goals
          </button>
        </Panel>

        <Panel title="Q1 Progress Trend" icon={TrendingUp}>
          {EMPLOYEE_DATA.qoq.map((q) => (
            <div className="trend-row" key={q.quarter}>
              <span>{q.quarter}</span>
              <div className="progress-track">
                <i style={{ width: `${q.progress}%` }} />
              </div>
              <strong>{q.progress > 0 ? `${q.progress}%` : "—"}</strong>
            </div>
          ))}
          <div style={{ marginTop: 16, padding: 14, borderRadius: 8, background: "rgba(214,168,79,0.08)", border: "1px solid rgba(214,168,79,0.2)", fontSize: "0.88rem", color: "#b8b8b8" }}>
            💡 <strong style={{ color: "#f2c96d" }}>Tip:</strong> Goals must total 100% weightage before you can submit them to your manager.
          </div>
        </Panel>
      </div>
    </section>
  );
}

// ── Manager Dashboard ─────────────────────────────────────────────────────────
function ManagerDashboard({ user, navigate }) {
  return (
    <section className="page-stack">
      <div className="page-header">
        <span>Team Overview</span>
        <h1>Team Dashboard</h1>
        <p>Monitor your team's goal setting progress, approvals, and quarterly check-ins.</p>
      </div>

      <div className="metrics-grid">
        {MANAGER_DATA.metrics.map((m) => (
          <MetricCard key={m.label} label={m.label} value={m.value} detail={m.detail} />
        ))}
      </div>

      <div className="dashboard-grid">
        <Panel title="Team Goal Status" icon={Users}>
          <div style={{ display: "grid", gap: 10 }}>
            {MANAGER_DATA.teamGoals.map((t) => (
              <div key={t.employee} style={{ padding: "12px 14px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>{t.employee}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <StatusPill status="approved" />
                  <span style={{ color: "#86efac", fontSize: "0.8rem" }}>{t.approved} approved</span>
                  <StatusPill status="submitted" />
                  <span style={{ color: "#93c5fd", fontSize: "0.8rem" }}>{t.pending} pending</span>
                  {t.draft > 0 && <><StatusPill status="draft" /><span style={{ color: "#9ca3af", fontSize: "0.8rem" }}>{t.draft} draft</span></>}
                </div>
              </div>
            ))}
          </div>
          <button className="button button-gold full-width" style={{ marginTop: 14 }} onClick={() => navigate("/app/approvals")}>
            Review Pending Goals →
          </button>
        </Panel>

        <Panel title="Blockers & Alerts" icon={AlertTriangle}>
          {MANAGER_DATA.blockers.length > 0 ? (
            MANAGER_DATA.blockers.map((b, i) => (
              <div key={i} style={{ padding: 14, borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", marginBottom: 10 }}>
                <div style={{ color: "#fca5a5", fontWeight: 700, fontSize: "0.82rem", marginBottom: 4 }}>🚩 BLOCKER — {b.employee}</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{b.goal}</div>
                <div style={{ color: "#b8b8b8", fontSize: "0.85rem" }}>{b.comment}</div>
              </div>
            ))
          ) : (
            <p className="muted">No blockers flagged. Great work! ✅</p>
          )}

          <Panel title="Pending Approvals" icon={Clock}>
            {MANAGER_DATA.pendingGoals.map((g, i) => (
              <div key={i} className="list-row">
                <div>
                  <div style={{ fontSize: "0.78rem", color: "#f2c96d", fontWeight: 700 }}>{g.employee}</div>
                  <div style={{ fontWeight: 600 }}>{g.title}</div>
                </div>
                <StatusPill status="submitted" />
              </div>
            ))}
          </Panel>
        </Panel>
      </div>
    </section>
  );
}

// ── Admin / HR Dashboard ──────────────────────────────────────────────────────
function AdminDashboard({ navigate }) {
  return (
    <section className="page-stack">
      <div className="page-header">
        <span>Organisation Overview</span>
        <h1>HR Governance Dashboard</h1>
        <p>Org-wide goal health, department breakdown, and manager effectiveness for FY2026.</p>
      </div>

      <div className="metrics-grid">
        {ADMIN_DATA.metrics.map((m) => (
          <MetricCard key={m.label} label={m.label} value={m.value} detail={m.detail} />
        ))}
      </div>

      <div className="dashboard-grid">
        <Panel title="Goal Status Distribution" icon={PieChart}>
          {ADMIN_DATA.goalStatus.map((g) => (
            <div className="list-row" key={g.status} style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <StatusPill status={g.status} />
              <strong style={{ color: "#f2c96d", fontSize: "1.2rem" }}>{g.count}</strong>
            </div>
          ))}
        </Panel>

        <Panel title="Department Breakdown" icon={Users}>
          {ADMIN_DATA.departments.map((d) => (
            <div key={d.name} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontWeight: 600 }}>{d.name}</span>
                <span style={{ color: "#f2c96d", fontWeight: 700 }}>{d.avgProgress > 0 ? `${d.avgProgress}%` : "—"}</span>
              </div>
              <div className="progress-track">
                <i style={{ width: `${d.avgProgress}%` }} />
              </div>
              <small>{d.headcount} member{d.headcount > 1 ? "s" : ""}</small>
            </div>
          ))}
        </Panel>

        <Panel title="Manager Effectiveness" icon={Activity}>
          {ADMIN_DATA.managers.map((m) => (
            <div key={m.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0" }}>
              <div>
                <div style={{ fontWeight: 700 }}>{m.name}</div>
                <small>{m.reports} direct reports</small>
              </div>
              <strong style={{ color: "#f2c96d", fontSize: "1.4rem" }}>{m.avgProgress}%</strong>
            </div>
          ))}
        </Panel>

        <Panel title="Quick Actions" icon={CheckCircle2}>
          <div style={{ display: "grid", gap: 10 }}>
            <button className="button button-gold" onClick={() => navigate("/app/approvals")}>Review Approval Queue (3 pending)</button>
            <button className="button button-ghost" onClick={() => navigate("/app/admin")}>Open HR Governance Console</button>
            <button className="button button-ghost" onClick={() => navigate("/app/reports")}>Download Progress Report</button>
          </div>
        </Panel>
      </div>
    </section>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user?.role === "employee") return <EmployeeDashboard user={user} navigate={navigate} />;
  if (user?.role === "manager")  return <ManagerDashboard  user={user} navigate={navigate} />;
  return <AdminDashboard navigate={navigate} />;
}
