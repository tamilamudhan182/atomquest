import { useState } from "react";
import { MessageSquare, Save } from "lucide-react";
import { useAuth } from "../auth/AuthContext.jsx";

const quarters = ["Q1", "Q2", "Q3", "Q4"];

// Mock check-in rows per role
const MY_CHECKINS = [
  { goal_id: "goal-001", checkin_id: "ci-001", employee_name: "Priya Sharma", title: "Ship API v2",        measurement_type: "timeline", target_date: "2026-06-30", actual_date: null,    actual_numeric: null, status: "on_track",    progress_score: 65, employee_comment: "On schedule, design phase complete.", manager_comment: "Great work, keep it up.", manager_confidence: "high",   blocker_flag: false },
  { goal_id: "goal-002", checkin_id: "ci-002", employee_name: "Priya Sharma", title: "Reduce Bug Backlog", measurement_type: "percent",   target_numeric: 90,        actual_numeric: 72,   actual_date: null,    status: "on_track",    progress_score: 80, employee_comment: "Cleared 72% of P1 bugs.",           manager_comment: "",            manager_confidence: "medium", blocker_flag: false },
  { goal_id: "goal-003", checkin_id: null,      employee_name: "Priya Sharma", title: "AWS Certification",  measurement_type: "zero_based", target_numeric: 1,         actual_numeric: null, actual_date: null,    status: "not_started", progress_score: 0,  employee_comment: "",                                  manager_comment: "",            manager_confidence: "medium", blocker_flag: false },
  { goal_id: "goal-004", checkin_id: null,      employee_name: "Priya Sharma", title: "Mentor 2 Interns",   measurement_type: "numeric",   target_numeric: 2,         actual_numeric: null, actual_date: null,    status: "not_started", progress_score: 0,  employee_comment: "",                                  manager_comment: "",            manager_confidence: "medium", blocker_flag: false }
];

const TEAM_CHECKINS = [
  ...MY_CHECKINS,
  { goal_id: "goal-005", checkin_id: "ci-005", employee_name: "Arjun Nair",    title: "Launch Design System", measurement_type: "percent",   target_numeric: 100, actual_numeric: 55,  actual_date: null,    status: "on_track",    progress_score: 55, employee_comment: "55% components done, docs in progress.", manager_comment: "",                   manager_confidence: "medium", blocker_flag: false },
  { goal_id: "goal-006", checkin_id: "ci-006", employee_name: "Arjun Nair",    title: "Core Web Vitals",      measurement_type: "numeric",   target_numeric: 2.5, actual_numeric: 2.9, actual_date: null,    status: "on_track",    progress_score: 42, employee_comment: "Optimising images, should improve by Q2.", manager_comment: "",                  manager_confidence: "low",    blocker_flag: false },
  { goal_id: "goal-007", checkin_id: "ci-007", employee_name: "Fatima Khan",   title: "NPS Score 70+",        measurement_type: "numeric",   target_numeric: 70,  actual_numeric: 62,  actual_date: null,    status: "on_track",    progress_score: 58, employee_comment: "Ran 3 NPS surveys, working on gaps.", manager_comment: "Flag the detractors", manager_confidence: "medium", blocker_flag: true }
];

const STATUS_COLOR = {
  not_started: { color: "#9ca3af", bg: "rgba(156,163,175,0.1)", border: "rgba(156,163,175,0.2)" },
  on_track:    { color: "#86efac", bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.3)"   },
  completed:   { color: "#f2c96d", bg: "rgba(214,168,79,0.12)", border: "rgba(214,168,79,0.3)"  }
};

function StatusPill({ status }) {
  const s = STATUS_COLOR[status] ?? STATUS_COLOR.not_started;
  return <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: "0.75rem", fontWeight: 700, color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>{status.replace("_", " ")}</span>;
}

export default function CheckIns() {
  const { user } = useAuth();
  const isManager = user?.role === "manager" || user?.role === "admin";
  const source = isManager ? TEAM_CHECKINS : MY_CHECKINS;

  const [quarter, setQuarter] = useState("Q1");
  const [rows, setRows] = useState(source);
  const [drafts, setDrafts] = useState(
    Object.fromEntries(source.map(r => [r.goal_id, {
      actualNumeric: r.actual_numeric ?? "", actualDate: r.actual_date ?? "",
      status: r.status, employeeComment: r.employee_comment,
      managerComment: r.manager_comment, managerConfidence: r.manager_confidence, blockerFlag: r.blocker_flag
    }]))
  );
  const [message, setMessage] = useState("");

  function update(goalId, field, value) {
    setDrafts(c => ({ ...c, [goalId]: { ...c[goalId], [field]: value } }));
  }

  function saveCheckin(row) {
    const d = drafts[row.goal_id];
    setRows(rs => rs.map(r => r.goal_id === row.goal_id ? { ...r, status: d.status, actual_numeric: d.actualNumeric, employee_comment: d.employeeComment, checkin_id: r.checkin_id ?? `ci-new-${row.goal_id}`, progress_score: d.status === "completed" ? 100 : d.status === "on_track" ? Math.round((Number(d.actualNumeric) / Number(r.target_numeric || 1)) * 100) : 0 } : r));
    setMessage("Check-in saved successfully.");
  }

  function saveReview(row) {
    const d = drafts[row.goal_id];
    setRows(rs => rs.map(r => r.goal_id === row.goal_id ? { ...r, manager_comment: d.managerComment, manager_confidence: d.managerConfidence, blocker_flag: d.blockerFlag } : r));
    setMessage("Manager review saved.");
  }

  return (
    <section className="page-stack">
      <div className="page-header">
        <span>{isManager ? "Manager View — Phase 2" : "Phase 2 — Achievement Tracking"}</span>
        <h1>{isManager ? "Team Check-ins" : "My Check-ins"}</h1>
        <p>{isManager
          ? "Review your team's quarterly progress, add confidence ratings, and flag blockers."
          : "Log your actual achievements against planned targets and add comments for your manager."
        }</p>
      </div>

      <div className="toolbar">
        <div className="segmented">
          {quarters.map(q => (
            <button key={q} type="button" className={q === quarter ? "active" : ""} onClick={() => setQuarter(q)}>{q}</button>
          ))}
        </div>
        <span style={{ color: "#b8b8b8", fontSize: "0.85rem" }}>{rows.length} goal{rows.length !== 1 ? "s" : ""} · {quarter} Check-ins</span>
      </div>

      {message && <p className="form-success">{message}</p>}

      <div className="item-list">
        {rows.map(row => {
          const draft = drafts[row.goal_id] ?? {};
          const isTimeline = row.measurement_type === "timeline";
          return (
            <article className="checkin-card" key={row.goal_id}>
              {/* Header */}
              <div className="checkin-title">
                {isManager && <span>{row.employee_name}</span>}
                <h2>{row.title}</h2>
                <small>Target: {row.target_date ?? (row.target_numeric != null ? row.target_numeric : "N/A")} · Progress: <strong style={{ color: "#f2c96d" }}>{row.progress_score}%</strong></small>
              </div>

              {/* Employee section */}
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: 16 }}>
                <div style={{ fontSize: "0.78rem", color: "#b8b8b8", fontWeight: 700, marginBottom: 10, textTransform: "uppercase" }}>
                  {isManager ? "Employee Self-Report" : "My Progress Update"}
                </div>
                <div className="form-grid">
                  {isTimeline
                    ? <label>Completion Date<input type="date" value={draft.actualDate ?? ""} onChange={e => update(row.goal_id, "actualDate", e.target.value)} readOnly={isManager} /></label>
                    : <label>Actual Achievement<input type="number" value={draft.actualNumeric ?? ""} onChange={e => update(row.goal_id, "actualNumeric", e.target.value)} readOnly={isManager} /></label>
                  }
                  <label>Status
                    <select value={draft.status ?? "not_started"} onChange={e => update(row.goal_id, "status", e.target.value)} disabled={isManager}>
                      <option value="not_started">Not Started</option>
                      <option value="on_track">On Track</option>
                      <option value="completed">Completed</option>
                    </select>
                  </label>
                  <label className="wide">Employee Comment
                    <textarea value={draft.employeeComment ?? ""} onChange={e => update(row.goal_id, "employeeComment", e.target.value)} readOnly={isManager} placeholder={isManager ? "—" : "What did you achieve this quarter?"} />
                  </label>
                  {!isManager && (
                    <div className="form-actions wide">
                      <button className="button button-gold" type="button" onClick={() => saveCheckin(row)}>
                        <Save size={16} />Save Check-in
                      </button>
                      <StatusPill status={draft.status ?? "not_started"} />
                    </div>
                  )}
                </div>
              </div>

              {/* Manager review section */}
              {isManager && (
                <div style={{ background: "rgba(214,168,79,0.04)", border: "1px solid rgba(214,168,79,0.18)", borderRadius: 8, padding: 16 }}>
                  <div style={{ fontSize: "0.78rem", color: "#f2c96d", fontWeight: 700, marginBottom: 10, textTransform: "uppercase" }}>
                    Manager Review
                  </div>
                  <div className="manager-review">
                    <label>Your Comment
                      <textarea value={draft.managerComment ?? ""} onChange={e => update(row.goal_id, "managerComment", e.target.value)} placeholder="Add coaching feedback…" />
                    </label>
                    <label>Confidence
                      <select value={draft.managerConfidence ?? "medium"} onChange={e => update(row.goal_id, "managerConfidence", e.target.value)}>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </label>
                    <label className="checkbox-line">
                      <input type="checkbox" checked={Boolean(draft.blockerFlag)} onChange={e => update(row.goal_id, "blockerFlag", e.target.checked)} />
                      Flag Blocker
                    </label>
                    <button className="button button-ghost" type="button" onClick={() => saveReview(row)}>
                      <MessageSquare size={16} />Save Review
                    </button>
                  </div>
                  {draft.blockerFlag && (
                    <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 6, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#fca5a5", fontSize: "0.83rem" }}>
                      🚩 Blocker flagged — this will appear in the team dashboard.
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}

        {!rows.length && <p className="muted">No locked goals are ready for check-in in {quarter}.</p>}
      </div>
    </section>
  );
}
