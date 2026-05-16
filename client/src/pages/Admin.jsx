import { useEffect, useState } from "react";
import { LockOpen, RefreshCcw, Save, Send } from "lucide-react";
import { apiRequest } from "../api/client.js";
import StatusBadge from "../components/StatusBadge.jsx";

const cycleDefaults = {
  name: "FY2027 Performance Cycle",
  year: 2027,
  status: "draft",
  goalSettingStart: "2027-05-01",
  goalSettingEnd: "2027-05-31",
  q1Start: "2027-07-01",
  q1End: "2027-07-31",
  q2Start: "2027-10-01",
  q2End: "2027-10-31",
  q3Start: "2028-01-01",
  q3End: "2028-01-31",
  q4Start: "2028-03-01",
  q4End: "2028-04-30"
};

const sharedDefaults = {
  cycleId: "",
  department: "Customer Success",
  thrustArea: "Department KPI",
  title: "Improve team delivery health",
  description: "Department-level KPI pushed to eligible employees.",
  measurementType: "percent",
  scoringDirection: "higher_better",
  targetNumeric: 90,
  targetDate: "",
  defaultWeightage: 10
};

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [lockedGoals, setLockedGoals] = useState([]);
  const [hierarchyDrafts, setHierarchyDrafts] = useState({});
  const [cycleForm, setCycleForm] = useState(cycleDefaults);
  const [sharedForm, setSharedForm] = useState(sharedDefaults);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    const [userData, cycleData, auditData, goalData] = await Promise.all([
      apiRequest("/admin/users"),
      apiRequest("/admin/cycles"),
      apiRequest("/admin/audit-logs?limit=25"),
      apiRequest("/goals?status=locked")
    ]);
    setUsers(userData.users);
    setCycles(cycleData.cycles);
    setAuditLogs(auditData.auditLogs);
    setLockedGoals(goalData.goals);
    setHierarchyDrafts(
      Object.fromEntries(userData.users.map((user) => [user.id, user.manager_id ?? ""]))
    );
    setSharedForm((current) => ({ ...current, cycleId: current.cycleId || cycleData.cycles[0]?.id || "" }));
  }

  function patchCycle(field, value) {
    setCycleForm((current) => ({ ...current, [field]: value }));
  }

  function patchShared(field, value) {
    setSharedForm((current) => ({ ...current, [field]: value }));
  }

  async function createCycle(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await apiRequest("/admin/cycles", {
        method: "POST",
        body: JSON.stringify(cycleForm)
      });
      setMessage("Cycle configured.");
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function pushSharedGoal(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await apiRequest("/admin/shared-goals/push", {
        method: "POST",
        body: JSON.stringify({
          ...sharedForm,
          targetNumeric: sharedForm.measurementType === "timeline" ? null : Number(sharedForm.targetNumeric),
          targetDate: sharedForm.measurementType === "timeline" ? sharedForm.targetDate : null,
          defaultWeightage: Number(sharedForm.defaultWeightage)
        })
      });
      setMessage("Shared goal pushed.");
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function unlockGoal(id) {
    setError("");
    setMessage("");
    try {
      await apiRequest(`/admin/goals/${id}/unlock`, { method: "POST" });
      setMessage("Goal unlocked for admin-controlled edits.");
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function syncWindows() {
    setError("");
    setMessage("");
    try {
      await apiRequest("/admin/windows/sync", { method: "POST" });
      setMessage("Windows synchronized.");
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveUser(user) {
    try {
      await apiRequest(`/admin/users/${user.id}/hierarchy`, {
        method: "PATCH",
        body: JSON.stringify({ managerId: hierarchyDrafts[user.id] || null })
      });
      setMessage("Hierarchy updated.");
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="page-stack">
      <div className="page-header">
        <span>Admin and HR</span>
        <h1>Governance Console</h1>
        <p>Configure cycles, manage hierarchy, push shared KPIs, unlock goals, and inspect audit logs.</p>
      </div>

      {message ? <p className="form-success">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      <div className="admin-grid">
        <section className="panel">
          <header className="panel-header between">
            <h2>Cycles</h2>
            <button className="icon-button" type="button" onClick={syncWindows} title="Sync windows">
              <RefreshCcw size={18} />
            </button>
          </header>
          <form className="form-grid" onSubmit={createCycle}>
            <label>
              Name
              <input value={cycleForm.name} onChange={(event) => patchCycle("name", event.target.value)} />
            </label>
            <label>
              Year
              <input type="number" value={cycleForm.year} onChange={(event) => patchCycle("year", event.target.value)} />
            </label>
            <label>
              Goal Start
              <input type="date" value={cycleForm.goalSettingStart} onChange={(event) => patchCycle("goalSettingStart", event.target.value)} />
            </label>
            <label>
              Goal End
              <input type="date" value={cycleForm.goalSettingEnd} onChange={(event) => patchCycle("goalSettingEnd", event.target.value)} />
            </label>
            <button className="button button-gold wide" type="submit">
              <Save size={18} />
              Save Cycle
            </button>
          </form>
          <div className="compact-list">
            {cycles.map((cycle) => (
              <div className="list-row" key={cycle.id}>
                <span>{cycle.name}</span>
                <strong>{cycle.active_window}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <header className="panel-header">
            <Send size={18} />
            <h2>Shared Goals</h2>
          </header>
          <form className="form-grid" onSubmit={pushSharedGoal}>
            <label>
              Cycle
              <select value={sharedForm.cycleId} onChange={(event) => patchShared("cycleId", event.target.value)}>
                {cycles.map((cycle) => (
                  <option value={cycle.id} key={cycle.id}>{cycle.name}</option>
                ))}
              </select>
            </label>
            <label>
              Department
              <input value={sharedForm.department} onChange={(event) => patchShared("department", event.target.value)} />
            </label>
            <label>
              Title
              <input value={sharedForm.title} onChange={(event) => patchShared("title", event.target.value)} />
            </label>
            <label>
              Target
              <input value={sharedForm.targetNumeric} onChange={(event) => patchShared("targetNumeric", event.target.value)} />
            </label>
            <label>
              Weightage
              <input type="number" value={sharedForm.defaultWeightage} onChange={(event) => patchShared("defaultWeightage", event.target.value)} />
            </label>
            <button className="button button-gold wide" type="submit">
              Push KPI
            </button>
          </form>
        </section>

        <section className="panel">
          <h2>Hierarchy</h2>
          <div className="compact-list">
            {users.map((user) => (
              <div className="list-row" key={user.id}>
                <span>{user.name}<small>{user.role} | {user.department}</small></span>
                <div className="row-actions hierarchy-actions">
                  <select
                    value={hierarchyDrafts[user.id] ?? ""}
                    onChange={(event) =>
                      setHierarchyDrafts((current) => ({ ...current, [user.id]: event.target.value }))
                    }
                  >
                    <option value="">No manager</option>
                    {users
                      .filter((candidate) => candidate.id !== user.id && candidate.role !== "employee")
                      .map((candidate) => (
                        <option value={candidate.id} key={candidate.id}>{candidate.name}</option>
                      ))}
                  </select>
                  <button className="button button-ghost small-button" type="button" onClick={() => saveUser(user)}>
                    Manager
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2>Unlock Goals</h2>
          <div className="compact-list">
            {lockedGoals.map((goal) => (
              <div className="list-row" key={goal.id}>
                <span>{goal.employee_name}<small>{goal.title}</small></span>
                <div className="row-actions">
                  <StatusBadge status={goal.status} />
                  <button className="icon-button" type="button" onClick={() => unlockGoal(goal.id)} title="Unlock goal">
                    <LockOpen size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel">
        <h2>Audit Trail</h2>
        <div className="audit-table">
          {auditLogs.map((log) => (
            <div className="audit-row" key={log.id}>
              <span>{new Date(log.created_at).toLocaleString()}</span>
              <strong>{log.action}</strong>
              <small>{log.actor_name ?? "System"} | {log.entity_type}</small>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
