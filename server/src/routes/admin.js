import express from "express";
import { z } from "zod";
import { query, withTransaction } from "../config/db.js";
import { requireAuth, requireRole, assertCanAccessEmployee } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { writeAudit } from "../utils/audit.js";
import { getActiveWindow } from "../utils/windows.js";
import { syncCycleWindows } from "../jobs/scheduler.js";

const router = express.Router();

const cycleSchema = z.object({
  name: z.string().min(3),
  year: z.coerce.number().int(),
  status: z.enum(["draft", "active", "closed"]).default("active"),
  goalSettingStart: z.string(),
  goalSettingEnd: z.string(),
  q1Start: z.string(),
  q1End: z.string(),
  q2Start: z.string(),
  q2End: z.string(),
  q3Start: z.string(),
  q3End: z.string(),
  q4Start: z.string(),
  q4End: z.string()
});

const hierarchySchema = z.object({
  managerId: z.string().uuid().nullable().optional(),
  department: z.string().min(2).optional(),
  title: z.string().min(2).optional(),
  role: z.enum(["employee", "manager", "admin"]).optional(),
  isActive: z.boolean().optional()
});

const sharedGoalSchema = z.object({
  cycleId: z.string().uuid(),
  department: z.string().min(2),
  employeeIds: z.array(z.string().uuid()).optional(),
  thrustArea: z.string().min(2),
  title: z.string().min(3),
  description: z.string().optional().nullable(),
  measurementType: z.enum(["numeric", "percent", "timeline", "zero_based"]),
  scoringDirection: z.enum(["higher_better", "lower_better"]).default("higher_better"),
  unitLabel: z.string().optional().nullable(),
  targetNumeric: z.coerce.number().optional().nullable(),
  targetDate: z.string().optional().nullable(),
  targetText: z.string().optional().nullable(),
  defaultWeightage: z.coerce.number().min(10).max(100)
});

router.use(requireAuth);

router.get(
  "/users",
  requireRole("manager", "admin"),
  asyncHandler(async (req, res) => {
    const { rows } =
      req.user.role === "admin"
        ? await query(
            `SELECT id, name, email, role, manager_id, department, title, is_active, created_at
             FROM users
             ORDER BY department, name`
          )
        : await query(
            `SELECT id, name, email, role, manager_id, department, title, is_active, created_at
             FROM users
             WHERE manager_id = $1
             ORDER BY department, name`,
            [req.user.id]
          );

    res.json({ users: rows });
  })
);

router.patch(
  "/users/:id/hierarchy",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const input = hierarchySchema.parse(req.body);
    const before = await getUser(req.params.id);
    const next = {
      managerId: Object.prototype.hasOwnProperty.call(input, "managerId")
        ? input.managerId
        : before.manager_id,
      department: input.department ?? before.department,
      title: input.title ?? before.title,
      role: input.role ?? before.role,
      isActive: Object.prototype.hasOwnProperty.call(input, "isActive")
        ? input.isActive
        : before.is_active
    };

    const { rows } = await query(
      `UPDATE users
       SET manager_id = $1,
           department = $2,
           title = $3,
           role = $4,
           is_active = $5,
           updated_at = now()
       WHERE id = $6
       RETURNING id, name, email, role, manager_id, department, title, is_active, created_at`,
      [next.managerId, next.department, next.title, next.role, next.isActive, req.params.id]
    );

    await writeAudit({
      actorId: req.user.id,
      entityType: "user",
      entityId: req.params.id,
      action: "update_hierarchy",
      beforeData: before,
      afterData: rows[0],
      req
    });

    res.json({ user: rows[0] });
  })
);

router.get(
  "/cycles",
  asyncHandler(async (req, res) => {
    const { rows } = await query("SELECT * FROM cycles ORDER BY year DESC, created_at DESC");
    res.json({ cycles: rows });
  })
);

router.post(
  "/cycles",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const input = cycleSchema.parse(req.body);
    const activeWindow = getActiveWindow(toCycleWindow(input));

    const { rows } = await query(
      `INSERT INTO cycles (
        name, year, status, goal_setting_start, goal_setting_end, q1_start, q1_end,
        q2_start, q2_end, q3_start, q3_end, q4_start, q4_end, active_window,
        last_window_sync_at, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, now(), $15)
      RETURNING *`,
      [
        input.name,
        input.year,
        input.status,
        input.goalSettingStart,
        input.goalSettingEnd,
        input.q1Start,
        input.q1End,
        input.q2Start,
        input.q2End,
        input.q3Start,
        input.q3End,
        input.q4Start,
        input.q4End,
        activeWindow,
        req.user.id
      ]
    );

    await writeAudit({
      actorId: req.user.id,
      entityType: "cycle",
      entityId: rows[0].id,
      action: "create_cycle",
      afterData: rows[0],
      req
    });

    res.status(201).json({ cycle: rows[0] });
  })
);

router.patch(
  "/cycles/:id",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const input = cycleSchema.partial().parse(req.body);
    const before = await getCycle(req.params.id);
    const merged = {
      name: input.name ?? before.name,
      year: input.year ?? before.year,
      status: input.status ?? before.status,
      goalSettingStart: input.goalSettingStart ?? before.goal_setting_start,
      goalSettingEnd: input.goalSettingEnd ?? before.goal_setting_end,
      q1Start: input.q1Start ?? before.q1_start,
      q1End: input.q1End ?? before.q1_end,
      q2Start: input.q2Start ?? before.q2_start,
      q2End: input.q2End ?? before.q2_end,
      q3Start: input.q3Start ?? before.q3_start,
      q3End: input.q3End ?? before.q3_end,
      q4Start: input.q4Start ?? before.q4_start,
      q4End: input.q4End ?? before.q4_end
    };
    const activeWindow = getActiveWindow(toCycleWindow(merged));

    const { rows } = await query(
      `UPDATE cycles
       SET name = $1, year = $2, status = $3,
           goal_setting_start = $4, goal_setting_end = $5,
           q1_start = $6, q1_end = $7, q2_start = $8, q2_end = $9,
           q3_start = $10, q3_end = $11, q4_start = $12, q4_end = $13,
           active_window = $14, last_window_sync_at = now(), updated_at = now()
       WHERE id = $15
       RETURNING *`,
      [
        merged.name,
        merged.year,
        merged.status,
        merged.goalSettingStart,
        merged.goalSettingEnd,
        merged.q1Start,
        merged.q1End,
        merged.q2Start,
        merged.q2End,
        merged.q3Start,
        merged.q3End,
        merged.q4Start,
        merged.q4End,
        activeWindow,
        req.params.id
      ]
    );

    await writeAudit({
      actorId: req.user.id,
      entityType: "cycle",
      entityId: req.params.id,
      action: "update_cycle",
      beforeData: before,
      afterData: rows[0],
      req
    });

    res.json({ cycle: rows[0] });
  })
);

router.post(
  "/goals/:id/unlock",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const before = await getGoal(req.params.id);
    const { rows } = await query(
      `UPDATE goals
       SET status = 'approved',
           locked_at = NULL,
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );

    await writeAudit({
      actorId: req.user.id,
      entityType: "goal",
      entityId: req.params.id,
      action: "admin_unlock_goal",
      beforeData: before,
      afterData: rows[0],
      req
    });

    res.json({ goal: rows[0] });
  })
);

router.post(
  "/shared-goals/push",
  requireRole("manager", "admin"),
  asyncHandler(async (req, res) => {
    const input = sharedGoalSchema.parse(req.body);

    const result = await withTransaction(async (client) => {
      const employees = await resolveSharedGoalEmployees(client, req.user, input);

      const { rows: sharedRows } = await client.query(
        `INSERT INTO shared_goals (
          cycle_id, department, thrust_area, title, description, measurement_type,
          scoring_direction, unit_label, target_numeric, target_date, target_text, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          input.cycleId,
          input.department,
          input.thrustArea,
          input.title,
          input.description ?? null,
          input.measurementType,
          input.scoringDirection,
          input.unitLabel ?? defaultUnit(input.measurementType),
          input.targetNumeric ?? (input.measurementType === "zero_based" ? 0 : null),
          input.targetDate ?? null,
          input.targetText ?? null,
          req.user.id
        ]
      );

      await ensureSharedGoalCapacity(client, employees, input.cycleId, input.defaultWeightage);

      const inserted = [];
      for (const employee of employees) {
        const { rows } = await client.query(
          `INSERT INTO goals (
            employee_id, cycle_id, shared_goal_id, thrust_area, title, description,
            measurement_type, scoring_direction, unit_label, target_numeric, target_date,
            target_text, weightage, status, is_shared, title_locked, target_locked, created_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
                  'draft', true, true, true, $14)
          RETURNING *`,
          [
            employee.id,
            input.cycleId,
            sharedRows[0].id,
            input.thrustArea,
            input.title,
            input.description ?? null,
            input.measurementType,
            input.scoringDirection,
            input.unitLabel ?? defaultUnit(input.measurementType),
            input.targetNumeric ?? (input.measurementType === "zero_based" ? 0 : null),
            input.targetDate ?? null,
            input.targetText ?? null,
            input.defaultWeightage,
            req.user.id
          ]
        );
        inserted.push(rows[0]);
      }

      await writeAudit({
        actorId: req.user.id,
        entityType: "shared_goal",
        entityId: sharedRows[0].id,
        action: "push_shared_goal",
        afterData: { sharedGoal: sharedRows[0], employees: employees.map((employee) => employee.id) },
        req
      });

      return { sharedGoal: sharedRows[0], goals: inserted };
    });

    res.status(201).json(result);
  })
);

router.get(
  "/audit-logs",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit ?? 100), 500);
    const { rows } = await query(
      `SELECT a.*, u.name AS actor_name, u.email AS actor_email
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.actor_id
       ORDER BY a.created_at DESC
       LIMIT $1`,
      [limit]
    );
    res.json({ auditLogs: rows });
  })
);

router.post(
  "/windows/sync",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    await syncCycleWindows();
    await writeAudit({
      actorId: req.user.id,
      entityType: "cycle",
      entityId: null,
      action: "manual_window_sync",
      req
    });
    res.json({ message: "Cycle windows synchronized" });
  })
);

async function getUser(id) {
  const { rows } = await query("SELECT * FROM users WHERE id = $1", [id]);
  if (!rows[0]) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }
  return rows[0];
}

async function getGoal(id) {
  const { rows } = await query("SELECT * FROM goals WHERE id = $1", [id]);
  if (!rows[0]) {
    const error = new Error("Goal not found");
    error.status = 404;
    throw error;
  }
  return rows[0];
}

async function getCycle(id) {
  const { rows } = await query("SELECT * FROM cycles WHERE id = $1", [id]);
  if (!rows[0]) {
    const error = new Error("Cycle not found");
    error.status = 404;
    throw error;
  }
  return rows[0];
}

function toCycleWindow(input) {
  return {
    name: input.name,
    goal_setting_start: input.goalSettingStart,
    goal_setting_end: input.goalSettingEnd,
    q1_start: input.q1Start,
    q1_end: input.q1End,
    q2_start: input.q2Start,
    q2_end: input.q2End,
    q3_start: input.q3Start,
    q3_end: input.q3End,
    q4_start: input.q4Start,
    q4_end: input.q4End
  };
}

async function resolveSharedGoalEmployees(client, user, input) {
  const params = [input.department];
  let where = "department = $1 AND role = 'employee' AND is_active = true";

  if (input.employeeIds?.length) {
    params.push(input.employeeIds);
    where += ` AND id = ANY($${params.length}::uuid[])`;
  }

  if (user.role === "manager") {
    params.push(user.id);
    where += ` AND manager_id = $${params.length}`;
  }

  const { rows } = await client.query(`SELECT id, name FROM users WHERE ${where}`, params);

  if (!rows.length) {
    const error = new Error("No eligible employees found for shared goal push");
    error.status = 400;
    throw error;
  }

  for (const employee of rows) {
    await assertCanAccessEmployee(user, employee.id);
  }

  return rows;
}

async function ensureSharedGoalCapacity(client, employees, cycleId, weightage) {
  for (const employee of employees) {
    const { rows } = await client.query(
      `SELECT COUNT(*)::int AS count, COALESCE(SUM(weightage), 0)::numeric AS total
       FROM goals
       WHERE employee_id = $1 AND cycle_id = $2`,
      [employee.id, cycleId]
    );

    const count = rows[0].count + 1;
    const total = Number(rows[0].total) + weightage;
    if (count > 8 || total > 100) {
      const error = new Error(
        `Shared goal would violate goal count or 100% weightage limit for ${employee.name}`
      );
      error.status = 400;
      throw error;
    }
  }
}

function defaultUnit(type) {
  if (type === "percent") return "%";
  if (type === "timeline") return "date";
  if (type === "zero_based") return "count";
  return "number";
}

export default router;
