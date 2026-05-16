import express from "express";
import { z } from "zod";
import { query, withTransaction } from "../config/db.js";
import { requireAuth, requireRole, assertCanAccessEmployee } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { writeAudit } from "../utils/audit.js";
import { computeProgress } from "../utils/progress.js";
import { assertWindowOpen } from "../utils/windows.js";

const router = express.Router();

const quarterSchema = z.enum(["Q1", "Q2", "Q3", "Q4"]);

const checkinSchema = z.object({
  quarter: quarterSchema,
  actualNumeric: z.coerce.number().optional().nullable(),
  actualDate: z.string().optional().nullable(),
  actualText: z.string().optional().nullable(),
  status: z.enum(["not_started", "on_track", "completed"]),
  employeeComment: z.string().optional().nullable()
});

const reviewSchema = z.object({
  managerComment: z.string().min(3),
  managerConfidence: z.enum(["low", "medium", "high"]).optional().nullable(),
  blockerFlag: z.boolean().default(false)
});

router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const quarter = quarterSchema.parse(req.query.quarter ?? "Q1");
    const cycleId = z.string().uuid().optional().parse(req.query.cycleId);
    const employeeId = z.string().uuid().optional().parse(req.query.employeeId);

    const params = [quarter];
    const conditions = [];

    if (cycleId) {
      params.push(cycleId);
      conditions.push(`g.cycle_id = $${params.length}`);
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
      conditions.push(`u.manager_id = $${params.length}`);
    }

    const where = conditions.length ? `AND ${conditions.join(" AND ")}` : "";
    const { rows } = await query(
      `SELECT g.id AS goal_id, g.title, g.thrust_area, g.measurement_type, g.scoring_direction,
              g.unit_label, g.target_numeric, g.target_date, g.target_text, g.weightage,
              g.status AS goal_status, u.id AS employee_id, u.name AS employee_name,
              c.id AS cycle_id, c.name AS cycle_name, c.active_window,
              ci.id AS checkin_id, ci.quarter, ci.actual_numeric, ci.actual_date, ci.actual_text,
              ci.status, ci.progress_score, ci.progress_meta, ci.employee_comment,
              ci.manager_comment, ci.manager_confidence, ci.blocker_flag,
              ci.submitted_at, ci.reviewed_at
       FROM goals g
       JOIN users u ON u.id = g.employee_id
       JOIN cycles c ON c.id = g.cycle_id
       LEFT JOIN check_ins ci ON ci.goal_id = g.id AND ci.quarter = $1
       WHERE g.status = 'locked' ${where}
       ORDER BY u.name ASC, g.created_at ASC`,
      params
    );

    res.json({ checkins: rows, quarter });
  })
);

router.post(
  "/goals/:goalId",
  asyncHandler(async (req, res) => {
    const input = checkinSchema.parse(req.body);

    const saved = await withTransaction(async (client) => {
      const goal = await getGoal(client, req.params.goalId);
      await assertCanAccessEmployee(req.user, goal.employee_id);

      if (goal.status !== "locked") {
        const error = new Error("Achievements can only be logged for approved and locked goals");
        error.status = 400;
        throw error;
      }

      const cycle = await getCycle(client, goal.cycle_id);
      assertWindowOpen(cycle, input.quarter, req.user);

      const progress = computeProgress(goal, {
        actual_numeric: input.actualNumeric,
        actual_date: input.actualDate,
        actual_text: input.actualText
      });

      const { rows } = await client.query(
        `INSERT INTO check_ins (
          goal_id, employee_id, cycle_id, quarter, planned_target_numeric, planned_target_date,
          planned_target_text, actual_numeric, actual_date, actual_text, status, progress_score,
          progress_meta, employee_comment, submitted_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, now())
        ON CONFLICT (goal_id, quarter) DO UPDATE
        SET actual_numeric = EXCLUDED.actual_numeric,
            actual_date = EXCLUDED.actual_date,
            actual_text = EXCLUDED.actual_text,
            status = EXCLUDED.status,
            progress_score = EXCLUDED.progress_score,
            progress_meta = EXCLUDED.progress_meta,
            employee_comment = EXCLUDED.employee_comment,
            submitted_at = now(),
            updated_at = now()
        RETURNING *`,
        [
          goal.id,
          goal.employee_id,
          goal.cycle_id,
          input.quarter,
          goal.target_numeric,
          goal.target_date,
          goal.target_text,
          input.actualNumeric ?? null,
          input.actualDate ?? null,
          input.actualText ?? null,
          input.status,
          progress.score,
          JSON.stringify(progress.meta),
          input.employeeComment ?? null
        ]
      );

      await writeAudit({
        actorId: req.user.id,
        entityType: "check_in",
        entityId: rows[0].id,
        action: "upsert_checkin",
        afterData: rows[0],
        req
      });

      return rows[0];
    });

    res.json({ checkin: saved });
  })
);

router.post(
  "/:id/review",
  requireRole("manager", "admin"),
  asyncHandler(async (req, res) => {
    const input = reviewSchema.parse(req.body);

    const reviewed = await withTransaction(async (client) => {
      const before = await getCheckin(client, req.params.id);
      await assertCanAccessEmployee(req.user, before.employee_id);

      const { rows } = await client.query(
        `UPDATE check_ins
         SET manager_comment = $1,
             manager_confidence = $2,
             blocker_flag = $3,
             reviewed_by = $4,
             reviewed_at = now(),
             updated_at = now()
         WHERE id = $5
         RETURNING *`,
        [
          input.managerComment,
          input.managerConfidence ?? null,
          input.blockerFlag,
          req.user.id,
          before.id
        ]
      );

      await writeAudit({
        actorId: req.user.id,
        entityType: "check_in",
        entityId: before.id,
        action: "manager_checkin_review",
        beforeData: before,
        afterData: rows[0],
        req
      });

      return rows[0];
    });

    res.json({ checkin: reviewed });
  })
);

async function getGoal(client, id) {
  const { rows } = await client.query("SELECT * FROM goals WHERE id = $1", [id]);
  if (!rows[0]) {
    const error = new Error("Goal not found");
    error.status = 404;
    throw error;
  }
  return rows[0];
}

async function getCycle(client, id) {
  const { rows } = await client.query("SELECT * FROM cycles WHERE id = $1", [id]);
  if (!rows[0]) {
    const error = new Error("Cycle not found");
    error.status = 404;
    throw error;
  }
  return rows[0];
}

async function getCheckin(client, id) {
  const { rows } = await client.query("SELECT * FROM check_ins WHERE id = $1", [id]);
  if (!rows[0]) {
    const error = new Error("Check-in not found");
    error.status = 404;
    throw error;
  }
  return rows[0];
}

export default router;
