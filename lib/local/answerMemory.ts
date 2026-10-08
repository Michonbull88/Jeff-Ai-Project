import { createHash, randomUUID } from "node:crypto";
import {
  appendFile,
  mkdir,
  readFile,
  rename,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { describeQuestion } from "./question";

type Message = { role: "user" | "assistant"; content: string };
type Input = { model: string; system: string; messages: Message[] };
type Answer = { content: string; cached: boolean; memorySaved: boolean };

export function answerKey(input: Input) {
  // Preserve code, case and whitespace: these can change a question's meaning.
  return createHash("sha256")
    .update(JSON.stringify({ version: 1, ...input }))
    .digest("hex");
}

export async function answerWithMemory(
  input: Input,
  generate: () => Promise<{ content: string }>,
  options: { directory?: string; signal?: AbortSignal } = {},
): Promise<Answer> {
  const directory =
    options.directory || path.join(process.cwd(), ".jeff-data", "tutor-memory");
  const id = randomUUID();
  const key = answerKey(input);
  const question =
    input.messages.length === 1 && input.messages[0].role === "user"
      ? describeQuestion(input.messages[0].content)
      : null;
  const questionKey = question?.standalone
    ? createHash("sha256")
        .update(
          JSON.stringify({
            version: 1,
            model: input.model,
            system: input.system,
            question: question.identity,
          }),
        )
        .digest("hex")
    : null;
  let memorySaved = true;
  async function save(content: string) {
    try {
      for (const target of new Set([
        key,
        ...(questionKey ? [questionKey] : []),
      ])) {
        const temporary = path.join(directory, `${target}.${id}.tmp`);
        await writeFile(temporary, JSON.stringify({ key: target, content }), {
          mode: 0o600,
        });
        await rename(temporary, path.join(directory, `${target}.json`));
      }
    } catch {
      memorySaved = false;
    }
  }
  async function record(event: object) {
    try {
      await mkdir(directory, { recursive: true, mode: 0o700 });
      await appendFile(
        path.join(directory, "questions.jsonl"),
        JSON.stringify({ id, at: new Date().toISOString(), ...event }) + "\n",
        { mode: 0o600 },
      );
    } catch {
      memorySaved = false;
    }
  }
  options.signal?.throwIfAborted();
  await record({ type: "question", key, ...input });
  if (questionKey) {
    try {
      const saved = JSON.parse(
        await readFile(path.join(directory, `${questionKey}.json`), "utf8"),
      );
      if (
        saved.key === questionKey &&
        typeof saved.content === "string" &&
        saved.content.trim()
      ) {
        options.signal?.throwIfAborted();
        await save(saved.content);
        await record({
          type: "answer",
          key,
          content: saved.content,
          cached: true,
        });
        return { content: saved.content, cached: true, memorySaved };
      }
    } catch {
      /* Fall through to legacy entries, then generate. */
    }
  }
  // A verbatim repeat immediately after its saved answer has the same context.
  // Other follow-ups retain every supplied message in their cache key.
  let candidate = input.messages;
  while (candidate.length) {
    const candidateKey = answerKey({ ...input, messages: candidate });
    try {
      const saved = JSON.parse(
        await readFile(path.join(directory, `${candidateKey}.json`), "utf8"),
      );
      if (
        saved.key === candidateKey &&
        typeof saved.content === "string" &&
        saved.content.trim()
      ) {
        options.signal?.throwIfAborted();
        // Index this conversation too, so third and later repeats also hit.
        if (candidateKey !== key || questionKey) await save(saved.content);
        await record({
          type: "answer",
          key,
          content: saved.content,
          cached: true,
        });
        return { content: saved.content, cached: true, memorySaved };
      }
    } catch {
      // Missing/corrupt cache entries never block a fresh answer.
    }
    const last = candidate.at(-1);
    const prior = candidate.at(-3);
    if (
      last?.role !== "user" ||
      prior?.role !== "user" ||
      last.content !== prior.content ||
      candidate.at(-2)?.role !== "assistant"
    )
      break;
    // Only remove a repeat if the preceding answer is the actual saved answer.
    const earlier = candidate.slice(0, -2);
    try {
      const earlierKey = answerKey({ ...input, messages: earlier });
      const saved = JSON.parse(
        await readFile(path.join(directory, `${earlierKey}.json`), "utf8"),
      );
      if (
        saved.key !== earlierKey ||
        saved.content !== candidate.at(-2)?.content
      )
        break;
    } catch {
      break;
    }
    candidate = earlier;
  }
  options.signal?.throwIfAborted();
  try {
    const result = await generate();
    options.signal?.throwIfAborted();
    if (!result.content.trim())
      throw new Error("The local model returned no answer.");
    await save(result.content);
    await record({
      type: "answer",
      key,
      content: result.content,
      cached: false,
    });
    return { content: result.content, cached: false, memorySaved };
  } catch (error) {
    await record({ type: "failed", key });
    throw error;
  }
}
