import { test, expect } from "@playwright/test";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { answerWithMemory } from "../lib/local/answerMemory";

const input = {
  model: "test-model",
  system: "Excel modern: supplied lesson material",
  messages: [{ role: "user" as const, content: "What does SUM do?" }],
};

test("saved answers persist, repeat safely, and invalidate when supplied information changes", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "jeff-memory-"));
  let calls = 0;
  const generate = async () => {
    calls++;
    return { content: "SUM adds numbers." };
  };
  try {
    expect(
      (await answerWithMemory(input, generate, { directory })).cached,
    ).toBe(false);
    expect(
      (await answerWithMemory(input, generate, { directory })).cached,
    ).toBe(true);
    expect(calls).toBe(1);
    const repeat = {
      ...input,
      messages: [
        ...input.messages,
        { role: "assistant" as const, content: "SUM adds numbers." },
        ...input.messages,
      ],
    };
    expect(
      (await answerWithMemory(repeat, generate, { directory })).cached,
    ).toBe(true);
    expect(calls).toBe(1);
    for (const changed of [
      { ...input, system: "Different supplied course or Excel version" },
      { ...input, model: "new-model" },
      {
        ...input,
        messages: [
          { role: "user" as const, content: "Use only rows 2 to 5." },
          ...input.messages,
        ],
      },
      {
        ...repeat,
        messages: [
          ...input.messages,
          { role: "assistant" as const, content: "A different answer" },
          ...input.messages,
        ],
      },
    ])
      expect(
        (await answerWithMemory(changed, generate, { directory })).cached,
      ).toBe(false);
    expect(calls).toBe(5);
    const events = (
      await readFile(path.join(directory, "questions.jsonl"), "utf8")
    )
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(events.filter((event) => event.type === "question")).toHaveLength(7);
    expect(events.filter((event) => event.type === "answer")).toHaveLength(7);
    for (const file of await readdir(directory)) {
      if (file.endsWith(".json"))
        await writeFile(path.join(directory, file), "invalid");
    }
    expect(
      (await answerWithMemory(input, generate, { directory })).cached,
    ).toBe(false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("failed answers are recorded but not reused; storage failures do not lose a fresh answer", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "jeff-memory-"));
  try {
    await expect(
      answerWithMemory(
        input,
        async () => {
          throw new Error("offline");
        },
        { directory },
      ),
    ).rejects.toThrow("offline");
    const result = await answerWithMemory(
      input,
      async () => ({ content: "Recovered" }),
      { directory },
    );
    expect(result.cached).toBe(false);
    const blocker = path.join(directory, "file");
    await writeFile(blocker, "not a directory");
    expect(
      await answerWithMemory(
        input,
        async () => ({ content: "Still answered" }),
        { directory: blocker },
      ),
    ).toEqual({ content: "Still answered", cached: false, memorySaved: false });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

for (const route of ["/excel", "/web-development"]) {
  test(`tutor questions survive reload and remain scoped to the lesson on ${route}`, async ({
    page,
  }) => {
    await page.route("**/api/status", (r) =>
      r.fulfill({ json: { configured: true, locked: false } }),
    );
    const requests: { messages: { content: string }[] }[] = [];
    await page.route(
      route === "/excel" ? "**/api/tutor" : "**/api/web-tutor",
      (r) => {
        requests.push(r.request().postDataJSON());
        return r.fulfill({
          json: {
            content: "Saved test explanation",
            sources: [],
            cached: requests.length > 1,
          },
        });
      },
    );
    await page.goto(route);
    await page.getByLabel("Speak answers aloud").uncheck();
    const question = page.getByRole("textbox", {
      name:
        route === "/excel"
          ? "Ask JEFF about this lesson"
          : "Ask JEFF about web development",
    });
    await question.fill("Remember my lesson question");
    await page.getByRole("button", { name: "Ask JEFF", exact: true }).click();
    await expect(
      page.getByText("Saved test explanation", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByText("Remember my lesson question", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Saved test explanation", { exact: true }),
    ).toBeVisible();
    await question.fill("Remember my lesson question");
    await page.getByRole("button", { name: "Ask JEFF", exact: true }).click();
    await expect(
      page.getByText("Reused saved answer", { exact: true }),
    ).toBeVisible();
    expect(requests[1].messages.map((message) => message.content)).toEqual([
      "Remember my lesson question",
      "Saved test explanation",
      "Remember my lesson question",
    ]);
    if (route === "/excel") {
      await page.getByRole("button", { name: /Make numbers readable/ }).click();
      await expect(
        page.getByText("Saved test explanation", { exact: true }),
      ).toHaveCount(0);
    } else {
      await page.getByLabel("Tutoring level").selectOption("advanced");
      await expect(
        page.getByText("Saved test explanation", { exact: true }),
      ).toHaveCount(0);
      await page.getByLabel("Tutoring level").selectOption("beginner");
      await expect(
        page.getByText("Saved test explanation", { exact: true }),
      ).toHaveCount(2);
    }
  });
}

test("third and later repeats reuse the answer without generating again", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "jeff-repeat-"));
  let calls = 0;
  const generate = async () => {
    calls++;
    return { content: "The saved answer." };
  };
  let messages: { role: "user" | "assistant"; content: string }[] = [];
  try {
    for (let repeat = 0; repeat < 5; repeat++) {
      messages = [...messages, ...input.messages];
      const result = await answerWithMemory({ ...input, messages }, generate, {
        directory,
      });
      expect(result.cached).toBe(repeat > 0);
      messages.push({ role: "assistant", content: result.content });
    }
    expect(calls).toBe(1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("main chat shows saved-answer provenance", async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("jeff-ready", "1");
    Object.defineProperty(speechSynthesis, "speak", { value: () => {} });
  });
  await page.route("**/api/status", (r) =>
    r.fulfill({
      json: { configured: true, locked: false, voiceConfigured: false },
    }),
  );
  await page.route("**/api/chat", (r) =>
    r.fulfill({
      json: {
        content: "A previously saved answer.",
        cached: true,
        memorySaved: true,
      },
    }),
  );
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Ask JEFF anything" })
    .fill("What is HTML?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("log")).toContainText("Saved answer");
  await expect(page.getByRole("log")).toContainText(
    "A previously saved answer.",
  );
  await expect(
    page.getByText("Connecting the dots", { exact: true }),
  ).toHaveCount(0);
});

for (const route of ["/excel", "/web-development"]) {
  test(`retrying a saved unanswered question sends it once on ${route}`, async ({
    page,
  }) => {
    await page.route("**/api/status", (r) =>
      r.fulfill({ json: { configured: true, locked: false } }),
    );
    const requests: { messages: { role: string; content: string }[] }[] = [];
    await page.route(
      route === "/excel" ? "**/api/tutor" : "**/api/web-tutor",
      (r) => {
        requests.push(r.request().postDataJSON());
        return requests.length === 1
          ? r.fulfill({
              status: 503,
              json: { error: "Temporary tutor failure" },
            })
          : r.fulfill({
              json: { content: "Recovered tutor answer", sources: [] },
            });
      },
    );
    await page.goto(route);
    await page.getByLabel("Speak answers aloud").uncheck();
    const question = page.getByRole("textbox", {
      name:
        route === "/excel"
          ? "Ask JEFF about this lesson"
          : "Ask JEFF about web development",
    });
    await question.fill("Explain the lesson example");
    await page.getByRole("button", { name: "Ask JEFF", exact: true }).click();
    await expect(
      page.getByText("Temporary tutor failure", { exact: true }),
    ).toBeVisible();
    await expect(question).toHaveValue("Explain the lesson example");
    await page.reload();
    await expect(
      page.getByText("Explain the lesson example", { exact: true }),
    ).toBeVisible();
    await question.fill("Explain the lesson example");
    await page.getByRole("button", { name: "Ask JEFF", exact: true }).click();
    await expect(
      page.getByText("Recovered tutor answer", { exact: true }),
    ).toBeVisible();
    expect(requests[1].messages).toEqual([
      { role: "user", content: "Explain the lesson example" },
    ]);
    await expect(
      page.getByText("Explain the lesson example", { exact: true }),
    ).toHaveCount(1);
  });
}
