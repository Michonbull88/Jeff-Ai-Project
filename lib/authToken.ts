import { createHmac, timingSafeEqual } from "node:crypto";

export const sessionCookie = "jeff-user-session";
export type UserSession = { username: string; role: "admin" | "learner"; expires: number };

function secret() {
  return process.env.JEFF_AUTH_SECRET || process.env.JEFF_ACCESS_CODE || "jeff-local-development-secret";
}
function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}
export function issueUserSession(username: string, role: UserSession["role"]) {
  const payload = Buffer.from(JSON.stringify({ username, role, expires: Date.now() + 7 * 86400000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}
export function verifyUserSession(token?: string | null): UserSession | null {
  try {
    if (!token) return null;
    const [payload, signature] = token.split(".");
    const expected = Buffer.from(sign(payload));
    const supplied = Buffer.from(signature || "");
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as UserSession;
    if (!session.username || !["admin", "learner"].includes(session.role) || session.expires < Date.now()) return null;
    return session;
  } catch { return null; }
}
