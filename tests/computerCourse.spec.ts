import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { computerLessons } from "../lib/computer/course";
import {
  computerProgressKey,
  readComputerProgress,
} from "../lib/computer/progress";

test("saved computer data rejects unknown lessons, duplicates and malformed notes", () => {
  expect(computerLessons).toHaveLength(24);
  expect(new Set(computerLessons.map((lesson) => lesson.id)).size).toBe(24);
  expect(readComputerProgress("broken").current).toBe("meet-your-computer");
  const saved = readComputerProgress(
    JSON.stringify({
      current: "missing",
      version: "XP",
      spoken: false,
      completed: ["keyboard", "keyboard", 42, "sum"],
      notes: {
        keyboard: "My keyboard notes",
        wifi: 3,
        backups: "x".repeat(20001),
        missing: "Ignore",
      },
    }),
  );
  expect(saved).toEqual({
    current: "meet-your-computer",
    version: "11",
    spoken: false,
    completed: ["keyboard"],
    notes: { keyboard: "My keyboard notes" },
  });
  for (const lesson of computerLessons) {
    expect(lesson.quiz.options[lesson.quiz.correct]).toBeTruthy();
    expect(new URL(lesson.reference.url).hostname).toBe(
      "support.microsoft.com",
    );
  }
});

test("offline course records correct checks and notes without changing other courses", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("jeff-chatgpt-basics-v1", '{"completed":["emails"]}'),
  );
  await page.route("**/api/status", (r) =>
    r.fulfill({ json: { configured: false, locked: false } }),
  );
  await page.goto("/computer-basics");
  await expect(
    page.getByRole("heading", { name: "PC & Windows basics.", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Ask JEFF", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("radio", { name: "The physical screen", exact: true })
    .check();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(
    page.getByText("Not quite. Try again.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("0 / 24 checks complete", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("radio", {
      name: "Software that helps you use the computer",
      exact: true,
    })
    .check();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Your lesson notes", exact: true })
    .fill("My laptop runs Windows 11.");
  await page.reload();
  await expect(
    page.getByText("1 / 24 checks complete", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Your lesson notes", exact: true }),
  ).toHaveValue("My laptop runs Windows 11.");
  await page.getByRole("button", { name: "Reset course progress" }).click();
  await page.getByRole("button", { name: "Clear completed checks" }).click();
  await expect(
    page.getByText("0 / 24 checks complete", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Your lesson notes", exact: true }),
  ).toHaveValue("My laptop runs Windows 11.");
  expect(
    await page.evaluate(() => localStorage.getItem("jeff-chatgpt-basics-v1")),
  ).toBe('{"completed":["emails"]}');
});

test("Windows selection changes steps, persists and exports the matching notes", async ({
  page,
}) => {
  await page.goto("/computer-basics?lesson=accessibility");
  const steps = page.locator(".computer-steps");
  await expect(steps).toContainText("Settings > Accessibility > Text size");
  await page
    .getByRole("combobox", { name: "Windows version" })
    .selectOption("10");
  await expect(steps).toContainText("Settings > Ease of Access > Display");
  await expect(page.locator(".computer-support")).toContainText(
    "14 October 2025",
  );
  await page
    .getByRole("textbox", { name: "Your lesson notes", exact: true })
    .fill("Larger text helps me read.");
  const downloadEvent = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download lesson notes (.txt)" })
    .click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe(
    "jeff-computer-accessibility-windows-10.txt",
  );
  const text = await readFile((await download.path())!, "utf8");
  expect(text).toContain("Windows 10");
  expect(text).toContain("Ease of Access > Display");
  expect(text).toContain("Larger text helps me read.");
  expect(text).toContain("https://support.microsoft.com/");
  await page.getByRole("button", { name: "Next lesson", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Your lesson notes", exact: true }),
  ).toBeEmpty();
  await page
    .getByRole("button", { name: "Previous lesson", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Windows version" }),
  ).toHaveValue("10");
  await expect(
    page.getByRole("textbox", { name: "Your lesson notes", exact: true }),
  ).toHaveValue("Larger text helps me read.");
});

test("pointer and typing pads give feedback without completing a knowledge check", async ({
  page,
  isMobile,
}) => {
  await page.goto("/computer-basics?lesson=mouse-touchpad");
  const pad = page.getByRole("region", { name: "Browser practice pad" });
  const folder = pad.getByRole("button", {
    name: "Practice folder",
    exact: true,
  });
  await folder.click();
  await expect(folder).toHaveAttribute("aria-pressed", "true");
  if (isMobile) {
    await pad
      .getByRole("button", { name: "Open practice folder", exact: true })
      .click();
    await pad
      .getByRole("button", { name: "Show practice menu", exact: true })
      .click();
  } else {
    await folder.dblclick();
    await folder.click({ button: "right" });
  }
  await expect(pad.getByRole("status")).toHaveText(
    "✓ Selected · ✓ Opened · ✓ Menu explored",
  );
  await pad.getByRole("button", { name: "Close practice menu" }).click();
  await expect(
    page.getByText("0 / 24 checks complete", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next lesson", exact: true }).click();
  const typing = page.getByRole("textbox", {
    name: "Type the practice sentence",
  });
  await typing.fill("i can use my computer");
  await expect(pad.getByRole("status")).toContainText("Check capitals");
  await typing.fill("I can use my computer.");
  await expect(pad.getByRole("status")).toHaveText(
    "Well done — the sentence matches.",
  );
});

test("failed questions retry without duplication and conversations are scoped by Windows version", async ({
  page,
}) => {
  await page.route("**/api/status", (r) =>
    r.fulfill({ json: { configured: true, locked: false } }),
  );
  const requests: {
    lessonId: string;
    version: string;
    messages: { role: string; content: string }[];
  }[] = [];
  await page.route("**/api/computer-tutor", (r) => {
    requests.push(r.request().postDataJSON());
    return r.fulfill(
      requests.length === 1
        ? { status: 503, json: { error: "Local model unavailable." } }
        : {
            json: {
              content: "Click in your notes, then press Ctrl + V.",
              cached: true,
            },
          },
    );
  });
  await page.goto("/computer-basics?lesson=keyboard");
  await page.getByRole("checkbox", { name: "Speak answers aloud" }).uncheck();
  const question = page.getByRole("textbox", {
    name: "Ask JEFF about PC and Windows",
  });
  await question.fill("How do I paste?");
  await page.getByRole("button", { name: "Ask JEFF", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Local model unavailable." }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole("log")).toContainText("How do I paste?");
  await question.fill("How do I paste?");
  await page.getByRole("button", { name: "Ask JEFF", exact: true }).click();
  await expect(page.getByRole("log")).toContainText(
    "Click in your notes, then press Ctrl + V.",
  );
  expect(requests[1]).toEqual({
    lessonId: "keyboard",
    version: "11",
    messages: [{ role: "user", content: "How do I paste?" }],
  });
  await page
    .getByRole("combobox", { name: "Windows version" })
    .selectOption("10");
  await expect(page.getByRole("log")).toBeEmpty();
  await question.fill("Is paste the same here?");
  await page.getByRole("button", { name: "Ask JEFF", exact: true }).click();
  await expect(page.getByRole("log")).toContainText("Click in your notes");
  expect(requests[2].version).toBe("10");
  expect(requests[2].messages).toHaveLength(1);
  await page
    .getByRole("combobox", { name: "Windows version" })
    .selectOption("11");
  await expect(page.getByRole("log")).toContainText("How do I paste?");
  await expect(page.getByRole("log")).not.toContainText(
    "Is paste the same here?",
  );
  await page.getByRole("button", { name: "Next lesson", exact: true }).click();
  await expect(page.getByRole("log")).toBeEmpty();
});

test("changing Windows version cancels pending answers and does not insert stale replies", async ({
  page,
}) => {
  await page.route("**/api/status", (r) =>
    r.fulfill({ json: { configured: true, locked: false } }),
  );
  let release: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requested = false;
  await page.route("**/api/computer-tutor", async (r) => {
    requested = true;
    await pending;
    await r
      .fulfill({ json: { content: "Old Windows 11 answer." } })
      .catch(() => {});
  });
  await page.goto("/computer-basics?lesson=wifi");
  const question = page.getByRole("textbox", {
    name: "Ask JEFF about PC and Windows",
  });
  await question.fill("How do I connect?");
  await page.getByRole("button", { name: "Ask JEFF", exact: true }).click();
  await expect.poll(() => requested).toBe(true);
  await page
    .getByRole("combobox", { name: "Windows version" })
    .selectOption("10");
  release();
  await expect(question).toBeEnabled();
  await expect(page.getByRole("log")).toBeEmpty();
  await expect(page.getByRole("button", { name: "Cancel answer" })).toHaveCount(
    0,
  );
});

test("every workspace links to the new course and lesson search supports navigation", async ({
  page,
}) => {
  await page.addInitScript(() => sessionStorage.setItem("jeff-ready", "1"));
  for (const path of ["/", "/excel", "/web-development", "/chatgpt-basics"]) {
    await page.goto(path);
    await page.getByRole("link", { name: /^PC & Windows/ }).click();
    await expect(page).toHaveURL(/\/computer-basics/);
    await expect(
      page.getByRole("heading", { name: "PC & Windows basics.", exact: true }),
    ).toBeVisible();
  }
  await page
    .getByRole("textbox", { name: "Find a computer lesson" })
    .fill("nothing-matches");
  await expect(page.getByText(/No matching lessons/)).toBeVisible();
  await page
    .getByRole("textbox", { name: "Find a computer lesson" })
    .fill("screenshot");
  await page
    .getByRole("button", { name: /Take and save a screenshot/ })
    .click();
  await expect(page).toHaveURL(/lesson=screenshots/);
  await page.getByRole("button", { name: "Show hint" }).click();
  await expect(page.locator(".web-hint")).toContainText(
    "A small selection is often clearer",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/computer-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.goto("/computer-basics?lesson=does-not-exist");
  await expect(
    page.getByRole("heading", {
      name: "Take and save a screenshot",
      exact: true,
    }),
  ).toBeVisible();
});

test("storage failure keeps notes usable and offers a download", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Full", "QuotaExceededError");
    };
  });
  await page.goto("/computer-basics");
  const notes = page.getByRole("textbox", {
    name: "Your lesson notes",
    exact: true,
  });
  await notes.fill("Keep this note.");
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Your changes could not be saved" }),
  ).toBeVisible();
  await expect(notes).toHaveValue("Keep this note.");
  const downloadEvent = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download lesson notes (.txt)" })
    .click();
  const download = await downloadEvent;
  expect(await readFile((await download.path())!, "utf8")).toContain(
    "Keep this note.",
  );
});

test("computer API rejects invalid lessons, versions and cross-origin requests", async ({
  request,
}) => {
  const data = {
    lessonId: "keyboard",
    version: "11",
    messages: [{ role: "user", content: "How do I paste?" }],
  };
  expect(
    (
      await request.post("/api/computer-tutor", {
        headers: { origin: "https://untrusted.example" },
        data,
      })
    ).status(),
  ).toBe(403);
  for (const invalid of [
    { ...data, lessonId: "missing" },
    { ...data, version: "XP" },
    { ...data, messages: [] },
    { ...data, messages: [{ role: "assistant", content: "An answer" }] },
    { ...data, messages: [{ role: "user", content: "x".repeat(3001) }] },
  ])
    expect(
      (
        await request.post("/api/computer-tutor", {
          headers: { origin: "http://127.0.0.1:3000" },
          data: invalid,
        })
      ).status(),
    ).toBe(400);
  expect(computerProgressKey).not.toBe("jeff-chatgpt-basics-v1");
});
