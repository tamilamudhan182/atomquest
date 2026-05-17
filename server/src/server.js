import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { pool } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import goalRoutes from "./routes/goals.js";
import checkinRoutes from "./routes/checkins.js";
import adminRoutes from "./routes/admin.js";
import dashboardRoutes from "./routes/dashboard.js";
import reportRoutes from "./routes/reports.js";
import { errorHandler, notFound } from "./middleware/error.js";
import { startScheduler, syncCycleWindows } from "./jobs/scheduler.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = env.corsOrigin.split(",").map((o) => o.trim());
      const isLocalhost = origin.includes("localhost") || origin.includes("127.0.0.1");
      const isVercel = origin.endsWith(".vercel.app");
      
      if (isLocalhost || isVercel || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));

app.get("/", (req, res) => {
  res.json({
    status: "active",
    message: "AtomQuest API Server is running successfully. API endpoints are available under /api"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "AtomQuest Goal Portal API",
    timestamp: new Date().toISOString()
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/checkins", checkinRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);

app.use(notFound);
app.use(errorHandler);

// Export for Vercel serverless environment
export default app;

if (process.env.NODE_ENV !== "production" && process.env.VERCEL !== "1") {
  const server = app.listen(env.port, async () => {
    console.log(`AtomQuest Goal Portal API running on port ${env.port}`);
    await syncCycleWindows().catch((error) => console.warn("Initial cycle sync skipped:", error.message));
    if (env.enableScheduler) startScheduler();
  });

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  async function shutdown() {
    console.log("Shutting down API");
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  }
}

