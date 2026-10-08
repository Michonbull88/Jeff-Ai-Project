import { cookies, headers } from "next/headers";
import { z } from "zod";
import { createAccount, authenticate, currentUser } from "@/lib/local/accounts";
import { apiError, jsonBody, originGuard, rateLimit } from "@/lib/server";
import { issueUserSession, sessionCookie } from "@/lib/authToken";

const schema = z.object({ action: z.enum(["login", "register", "logout"]), username: z.string().max(40).optional(), password: z.string().max(200).optional() });
export async function GET() { const bypass = process.env.JEFF_E2E_BYPASS_AUTH === "1" || (process.env.NODE_ENV === "development" && (await headers()).get("x-jeff-e2e") === "1"); return Response.json({ user: bypass ? { username: "test-admin", role: "admin" } : await currentUser() }, { headers: { "Cache-Control": "no-store" } }); }
export async function POST(request: Request) {
  try {
    originGuard(request); rateLimit("account-auth", 12);
    const data = schema.parse(await jsonBody(request, 3000));
    const jar = await cookies();
    if (data.action === "logout") {
      jar.delete(sessionCookie); return Response.json({ ok: true });
    }
    const user = data.action === "register"
      ? await createAccount(data.username || "", data.password || "")
      : await authenticate(data.username || "", data.password || "");
    jar.set(sessionCookie, issueUserSession(user.username, user.role), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 7 * 86400 });
    return Response.json({ user });
  } catch (error) { return apiError(error); }
}
