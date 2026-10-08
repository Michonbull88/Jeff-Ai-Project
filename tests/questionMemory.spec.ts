import { test, expect } from "@playwright/test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { describeQuestion, questionMessages } from "../lib/local/question";
import { answerKey, answerWithMemory } from "../lib/local/answerMemory";
import { isExcelConversation } from "../lib/openai/excelTutor";

type Message = { role: "user" | "assistant"; content: string };

test("A, B, A reuses the saved question across topic changes and casing", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "jeff-topic-"));
  let calls = 0;
  const conversation: Message[] = [];
  try {
    for (const [question, cached] of [
      ["What is HTML?", false],
      ["What is Excel?", false],
      ["What is HTML?", true],
      ["WHAT   is HTML!!", true],
      ["What's HTML?", true],
      ["What does HTML do?", false],
    ] as const) {
      conversation.push({ role: "user", content: question });
      const messages = questionMessages(conversation);
      const system = isExcelConversation(messages)
        ? "Excel instructions"
        : "General instructions";
      const result = await answerWithMemory(
        { model: "test", system, messages },
        async () => {
          calls++;
          return { content: `Answer for ${question}` };
        },
        { directory },
      );
      expect(result.cached, question).toBe(cached);
      conversation.push({ role: "assistant", content: result.content });
    }
    expect(calls).toBe(3);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("topic words identify subjects without conflating different questions or context", () => {
  expect(describeQuestion("Can you explain HTML?").standalone).toBe(true);
  expect(describeQuestion("What is HTML?").topic).toBe("html");
  expect(describeQuestion("What is Excel?").topic).toBe("excel");
  expect(describeQuestion("What is HTML?").identity).not.toBe(
    describeQuestion("How does HTML work?").identity,
  );
  expect(describeQuestion("What is -5?").identity).not.toBe(
    describeQuestion("What is 5?").identity,
  );
  for (const question of [
    "Explain that",
    "How does it work?",
    "What is wrong with my Excel file?",
    "What is the latest Excel version?",
    "What does =SUM(A1:A5) do?",
    'What does HTML class="Example" mean?',
  ]) {
    expect(describeQuestion(question).standalone, question).toBe(false);
    const conversation: Message[] = [
      { role: "user", content: "Earlier supplied context" },
      { role: "user", content: question },
    ];
    expect(questionMessages(conversation)).toEqual(conversation);
  }
});

test("existing first-question cache entries are reused and indexed without regenerating", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "jeff-legacy-"));
  const input = {
    model: "test",
    system: "General instructions",
    messages: [{ role: "user" as const, content: "What is HTML?" }],
  };
  try {
    const key = answerKey(input);
    await writeFile(
      path.join(directory, `${key}.json`),
      JSON.stringify({ key, content: "Existing saved HTML answer" }),
    );
    const generate = async () => {
      throw new Error("Must not regenerate");
    };
    expect(
      (await answerWithMemory(input, generate, { directory })).cached,
    ).toBe(true);
    expect(
      (
        await answerWithMemory(
          { ...input, messages: [{ role: "user", content: "WHAT IS HTML!" }] },
          generate,
          { directory },
        )
      ).cached,
    ).toBe(true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
