import express from "express";
import { z } from "zod";
import { query, withTransaction } from "../config/db.js";
import { requireAuth, requireRole, assertCanAccessEmployee } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { writeAudit } from "../utils/audit.js";
import { assertWindowOpen } from "../utils/windows.js";
import { notify } from "../services/notificationService.js";

const router = express.Router();

const goalInputSchema = z.object({
  employeeId: z.string().uuid().optional(),
  cycleId: z.string().uuid().optional(),
  thrustArea: z.string().min(2),
  title: z.string().min(3),
  description: z.string().optional().nullable(),
  measurementType: z.enum(["numeric", "percent", "timeline", "zero_based"]),
  scoringDirection: z.enum(["higher_better", "lower_better"]).default("higher_better"),
  unitLabel: z.string().optional().nullable(),
  targetNumeric: z.coerce.number().optional().nullable(),
  targetDate: z.string().optional().nullable(),
  targetText: z.string().optional().nullable(),
  weightage: z.coerce.number().min(10).max(100)
});

const updateGoalSchema = goalInputSchema.partial().extend({
  weightage: z.coerce.number().min(10).max(100).optional()
});

const submitSchema = z.object({
  employeeId: z.string().uuid().optional(),
  cycleId: z.string().uuid()
});

const approvalSchema = z.object({
  managerComment: z.string().optional().nullable(),
  updates: updateGoalSchema.optional()
});

router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { cycleId, employeeId, status } = req.query;
    const params = [];
    const conditions = [];

    if (cycleId) {
      params.push(cycleId);
      conditions.push(`g.cycle_id = $${params.length}`);
    }

    if (status) {
      params.push(status);
      conditions.push(`g.status = $${params.length}`);
    }

    if (employeeId) {
      await assertCanAccessEmployee(req.user, employeeId);
      params.push(employeeId);
      conditions.push(`g.employee_id = $${params.length}`);
    } else if (req.user.role === "employee") {
      params.push(req.user.id);
      conditions.push(`g.employee_id = $${params.length}`);
    } else if (req.user.role === "manager") {
      params.push(req.user.id);
      conditions.push(`(u.manager_id = $${params.length} OR g.employee_id = $${params.length})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await query(
      `SELECT g.*, u.name AS employee_name, u.email AS employee_email, u.department,
              c.name AS cycle_name, c.active_window
       FROM goals g
       JOIN users u ON u.id = g.employee_id
       JOIN cycles c ON c.id = g.cycle_id
       ${where}
       ORDER BY g.created_at DESC`,
      params
    );

    res.json({ goals: rows });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = goalInputSchema.parse(req.body);

    const created = await withTransaction(async (client) => {
      const cycle = await getCycle(client, input.cycleId);
      assertWindowOpen(cycle, "goal_setting", req.user);

      const employeeId = input.employeeId ?? req.user.id;
      await assertCanAccessEmployee(req.user, employeeId);
      ensureGoalTarget(input);

      const { rows } = await client.query(
        `INSERT INTO goals (
          employee_id, cycle_id, thrust_area, title, description, measurement_type,
          scoring_direction, unit_label, target_numeric, target_date, target_text,
          weightage, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          employeeId,
          cycle.id,
          input.thrustArea,
          input.title,
          input.description ?? null,
          input.measurementType,
          input.scoringDirection,
          input.unitLabel ?? defaultUnit(input.measurementType),
          input.targetNumeric ?? (input.measurementType === "zero_based" ? 0 : null),
          input.targetDate ?? null,
          input.targetText ?? null,
          input.weightage,
          req.user.id
        ]
      );

      await validateGoalSet(client, employeeId, cycle.id);

      await writeAudit({
        actorId: req.user.id,
        entityType: "goal",
        entityId: rows[0].id,
        action: "create_goal",
        afterData: rows[0],
        req
      });

      return rows[0];
    });

    res.status(201).json({ goal: created });
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const input = updateGoalSchema.parse(req.body);

    const updated = await withTransaction(async (client) => {
      const before = await getGoal(client, req.params.id);
      await assertCanAccessEmployee(req.user, before.employee_id);

      const cycle = await getCycle(client, before.cycle_id);
      assertWindowOpen(cycle, "goal_setting", req.user);

      if (before.locked_at && req.user.role !== "admin") {
        const error = new Error("Approved goals are locked. Ask Admin/HR to unlock before editing.");
        error.status = 423;
        throw error;
      }

      const allowedInput = applySharedGoalRules(before, input, req.user.role);
      const merged = goalToInput(before, allowedInput);
      ensureGoalTarget(merged);

      const { rows } = await client.query(
        `UPDATE goals
         SET thrust_area = $1,
             title = $2,
             description = $3,
             measurement_type = $4,
             scoring_direction = $5,
             unit_label = $6,
             target_numeric = $7,
             target_date = $8,
             target_text = $9,
             weightage = $10,
             status = CASE WHEN status = 'returned' THEN 'draft'::goal_status ELSE status END,
             updated_at = now()
         WHERE id = $11
         RETURNING *`,
        [
          merged.thrustArea,
          merged.title,
          merged.description ?? null,
          merged.measurementType,
          merged.scoringDirection,
          merged.unitLabel ?? defaultUnit(merged.measurementType),
          merged.targetNumeric ?? (merged.measurementType === "zero_based" ? 0 : null),
          merged.targetDate ?? null,
          merged.targetText ?? null,
          merged.weightage,
          before.id
        ]
      );

      await validateGoalSet(client, before.employee_id, before.cycle_id);

      await writeAudit({
        actorId: req.user.id,
        entityType: "goal",
        entityId: before.id,
        action: before.locked_at ? "post_lock_goal_change" : "update_goal",
        beforeData: before,
        afterData: rows[0],
        req
      });

      return rows[0];
    });

    res.json({ goal: updated });
  })
);

router.post(
  "/submit",
  asyncHandler(async (req, res) => {
    const input = submitSchema.parse(req.body);
    const employeeId = input.employeeId ?? req.user.id;
    await assertCanAccessEmployee(req.user, employeeId);

    const result = await withTransaction(async (client) => {
      const cycle = await getCycle(client, input.cycleId);
      assertWindowOpen(cycle, "goal_setting", req.user);
      const summary = await validateGoalSet(client, employeeId, input.cycleId, { requireExactTotal: true });

      const { rows } = await client.query(
        `UPDATE goals
         SET status = 'submitted', updated_at = now()
         WHERE employee_id = $1 AND cycle_id = $2 AND status IN ('draft', 'returned')
         RETURNING *`,
        [employeeId, input.cycleId]
      );

      await writeAudit({
        actorId: req.user.id,
        entityType: "cycle",
        entityId: input.cycleId,
        action: "submit_goals",
        afterData: { employeeId, summary, submittedGoals: rows.length },
        req
      });

      return { goals: rows, summary };
    });

    await notify({
      type: "goal_submission",
      recipient: "manager",
      subject: "Goals submitted for approval",
      body: `${req.user.name} submitted goals for review.`,
      metadata: { employeeId, cycleId: input.cycleId }
    });

    res.json(result);
  })
);

router.post(
  "/:id/approve",
  requireRole("manager", "admin"),
  asyncHandler(async (req, res) => {
    const input = approvalSchema.parse(req.body);

    const approved = await withTransaction(async (client) => {
      const before = await getGoal(client, req.params.id);
      await assertCanAccessEmployee(req.user, before.employee_id);

      const merged = goalToInput(before, input.updates ?? {});
      ensureGoalTarget(merged);

      const { rows } = await client.query(
        `UPDATE goals
         SET thrust_area = $1,
             title = $2,
             description = $3,
             measurement_type = $4,
             scoring_direction = $5,
             unit_label = $6,
             target_numeric = $7,
             target_date = $8,
             target_text = $9,
             weightage = $10,
             status = 'locked',
             manager_comment = $11,
             approved_by = $12,
             approved_at = now(),
             locked_at = now(),
             updated_at = now()
         WHERE id = $13
         RETURNING *`,
        [
          merged.thrustArea,
          merged.title,
          merged.description ?? null,
          merged.measurementType,
          merged.scoringDirection,
          merged.unitLabel,
          merged.targetNumeric ?? (merged.measurementType === "zero_based" ? 0 : null),
          merged.targetDate ?? null,
          merged.targetText ?? null,
          merged.weightage,
          input.managerComment ?? null,
          req.user.id,
          before.id
        ]
      );

      await validateGoalSet(client, before.employee_id, before.cycle_id, { requireExactTotal: true });

      await writeAudit({
        actorId: req.user.id,
        entityType: "goal",
        entityId: before.id,
        action: "approve_and_lock_goal",
        beforeData: before,
        afterData: rows[0],
        req
      });

      return rows[0];
    });

    res.json({ goal: approved });
  })
);

router.post(
  "/:id/return",
  requireRole("manager", "admin"),
  asyncHandler(async (req, res) => {
    const input = z.object({ managerComment: z.string().min(3) }).parse(req.body);

    const returned = await withTransaction(async (client) => {
      const before = await getGoal(client, req.params.id);
      await assertCanAccessEmployee(req.user, before.employee_id);

      const { rows } = await client.query(
        `UPDATE goals
         SET status = 'returned',
             manager_comment = $1,
             locked_at = NULL,
             updated_at = now()
         WHERE id = $2
         RETURNING *`,
        [input.managerComment, before.id]
      );

      await writeAudit({
        actorId: req.user.id,
        entityType: "goal",
        entityId: before.id,
        action: "return_goal_for_rework",
        beforeData: before,
        afterData: rows[0],
        req
      });

      return rows[0];
    });

    res.json({ goal: returned });
  })
);

async function getCycle(client, cycleId) {
  const sql = cycleId
    ? "SELECT * FROM cycles WHERE id = $1"
    : "SELECT * FROM cycles WHERE status = 'active' ORDER BY year DESC, created_at DESC LIMIT 1";
  const params = cycleId ? [cycleId] : [];
  const { rows } = await client.query(sql, params);
  if (!rows[0]) {
    const error = new Error("Active cycle not found");
    error.status = 404;
    throw error;
  }
  return rows[0];
}

async function getGoal(client, id) {
  const { rows } = await client.query(
    `SELECT g.*, u.manager_id, u.name AS employee_name, u.email AS employee_email
     FROM goals g
     JOIN users u ON u.id = g.employee_id
     WHERE g.id = $1`,
    [id]
  );
  if (!rows[0]) {
    const error = new Error("Goal not found");
    error.status = 404;
    throw error;
  }
  return rows[0];
}

async function validateGoalSet(client, employeeId, cycleId, options = {}) {
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS count, COALESCE(SUM(weightage), 0)::numeric AS total,
            COUNT(*) FILTER (WHERE weightage < 10)::int AS below_minimum
     FROM goals
     WHERE employee_id = $1 AND cycle_id = $2`,
    [employeeId, cycleId]
  );

  const summary = {
    count: rows[0].count,
    total: Number(rows[0].total),
    belowMinimum: rows[0].below_minimum
  };

  if (summary.count > 8) {
    const error = new Error("Maximum goals per employee is 8");
    error.status = 400;
    throw error;
  }

  if (summary.belowMinimum > 0) {
    const error = new Error("Minimum weightage per goal is 10%");
    error.status = 400;
    throw error;
  }

  if (summary.total > 100) {
    const error = new Error("Total goal weightage cannot exceed 100%");
    error.status = 400;
    throw error;
  }

  if (options.requireExactTotal && summary.total !== 100) {
    const error = new Error("Total goal weightage must equal 100% before submission or approval");
    error.status = 400;
    throw error;
  }

  return summary;
}

function ensureGoalTarget(input) {
  if (["numeric", "percent"].includes(input.measurementType) && input.targetNumeric == null) {
    const error = new Error("Numeric and percent goals require a target value");
    error.status = 400;
    throw error;
  }

  if (input.measurementType === "timeline" && !input.targetDate) {
    const error = new Error("Timeline goals require a target deadline");
    error.status = 400;
    throw error;
  }
}

function goalToInput(goal, patch) {
  return {
    thrustArea: patch.thrustArea ?? goal.thrust_area,
    title: patch.title ?? goal.title,
    description: patch.description ?? goal.description,
    measurementType: patch.measurementType ?? goal.measurement_type,
    scoringDirection: patch.scoringDirection ?? goal.scoring_direction,
    unitLabel: patch.unitLabel ?? goal.unit_label,
    targetNumeric: patch.targetNumeric ?? (goal.target_numeric == null ? null : Number(goal.target_numeric)),
    targetDate: patch.targetDate ?? goal.target_date,
    targetText: patch.targetText ?? goal.target_text,
    weightage: patch.weightage ?? Number(goal.weightage)
  };
}

function applySharedGoalRules(goal, input, role) {
  if (!goal.is_shared || role === "manager" || role === "admin") return input;

  const disallowed = [
    "thrustArea",
    "title",
    "description",
    "measurementType",
    "scoringDirection",
    "unitLabel",
    "targetNumeric",
    "targetDate",
    "targetText"
  ].filter((field) => Object.prototype.hasOwnProperty.call(input, field));

  if (disallowed.length) {
    const error = new Error("Shared goals only allow employees to adjust weightage");
    error.status = 400;
    throw error;
  }

  return input;
}

function defaultUnit(type) {
  if (type === "percent") return "%";
  if (type === "timeline") return "date";
  if (type === "zero_based") return "count";
  return "number";
}

export default router;
