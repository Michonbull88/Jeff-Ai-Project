import { test, expect } from "@playwright/test";
import { answerNameQuestion } from "../lib/openai/identity";

test("name questions receive Jeff's exact requested reply", () => {
  for (const question of [
    "What is your name?",
    "Jeff, what's your name?",
    "WHO IS YOUR NAME?",
  ]) {
    expect(answerNameQuestion([{ role: "user", content: question }])).toEqual({
      content: "My name is Jeff!",
      sources: [],
      live: false,
    });
  }
});

test("name response only applies to the latest user question", () => {
  expect(
    answerNameQuestion([
      { role: "user", content: "What is your name?" },
      { role: "assistant", content: "My name is Jeff!" },
      { role: "user", content: "What can you help me with?" },
    ]),
  ).toBeNull();
});
