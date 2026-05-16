import { useEffect, useMemo, useState } from "react";
import { Plus, Save, Send, SquarePen, Eye } from "lucide-react";
import { apiRequest } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

// Mock goals for each role (same data, filtered by role on the frontend)
const MOCK_ALL_GOALS = [
  { id: "goal-001", employee_id: "mock-employee-001", employee_name: "Priya Sharma",  cycle_id: "cycle-2026", thrust_area: "Delivery",     title: "Ship API v2",           description: "Deliver the new REST API by Q2.", measurement_type: "timeline", scoring_direction: "higher_better", target_date: "2026-06-30", weightage: 30, status: "approved",  locked_at: "2026-05-01", department: "Engineering" },
  { id: "goal-002", employee_id: "mock-employee-001", employee_name: "Priya Sharma",  cycle_id: "cycle-2026", thrust_area: "Quality",      title: "Reduce Bug Backlog",    description: "Resolve 90% of P1 bugs within Q1.", measurement_type: "percent", scoring_direction: "higher_better", target_numeric: 90, weightage: 25, status: "approved",  locked_at: "2026-05-01", department: "Engineering" },
  { id: "goal-003", employee_id: "mock-employee-001", employee_name: "Priya Sharma",  cycle_id: "cycle-2026", thrust_area: "Learning",     title: "AWS Certification",     description: "Obtain AWS Cloud Practitioner cert.", measurement_type: "zero_based", scoring_direction: "higher_better", target_numeric: 1, weightage: 20, status: "submitted", locked_at: null, department: "Engineering" },
  { id: "goal-004", employee_id: "mock-employee-001", employee_name: "Priya Sharma",  cycle_id: "cycle-2026", thrust_area: "Mentoring",    title: "Mentor 2 Interns",      description: "Provide structured guidance to 2 interns.", measurement_type: "numeric", scoring_direction: "higher_better", target_numeric: 2, weightage: 25, status: "draft",     locked_at: null, department: "Engineering" },
  { id: "goal-005", employee_id: "mock-employee-002", employee_name: "Arjun Nair",    cycle_id: "cycle-2026", thrust_area: "Delivery",     title: "Launch Design System",  description: "Build and document the component library.", measurement_type: "percent", scoring_direction: "higher_better", target_numeric: 100, weightage: 40, status: "submitted", locked_at: null, department: "Engineering" },
  { id: "goal-006", employee_id: "mock-employee-002", employee_name: "Arjun Nair",    cycle_id: "cycle-2026", thrust_area: "Performance",  title: "Core Web Vitals",       description: "Achieve LCP < 2.5s on all pages.", measurement_type: "numeric", scoring_direction: "lower_better", target_numeric: 2.5, weightage: 35, status: "submitted", locked_at: null, department: "Engineering" },
  { id: "goal-007", employee_id: "mock-employee-003", employee_name: "Fatima Khan",   cycle_id: "cycle-2026", thrust_area: "CSAT",         title: "NPS Score 70+",         description: "Achieve Net Promoter Score above 70.", measurement_type: "numeric", scoring_direction: "higher_better", target_numeric: 70, weightage: 40, status: "approved",  locked_at: "2026-05-02", department: "Customer Success" }
];

const emptyGoal = {
  thrustArea: "", title: "", description: "",
  measurementType: "numeric", scoringDirection: "higher_better",
  unitLabel: "", targetNumeric: "", targetDate: "", targetText: "", weightage: 10
};

// ─── Status badge colours ────────────────────────────────────────────────────
const STATUS_COLORS = {
  approved:  { color: "#86efac", bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.3)"  },
  submitted: { color: "#93c5fd", bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.3)" },
  draft:     { color: "#9ca3af", bg: "rgba(156,163,175,0.1)", border: "rgba(156,163,175,0.2)"},
  returned:  { color: "#fca5a5", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.3)"  },
  locked:    { color: "#f2c96d", bg: "rgba(214,168,79,0.12)", border: "rgba(214,168,79,0.3)" }
};

function StatusPill({ status }) {
  const s = STATUS_COLORS[status] ?? STATUS_COLORS.draft;
  return (
    <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: "0.75rem", fontWeight: 700,
      color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
      {status}
    </span>
  );
}

// ─── Employee: create/edit/submit own goals ──────────────────────────────────
function EmployeeGoals({ userId }) {
  const myGoals = MOCK_ALL_GOALS.filter(g => g.employee_id === "mock-employee-001");
  const [goals, setGoals] = useState(myGoals);
  const [form, setForm] = useState(emptyGoal);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const totalWeightage = useMemo(() => goals.reduce((t, g) => t + Number(g.weightage), 0), [goals]);
  const canSubmit = totalWeightage === 100 && goals.some(g => g.status === "draft");

  function update(f, v) { setForm(c => ({ ...c, [f]: v })); }

  function startEdit(goal) {
    setEditingId(goal.id);
    setForm({
      thrustArea: goal.thrust_area, title: goal.title, description: goal.description ?? "",
      measurementType: goal.measurement_type, scoringDirection: goal.scoring_direction,
      unitLabel: goal.unit_label ?? "", targetNumeric: goal.target_numeric ?? "",
      targetDate: goal.target_date ?? "", targetText: goal.target_text ?? "",
      weightage: Number(goal.weightage)
    });
  }

  function handleSave(e) {
    e.preventDefault();
    if (editingId) {
      setGoals(gs => gs.map(g => g.id === editingId ? { ...g, ...form, thrust_area: form.thrustArea, measurement_type: form.measurementType, scoring_direction: form.scoringDirection, target_numeric: form.targetNumeric, target_date: form.targetDate, unit_label: form.unitLabel } : g));
      setMessage("Goal updated.");
    } else {
      const newGoal = { id: `goal-new-${Date.now()}`, employee_id: userId, employee_name: "Priya Sharma", cycle_id: "cycle-2026", thrust_area: form.thrustArea, title: form.title, description: form.description, measurement_type: form.measurementType, scoring_direction: form.scoringDirection, target_numeric: form.targetNumeric || null, target_date: form.targetDate || null, weightage: Number(form.weightage), status: "draft", locked_at: null, department: "Engineering" };
      setGoals(gs => [...gs, newGoal]);
      setMessage("Goal created.");
    }
    setEditingId(null); setForm(emptyGoal);
  }

  function submitGoals() {
    setGoals(gs => gs.map(g => g.status === "draft" ? { ...g, status: "submitted" } : g));
    setMessage("Goals submitted to your manager for review.");
  }

  return (
    <section className="page-stack">
      <div className="page-header">
        <span>Phase 1 — Goal Setting</span>
        <h1>My Goals</h1>
        <p>Build your goal set. Total weightage must equal exactly 100% before submitting to your manager.</p>
      </div>

      <div className="split-grid">
        <section className="panel">
          <header className="panel-header">
            <Plus size={18} />
            <h2>{editingId ? "Edit Goal" : "Add New Goal"}</h2>
          </header>
          <form className="form-grid" onSubmit={handleSave}>
            <label>Thrust Area<input value={form.thrustArea} onChange={e => update("thrustArea", e.target.value)} /></label>
            <label>Goal Title<input value={form.title} onChange={e => update("title", e.target.value)} /></label>
            <label className="wide">Description<textarea value={form.description} onChange={e => update("description", e.target.value)} /></label>
            <label>Measurement<select value={form.measurementType} onChange={e => update("measurementType", e.target.value)}>
              <option value="numeric">Numeric</option>
              <option value="percent">Percent</option>
              <option value="timeline">Timeline / Date</option>
              <option value="zero_based">Zero-based</option>
            </select></label>
            <label>Direction<select value={form.scoringDirection} onChange={e => update("scoringDirection", e.target.value)}>
              <option value="higher_better">Higher is better</option>
              <option value="lower_better">Lower is better</option>
            </select></label>
            {form.measurementType === "timeline"
              ? <label>Deadline<input type="date" value={form.targetDate} onChange={e => update("targetDate", e.target.value)} /></label>
              : <label>Target<input type="number" value={form.targetNumeric} onChange={e => update("targetNumeric", e.target.value)} /></label>
            }
            <label>Weightage (%)<input type="number" min="10" max="100" value={form.weightage} onChange={e => update("weightage", e.target.value)} /></label>
            <div className="form-actions wide">
              <button className="button button-gold" type="submit"><Save size={16} />{editingId ? "Update" : "Save Goal"}</button>
              {editingId && <button className="button button-ghost" type="button" onClick={() => { setEditingId(null); setForm(emptyGoal); }}>Cancel</button>}
            </div>
          </form>
        </section>

        <section className="panel">
          <header className="panel-header between">
            <div>
              <h2>My Goal Set</h2>
              <small style={{ color: totalWeightage === 100 ? "#86efac" : "#fca5a5" }}>Total: {totalWeightage}% / 100%</small>
            </div>
            <button className="button button-gold" type="button" onClick={submitGoals} disabled={!canSubmit} title={canSubmit ? "" : "Goals must total 100% to submit"}>
              <Send size={16} />Submit to Manager
            </button>
          </header>
          {message && <p className="form-success">{message}</p>}
          {error && <p className="form-error">{error}</p>}
          <div className="item-list">
            {goals.map(goal => (
              <article className="goal-row" key={goal.id}>
                <div>
                  <span>{goal.thrust_area}</span>
                  <h3>{goal.title}</h3>
                  <p>{goal.description}</p>
                  <small>{goal.weightage}% · {goal.measurement_type}</small>
                </div>
                <div className="row-actions" style={{ flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                  <StatusPill status={goal.status} />
                  {!goal.locked_at && goal.status === "draft" && (
                    <button className="icon-button" type="button" onClick={() => startEdit(goal)} title="Edit">
                      <SquarePen size={16} />
                    </button>
                  )}
                  {goal.status === "returned" && (
                    <div style={{ fontSize: "0.78rem", color: "#fca5a5", textAlign: "right" }}>⚠ Returned — please revise</div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

// ─── Manager: read-only team goal view grouped by employee ──────────────────
function ManagerGoals() {
  const teamGoals = MOCK_ALL_GOALS;
  const byEmployee = teamGoals.reduce((acc, g) => {
    (acc[g.employee_name] = acc[g.employee_name] || []).push(g);
    return acc;
  }, {});
  const [filter, setFilter] = useState("all");

  return (
    <section className="page-stack">
      <div className="page-header">
        <span>Manager View</span>
        <h1>Team Goals</h1>
        <p>Review your team's goal sets. Approve or return goals from the <strong>Approvals</strong> page.</p>
      </div>

      <div className="toolbar">
        <div className="segmented">
          {["all","draft","submitted","approved"].map(s => (
            <button key={s} type="button" className={filter === s ? "active" : ""} onClick={() => setFilter(s)}>
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {Object.entries(byEmployee).map(([name, goals]) => {
        const filtered = filter === "all" ? goals : goals.filter(g => g.status === filter);
        if (!filtered.length) return null;
        const total = filtered.reduce((t,g) => t+Number(g.weightage), 0);
        return (
          <section className="panel" key={name}>
            <header className="panel-header between">
              <div><span style={{ color: "#f2c96d", fontWeight: 700 }}>{name}</span><div style={{ fontWeight: 600, marginTop: 4 }}>{goals[0].department} · {filtered.length} goal{filtered.length !== 1 ? "s" : ""}</div></div>
              <div style={{ textAlign: "right" }}><div style={{ fontSize: "0.8rem", color: "#b8b8b8" }}>Total Weightage</div><div style={{ color: total === 100 ? "#86efac" : "#fca5a5", fontWeight: 700, fontSize: "1.2rem" }}>{total}%</div></div>
            </header>
            <div className="item-list">
              {filtered.map(goal => (
                <article className="goal-row" key={goal.id}>
                  <div>
                    <span>{goal.thrust_area}</span>
                    <h3>{goal.title}</h3>
                    <small>{goal.weightage}% · {goal.measurement_type}</small>
                  </div>
                  <StatusPill status={goal.status} />
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </section>
  );
}

// ─── Admin: full org-wide read-only list ─────────────────────────────────────
function AdminGoals() {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? MOCK_ALL_GOALS : MOCK_ALL_GOALS.filter(g => g.status === filter);

  return (
    <section className="page-stack">
      <div className="page-header">
        <span>HR Admin — All Goals</span>
        <h1>Organisation Goals</h1>
        <p>Full read-only view of every goal across all employees, departments, and cycles.</p>
      </div>

      <div className="toolbar">
        <div className="segmented">
          {["all","draft","submitted","approved","locked"].map(s => (
            <button key={s} type="button" className={filter === s ? "active" : ""} onClick={() => setFilter(s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <span style={{ color: "#b8b8b8", fontSize: "0.85rem" }}>{filtered.length} goal{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="item-list">
        {filtered.map(goal => (
          <article className="goal-row" key={goal.id}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 4 }}>
                <span>{goal.employee_name}</span>
                <span style={{ color: "#b8b8b8", fontWeight: 400, fontSize: "0.82rem" }}>·</span>
                <span style={{ color: "#b8b8b8", fontWeight: 400, fontSize: "0.82rem" }}>{goal.department}</span>
              </div>
              <h3 style={{ margin: "4px 0" }}>{goal.title}</h3>
              <small>{goal.thrust_area} · {goal.weightage}% · {goal.measurement_type}</small>
            </div>
            <div className="row-actions">
              <StatusPill status={goal.status} />
              <Eye size={16} style={{ color: "#b8b8b8" }} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

// ─── Root ────────────────────────────────────────────────────────────────────
export default function Goals() {
  const { user } = useAuth();
  if (user?.role === "employee") return <EmployeeGoals userId={user.id} />;
  if (user?.role === "manager")  return <ManagerGoals />;
  return <AdminGoals />;
}
