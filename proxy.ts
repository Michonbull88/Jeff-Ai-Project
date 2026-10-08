import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { sessionCookie, verifyUserSession } from "@/lib/authToken";

export function proxy(request: NextRequest) {
  if (process.env.JEFF_E2E_BYPASS_AUTH === "1" || (process.env.NODE_ENV === "development" && request.headers.get("x-jeff-e2e") === "1")) return NextResponse.next();
  if (["/api/auth", "/api/status"].includes(request.nextUrl.pathname))
    return NextResponse.next();
  const session = verifyUserSession(request.cookies.get(sessionCookie)?.value);
  if (session) return NextResponse.next();
  if (request.nextUrl.pathname.startsWith("/api/"))
    return Response.json({ error: "Please log in to continue." }, { status: 401 });
  const login = new URL("/login", request.url);
  if (request.nextUrl.pathname !== "/") login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}
export const config = { matcher: ["/((?!login|_next/static|_next/image|icon.svg|favicon.ico).*)"] };
