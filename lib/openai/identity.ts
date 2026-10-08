export function answerNameQuestion(
  messages: { role: "user" | "assistant"; content: string }[],
) {
  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user")?.content;
  if (
    !latestUserMessage ||
    !/\b(?:what is|what's|who is|who's) your name\b/i.test(latestUserMessage)
  )
    return null;
  return { content: "My name is Jeff!", sources: [], live: false };
}
