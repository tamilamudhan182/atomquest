import { query } from "../config/db.js";

export async function writeAudit({
  actorId,
  entityType,
  entityId,
  action,
  beforeData = null,
  afterData = null,
  req = null
}) {
  await query(
    `INSERT INTO audit_logs (actor_id, entity_type, entity_id, action, before_data, after_data, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      actorId ?? null,
      entityType,
      entityId,
      action,
      beforeData ? JSON.stringify(beforeData) : null,
      afterData ? JSON.stringify(afterData) : null,
      req?.ip ?? null
    ]
  );
}
