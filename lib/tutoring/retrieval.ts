import type { WebLesson } from "./types";

const ignored = new Set(
  "a an and are as at be by can could do does for from how i in is it me my of on or please the this to use using what when where which why with you your explain show help tell jeff about would should like want difference between teach make create build understand example another".split(
    " ",
  ),
);
const aliases: Record<string, string[]> = {
  js: ["javascript"],
  html5: ["html"],
  css3: ["css"],
  nav: ["navigation"],
  navbar: ["navigation", "flexbox", "responsive"],
  responsive: ["mobile"],
  spacing: ["margin", "padding"],
  whitespace: ["spacing"],
  login: ["authentication", "session"],
  password: ["authentication", "security"],
  passwords: ["authentication", "security"],
  hacking: ["security"],
  centre: ["center"],
  centered: ["center", "flexbox"],
  centeredness: ["center"],
  debugging: ["debug"],
  accessible: ["accessibility"],
  a11y: ["accessibility"],
  colour: ["color"],
  colors: ["color"],
  fonts: ["typography"],
};
export function tokens(text: string): string[] {
  return (text.toLowerCase().match(/[a-z][a-z0-9-]*/g) || []).filter(
    (word) => word.length > 1 && !ignored.has(word),
  );
}
export type SearchIndex = {
  version: 1;
  fingerprint: string;
  idf: Record<string, number>;
  documents: { id: string; vector: Record<string, number> }[];
};
function unitVector(counts: Map<string, number>, idf: Record<string, number>) {
  const vector: Record<string, number> = Object.create(null);
  let sum = 0;
  for (const [term, count] of counts) {
    if (!Object.hasOwn(idf, term)) continue;
    const weight = (1 + Math.log(count)) * idf[term];
    vector[term] = weight;
    sum += weight * weight;
  }
  const length = Math.sqrt(sum) || 1;
  for (const term of Object.keys(vector)) vector[term] /= length;
  return vector;
}
function counts(words: string[]) {
  const result = new Map<string, number>();
  for (const word of words) result.set(word, (result.get(word) || 0) + 1);
  return result;
}
export function createSearchIndex(
  lessons: WebLesson[],
  fingerprint: string,
): SearchIndex {
  const terms = lessons.map((lesson) =>
    tokens(
      [
        ...Array(4).fill(`${lesson.title} ${lesson.keywords.join(" ")}`),
        lesson.goal,
        ...lesson.explanation,
        lesson.code,
        lesson.exercise,
      ].join(" "),
    ),
  );
  const frequencies = new Map<string, number>();
  for (const document of terms)
    for (const term of new Set(document))
      frequencies.set(term, (frequencies.get(term) || 0) + 1);
  const idf: Record<string, number> = Object.create(null);
  for (const [term, frequency] of frequencies)
    idf[term] = Math.log(1 + lessons.length / (1 + frequency));
  return {
    version: 1,
    fingerprint,
    idf,
    documents: lessons.map((lesson, i) => ({
      id: lesson.id,
      vector: unitVector(counts(terms[i]), idf),
    })),
  };
}
export function searchLessons(
  index: SearchIndex,
  lessons: WebLesson[],
  question: string,
  limit = 3,
) {
  const words = tokens(question);
  const expanded = words.flatMap((word) => [
    word,
    ...(Object.hasOwn(aliases, word) ? aliases[word] : []),
  ]);
  const query = unitVector(counts(expanded), index.idf);
  const relevant = new Set(
    lessons
      .filter((lesson) =>
        tokens(`${lesson.title} ${lesson.keywords.join(" ")}`).some((term) =>
          expanded.includes(term),
        ),
      )
      .map((lesson) => lesson.id),
  );
  const scored = index.documents
    .filter((document) => relevant.has(document.id))
    .map((document) => ({
      id: document.id,
      score: Object.entries(query).reduce(
        (sum, [term, weight]) =>
          sum +
          weight *
            (Object.hasOwn(document.vector, term) ? document.vector[term] : 0),
        0,
      ),
    }))
    .filter((result) => result.score >= 0.055)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const cutoff = Math.max(0.055, (scored[0]?.score || 0) * 0.5);
  return scored
    .filter((result) => result.score >= cutoff)
    .slice(0, limit)
    .flatMap((result) => {
      const lesson = lessons.find((item) => item.id === result.id);
      return lesson ? [{ lesson, score: result.score }] : [];
    });
}
