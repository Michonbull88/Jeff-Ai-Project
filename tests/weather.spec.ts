import { test, expect } from "@playwright/test";
import { getWeather } from "../lib/weather/forecast";
import { answerJohannesburgWeather } from "../lib/weather/answer";
const originalFetch = globalThis.fetch;
test.afterEach(() => {
  globalThis.fetch = originalFetch;
});
const place = {
  name: "Cape Town",
  latitude: -33.92584,
  longitude: 18.42322,
  country: "South Africa",
  country_code: "ZA",
  admin1: "Western Cape",
};
const forecast = {
  timezone: "Africa/Johannesburg",
  current: {
    time: "2026-09-29T14:00",
    temperature_2m: 21,
    apparent_temperature: 20,
    relative_humidity_2m: 65,
    weather_code: 2,
    wind_speed_10m: 14,
  },
  daily: {
    time: ["2026-09-29", "2026-09-30"],
    weather_code: [2, 61],
    temperature_2m_max: [23, 19],
    temperature_2m_min: [14, 12],
    precipitation_probability_max: [10, 70],
  },
};
test("weather returns local time, units, forecast and a real source URL", async () => {
  const requests: URL[] = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    requests.push(url);
    return Response.json(
      url.hostname.startsWith("geocoding") ? { results: [place] } : forecast,
    );
  };
  const result = await getWeather({
    city: "Cape Town",
    country_code: "ZA",
    temperature_unit: "celsius",
  });
  expect(result.live).toBe(true);
  expect(result.current?.conditions).toBe("Partly cloudy");
  expect(result.timezone).toBe("Africa/Johannesburg");
  expect(result.forecast?.[1].rain_chance_percent).toBe(70);
  expect(result.sources[0].url).toContain("api.open-meteo.com/v1/forecast?");
  expect(requests[0].searchParams.get("countryCode")).toBe("ZA");
  expect(requests[1].searchParams.get("timezone")).toBe("auto");
});
test("Johannesburg weather questions receive a live answer without an AI call", async () => {
  const requests: URL[] = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    requests.push(url);
    return Response.json(
      url.hostname.startsWith("geocoding")
        ? {
            results: [
              {
                name: "Johannesburg",
                latitude: -26.20227,
                longitude: 28.04363,
                country: "South Africa",
                country_code: "ZA",
                admin1: "Gauteng",
              },
            ],
          }
        : forecast,
    );
  };
  const answer = await answerJohannesburgWeather([
    { role: "user", content: "How is the weather in Johannesburg?" },
  ]);
  expect(answer?.content).toContain("Johannesburg, Gauteng, South Africa");
  expect(answer?.content).toContain("21°C");
  expect(answer?.content).toContain("Partly cloudy");
  expect(answer?.content).toContain("high 23°C");
  expect(answer?.content).toContain("low 14°C");
  expect(answer?.content).toContain("10% chance of rain");
  expect(answer?.live).toBe(true);
  expect(answer?.sources[0].url).toContain("api.open-meteo.com");
  expect(requests[0].searchParams.get("countryCode")).toBe("ZA");
});
test("weather answer handler ignores unrelated requests", async () => {
  expect(
    await answerJohannesburgWeather([
      { role: "user", content: "Tell me about Johannesburg." },
    ]),
  ).toBeNull();
});
test("unknown or ambiguous locations request clarification rather than inventing weather", async () => {
  globalThis.fetch = async () => Response.json({ results: [] });
  const missing = await getWeather({ city: "Unknown City" });
  expect(missing.live).toBe(false);
  expect(missing.error).toContain("nearby city");
  globalThis.fetch = async () =>
    Response.json({
      results: [
        {
          ...place,
          name: "London",
          country: "United Kingdom",
          country_code: "GB",
        },
        { ...place, name: "London", country: "Canada", country_code: "CA" },
      ],
    });
  const ambiguous = await getWeather({ city: "London" });
  expect(ambiguous.error).toContain("which country");
  expect(ambiguous.locations).toHaveLength(2);
});
test("Fahrenheit requests reach the provider and unavailable data remains unknown", async () => {
  let unit: string | null = null;
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    if (url.hostname.startsWith("geocoding"))
      return Response.json({ results: [place] });
    unit = url.searchParams.get("temperature_unit");
    return Response.json({
      ...forecast,
      current: { ...forecast.current, temperature_2m: null },
    });
  };
  const result = await getWeather({
    city: "Cape Town",
    country_code: "ZA",
    temperature_unit: "fahrenheit",
  });
  expect(unit).toBe("fahrenheit");
  expect(result.temperature_unit).toBe("°F");
  expect(result.current?.temperature).toBeNull();
});
test("invalid weather arguments and provider failures do not produce forecasts", async () => {
  await expect(getWeather({ city: "", country_code: "ZZZ" })).rejects.toThrow();
  globalThis.fetch = async () => new Response("Unavailable", { status: 503 });
  await expect(getWeather({ city: "Cape Town" })).rejects.toThrow(
    "unavailable",
  );
});
