import { ZodError } from "zod";

export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(error, req, res, next) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      message: "Validation failed",
      issues: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    });
  }

  if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  const status = error.status ?? 500;
  const payload = { message: error.message ?? "Unexpected server error" };

  if (process.env.NODE_ENV !== "production" && status >= 500) {
    payload.stack = error.stack;
  }

  res.status(status).json(payload);
}
