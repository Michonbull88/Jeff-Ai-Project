import { test, expect } from "@playwright/test";
import {
  excelTutorInstructions,
  isExcelConversation,
  isExcelQuestion,
} from "../lib/openai/excelTutor";

test("Excel detection recognizes product names, features, formulas and errors", () => {
  for (const question of [
    "How do I freeze panes in Excel?",
    "Can Power Query combine these monthly files?",
    "Why does my XLOOKUP return #N/A?",
    "Help me with a PivotTable slicer.",
    "My formula =SUM(A1:A10) returns the wrong total.",
    "Why does =B2*C2 give me the wrong result?",
    "How do I fix a #SPILL! error?",
  ])
    expect(isExcelQuestion(question), question).toBe(true);

  expect(isExcelQuestion("What is the formula for gravitational force?")).toBe(
    false,
  );
});

test("Excel tutor instructions persist for relevant conversation follow-ups", () => {
  expect(
    isExcelConversation([
      { role: "user", content: "Teach me XLOOKUP." },
      { role: "assistant", content: "Sure, let's begin." },
      { role: "user", content: "Can you show another example?" },
    ]),
  ).toBe(true);
  expect(
    isExcelConversation([
      { role: "assistant", content: "I can help with Excel." },
      { role: "user", content: "Tell me a joke." },
    ]),
  ).toBe(false);
});

test("tutor prompt covers lessons, troubleshooting and version guidance", () => {
  expect(excelTutorInstructions).toContain("interactive teacher");
  expect(excelTutorInstructions).toContain("Power Query");
  expect(excelTutorInstructions).toContain("#SPILL!");
  expect(excelTutorInstructions).toContain("Microsoft 365/newer-version");
  expect(excelTutorInstructions).toContain("corrected formula");
});