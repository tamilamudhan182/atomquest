import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { query } from "../config/db.js";

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "Missing bearer token" });
    }

    // MOCK: Read user directly from JWT payload (no DB lookup needed)
    const payload = jwt.verify(token, env.jwtSecret || "secret");
    if (!payload?.user) {
      return res.status(401).json({ message: "Invalid token" });
    }

    req.user = payload.user;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ message: "You do not have permission for this action" });
    }
    next();
  };
}

export async function assertCanAccessEmployee(user, employeeId) {
  if (user.role === "admin" || user.id === employeeId) return;

  const { rows } = await query("SELECT manager_id FROM users WHERE id = $1", [employeeId]);
  if (rows[0]?.manager_id === user.id) return;

  const error = new Error("You can only access your own records or direct reports");
  error.status = 403;
  throw error;
}
