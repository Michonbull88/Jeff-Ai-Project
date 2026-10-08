# Local web-development course

These 40 JSON modules are the editable source of truth for JEFF's web tutor. They contain introductory explanations, examples, exercises and knowledge checks written for this project. Reference URLs point to supporting official documentation; JEFF does not fetch those websites while answering.

Copy a numbered module to add another lesson. Use a unique lowercase `id`, a numeric `order`, and the same fields. `quiz.correct` is the zero-based index of a choice. Content is public to users of this local app: do not place credentials or private data here.

Run `npm run knowledge:index` from the project root after editing. It validates all numbered JSON modules and rebuilds `search-index.json`. Do not edit the generated vectors directly. At runtime, changed lesson content invalidates the cached index and is re-indexed in memory.

The index uses sparse TF-IDF vectors and cosine similarity with topic matching. It does not download an embedding model or contact an external database. The course is intentionally separate from the Excel tutor's data and prompt.
