// Keep the assistant greeting, chat replies and Excel narration consistent.
export function getJeffVoice(voices: SpeechSynthesisVoice[]) {
  const local = voices.filter(
    (voice) => voice.localService && /^en(?:[-_]|$)/i.test(voice.lang),
  );
  // SpeechSynthesis has no gender field. Prefer installed male voices by name.
  // Daniel is available on this Mac; keep fallbacks for other computers.
  for (const name of [
    "Daniel",
    "Alex",
    "Microsoft David",
    "Microsoft Mark",
    "Aaron",
    "Fred",
  ]) {
    const preferred = local.find(
      (voice) =>
        voice.name === name ||
        voice.name.startsWith(`${name} `) ||
        voice.name.startsWith(`${name}(`),
    );
    if (preferred) return preferred;
  }
  return local.find((voice) => voice.default) || local[0] || null;
}

export function applyJeffVoice(
  utterance: SpeechSynthesisUtterance,
  voice: SpeechSynthesisVoice | null,
) {
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  }
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;
}
