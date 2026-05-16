import express from "express";
import ExcelJS from "exceljs";
import { z } from "zod";
import { query } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { writeAudit } from "../utils/audit.js";

const router = express.Router();

router.use(requireAuth);

router.get(
  "/achievements.csv",
  asyncHandler(async (req, res) => {
    const rows = await loadAchievementRows(req);
    await auditExport(req, "export_achievements_csv", rows.length);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=achievement-report.csv");
    res.send(toCsv(rows));
  })
);

router.get(
  "/achievements.xlsx",
  asyncHandler(async (req, res) => {
    const rows = await loadAchievementRows(req);
    await auditExport(req, "export_achievements_xlsx", rows.length);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "AtomQuest Goal Portal";
    const sheet = workbook.addWorksheet("Achievements");
    sheet.columns = reportHeaders.map((header) => ({
      header,
      key: header,
      width: Math.max(18, header.length + 2)
    }));
    sheet.addRows(rows);
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF151515" }
    };

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=achievement-report.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  })
);

const reportHeaders = [
  "Employee",
  "Email",
  "Department",
  "Manager",
  "Cycle",
  "Quarter",
  "Thrust Area",
  "Goal Title",
  "Measurement",
  "Target",
  "Actual",
  "Weightage",
  "Status",
  "Progress Score",
  "Employee Comment",
  "Manager Comment"
];

async function loadAchievementRows(req) {
  const cycleId = z.string().uuid().optional().parse(req.query.cycleId);
  const quarter = z.enum(["Q1", "Q2", "Q3", "Q4"]).optional().parse(req.query.quarter);
  const params = [];
  const conditions = [];

  if (cycleId) {
    params.push(cycleId);
    conditions.push(`g.cycle_id = $${params.length}`);
  }

  if (quarter) {
    params.push(quarter);
    conditions.push(`ci.quarter = $${params.length}`);
  }

  if (req.user.role === "employee") {
    params.push(req.user.id);
    conditions.push(`u.id = $${params.length}`);
  } else if (req.user.role === "manager") {
    params.push(req.user.id);
    conditions.push(`u.manager_id = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const { rows } = await query(
    `SELECT u.name AS employee, u.email, u.department, m.name AS manager, c.name AS cycle,
            ci.quarter, g.thrust_area, g.title, g.measurement_type, g.unit_label,
            g.target_numeric, g.target_date, g.target_text, ci.actual_numeric, ci.actual_date,
            ci.actual_text, g.weightage, ci.status, ci.progress_score, ci.employee_comment,
            ci.manager_comment
     FROM goals g
     JOIN users u ON u.id = g.employee_id
     LEFT JOIN users m ON m.id = u.manager_id
     JOIN cycles c ON c.id = g.cycle_id
     LEFT JOIN check_ins ci ON ci.goal_id = g.id
     ${where}
     ORDER BY u.name, ci.quarter, g.created_at`,
    params
  );

  return rows.map((row) => ({
    Employee: row.employee,
    Email: row.email,
    Department: row.department,
    Manager: row.manager ?? "",
    Cycle: row.cycle,
    Quarter: row.quarter ?? "",
    "Thrust Area": row.thrust_area,
    "Goal Title": row.title,
    Measurement: row.measurement_type,
    Target: row.target_date ?? row.target_numeric ?? row.target_text ?? "",
    Actual: row.actual_date ?? row.actual_numeric ?? row.actual_text ?? "",
    Weightage: `${row.weightage}%`,
    Status: row.status ?? "not_started",
    "Progress Score": row.progress_score ?? 0,
    "Employee Comment": row.employee_comment ?? "",
    "Manager Comment": row.manager_comment ?? ""
  }));
}

function toCsv(rows) {
  const lines = [reportHeaders.join(",")];
  for (const row of rows) {
    lines.push(reportHeaders.map((header) => escapeCsv(row[header])).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function escapeCsv(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

async function auditExport(req, action, rowCount) {
  await writeAudit({
    actorId: req.user.id,
    entityType: "report",
    entityId: null,
    action,
    afterData: { rowCount },
    req
  });
}

export default router;
