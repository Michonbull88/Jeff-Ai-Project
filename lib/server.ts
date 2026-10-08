import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { ZodError } from "zod";
import OpenAI from "openai";
import { isAllowedOrigin } from "./origin";
import { openAIErrorMessage } from "./openai/errors";
import { sessionCookie, verifyUserSession } from "./authToken";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const buckets = new Map<string, { count: number; reset: number }>();
export function rateLimit(key: string, limit = 30) {
  const now = Date.now();
  if (buckets.size > 2000)
    for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
  let bucket = buckets.get(key);
  if (!bucket || bucket.reset < now) {
    bucket = { count: 0, reset: now + 60000 };
    buckets.set(key, bucket);
  }
  if (++bucket.count > limit)
    throw new HttpError(
      429,
      "A little breather. Please try again in a minute.",
    );
}
function signature(value: string) {
  return createHmac("sha256", process.env.JEFF_ACCESS_CODE || "")
    .update(value)
    .digest("hex");
}
export function issueToken() {
  const expires = String(Date.now() + 12 * 60 * 60 * 1000);
  return `${expires}.${signature(expires)}`;
}
export function equal(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export async function isLocked() {
  if (verifyUserSession((await cookies()).get(sessionCookie)?.value)) return false;
  if (!process.env.JEFF_ACCESS_CODE)
    return process.env.NODE_ENV === "production";
  const token = (await cookies()).get("jeff-access")?.value || "";
  const [expires, hash] = token.split(".");
  return (
    !expires ||
    !hash ||
    Number(expires) < Date.now() ||
    !equal(hash, signature(expires))
  );
}
export function originGuard(request: Request) {
  if (
    !isAllowedOrigin(
      request.url,
      request.headers.get("origin"),
      process.env.APP_ORIGIN,
      process.env.NODE_ENV === "development",
    )
  )
    throw new HttpError(
      403,
      "This request could not be verified. Refresh and try again.",
    );
}
export async function guard(request: Request, kind: string, limit = 30) {
  originGuard(request);
  // A global cap cannot be bypassed by spoofing forwarded IP headers.
  rateLimit("global", 120);
  if (await isLocked()) throw new HttpError(401, "Unlock JEFF to continue.");
  rateLimit(kind, limit);
}
export function requireOpenAIKey() {
  if (process.env.JEFF_ENABLE_OPENAI !== "true")
    throw new HttpError(
      503,
      "Paid OpenAI features are disabled. Use the local Excel tutor or text chat.",
    );
  if (!process.env.OPENAI_API_KEY)
    throw new HttpError(
      503,
      "This feature needs an OpenAI API key. Configure it in the server environment, then restart JEFF.",
    );
}
export async function jsonBody(request: Request, max = 100000) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new HttpError(415, "Please send a valid request.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Your request was empty.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel();
        throw new HttpError(
          413,
          "That message is too long. Please shorten it.",
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(
      400,
      "That request could not be read. Please try again.",
    );
  }
}
export function apiError(error: unknown) {
  let status = 502;
  let message = "I've lost my connection. Please try again.";
  if (error instanceof HttpError) {
    status = error.status;
    message = error.message;
  } else if (error instanceof ZodError) {
    status = 400;
    message = "Please use a shorter message or start a new conversation.";
  } else if (error instanceof OpenAI.APIError) {
    status = error.status === 429 ? 429 : 502;
    message = openAIErrorMessage(error.status, error.code, error.type);
  }
  return Response.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...(status === 429 ? { "Retry-After": "60" } : {}),
      },
    },
  );
}
