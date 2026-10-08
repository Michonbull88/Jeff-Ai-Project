import { test, expect } from "@playwright/test";
import { checkAnswer, lessonForVersion, lessons } from "../lib/excel/course";
import { parseProgress } from "../lib/excel/progress";

test("guided formula checking preserves text, ranges and absolute references", () => {
  const get = (id: string) => lessons.find((l) => l.id === id)!;
  expect(checkAnswer(get("if"), '=if( E2 >= 400 ; "High" ; "Low" )')).toBe(
    true,
  );
  expect(checkAnswer(get("if"), '=IF(E2>400,"High","Low")')).toBe(false);
  expect(checkAnswer(get("if"), '=IF(E2>=400,"High ","Low")')).toBe(false);
  expect(checkAnswer(get("absolute"), "=E3*H1")).toBe(false);
  expect(checkAnswer(get("absolute"), "=$H$1 * E3")).toBe(true);
  expect(checkAnswer(get("sum"), "=SUM(E2:E8)")).toBe(false);
  expect(checkAnswer(get("sum"), "1670")).toBe(false);
  for (const lesson of lessons) {
    expect(checkAnswer(lesson, lesson.answer), lesson.id).toBe(true);
    const legacy = lessonForVersion(lesson, "legacy");
    expect(checkAnswer(legacy, legacy.answer)).toBe(true);
  }
  expect(lessonForVersion(get("lookup"), "legacy").answer).toContain("VLOOKUP");
});
test("saved progress tolerates corrupted and old browser data", () => {
  expect(parseProgress("invalid").completed).toEqual([]);
  expect(
    parseProgress(
      '{"current":"missing","completed":["sum","sum","unknown",4],"version":"legacy"}',
    ),
  ).toEqual({ current: "cells", completed: ["sum"], version: "legacy" });
});
test("course works without AI, checks answers, persists progress and supports older Excel", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const paidRequests: string[] = [];
  page.on("request", (req) => {
    if (/openai\.com|\/api\/(realtime|search)/.test(req.url()))
      paidRequests.push(req.url());
  });
  await page.route("**/api/status", (route) =>
    route.fulfill({
      json: {
        configured: false,
        locked: false,
        voiceConfigured: false,
        model: "qwen3:4b",
      },
    }),
  );
  await page.goto("/excel");
  await expect(
    page.getByRole("heading", { name: "Find your way around" }),
  ).toBeVisible();
  await expect(
    page.getByText("Guided lessons ready · AI offline"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Show me the solution" }).click();
  await expect(page.getByText("0 of 11 checked")).toBeVisible();
  await page.getByLabel("Your answer", { exact: true }).fill("C4");
  await page.getByRole("button", { name: "Check my answer" }).click();
  await expect(page.getByRole("status")).toContainText("try one more step");
  await page.getByLabel("Your answer", { exact: true }).fill("D4");
  await page.getByRole("button", { name: "Check my answer" }).click();
  await expect(page.getByText("1 of 11 checked")).toBeVisible();
  await page.reload();
  await expect(page.getByText("1 of 11 checked")).toBeVisible();
  await page.getByRole("button", { name: /Look up a product/ }).click();
  await page.getByLabel("Excel version").selectOption("legacy");
  await expect(
    page.getByRole("heading", { name: /Using VLOOKUP/ }),
  ).toBeVisible();
  await page
    .getByLabel("Your answer", { exact: true })
    .fill('=VLOOKUP("Marker";A2:D6;4;FALSE)');
  await page.getByRole("button", { name: "Check my answer" }).click();
  await expect(page.getByText("2 of 11 checked")).toBeVisible();
  await page.getByLabel("Excel version").selectOption("modern");
  await expect(page.getByText("1 of 11 checked")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Practice data" }).click();
  expect((await download).suggestedFilename()).toBe("jeff-excel-sales.csv");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/excel-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Reset progress" }).click();
  await page
    .getByRole("button", { name: "Clear progress", exact: true })
    .click();
  await expect(page.getByText("0 of 11 checked")).toBeVisible();
  expect(paidRequests).toEqual([]);
  expect(errors).toEqual([]);
});
test("local questions include lesson context, retain drafts on failure and clear on navigation", async ({
  page,
}) => {
  await page.route("**/api/status", (route) =>
    route.fulfill({
      json: { configured: true, locked: false, voiceConfigured: false },
    }),
  );
  let calls = 0;
  await page.route("**/api/tutor", async (route) => {
    const body = route.request().postDataJSON();
    expect(body.lessonId).toBe("sum");
    expect(body.version).toBe("modern");
    if (++calls === 1)
      return route.fulfill({
        status: 503,
        json: { error: "Test fixture: Ollama is unavailable." },
      });
    expect(body.messages).toHaveLength(1);
    return route.fulfill({
      json: {
        content: "Test fixture: a colon includes every cell in the range.",
      },
    });
  });
  await page.goto("/excel");
  await page.getByRole("button", { name: /Add it up with SUM/ }).click();
  const input = page.getByRole("textbox", {
    name: "Ask JEFF about this lesson",
  });
  await input.fill("What does the colon do?");
  await page.getByRole("button", { name: "Ask JEFF", exact: true }).click();
  await expect(page.locator(".excel-chat [role=alert]")).toContainText(
    "Ollama is unavailable",
  );
  await expect(input).toHaveValue("What does the colon do?");
  await page.getByRole("button", { name: "Ask JEFF", exact: true }).click();
  await expect(
    page.getByText("Test fixture: a colon includes every cell in the range."),
  ).toBeVisible();
  await expect(input).toHaveValue("");
  await page.getByRole("button", { name: /Find an average/ }).click();
  await expect(
    page.getByText("Test fixture: a colon includes every cell in the range."),
  ).toHaveCount(0);
});
test("server validates tutor requests and blocks paid features", async ({
  request,
}) => {
  const headers = { origin: "http://127.0.0.1:3000" };
  const status = await (await request.get("/api/status")).json();
  expect(status.voiceConfigured).toBe(false);
  for (const endpoint of ["search", "realtime"]) {
    const result = await request.post(`/api/${endpoint}`, {
      headers,
      data: {},
    });
    expect(result.status()).toBe(status.locked ? 401 : 503);
    if (!status.locked)
      expect((await result.json()).error).toContain(
        "Paid OpenAI features are disabled",
      );
  }
  const malformed = await request.post("/api/tutor", {
    headers,
    data: {
      lessonId: "missing",
      version: "modern",
      messages: [{ role: "user", content: "hello" }],
    },
  });
  expect(malformed.status()).toBe(status.locked ? 401 : 400);
  const crossOrigin = await request.post("/api/tutor", {
    headers: { origin: "https://untrusted.example" },
    data: {},
  });
  expect(crossOrigin.status()).toBe(403);
});

test("narration uses a local voice, animates JEFF and stops on navigation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.__jeffSpoken = [];
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      value: class {
        constructor(public text: string) {}
        voice = null;
      },
    });
    const local = {
      name: "Daniel (English (United Kingdom))",
      lang: "en-GB",
      localService: true,
      default: false,
    };
    const remote = {
      name: "Daniel",
      lang: "en-US",
      localService: false,
    };
    Object.defineProperty(window.speechSynthesis, "getVoices", {
      value: () => [
        remote,
        {
          name: "Tessa",
          lang: "en-ZA",
          localService: true,
          default: true,
        },
        local,
      ],
    });
    Object.defineProperty(window.speechSynthesis, "speak", {
      value: (item: SpeechSynthesisUtterance) => {
        if (item.voice?.name !== local.name)
          throw new Error("The preferred local male voice was not selected");
        if (item.rate !== 1 || item.pitch !== 1 || item.volume !== 1)
          throw new Error("Tutor voice settings differ from the assistant");
        window.__jeffSpoken.push(item.text);
        item.onstart?.(new Event("start") as SpeechSynthesisEvent);
      },
    });
    Object.defineProperty(window.speechSynthesis, "cancel", {
      value: () => {},
    });
  });
  await page.route("**/api/status", (route) =>
    route.fulfill({ json: { configured: true, locked: false } }),
  );
  await page.route("**/api/tutor", (route) =>
    route.fulfill({
      json: {
        content: "Test reply: currency formatting keeps the value numeric.",
      },
    }),
  );
  await page.goto("/excel");
  await page.getByRole("button", { name: "Read lesson", exact: true }).click();
  await expect(
    page.getByRole("img", { name: "JEFF is speaking" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Stop reading" }).click();
  await expect(page.getByRole("img", { name: "JEFF is idle" })).toBeVisible();
  await page.getByRole("button", { name: "Read lesson", exact: true }).click();
  await page.getByRole("button", { name: /Make numbers readable/ }).click();
  await expect(page.getByRole("img", { name: "JEFF is idle" })).toBeVisible();
  const question = page.getByRole("textbox", {
    name: "Ask JEFF about this lesson",
  });
  await question.fill("How does currency formatting work?");
  await page.getByRole("button", { name: "Ask JEFF", exact: true }).click();
  await expect(
    page.getByRole("img", { name: "JEFF is speaking" }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.__jeffSpoken.at(-1)))
    .toBe("Test reply: currency formatting keeps the value numeric.");
  await page
    .getByRole("button", { name: "Stop speaking", exact: true })
    .click();
  await expect(page.getByRole("img", { name: "JEFF is idle" })).toBeVisible();
  await page.getByLabel("Speak answers aloud").uncheck();
  const spokenCount = await page.evaluate(() => window.__jeffSpoken.length);
  await question.fill("And what about percentages?");
  await page.getByRole("button", { name: "Ask JEFF", exact: true }).click();
  await expect(question).toHaveValue("");
  expect(await page.evaluate(() => window.__jeffSpoken.length)).toBe(
    spokenCount,
  );
  await page.reload();
  await expect(page.getByLabel("Speak answers aloud")).not.toBeChecked();
});

test("cancelling a pending question releases the composer and ignores a late response", async ({
  page,
}) => {
  await page.route("**/api/status", (route) =>
    route.fulfill({ json: { configured: true, locked: false } }),
  );
  let release: (() => void) | undefined;
  let arrived: (() => void) | undefined;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const requested = new Promise<void>((resolve) => {
    arrived = resolve;
  });
  await page.route("**/api/tutor", async (route) => {
    arrived?.();
    await pending;
    await route
      .fulfill({ json: { content: "Stale test reply" } })
      .catch(() => {});
  });
  await page.goto("/excel");
  const input = page.getByRole("textbox", {
    name: "Ask JEFF about this lesson",
  });
  await input.fill("Please help with this cell.");
  await page.getByRole("button", { name: "Ask JEFF", exact: true }).click();
  await requested;
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  release?.();
  await expect(input).toBeEnabled();
  await expect(input).toHaveValue("Please help with this cell.");
  await expect(page.getByText("Stale test reply")).toHaveCount(0);
  await page.getByRole("button", { name: /Make numbers readable/ }).click();
  await expect(input).toHaveValue("");
});
