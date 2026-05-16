// MOCK DB — no database required for demo
export const pool = {
  end: async () => {},
  connect: async () => ({
    query: async () => ({ rows: [] }),
    release: () => {}
  })
};

// ── Shared mock data ─────────────────────────────────────────────────────────

const MOCK_CYCLES = [
  {
    id: "cycle-2026",
    name: "FY2026 Performance Cycle",
    year: 2026,
    status: "active",
    active_window: "goal_setting",
    goal_setting_start: "2026-04-01",
    goal_setting_end: "2026-05-31"
  }
];

const MOCK_USERS = [
  { id: "mock-employee-001", name: "Priya Sharma",   role: "employee", department: "Engineering", title: "Software Engineer",    manager_id: "mock-manager-001", is_active: true, email: "employee@atomquest.dev" },
  { id: "mock-employee-002", name: "Arjun Nair",     role: "employee", department: "Engineering", title: "Frontend Developer",   manager_id: "mock-manager-001", is_active: true, email: "arjun@atomquest.dev" },
  { id: "mock-employee-003", name: "Fatima Khan",    role: "employee", department: "Customer Success", title: "CS Specialist",  manager_id: "mock-manager-001", is_active: true, email: "fatima@atomquest.dev" },
  { id: "mock-manager-001", name: "Rahul Mehta",    role: "manager",  department: "Engineering", title: "Engineering Manager",  manager_id: "mock-admin-001",   is_active: true, email: "manager@atomquest.dev" },
  { id: "mock-admin-001",   name: "Sneha Gupta",    role: "admin",    department: "HR",          title: "Head of HR",          manager_id: null,               is_active: true, email: "admin@atomquest.dev"   }
];

const MOCK_GOALS = [
  { id: "goal-001", employee_id: "mock-employee-001", employee_name: "Priya Sharma",  cycle_id: "cycle-2026", thrust_area: "Delivery",   title: "Ship API v2",           description: "Deliver the new REST API by Q2.", measurement_type: "timeline", scoring_direction: "higher_better", target_date: "2026-06-30", weightage: 30, status: "approved",  locked_at: "2026-05-01", department: "Engineering" },
  { id: "goal-002", employee_id: "mock-employee-001", employee_name: "Priya Sharma",  cycle_id: "cycle-2026", thrust_area: "Quality",    title: "Reduce Bug Backlog",    description: "Resolve 90% of P1 bugs within Q1.", measurement_type: "percent", scoring_direction: "higher_better", target_numeric: 90, weightage: 25, status: "approved",  locked_at: "2026-05-01", department: "Engineering" },
  { id: "goal-003", employee_id: "mock-employee-001", employee_name: "Priya Sharma",  cycle_id: "cycle-2026", thrust_area: "Learning",   title: "AWS Certification",     description: "Obtain AWS Cloud Practitioner cert.", measurement_type: "zero_based", scoring_direction: "higher_better", target_numeric: 1, weightage: 20, status: "submitted", locked_at: null, department: "Engineering" },
  { id: "goal-004", employee_id: "mock-employee-001", employee_name: "Priya Sharma",  cycle_id: "cycle-2026", thrust_area: "Mentoring",  title: "Mentor 2 Interns",      description: "Provide structured guidance to 2 interns.", measurement_type: "numeric", scoring_direction: "higher_better", target_numeric: 2, weightage: 25, status: "draft",     locked_at: null, department: "Engineering" },
  { id: "goal-005", employee_id: "mock-employee-002", employee_name: "Arjun Nair",    cycle_id: "cycle-2026", thrust_area: "Delivery",   title: "Launch Design System",  description: "Build and document the component library.", measurement_type: "percent", scoring_direction: "higher_better", target_numeric: 100, weightage: 40, status: "submitted", locked_at: null, department: "Engineering" },
  { id: "goal-006", employee_id: "mock-employee-002", employee_name: "Arjun Nair",    cycle_id: "cycle-2026", thrust_area: "Performance","title": "Core Web Vitals",     description: "Achieve LCP < 2.5s on all pages.", measurement_type: "numeric", scoring_direction: "lower_better", target_numeric: 2.5, weightage: 35, status: "submitted", locked_at: null, department: "Engineering" },
  { id: "goal-007", employee_id: "mock-employee-003", employee_name: "Fatima Khan",   cycle_id: "cycle-2026", thrust_area: "CSAT",       title: "NPS Score 70+",         description: "Achieve Net Promoter Score above 70.", measurement_type: "numeric", scoring_direction: "higher_better", target_numeric: 70, weightage: 40, status: "approved",  locked_at: "2026-05-02", department: "Customer Success" }
];

const MOCK_CHECKINS = [
  { id: "ci-001", goal_id: "goal-001", checkin_id: "ci-001", employee_id: "mock-employee-001", employee_name: "Priya Sharma", cycle_id: "cycle-2026", quarter: "Q1", title: "Ship API v2", measurement_type: "timeline", target_date: "2026-06-30", actual_date: null, status: "on_track",    progress_score: 65, employee_comment: "On schedule, design phase complete.", manager_comment: "Great work, keep it up.", manager_confidence: "high", blocker_flag: false },
  { id: "ci-002", goal_id: "goal-002", checkin_id: "ci-002", employee_id: "mock-employee-001", employee_name: "Priya Sharma", cycle_id: "cycle-2026", quarter: "Q1", title: "Reduce Bug Backlog", measurement_type: "percent", target_numeric: 90, actual_numeric: 72, status: "on_track",    progress_score: 80, employee_comment: "Cleared 72% of P1 bugs.",           manager_comment: "",            manager_confidence: "medium", blocker_flag: false },
  { id: "ci-003", goal_id: "goal-007", checkin_id: "ci-003", employee_id: "mock-employee-003", employee_name: "Fatima Khan",  cycle_id: "cycle-2026", quarter: "Q1", title: "NPS Score 70+",    measurement_type: "numeric",  target_numeric: 70, actual_numeric: 62, status: "on_track",    progress_score: 58, employee_comment: "Ran 3 NPS surveys, working on gaps.", manager_comment: "Flag the detractors", manager_confidence: "medium", blocker_flag: true  }
];

const MOCK_AUDIT = [
  { id: 1, actor_name: "Sneha Gupta", entity_type: "cycle",  action: "create_cycle",    created_at: "2026-05-01T08:00:00Z" },
  { id: 2, actor_name: "Priya Sharma", entity_type: "goal",   action: "submit_goals",    created_at: "2026-05-10T09:00:00Z" },
  { id: 3, actor_name: "Rahul Mehta", entity_type: "goal",   action: "approve_goal",    created_at: "2026-05-12T10:30:00Z" },
  { id: 4, actor_name: "Priya Sharma", entity_type: "checkin","action": "save_checkin",  created_at: "2026-05-14T11:00:00Z" },
  { id: 5, actor_name: "Rahul Mehta", entity_type: "checkin","action": "review_checkin", created_at: "2026-05-14T14:00:00Z" }
];

// ── query mock router ────────────────────────────────────────────────────────
export async function query(text, params = []) {
  const t = text.toLowerCase().trim();

  // cycles
  if (t.includes("from cycles")) return { rows: MOCK_CYCLES };

  // users list
  if (t.includes("from users") && !t.includes("where")) return { rows: MOCK_USERS };

  // single user lookup (auth middleware)
  if (t.includes("from users") && t.includes("where")) {
    const found = MOCK_USERS.find(u => u.id === params[0] || u.email === params[0]);
    return { rows: found ? [found] : [] };
  }

  // goals with status filter
  if (t.includes("from goals") || (t.includes("goal") && t.includes("select"))) {
    let goals = [...MOCK_GOALS];
    if (params.includes("submitted")) goals = goals.filter(g => g.status === "submitted");
    else if (params.includes("locked"))    goals = goals.filter(g => g.status === "locked" || !!g.locked_at);
    return { rows: goals };
  }

  // check-ins
  if (t.includes("check_in") || t.includes("checkin")) {
    let cis = [...MOCK_CHECKINS];
    const q = params.find(p => ["Q1","Q2","Q3","Q4"].includes(p));
    if (q) cis = cis.filter(c => c.quarter === q);
    return { rows: cis };
  }

  // audit logs
  if (t.includes("audit_log")) return { rows: MOCK_AUDIT };

  // shared_goals, INSERT, UPDATE, etc.
  return { rows: [] };
}

export async function withTransaction(work) {
  const client = await pool.connect();
  try { return await work(client); } finally { client.release(); }
}
