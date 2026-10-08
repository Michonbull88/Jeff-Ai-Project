import { z } from "zod";
export const weatherArguments = z.object({
  city: z.string().trim().min(2).max(120),
  country_code: z
    .string()
    .regex(/^[A-Za-z]{2}$/)
    .nullable()
    .default(null),
  temperature_unit: z.enum(["celsius", "fahrenheit"]).default("celsius"),
});
export const weatherTool = {
  type: "function" as const,
  name: "get_weather",
  description:
    "Get live current conditions and a seven-day forecast for a city. Ask which city if no location is given or established in the conversation. Use this for weather, temperature, rain, and forecasts; never guess the user's location. For Johannesburg, South Africa, pass city 'Johannesburg' and country_code 'ZA'.",
  parameters: {
    type: "object",
    properties: {
      city: {
        type: "string",
        description: "City name only, without country or province.",
      },
      country_code: {
        type: ["string", "null"],
        description:
          "Two-letter country code if known from the user's request or conversation, otherwise null.",
      },
      temperature_unit: { type: "string", enum: ["celsius", "fahrenheit"] },
    },
    required: ["city", "country_code", "temperature_unit"],
    additionalProperties: false,
  },
};
