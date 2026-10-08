import { cookies } from "next/headers";
import { z } from "zod";
import {
  originGuard,
  rateLimit,
  jsonBody,
  equal,
  issueToken,
  apiError,
  HttpError,
} from "@/lib/server";
export async function POST(req: Request) {
  try {
    originGuard(req);
    rateLimit("unlock", 5);
    const { code } = z
      .object({ code: z.string().min(1).max(300) })
      .parse(await jsonBody(req, 2000));
    if (
      !process.env.JEFF_ACCESS_CODE ||
      !equal(code, process.env.JEFF_ACCESS_CODE)
    )
      throw new HttpError(401, "That access code is not correct.");
    (await cookies()).set("jeff-access", issueToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 43200,
    });
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
