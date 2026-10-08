import { z } from "zod";
import { weatherArguments } from "./tool";
const placesSchema = z.object({
  results: z
    .array(
      z.object({
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        country: z.string().optional(),
        country_code: z.string().optional(),
        admin1: z.string().optional(),
      }),
    )
    .optional(),
});
const value = z.number().nullable();
const forecastSchema = z.object({
  timezone: z.string(),
  current: z.object({
    time: z.string(),
    temperature_2m: value,
    apparent_temperature: value,
    relative_humidity_2m: value,
    weather_code: value,
    wind_speed_10m: value,
  }),
  daily: z.object({
    time: z.array(z.string()),
    weather_code: z.array(value),
    temperature_2m_max: z.array(value),
    temperature_2m_min: z.array(value),
    precipitation_probability_max: z.array(value),
  }),
});
export function weatherDescription(code: number | null) {
  if (code === null) return "Unavailable";
  const labels: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Freezing fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Heavy drizzle",
    56: "Light freezing drizzle",
    57: "Freezing drizzle",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Freezing rain",
    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Light showers",
    81: "Showers",
    82: "Heavy showers",
    85: "Light snow showers",
    86: "Snow showers",
    95: "Thunderstorms",
    96: "Thunderstorms with hail",
    99: "Severe thunderstorms with hail",
  };
  return labels[code] || "Unknown conditions";
}
export async function getWeather(input: unknown, signal?: AbortSignal) {
  const args = weatherArguments.parse(input);
  const requestSignal = signal
    ? AbortSignal.any([signal, AbortSignal.timeout(12000)])
    : AbortSignal.timeout(12000);
  const geocoding = new URL("https://geocoding-api.open-meteo.com/v1/search");
  geocoding.search = new URLSearchParams({
    name: args.city,
    count: "5",
    language: "en",
    format: "json",
    ...(args.country_code
      ? { countryCode: args.country_code.toUpperCase() }
      : {}),
  }).toString();
  const locations = await fetch(geocoding, {
    signal: requestSignal,
    cache: "no-store",
  });
  if (!locations.ok)
    throw new Error("Weather location lookup is temporarily unavailable.");
  const places = placesSchema.parse(await locations.json()).results || [];
  if (!places.length)
    return {
      error: "Location not found. Ask the user for a nearby city and country.",
      sources: [],
      live: false,
    };
  const exact = places.filter(
    (p) => p.name.toLowerCase() === args.city.toLowerCase(),
  );
  if (!args.country_code && new Set(exact.map((p) => p.country_code)).size > 1)
    return {
      error:
        "Multiple countries match this city. Ask the user which country before answering.",
      locations: exact.map((p) =>
        [p.name, p.admin1, p.country].filter(Boolean).join(", "),
      ),
      sources: [],
      live: false,
    };
  const place = places[0];
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    timezone: "auto",
    forecast_days: "7",
    temperature_unit: args.temperature_unit,
    wind_speed_unit: "kmh",
    current:
      "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
  }).toString();
  const response = await fetch(url, {
    signal: requestSignal,
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error("The weather forecast is temporarily unavailable.");
  const data = forecastSchema.parse(await response.json());
  return {
    location: [place.name, place.admin1, place.country]
      .filter(Boolean)
      .join(", "),
    timezone: data.timezone,
    temperature_unit: args.temperature_unit === "celsius" ? "°C" : "°F",
    wind_unit: "km/h",
    current: {
      time: data.current.time,
      temperature: data.current.temperature_2m,
      feels_like: data.current.apparent_temperature,
      humidity_percent: data.current.relative_humidity_2m,
      conditions: weatherDescription(data.current.weather_code),
      wind: data.current.wind_speed_10m,
    },
    forecast: data.daily.time.map((date, i) => ({
      date,
      conditions: weatherDescription(data.daily.weather_code[i] ?? null),
      high: data.daily.temperature_2m_max[i] ?? null,
      low: data.daily.temperature_2m_min[i] ?? null,
      rain_chance_percent: data.daily.precipitation_probability_max[i] ?? null,
    })),
    sources: [{ title: "Open-Meteo live forecast", url: url.href }],
    live: true,
  };
}
