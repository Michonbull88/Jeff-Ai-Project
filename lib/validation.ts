import { z } from "zod";
export const historySchema = z
  .array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().trim().min(1).max(12000),
    }),
  )
  .max(40)
  .refine(
    (items) => items.reduce((n, m) => n + m.content.length, 0) <= 80000,
    "Conversation is too long. Please start a new one.",
  );
export const chatSchema = z.object({
  messages: historySchema.refine(
    (m) => m.length > 0 && m.at(-1)?.role === "user",
    "A question is required.",
  ),
});
export const searchSchema = z.object({
  query: z.string().trim().min(1).max(2000),
});
export function safeUrl(value: string) {
  try {
    const u = new URL(value);
    return ["http:", "https:"].includes(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
}
