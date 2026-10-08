import { getWeather } from "./forecast";

const weatherIntent = /\b(weather|temperature|rain|forecast|how hot|how cold)\b/i;

function formatTemperature(value: number | null | undefined, unit: string) {
  return typeof value === "number" ? `${Math.round(value)}${unit}` : null;
}

export async function answerJohannesburgWeather(
  messages: { role: "user" | "assistant"; content: string }[],
  signal?: AbortSignal,
) {
  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user")?.content;
  if (
    !latestUserMessage ||
    !weatherIntent.test(latestUserMessage) ||
    !/\bjohannesburg\b/i.test(latestUserMessage)
  )
    return null;

  try {
    const weather = await getWeather(
      {
        city: "Johannesburg",
        country_code: "ZA",
        temperature_unit: /fahrenheit|°\s*f\b/i.test(latestUserMessage)
          ? "fahrenheit"
          : "celsius",
      },
      signal,
    );
    if (weather.error)
      return {
        content: "I couldn't find live weather for Johannesburg right now.",
        sources: weather.sources,
        live: weather.live,
      };

    const unit = weather.temperature_unit || "°C";
    const current = [
      formatTemperature(weather.current?.temperature, unit),
      weather.current?.conditions,
    ].filter(Boolean);
    const today = weather.forecast?.[0];
    const high = formatTemperature(today?.high, unit);
    const low = formatTemperature(today?.low, unit);
    const details = [
      high && `high ${high}`,
      low && `low ${low}`,
      typeof today?.rain_chance_percent === "number" &&
        `${today.rain_chance_percent}% chance of rain`,
    ].filter(Boolean);
    const summary = [
      current.length ? `currently ${current.join(" and ")}` : null,
      details.length ? `today: ${details.join(", ")}` : null,
    ].filter(Boolean);

    return {
      content: summary.length
        ? `In ${weather.location}, ${summary.join("; ")}.`
        : "Live weather data for Johannesburg is unavailable right now.",
      sources: weather.sources,
      live: weather.live,
    };
  } catch (error) {
    if (signal?.aborted) throw error;
    return {
      content:
        "I can't retrieve live weather for Johannesburg right now. Please try again shortly.",
      sources: [],
      live: false,
    };
  }
}
