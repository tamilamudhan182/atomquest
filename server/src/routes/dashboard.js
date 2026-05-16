import express from "express";
import { z } from "zod";
import { query } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

router.use(requireAuth);

router.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const cycleId = z.string().uuid().optional().parse(req.query.cycleId);
    const quarter = z.enum(["Q1", "Q2", "Q3", "Q4"]).optional().parse(req.query.quarter);
    const employeeParams = [];
    const employeeScope = appendScope(employeeParams, req.user, "u");

    const goalParams = [];
    const goalScope = appendScope(goalParams, req.user, "u");
    const goalCycle = appendCycle(goalParams, cycleId, "g");

    const completionParams = [];
    const completionScope = appendScope(completionParams, req.user, "u");
    const completionCycle = appendCycle(completionParams, cycleId, "g");
    const quarterJoin = quarter ? `AND ci.quarter = $${completionParams.push(quarter)}` : "";

    const qoqParams = [];
    const qoqScope = appendScope(qoqParams, req.user, "u");
    const qoqCycle = cycleId ? `AND ci.cycle_id = $${qoqParams.push(cycleId)}` : "";

    const managerParams = [];
    const managerCycle = cycleId ? `AND g.cycle_id = $${managerParams.push(cycleId)}` : "";
    const managerSelf = req.user.role === "manager" ? `AND m.id = $${managerParams.push(req.user.id)}` : "";
    const managerHidden = req.user.role === "employee" ? "AND 1 = 0" : "";

    const [employeeCounts, goalCounts, completion, distribution, qoq, managerEffectiveness] =
      await Promise.all([
        query(
          `SELECT COUNT(*)::int AS employees
           FROM users u
           WHERE u.role = 'employee' AND u.is_active = true ${employeeScope}`,
          employeeParams
        ),
        query(
          `SELECT g.status, COUNT(*)::int AS count
           FROM goals g
           JOIN users u ON u.id = g.employee_id
           WHERE 1 = 1 ${goalScope} ${goalCycle}
           GROUP BY g.status`,
          goalParams
        ),
        query(
          `SELECT
             COUNT(g.id)::int AS locked_goals,
             COUNT(ci.id)::int AS completed_checkins,
             COALESCE(ROUND(AVG(ci.progress_score), 2), 0) AS average_progress
           FROM goals g
           JOIN users u ON u.id = g.employee_id
           LEFT JOIN check_ins ci ON ci.goal_id = g.id ${quarterJoin}
           WHERE g.status = 'locked' ${completionScope} ${completionCycle}`,
          completionParams
        ),
        query(
          `SELECT g.thrust_area, COUNT(*)::int AS goals, COALESCE(SUM(g.weightage), 0)::numeric AS weightage
           FROM goals g
           JOIN users u ON u.id = g.employee_id
           WHERE 1 = 1 ${goalScope} ${goalCycle}
           GROUP BY g.thrust_area
           ORDER BY goals DESC`,
          goalParams
        ),
        query(
          `SELECT ci.quarter, ROUND(AVG(ci.progress_score), 2) AS average_progress
           FROM check_ins ci
           JOIN users u ON u.id = ci.employee_id
           WHERE 1 = 1 ${qoqScope} ${qoqCycle}
           GROUP BY ci.quarter
           ORDER BY ci.quarter`,
          qoqParams
        ),
        query(
          `SELECT m.id, m.name AS manager_name,
                  COUNT(DISTINCT e.id)::int AS direct_reports,
                  COUNT(g.id)::int AS goals,
                  COUNT(*) FILTER (WHERE g.status = 'returned')::int AS returned_goals,
                  COALESCE(ROUND(AVG(ci.progress_score), 2), 0) AS average_progress
           FROM users m
           LEFT JOIN users e ON e.manager_id = m.id AND e.role = 'employee'
           LEFT JOIN goals g ON g.employee_id = e.id ${managerCycle}
           LEFT JOIN check_ins ci ON ci.goal_id = g.id
           WHERE m.role = 'manager' ${managerSelf} ${managerHidden}
           GROUP BY m.id, m.name
           ORDER BY average_progress DESC`,
          managerParams
        )
      ]);

    const lockedGoals = completion.rows[0]?.locked_goals ?? 0;
    const completedCheckins = completion.rows[0]?.completed_checkins ?? 0;

    res.json({
      employees: employeeCounts.rows[0]?.employees ?? 0,
      goalCounts: goalCounts.rows,
      checkinCompletion: {
        lockedGoals,
        completedCheckins,
        completionRate: lockedGoals ? Math.round((completedCheckins / lockedGoals) * 100) : 0,
        averageProgress: Number(completion.rows[0]?.average_progress ?? 0)
      },
      distribution: distribution.rows,
      qoq: qoq.rows,
      managerEffectiveness: managerEffectiveness.rows
    });
  })
);

function appendScope(params, user, alias) {
  if (user.role === "admin") return "";
  if (user.role === "manager") {
    return `AND ${alias}.manager_id = $${params.push(user.id)}`;
  }
  return `AND ${alias}.id = $${params.push(user.id)}`;
}

function appendCycle(params, cycleId, alias) {
  return cycleId ? `AND ${alias}.cycle_id = $${params.push(cycleId)}` : "";
}

export default router;
