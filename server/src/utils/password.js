import crypto from "crypto";

const KEY_LENGTH = 64;

export function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;

  const candidate = crypto.scryptSync(password, salt, KEY_LENGTH);
  const reference = Buffer.from(key, "hex");

  return reference.length === candidate.length && crypto.timingSafeEqual(reference, candidate);
}
