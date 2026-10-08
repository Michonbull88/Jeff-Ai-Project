import { guard, jsonBody, apiError, requireOpenAIKey } from "@/lib/server";
import { searchSchema } from "@/lib/validation";
import { respond } from "@/lib/openai/respond";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(req: Request) {
  try {
    await guard(req, "search", 20);
    requireOpenAIKey();
    const { query } = searchSchema.parse(await jsonBody(req, 12000));
    return Response.json(
      await respond([{ role: "user", content: query }], true, req.signal),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
