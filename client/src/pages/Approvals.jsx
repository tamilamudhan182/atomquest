import { useState } from "react";
import { Check, RotateCcw, MessageSquare } from "lucide-react";
import { useAuth } from "../auth/AuthContext.jsx";

const MOCK_SUBMITTED = [
  { id: "goal-003", employee_name: "Priya Sharma",  department: "Engineering",     thrust_area: "Learning",    title: "AWS Certification",    description: "Obtain AWS Cloud Practitioner cert.",          measurement_type: "zero_based", target_numeric: 1,   weightage: 20, status: "submitted" },
  { id: "goal-005", employee_name: "Arjun Nair",    department: "Engineering",     thrust_area: "Delivery",    title: "Launch Design System", description: "Build and document the component library.",    measurement_type: "percent",    target_numeric: 100, weightage: 40, status: "submitted" },
  { id: "goal-006", employee_name: "Arjun Nair",    department: "Engineering",     thrust_area: "Performance", title: "Core Web Vitals",      description: "Achieve LCP < 2.5s on all pages.",             measurement_type: "numeric",    target_numeric: 2.5, weightage: 35, status: "submitted" }
];

function StatusPill({ status }) {
  const colors = {
    approved:  { color: "#86efac", bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.3)"  },
    submitted: { color: "#93c5fd", bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.3)" },
    returned:  { color: "#fca5a5", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.3)"  },
    draft:     { color: "#9ca3af", bg: "rgba(156,163,175,0.1)", border: "rgba(156,163,175,0.2)"},
  };
  const s = colors[status] ?? colors.draft;
  return (
    <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: "0.75rem", fontWeight: 700,
      color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
      {status}
    </span>
  );
}

export default function Approvals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState(MOCK_SUBMITTED);
  const [comments, setComments] = useState(
    Object.fromEntries(MOCK_SUBMITTED.map(g => [g.id, { managerComment: "", targetNumeric: g.target_numeric ?? "", weightage: g.weightage }]))
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function updateComment(id, field, value) {
    setComments(c => ({ ...c, [id]: { ...c[id], [field]: value } }));
  }

  function approve(id) {
    setGoals(gs => gs.filter(g => g.id !== id));
    setMessage("✅ Goal approved and locked for quarterly check-ins.");
  }

  function returnGoal(id) {
    setGoals(gs => gs.filter(g => g.id !== id));
    setMessage("↩ Goal returned to employee with your comment.");
  }

  return (
    <section className="page-stack">
      <div className="page-header">
        <span>{user?.role === "admin" ? "HR Admin" : "Manager Workspace"}</span>
        <h1>Approval Queue</h1>
        <p>Review submitted goals from your team. You may adjust targets or weightage before approving.</p>
      </div>

      {message && <p className="form-success">{message}</p>}
      {error   && <p className="form-error">{error}</p>}

      {!goals.length && !message && (
        <div className="empty-state" style={{ minHeight: 240 }}>
          <div>
            <Check size={40} style={{ color: "#86efac", marginBottom: 12 }} />
            <h2>All caught up!</h2>
            <p className="muted">No goals are currently waiting for your review.</p>
          </div>
        </div>
      )}

      <div className="item-list">
        {goals.map(goal => {
          const draft = comments[goal.id] ?? {};
          return (
            <article className="approval-card" key={goal.id}>
              {/* Left — goal info */}
              <div className="approval-main">
                <span>{goal.employee_name} · {goal.department}</span>
                <h2 style={{ margin: "8px 0 6px" }}>{goal.title}</h2>
                <p>{goal.description}</p>
                <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <StatusPill status={goal.status} />
                  <small>{goal.thrust_area} · {goal.measurement_type}</small>
                </div>
              </div>

              {/* Right — controls */}
              <div className="approval-controls">
                <label>
                  Weightage (%)
                  <input type="number" value={draft.weightage ?? ""} onChange={e => updateComment(goal.id, "weightage", e.target.value)} />
                </label>
                {goal.measurement_type === "timeline" ? (
                  <label>Deadline<input type="date" value={draft.targetDate ?? ""} onChange={e => updateComment(goal.id, "targetDate", e.target.value)} /></label>
                ) : (
                  <label>Target Value<input type="number" value={draft.targetNumeric ?? ""} onChange={e => updateComment(goal.id, "targetNumeric", e.target.value)} /></label>
                )}
                <label>
                  Your Comment (visible to employee)
                  <textarea
                    value={draft.managerComment ?? ""}
                    onChange={e => updateComment(goal.id, "managerComment", e.target.value)}
                    placeholder="Provide feedback or adjustment notes…"
                  />
                </label>
                <div className="form-actions">
                  <button className="button button-gold" type="button" onClick={() => approve(goal.id)}>
                    <Check size={16} />Approve & Lock
                  </button>
                  <button className="button button-ghost" type="button" onClick={() => returnGoal(goal.id)}>
                    <RotateCcw size={16} />Return for Rework
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
