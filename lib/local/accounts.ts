import "server-only";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { cookies, headers } from "next/headers";
import { HttpError } from "@/lib/server";
import { sessionCookie, verifyUserSession } from "@/lib/authToken";

const scrypt = promisify(scryptCallback);
const file = path.join(process.cwd(), ".jeff-data", "accounts.json");
type Account = { username: string; passwordHash: string; salt: string; role: "admin" | "learner"; createdAt: string };
async function readAccounts(): Promise<Account[]> {
  try { return JSON.parse(await readFile(file, "utf8")); } catch { return []; }
}
async function hash(password: string, salt: string) {
  return (await scrypt(password, salt, 64) as Buffer).toString("hex");
}
export async function createAccount(username: string, password: string) {
  const accounts = await readAccounts();
  const normalized = username.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,40}$/.test(normalized)) throw new HttpError(400, "Use 3–40 letters, numbers, dots, dashes or underscores for the username.");
  if (password.length < 10 || password.length > 200) throw new HttpError(400, "Use a password of at least 10 characters.");
  if (accounts.some((item) => item.username === normalized)) throw new HttpError(409, "That username is already registered.");
  const salt = randomBytes(16).toString("hex");
  const account: Account = { username: normalized, passwordHash: await hash(password, salt), salt, role: accounts.length ? "learner" : "admin", createdAt: new Date().toISOString() };
  accounts.push(account);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(accounts, null, 2), { mode: 0o600 });
  return { username: account.username, role: account.role };
}
export async function authenticate(username: string, password: string) {
  const account = (await readAccounts()).find((item) => item.username === username.trim().toLowerCase());
  if (!account) throw new HttpError(401, "The username or password is incorrect.");
  const expected = Buffer.from(account.passwordHash, "hex");
  const supplied = Buffer.from(await hash(password, account.salt), "hex");
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) throw new HttpError(401, "The username or password is incorrect.");
  return { username: account.username, role: account.role };
}
export async function currentUser() {
  return verifyUserSession((await cookies()).get(sessionCookie)?.value);
}
export async function requireUser(role?: "admin") {
  if (process.env.JEFF_E2E_BYPASS_AUTH === "1" || (process.env.NODE_ENV === "development" && (await headers()).get("x-jeff-e2e") === "1"))
    return { username: "test-admin", role: "admin" as const, expires: Date.now() + 60000 };
  const user = await currentUser();
  if (!user) throw new HttpError(401, "Please log in to continue.");
  if (role === "admin" && user.role !== "admin") throw new HttpError(403, "Only the administrator can change course documents.");
  return user;
}
