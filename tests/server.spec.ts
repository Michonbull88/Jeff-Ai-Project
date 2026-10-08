import { test, expect } from "@playwright/test";
import { isAllowedOrigin } from "../lib/origin";
import { openAIErrorMessage } from "../lib/openai/errors";

test("loopback aliases work only in development on the same port", () => {
  expect(
    isAllowedOrigin(
      "http://localhost:3000/api/chat",
      "http://127.0.0.1:3000",
      undefined,
      true,
    ),
  ).toBe(true);
  expect(
    isAllowedOrigin(
      "http://127.0.0.1:3000/api/chat",
      "http://localhost:3000",
      undefined,
      true,
    ),
  ).toBe(true);
  for (const origin of [
    "https://untrusted.example",
    "http://localhost.evil.example:3000",
    "http://127.0.0.1:4000",
    "https://localhost:3000",
    "null",
    null,
  ])
    expect(
      isAllowedOrigin(
        "http://localhost:3000/api/chat",
        origin,
        undefined,
        true,
      ),
    ).toBe(false);
  expect(
    isAllowedOrigin(
      "http://localhost:3000/api/chat",
      "http://127.0.0.1:3000",
      undefined,
      false,
    ),
  ).toBe(false);
  expect(
    isAllowedOrigin(
      "http://localhost:3000/api/chat",
      "http://127.0.0.1:3000",
      "https://jeff.example.com",
      true,
    ),
  ).toBe(false);
  expect(
    isAllowedOrigin(
      "http://localhost:3000/api/chat",
      "https://jeff.example.com",
      "https://jeff.example.com",
      false,
    ),
  ).toBe(true);
});
test("billing and authentication failures have specific safe messages", () => {
  expect(openAIErrorMessage(429, "credit_balance_exhausted")).toContain(
    "API credits",
  );
  expect(openAIErrorMessage(429, "rate_limit_exceeded")).toContain(
    "wait a minute",
  );
  expect(openAIErrorMessage(401, "invalid_api_key")).toContain("rejected");
  expect(openAIErrorMessage(404, "model_not_found")).toContain(
    "model is unavailable",
  );
  expect(
    openAIErrorMessage(500, "arbitrary-secret-provider-code"),
  ).not.toContain("arbitrary-secret");
});
test("both local addresses reach validation without a paid API call", async ({
  request,
}) => {
  for (const origin of ["http://localhost:3000", "http://127.0.0.1:3000"]) {
    const response = await request.post("/api/chat", {
      headers: { origin },
      data: {},
    });
    expect([400, 401, 503]).toContain(response.status());
  }
});
