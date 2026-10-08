import { guard, jsonBody, apiError, HttpError } from "@/lib/server";
import { weatherArguments } from "@/lib/weather/tool";
import { getWeather } from "@/lib/weather/forecast";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    await guard(req, "weather", 20);
    const args = weatherArguments.parse(await jsonBody(req, 3000));
    try {
      return Response.json(await getWeather(args, req.signal), {
        headers: { "Cache-Control": "no-store" },
      });
    } catch {
      throw new HttpError(
        502,
        "The weather service is unavailable right now. Please try again shortly.",
      );
    }
  } catch (error) {
    return apiError(error);
  }
}
