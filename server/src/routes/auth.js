import express from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env.js";
import { query } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { writeAudit } from "../utils/audit.js";

const router = express.Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["employee", "manager", "admin"]).default("employee"),
  managerId: z.string().uuid().nullable().optional(),
  department: z.string().min(2),
  title: z.string().min(2)
});

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);

    // MOCK LOGIN — return different user based on email prefix
    let user;
    const email = input.email.toLowerCase();
    if (email.startsWith("manager")) {
      user = {
        id: "mock-manager-001",
        name: "Rahul Mehta",
        email: input.email,
        role: "manager",
        department: "Engineering",
        title: "Engineering Manager",
        manager_id: "mock-admin-001",
        is_active: true
      };
    } else if (email.startsWith("admin") || email.startsWith("hr")) {
      user = {
        id: "mock-admin-001",
        name: "Sneha Gupta",
        email: input.email,
        role: "admin",
        department: "HR",
        title: "Head of HR",
        manager_id: null,
        is_active: true
      };
    } else {
      user = {
        id: "mock-employee-001",
        name: "Priya Sharma",
        email: input.email,
        role: "employee",
        department: "Engineering",
        title: "Software Engineer",
        manager_id: "mock-manager-001",
        is_active: true
      };
    }

    const token = jwt.sign({ sub: user.id, role: user.role, user }, env.jwtSecret || "secret", {
      expiresIn: env.jwtExpiresIn || "8h"
    });

    res.json({ token, user });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  })
);

router.post(
  "/register",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body);
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash, role, manager_id, department, title)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, email, role, manager_id, department, title, is_active, created_at`,
      [
        input.name,
        input.email.toLowerCase(),
        hashPassword(input.password),
        input.role,
        input.managerId ?? null,
        input.department,
        input.title
      ]
    );

    await writeAudit({
      actorId: req.user.id,
      entityType: "user",
      entityId: rows[0].id,
      action: "create_user",
      afterData: rows[0],
      req
    });

    res.status(201).json({ user: rows[0] });
  })
);

function sanitizeUser(user) {
  const { password_hash, ...safe } = user;
  return safe;
}

export default router;
