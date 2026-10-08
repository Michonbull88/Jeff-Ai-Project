type Message = { role: "user" | "assistant"; content: string };

// Topic words route the question. The complete ordered wording identifies an
// answer: sharing "HTML" must never make two different questions equivalent.
export function describeQuestion(text: string) {
  const normalized = text
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\bwhat's\b/g, "what is")
    .replace(/\bwhat're\b/g, "what are");
  const words = normalized.match(/[a-z0-9]+/g) || [];
  const topics = [
    [
      "excel",
      /\b(excel|spreadsheet|workbook|worksheet|xlookup|vlookup|sumifs?|pivot tables?)\b/,
    ],
    ["html", /\bhtml5?\b/],
    ["css", /\bcss3?\b/],
    ["javascript", /\b(javascript|js)\b/],
    ["react", /\breact\b/],
    ["python", /\bpython\b/],
  ] as const;
  const topic =
    topics
      .filter(([, pattern]) => pattern.test(normalized))
      .map(([name]) => name)
      .join("+") || "general";
  const contextual =
    /\b(it|its|this|that|these|those|they|them|their|my|mine|our|ours|above|previous|earlier|same|again|another|instead|more|next|given|provided|attached|following)\b/;
  const changing =
    /\b(today|tomorrow|yesterday|now|current|currently|latest|recent|weather|forecast|news|price|prices|score|scores|time)\b/;
  const questionStart =
    /^(?:please\s+)?(?:(?:can|could|would) you\s+)?(?:what\s+(?:is|are|does|do)\s+|how\s+(?:does|do|can|to)\s+|why\s+(?:is|are|does|do)\s+|explain\s+|define\s+|describe\s+|tell me about\s+)/;
  // Code, quoted strings and formulas retain exact, context-bound matching.
  const plainText = /^[a-z0-9\s,.?!'-]+$/i.test(text.trim());
  const standalone =
    plainText &&
    words.length >= 3 &&
    questionStart.test(normalized.trim()) &&
    !contextual.test(normalized) &&
    !changing.test(normalized) &&
    !/["'`=<>:{}()[\]\\/]/.test(text.replace(/what['’]s/gi, "what is"));
  return {
    topic,
    words,
    standalone,
    identity: `${topic}:${normalized
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[?!.]+$/, "")}`,
  };
}

export function questionMessages(messages: Message[]) {
  const latest = messages.at(-1);
  return latest?.role === "user" && describeQuestion(latest.content).standalone
    ? [latest]
    : messages;
}
