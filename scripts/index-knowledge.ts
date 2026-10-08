import { writeFile } from "node:fs/promises";
import path from "node:path";
import { loadWebLibrary, libraryDirectory } from "../lib/tutoring/library";
import { createSearchIndex } from "../lib/tutoring/retrieval";
async function main() {
  const { lessons, fingerprint } = await loadWebLibrary();
  await writeFile(
    path.join(libraryDirectory, "search-index.json"),
    JSON.stringify(createSearchIndex(lessons, fingerprint)) + "\n",
  );
  console.log(`Indexed ${lessons.length} local web-development lessons.`);
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
