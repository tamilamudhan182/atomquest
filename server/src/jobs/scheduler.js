import cron from "node-cron";
import { query } from "../config/db.js";
import { getActiveWindow } from "../utils/windows.js";
import { writeAudit } from "../utils/audit.js";

export async function syncCycleWindows() {
  const { rows } = await query("SELECT * FROM cycles WHERE status IN ('active', 'draft')");

  for (const cycle of rows) {
    const activeWindow = getActiveWindow(cycle);
    if (activeWindow !== cycle.active_window) {
      await query(
        `UPDATE cycles
         SET active_window = $1, last_window_sync_at = now(), updated_at = now()
         WHERE id = $2`,
        [activeWindow, cycle.id]
      );
      await writeAudit({
        actorId: null,
        entityType: "cycle",
        entityId: cycle.id,
        action: "sync_active_window",
        beforeData: { activeWindow: cycle.active_window },
        afterData: { activeWindow }
      });
    }
  }
}

export function startScheduler() {
  cron.schedule("0 8 * * *", () => {
    syncCycleWindows().catch((error) => {
      console.error("Scheduled cycle window sync failed", error);
    });
  });
}
