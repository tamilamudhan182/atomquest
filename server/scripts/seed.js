import { pool, withTransaction } from "../src/config/db.js";
import { hashPassword } from "../src/utils/password.js";
import { getActiveWindow } from "../src/utils/windows.js";

const demoPassword = "Password123!";

async function upsertUser(client, user) {
  const { rows } = await client.query(
    `INSERT INTO users (name, email, password_hash, role, manager_id, department, title)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (email) DO UPDATE
     SET name = EXCLUDED.name,
         role = EXCLUDED.role,
         manager_id = EXCLUDED.manager_id,
         department = EXCLUDED.department,
         title = EXCLUDED.title,
         updated_at = now()
     RETURNING *`,
    [
      user.name,
      user.email,
      hashPassword(demoPassword),
      user.role,
      user.manager_id ?? null,
      user.department,
      user.title
    ]
  );

  return rows[0];
}

async function seed() {
  await withTransaction(async (client) => {
    const admin = await upsertUser(client, {
      name: "Aarav Mehta",
      email: "admin@atomquest.dev",
      role: "admin",
      department: "People Success",
      title: "HR Admin"
    });

    const manager = await upsertUser(client, {
      name: "Maya Rao",
      email: "manager@atomquest.dev",
      role: "manager",
      manager_id: admin.id,
      department: "Engineering",
      title: "Engineering Manager"
    });

    const employee = await upsertUser(client, {
      name: "Nikhil Sen",
      email: "employee@atomquest.dev",
      role: "employee",
      manager_id: manager.id,
      department: "Engineering",
      title: "Senior Software Engineer"
    });

    await upsertUser(client, {
      name: "Priya Shah",
      email: "priya@atomquest.dev",
      role: "employee",
      manager_id: manager.id,
      department: "Customer Success",
      title: "Customer Success Specialist"
    });

    const cycleWindow = {
      name: "FY2026 Performance Cycle",
      goal_setting_start: "2026-05-01",
      goal_setting_end: "2026-05-31",
      q1_start: "2026-07-01",
      q1_end: "2026-07-31",
      q2_start: "2026-10-01",
      q2_end: "2026-10-31",
      q3_start: "2027-01-01",
      q3_end: "2027-01-31",
      q4_start: "2027-03-01",
      q4_end: "2027-04-30"
    };

    const activeWindow = getActiveWindow(cycleWindow);
    const { rows: cycleRows } = await client.query(
      `INSERT INTO cycles (
        name, year, status, goal_setting_start, goal_setting_end, q1_start, q1_end,
        q2_start, q2_end, q3_start, q3_end, q4_start, q4_end, active_window,
        last_window_sync_at, created_by
      )
      VALUES ($1, 2026, 'active', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now(), $13)
      ON CONFLICT DO NOTHING
      RETURNING *`,
      [
        cycleWindow.name,
        cycleWindow.goal_setting_start,
        cycleWindow.goal_setting_end,
        cycleWindow.q1_start,
        cycleWindow.q1_end,
        cycleWindow.q2_start,
        cycleWindow.q2_end,
        cycleWindow.q3_start,
        cycleWindow.q3_end,
        cycleWindow.q4_start,
        cycleWindow.q4_end,
        activeWindow,
        admin.id
      ]
    );

    const cycle =
      cycleRows[0] ??
      (
        await client.query("SELECT * FROM cycles WHERE name = $1 ORDER BY created_at DESC LIMIT 1", [
          cycleWindow.name
        ])
      ).rows[0];

    await client.query("DELETE FROM check_ins WHERE cycle_id = $1", [cycle.id]);
    await client.query("DELETE FROM goals WHERE cycle_id = $1", [cycle.id]);
    await client.query("DELETE FROM shared_goals WHERE cycle_id = $1", [cycle.id]);

    const { rows: goalRows } = await client.query(
      `INSERT INTO goals (
        employee_id, cycle_id, thrust_area, title, description, measurement_type,
        scoring_direction, unit_label, target_numeric, weightage, status, created_by
      )
      VALUES
        ($1, $2, 'Delivery Excellence', 'Improve sprint predictability', 'Maintain predictable committed-vs-completed delivery across squads.', 'percent', 'higher_better', '%', 92, 35, 'submitted', $1),
        ($1, $2, 'Customer Impact', 'Reduce production defects', 'Lower defect leakage through automated quality gates.', 'numeric', 'lower_better', 'defects', 5, 25, 'submitted', $1),
        ($1, $2, 'Capability Building', 'Complete platform certification', 'Finish cloud architecture certification before the annual review.', 'timeline', 'higher_better', 'date', NULL, 20, 'submitted', $1),
        ($1, $2, 'Operational Discipline', 'Zero open critical incidents', 'Keep critical incidents at zero at the end of quarter.', 'zero_based', 'higher_better', 'count', 0, 20, 'submitted', $1)
      RETURNING *`,
      [employee.id, cycle.id]
    );

    await client.query(
      `UPDATE goals
       SET target_date = '2027-03-15'
       WHERE cycle_id = $1 AND measurement_type = 'timeline'`,
      [cycle.id]
    );

    await client.query(
      `INSERT INTO audit_logs (actor_id, entity_type, entity_id, action, after_data)
       VALUES ($1, 'cycle', $2, 'seed_demo_data', $3)`,
      [
        admin.id,
        cycle.id,
        JSON.stringify({
          credentials: [
            "employee@atomquest.dev / Password123!",
            "manager@atomquest.dev / Password123!",
            "admin@atomquest.dev / Password123!"
          ],
          goals: goalRows.length
        })
      ]
    );
  });

  await pool.end();
  console.log("Seed data complete");
  console.log("Demo password for all users: Password123!");
}

seed().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
