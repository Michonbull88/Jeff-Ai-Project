import { test, expect } from "@playwright/test";
import { loadWebLibrary, webSearchIndex } from "../lib/tutoring/library";
import { searchLessons } from "../lib/tutoring/retrieval";
import { readWebProgress, webProgressKey } from "../lib/tutoring/progress";
import { webTutorContext } from "../lib/tutoring/context";

test("local library retrieves relevant lessons, combines topics and rejects missing material", async () => {
  const { lessons, fingerprint } = await loadWebLibrary();
  expect(lessons).toHaveLength(40);
  const index = await webSearchIndex(lessons, fingerprint);
  expect(
    searchLessons(
      index,
      lessons,
      "What is the difference between margin and padding?",
    )[0].lesson.id,
  ).toBe("box-model");
  expect(
    searchLessons(
      index,
      lessons,
      "In CSS, what is the difference between margin and padding?",
    ).map((hit) => hit.lesson.id),
  ).toEqual(["box-model"]);
  const responsive = searchLessons(
    index,
    lessons,
    "How do I make a responsive navigation bar?",
  ).map((hit) => hit.lesson.id);
  expect(responsive).toContain("responsive-design");
  expect(responsive).toContain("flexbox");
  expect(searchLessons(index, lessons, "React state")[0].lesson.id).toBe(
    "react",
  );
  expect(
    searchLessons(index, lessons, "Teach me Kubernetes cluster autoscaling"),
  ).toEqual([]);
  expect(
    searchLessons(index, lessons, "Who won the rugby match yesterday?"),
  ).toEqual([]);
  expect(searchLessons(index, lessons, "constructor __proto__")).toEqual([]);
  const context = webTutorContext([lessons[5]], lessons[5], "beginner");
  expect(context).toContain("Flexbox");
  expect(context).not.toContain("=SUM(");
  expect(context).toContain("Sorry I dont understand this right now!");
  expect(
    readWebProgress(
      '{"completed":["flexbox","flexbox","cells"],"current":"unknown"}',
      lessons,
    ).completed,
  ).toEqual(["flexbox"]);
  expect(readWebProgress("invalid", lessons).current).toBe(lessons[0].id);
});

test("offline course checks, saved progress and navigation stay separate from Excel", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() =>
    localStorage.setItem(
      "jeff-excel-progress-v1",
      JSON.stringify({ current: "sum", completed: ["sum"], version: "modern" }),
    ),
  );
  await page.route("**/api/status", (route) =>
    route.fulfill({
      json: { configured: false, locked: false, voiceConfigured: false },
    }),
  );
  await page.goto("/web-development?lesson=flexbox");
  await expect(
    page.getByRole("heading", { name: "Flexbox", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Show answer and explanation" })
    .click();
  await expect(page.getByText("0 / 40 knowledge checks")).toBeVisible();
  await page.getByLabel("align-items", { exact: true }).check();
  await page.getByRole("button", { name: "Check my answer" }).click();
  await expect(page.getByRole("status")).toContainText("Try one more step");
  await page.getByLabel("justify-content", { exact: true }).check();
  await page.getByRole("button", { name: "Check my answer" }).click();
  await expect(page.getByText("1 / 40 knowledge checks")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key) || "{}").completed,
        webProgressKey,
      ),
    )
    .toEqual(["flexbox"]);
  await page.reload();
  await expect(page.getByText("1 / 40 knowledge checks")).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("jeff-excel-progress-v1")!).completed,
    ),
  ).toEqual(["sum"]);
  await page.getByRole("searchbox", { name: "Find a lesson" }).fill("margin");
  await page.getByRole("button", { name: /The CSS box model/ }).click();
  await expect(
    page.getByRole("heading", { name: "The CSS box model" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/web-tutor-${test.info().project.name}.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("playground executes browser code in isolation, saves edits and downloads HTML", async ({
  page,
}) => {
  await page.route("**/api/status", (route) =>
    route.fulfill({ json: { configured: false, locked: false } }),
  );
  await page.goto("/web-development");
  await page.getByRole("tab", { name: "Playground" }).click();
  await page.getByRole("button", { name: "Run preview" }).click();
  const preview = page.frameLocator('iframe[title="Your website preview"]');
  await preview.getByRole("button", { name: "Say hello" }).click();
  await expect(preview.getByRole("status")).toHaveText(
    "Hello! You made this work.",
  );
  const frame = (await (await page
    .locator("iframe")
    .elementHandle())!.contentFrame())!;
  expect(
    await frame.evaluate(() => {
      try {
        void parent.document.body;
        return false;
      } catch {
        return true;
      }
    }),
  ).toBe(true);
  expect(
    await frame.evaluate(async () => {
      try {
        await fetch("http://127.0.0.1:3000/api/status");
        return false;
      } catch {
        return true;
      }
    }),
  ).toBe(true);
  await page.getByRole("button", { name: "JavaScript", exact: true }).click();
  await page
    .getByRole("textbox", { name: "JavaScript code" })
    .fill(
      'document.querySelector("#message").textContent = "My saved practice";',
    );
  await page.getByRole("button", { name: "Run preview" }).click();
  await expect(preview.getByRole("status")).toHaveText("My saved practice");
  await expect
    .poll(() =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key) || "{}").code?.javascript,
        webProgressKey,
      ),
    )
    .toContain("My saved practice");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download HTML" }).click();
  expect((await download).suggestedFilename()).toBe("jeff-web-practice.html");
  await page.getByRole("button", { name: "Stop preview" }).click();
  await expect(page.locator("iframe")).toHaveCount(0);
  await page.reload();
  await page.getByRole("tab", { name: "Playground" }).click();
  await page.getByRole("button", { name: "JavaScript", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "JavaScript code" }),
  ).toHaveValue(/My saved practice/);
});

test("local questions use the selected lesson and show navigable retrieved sources", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window.speechSynthesis, "speak", { value: () => {} });
  });
  await page.route("**/api/status", (route) =>
    route.fulfill({
      json: { configured: true, locked: false, voiceConfigured: false },
    }),
  );
  let requests = 0;
  await page.route("**/api/web-tutor", async (route) => {
    const body = route.request().postDataJSON();
    expect(body.lessonId).toBe("box-model");
    expect(body.level).toBe("beginner");
    if (++requests === 1)
      return route.fulfill({
        status: 503,
        json: { error: "Test fixture: local model unavailable" },
      });
    expect(body.messages.at(-1).content).toBe("Explain margin and padding.");
    return route.fulfill({
      json: {
        content: "Test fixture: padding is inside the border.",
        sources: [
          {
            id: "box-model",
            title: "The CSS box model",
            url: "/web-development?lesson=box-model",
          },
        ],
        grounded: true,
        live: false,
      },
    });
  });
  await page.goto("/web-development?lesson=box-model");
  const question = page.getByRole("textbox", {
    name: "Ask JEFF about web development",
  });
  await question.fill("Explain margin and padding.");
  await page.getByRole("button", { name: "Ask JEFF", exact: true }).click();
  await expect(page.locator(".web-chat [role=alert]")).toContainText(
    "local model unavailable",
  );
  await expect(question).toHaveValue("Explain margin and padding.");
  await page.getByRole("button", { name: "Ask JEFF", exact: true }).click();
  await expect(page.getByText("LOCAL LESSONS USED")).toBeVisible();
  await page
    .locator(".web-sources")
    .getByRole("button", { name: /The CSS box model/ })
    .click();
  // Opening the current source lesson preserves its saved conversation.
  await expect(
    page.getByText("Test fixture: padding is inside the border."),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Test fixture: padding is inside the border."),
  ).toBeVisible();
});

test("server refuses unsupported questions without inventing content and validates mode", async ({
  request,
}) => {
  const headers = { origin: "http://127.0.0.1:3000" };
  const question = {
    lessonId: "flexbox",
    level: "beginner",
    messages: [{ role: "user", content: "Which rugby team won yesterday?" }],
  };
  const response = await request.post("/api/web-tutor", {
    headers,
    data: question,
  });
  expect(response.status()).toBe(200);
  const result = await response.json();
  expect(result.grounded).toBe(false);
  expect(result.sources).toEqual([]);
  expect(result.content).toBe("Sorry I dont understand this right now!");
  const unclear = await request.post("/api/web-tutor", {
    headers,
    data: { ...question, messages: [{ role: "user", content: "???" }] },
  });
  expect(unclear.status()).toBe(200);
  expect(await unclear.json()).toMatchObject({
    content: "Sorry I dont understand this right now!",
    sources: [],
    grounded: false,
  });
  const wrongMode = await request.post("/api/web-tutor", {
    headers,
    data: { ...question, lessonId: "sum" },
  });
  expect(wrongMode.status()).toBe(400);
  const crossOrigin = await request.post("/api/web-tutor", {
    headers: { origin: "https://untrusted.example" },
    data: question,
  });
  expect(crossOrigin.status()).toBe(403);
});
