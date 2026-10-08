import { test, expect } from "@playwright/test";
declare global {
  interface Window {
    __jeffSpoken: string[];
  }
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("jeff-ready", "1"));
});
test("landing screen, settings, responsive layout and honest setup error", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/api/status", (route) =>
    route.fulfill({ json: { configured: false, locked: false } }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "A little more human. A world of possibility.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("img", { name: "JEFF is idle" })).toBeVisible();
  await page.getByRole("button", { name: "Open settings" }).click();
  await expect(
    page.getByRole("heading", { name: "Make JEFF your own" }),
  ).toBeVisible();
  await page.getByRole("combobox", { name: /^Voice/ }).selectOption("marin");
  await page.getByRole("button", { name: "Close settings" }).click();
  await page.getByRole("button", { name: "Voice", exact: true }).click();
  await page.getByRole("button", { name: "Start a conversation" }).click();
  await expect(
    page.getByRole("alert", { name: "JEFF notification" }),
  ).toContainText("Paid voice mode is disabled");
  await page.getByRole("button", { name: "Dismiss error" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  expect(errors).toEqual([]);
  await page.screenshot({
    path: `test-results/jeff-${test.info().project.name}.png`,
    fullPage: true,
  });
});
test("text conversation retains context, shows sources and clears", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.__jeffSpoken = [];
    Object.defineProperty(window.speechSynthesis, "speak", {
      configurable: true,
      value: (utterance: SpeechSynthesisUtterance) => {
        window.__jeffSpoken.push(utterance.text);
        utterance.onstart?.(new Event("start") as SpeechSynthesisEvent);
      },
    });
    Object.defineProperty(window.speechSynthesis, "cancel", {
      configurable: true,
      value: () => {},
    });
  });
  await page.route("**/api/status", (route) =>
    route.fulfill({ json: { configured: true, locked: false } }),
  );
  const histories: unknown[] = [];
  await page.route("**/api/chat", async (route) => {
    histories.push(route.request().postDataJSON().messages);
    await route.fulfill({
      json: {
        content: "A response supplied by the browser test.",
        live: true,
        sources: [
          {
            title: "OpenAI documentation",
            url: "https://developers.openai.com/",
          },
        ],
      },
    });
  });
  await page.goto("/");
  await expect(
    page.getByText("AI SYSTEM ONLINE", { exact: true }),
  ).toBeVisible();
  const initialFaceSize = await page
    .getByRole("img", { name: "JEFF is idle" })
    .evaluate((face) => {
      const { width, height } = face.getBoundingClientRect();
      return { width, height };
    });
  await page.getByRole("button", { name: "Text", exact: true }).click();
  const input = page.getByRole("textbox", { name: "Ask JEFF anything" });
  await input.fill("Who invented this?");
  await input.press("Enter");
  await expect(page.getByRole("log")).toContainText(
    "A response supplied by the browser test.",
  );
  const faceAfterReply = await page.locator(".jeff-face").evaluate((face) => {
    const { width, height } = face.getBoundingClientRect();
    return { width, height };
  });
  expect(faceAfterReply).toEqual(initialFaceSize);
  await expect
    .poll(() => page.evaluate(() => window.__jeffSpoken))
    .toEqual(["A response supplied by the browser test."]);
  await expect(
    page.getByRole("img", { name: "JEFF is speaking" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "developers.openai.com" }),
  ).toHaveAttribute("href", "https://developers.openai.com/");
  await input.fill("Tell me more about them");
  await input.press("Enter");
  await expect(
    page.getByText("A response supplied by the browser test."),
  ).toHaveCount(2);
  await expect
    .poll(() => page.evaluate(() => window.__jeffSpoken))
    .toEqual([
      "A response supplied by the browser test.",
      "A response supplied by the browser test.",
    ]);
  expect(histories[1]).toHaveLength(3);
  await page.getByRole("button", { name: "New session" }).click();
  await expect(page.getByRole("log")).toHaveCount(0);
});
test("typed replies are spoken while Voice mode is idle", async ({ page }) => {
  await page.addInitScript(() => {
    window.__jeffSpoken = [];
    Object.defineProperty(window.speechSynthesis, "speak", {
      configurable: true,
      value: (utterance: SpeechSynthesisUtterance) => {
        window.__jeffSpoken.push(utterance.text);
        utterance.onstart?.(new Event("start") as SpeechSynthesisEvent);
      },
    });
    Object.defineProperty(window.speechSynthesis, "cancel", {
      configurable: true,
      value: () => {},
    });
  });
  await page.route("**/api/status", (route) =>
    route.fulfill({ json: { configured: true, locked: false } }),
  );
  await page.route("**/api/chat", (route) =>
    route.fulfill({ json: { content: "I can speak this answer." } }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Voice", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Voice", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const input = page.getByRole("textbox", { name: "Ask JEFF anything" });
  await input.fill("Tell me something.");
  await input.press("Enter");
  await expect
    .poll(() => page.evaluate(() => window.__jeffSpoken))
    .toEqual(["I can speak this answer."]);
  await expect(
    page.getByRole("img", { name: "JEFF is speaking" }),
  ).toBeVisible();
});
test("typing for the first time triggers one spoken welcome", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.__jeffSpoken = [];
    Object.defineProperty(window.speechSynthesis, "speak", {
      configurable: true,
      value: (utterance: SpeechSynthesisUtterance) => {
        window.__jeffSpoken.push(utterance.text);
        utterance.onstart?.(new Event("start") as SpeechSynthesisEvent);
      },
    });
    Object.defineProperty(window.speechSynthesis, "cancel", {
      configurable: true,
      value: () => {},
    });
  });
  await page.route("**/api/status", (route) =>
    route.fulfill({ json: { configured: false, locked: false } }),
  );
  await page.goto("/");
  await page.keyboard.press("a");
  await expect
    .poll(() => page.evaluate(() => window.__jeffSpoken))
    .toEqual(["What can I assist you with today?"]);
  await page.keyboard.press("b");
  await expect(
    page.getByRole("img", { name: "JEFF is speaking" }),
  ).toBeVisible();
  expect(await page.evaluate(() => window.__jeffSpoken)).toEqual([
    "What can I assist you with today?",
  ]);
});
test("microphone permission denial is friendly", async ({ page }) => {
  await page.route("**/api/status", (route) =>
    route.fulfill({ json: { configured: true, locked: false } }),
  );
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: () =>
        Promise.reject(new DOMException("Denied", "NotAllowedError")),
    });
  });
  await page.goto("/");
  await expect(
    page.getByText("AI SYSTEM ONLINE", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Voice", exact: true }).click();
  await page.getByRole("button", { name: "Start a conversation" }).click();
  await expect(
    page.getByRole("alert", { name: "JEFF notification" }),
  ).toContainText("Microphone access was denied");
});
test("server rejects cross-origin spending requests", async ({ request }) => {
  const response = await request.post("/api/chat", {
    headers: { origin: "https://untrusted.example" },
    data: { messages: [{ role: "user", content: "hello" }] },
  });
  expect(response.status()).toBe(403);
});

test("Johannesburg weather can be requested when the local chat model is offline", async ({
  page,
}) => {
  await page.route("**/api/status", (route) =>
    route.fulfill({
      json: {
        configured: false,
        voiceConfigured: false,
        locked: false,
        model: "qwen3:8b",
      },
    }),
  );
  await page.route("**/api/chat", async (route) => {
    expect(route.request().postDataJSON().messages.at(-1).content).toBe(
      "How is the weather in Johannesburg today?",
    );
    await route.fulfill({
      json: {
        content: "Weather test fixture: Johannesburg, 21°C and partly cloudy.",
        sources: [{ title: "Live forecast", url: "https://open-meteo.com/" }],
        live: true,
      },
    });
  });
  await page.goto("/");
  await expect(
    page.getByText("NEURAL INTERFACE READY", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Ask JEFF anything" })
    .fill("How is the weather in Johannesburg today?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("log")).toContainText(
    "Weather test fixture: Johannesburg",
  );
  await expect(
    page.getByRole("link", { name: "open-meteo.com" }),
  ).toBeVisible();
});
