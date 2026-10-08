import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { issueUserSession, sessionCookie } from "../lib/authToken";

test("course documents can be uploaded, downloaded and removed", async ({
  page,
}) => {
  await page.context().addCookies([{ name: sessionCookie, value: issueUserSession("test-admin", "admin"), url: "http://127.0.0.1:3000" }]);
  await page.goto("/chatgpt-basics");
  const filename = "course-upload-test.txt";
  const contents = "A supporting document for the ChatGPT course.";
  await page.locator('input[type="file"]').setInputFiles({
    name: filename,
    mimeType: "text/plain",
    buffer: Buffer.from(contents),
  });
  await expect(page.getByText(`${filename} is ready to download.`)).toBeVisible();
  const row = page.getByRole("listitem").filter({ hasText: filename });
  await expect(row).toBeVisible();
  const downloading = page.waitForEvent("download");
  await row.getByRole("link", { name: "Download" }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe(filename);
  expect(await readFile((await download.path())!, "utf8")).toBe(contents);
  page.once("dialog", (dialog) => dialog.accept());
  await row.getByRole("button", { name: `Remove ${filename}` }).click();
  await expect(row).toHaveCount(0);
});
import { chatgptLessons } from "../lib/chatgpt/course";
import {
  chatgptProgressKey,
  readChatGPTProgress,
} from "../lib/chatgpt/progress";

test("course has complete exercises and validates saved data without importing other course state", () => {
  expect(chatgptLessons).toHaveLength(8);
  expect(new Set(chatgptLessons.map((lesson) => lesson.id)).size).toBe(8);
  for (const lesson of chatgptLessons) {
    expect(lesson.steps.length).toBeGreaterThanOrEqual(3);
    expect(lesson.prompt.length).toBeGreaterThan(80);
    expect(lesson.review.length).toBeGreaterThanOrEqual(3);
    expect(lesson.quiz.options[lesson.quiz.correct]).toBeTruthy();
    expect(["help.openai.com", "support.microsoft.com", "www.canva.com"]).toContain(
      new URL(lesson.reference.url).hostname,
    );
  }
  expect(readChatGPTProgress("broken").current).toBe("getting-started");
  const progress = readChatGPTProgress(
    JSON.stringify({
      current: "not-a-lesson",
      completed: ["emails", "emails", "sum", 42],
      spoken: false,
      drafts: {
        emails: { prompt: "My saved prompt", notes: 5 },
        "canva-design": { prompt: "x".repeat(12001), notes: "Keep my notes" },
        unknown: { prompt: "ignore" },
      },
    }),
  );
  expect(progress.completed).toEqual(["emails"]);
  expect(progress.current).toBe("getting-started");
  expect(progress.spoken).toBe(false);
  expect(progress.drafts.emails).toEqual({
    prompt: "My saved prompt",
    notes: "",
  });
  expect(progress.drafts["canva-design"].prompt).toBe(
    chatgptLessons.find((lesson) => lesson.id === "canva-design")!.prompt,
  );
  expect(progress.drafts["canva-design"].notes).toBe("Keep my notes");
  expect(progress.drafts.unknown).toBeUndefined();
});

test("offline learning checks answers, saves progress and keeps the other courses intact", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "jeff-web-development-v1",
      '{"current":"grid","completed":["grid"]}',
    ),
  );
  await page.route("**/api/status", (route) =>
    route.fulfill({ json: { configured: false, locked: false } }),
  );
  await page.goto("/chatgpt-basics");
  await expect(
    page.getByRole("heading", { name: "AI made simple.", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Ask JEFF", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("radio", { name: "A confident answer is always correct" })
    .check();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(
    page.getByText("Not quite. Try again.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("0 / 8 checks complete", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("radio", { name: /AI can create useful drafts/ })
    .check();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(
    page.getByText("1 / 8 checks complete", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Your practice prompt", exact: true })
    .fill("My own announcement prompt.");
  await page.reload();
  await expect(
    page.getByText("1 / 8 checks complete", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Your practice prompt", exact: true }),
  ).toHaveValue("My own announcement prompt.");
  await page.getByRole("button", { name: "Reset course progress" }).click();
  await page.getByRole("button", { name: "Clear completed checks" }).click();
  await expect(
    page.getByText("0 / 8 checks complete", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Your practice prompt", exact: true }),
  ).toHaveValue("My own announcement prompt.");
  expect(
    await page.evaluate(() => localStorage.getItem("jeff-web-development-v1")),
  ).toBe('{"current":"grid","completed":["grid"]}');
});

test("practice drafts are scoped to lessons, copy accurately and download with notes", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          (window as Window & { copiedPrompt?: string }).copiedPrompt = value;
        },
      },
    });
  });
  await page.goto("/chatgpt-basics?lesson=canva-design");
  const prompt = page.getByRole("textbox", {
    name: "Your practice prompt",
    exact: true,
  });
  await expect(
    page.getByRole("heading", {
      name: "Canva for everyday design",
      exact: true,
    }),
  ).toBeVisible();
  await prompt.fill("Create a square watercolour of a blue notebook.");
  await page
    .getByRole("textbox", { name: "Your practice notes or finished text" })
    .fill("I saved the picture as notebook.png.");
  await page.getByRole("button", { name: "Copy prompt", exact: true }).click();
  expect(
    await page.evaluate(
      () => (window as Window & { copiedPrompt?: string }).copiedPrompt,
    ),
  ).toBe("Create a square watercolour of a blue notebook.");
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download practice (.txt)" }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe("jeff-chatgpt-canva-design.txt");
  const contents = await readFile((await download.path())!, "utf8");
  expect(contents).toContain("Create a square watercolour of a blue notebook.");
  expect(contents).toContain("I saved the picture as notebook.png.");
  expect(contents).toContain("https://www.canva.com/help/ai-tools-pages/");
  await page.getByRole("button", { name: "Next lesson", exact: true }).click();
  await expect(prompt).toHaveValue(
    chatgptLessons.find((lesson) => lesson.id === "combined-workflow")!.prompt,
  );
  await prompt.fill("Change only the background.");
  await page
    .getByRole("button", { name: "Previous lesson", exact: true })
    .click();
  await expect(prompt).toHaveValue(
    "Create a square watercolour of a blue notebook.",
  );
  await page.reload();
  await expect(prompt).toHaveValue(
    "Create a square watercolour of a blue notebook.",
  );
  await expect(
    page.getByRole("link", { name: "Open ChatGPT", exact: true }),
  ).toHaveAttribute("href", "https://chatgpt.com/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("lesson questions retry once after reload and restore the right conversation", async ({
  page,
}) => {
  await page.route("**/api/status", (route) =>
    route.fulfill({ json: { configured: true, locked: false } }),
  );
  const requests: {
    lessonId: string;
    messages: { role: string; content: string }[];
  }[] = [];
  await page.route("**/api/chatgpt-tutor", async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill(
      requests.length === 1
        ? { status: 503, json: { error: "Local model unavailable." } }
        : {
            json: {
              content: "State the reader and the result you need.",
              cached: true,
            },
          },
    );
  });
  await page.goto("/chatgpt-basics?lesson=clear-prompts");
  await page.getByRole("checkbox", { name: "Speak answers aloud" }).uncheck();
  const question = page.getByRole("textbox", {
    name: "Ask JEFF about AI Made Simple",
  });
  await question.fill("How do I improve my prompt?");
  await page.getByRole("button", { name: "Ask JEFF", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Local model unavailable." }),
  ).toBeVisible();
  await expect(question).toHaveValue("How do I improve my prompt?");
  await page.reload();
  await expect(page.getByRole("log")).toContainText(
    "How do I improve my prompt?",
  );
  await question.fill("How do I improve my prompt?");
  await page.getByRole("button", { name: "Ask JEFF", exact: true }).click();
  await expect(page.getByRole("log")).toContainText(
    "State the reader and the result you need.",
  );
  expect(requests[1].lessonId).toBe("clear-prompts");
  expect(requests[1].messages).toEqual([
    { role: "user", content: "How do I improve my prompt?" },
  ]);
  await expect(page.getByRole("log")).toContainText("Reused saved answer");
  await page.getByRole("button", { name: "Next lesson", exact: true }).click();
  await expect(page.getByRole("log")).toBeEmpty();
  await page
    .getByRole("button", { name: "Previous lesson", exact: true })
    .click();
  await expect(page.getByRole("log")).toContainText(
    "State the reader and the result you need.",
  );
});

test("switching lessons cancels pending replies and leaves the new composer usable", async ({
  page,
}) => {
  await page.route("**/api/status", (route) =>
    route.fulfill({ json: { configured: true, locked: false } }),
  );
  let release: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requested = false;
  await page.route("**/api/chatgpt-tutor", async (route) => {
    requested = true;
    await pending;
    await route
      .fulfill({
        json: { content: "This answer belongs to the previous lesson." },
      })
      .catch(() => {});
  });
  await page.goto("/chatgpt-basics");
  const question = page.getByRole("textbox", {
    name: "Ask JEFF about AI Made Simple",
  });
  await question.fill("Give me a hint.");
  await page.getByRole("button", { name: "Ask JEFF", exact: true }).click();
  await expect.poll(() => requested).toBe(true);
  await page.getByRole("button", { name: "Next lesson", exact: true }).click();
  release();
  await expect(
    page.getByRole("heading", {
      name: "ChatGPT for everyday life",
      exact: true,
    }),
  ).toBeVisible();
  await expect(question).toBeEnabled();
  await expect(page.getByRole("log")).toBeEmpty();
  await expect(page.getByRole("button", { name: "Cancel answer" })).toHaveCount(
    0,
  );
});

test("course is linked from every workspace and searches lessons", async ({
  page,
}) => {
  await page.addInitScript(() => sessionStorage.setItem("jeff-ready", "1"));
  for (const path of ["/", "/excel", "/web-development"]) {
    await page.goto(path);
    const link = page.getByRole("link", { name: /^AI Made Simple/ });
    await link.click();
    await expect(page).toHaveURL(/\/chatgpt-basics/);
    await expect(
      page.getByRole("heading", { name: "AI made simple.", exact: true }),
    ).toBeVisible();
  }
  await page
    .getByRole("textbox", { name: "Find an AI Made Simple lesson" })
    .fill("Canva");
  await page
    .getByRole("button", { name: /Canva for everyday design/ })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Canva for everyday design",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Show hint" }).click();
  await expect(
    page.getByText(
      "If everything is large and bold, nothing stands out. Choose one clear headline.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/chatgpt-${test.info().project.name}.png`,
    fullPage: true,
  });
});

test("server rejects invalid and cross-origin course questions before model inference", async ({
  request,
}) => {
  const data = {
    lessonId: "clear-prompts",
    messages: [{ role: "user", content: "What should a prompt include?" }],
  };
  const foreign = await request.post("/api/chatgpt-tutor", {
    headers: { origin: "https://untrusted.example" },
    data,
  });
  expect(foreign.status()).toBe(403);
  for (const invalid of [
    { ...data, lessonId: "missing-lesson" },
    { ...data, messages: [] },
    { ...data, messages: [{ role: "assistant", content: "Answer." }] },
    { ...data, messages: [{ role: "user", content: "x".repeat(3001) }] },
  ]) {
    const response = await request.post("/api/chatgpt-tutor", {
      headers: { origin: "http://127.0.0.1:3000" },
      data: invalid,
    });
    expect(response.status()).toBe(400);
  }
  expect(chatgptProgressKey).not.toBe("jeff-web-development-v1");
});
