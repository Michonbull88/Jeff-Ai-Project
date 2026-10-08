# JEFF — Local Learning Assistant

## Move JEFF to a Windows computer

The Windows transfer package contains the full source, all four courses, saved answers on disk, the current `qwen3:1.7b` model and the local English speech model. Extract the complete folder and open `START HERE.html`. Install Node.js LTS, 64-bit Python 3.13 and Ollama, then double-click `1 - SETUP JEFF.cmd` once. Use `2 - START JEFF.cmd` for later visits. Setup needs internet for Windows-compatible libraries; the bundled model files are reused. The supplied launcher targets Intel/AMD Windows x64 and uses a dedicated local Ollama service on port 11435 with cloud and paid API features disabled. Keep its command window open; Ctrl+C stops its services.

Browser progress needs a separate export. Open **http://127.0.0.1:3000/transfer** in the same browser and address you use for JEFF, download the browser backup, and copy the JSON file alongside the transfer package. On Windows, open the same page after starting JEFF and restore the backup. Settings also links to Backup & Transfer. Backups cover course progress, notes, drafts, playground code, tutor conversations and saved preferences. Disk answer memory is already in the transfer folder. Main-assistant conversations held only in an open tab are not part of browser storage.

## Local user accounts

JEFF requires a local account. The first account registered on an installation becomes the administrator; later accounts are learners. Passwords are salted and hashed on this computer, and signed sessions expire after seven days. Administrators can add and remove AI Made Simple course documents. Learners can view and download them but cannot change the library. Use a long random `JEFF_AUTH_SECRET` in production; Windows transfer packages generate one automatically. Account records remain in `.jeff-data/accounts.json` and are not copied into new transfer packages.

`scripts/package-windows.py DESTINATION` builds a new transfer folder and verified ZIP without overwriting an existing destination. It copies only the selected Ollama model's verified blobs and excludes `.env.local`, native packages, Python environments, build output and test artifacts. It writes fresh local-only settings into the copy. `PACKAGE-CONTENTS.json` records file sizes and SHA-256 checksums. Windows setup creates its own Python environment using `Scripts/python.exe`; macOS continues using `bin/python`.

JEFF now has a dedicated Excel learning workspace at **http://127.0.0.1:3000/excel**, also linked from the main assistant. The guided course works without an AI service. Optional follow-up questions run through Ollama on this computer.

## PC, laptop and Windows basics

Open **http://127.0.0.1:3000/computer-basics**, or choose **PC & Windows** from any workspace. Twenty-four beginner lessons cover computer parts, power and sign-in, mouse and keyboard, Start and window management, files, saving documents, downloads, browsing, Wi-Fi, email attachments, sound and camera, accessibility, apps, printing, screenshots, battery care, updates, scams, backups, troubleshooting and a final everyday project.

Choose Windows 11 or Windows 10 to see the appropriate steps. Windows 10 includes a support-status notice and Microsoft guidance. Each lesson includes a task, hint, review checklist, knowledge check, read-aloud and a Microsoft reference. Mouse and typing practice pads run inside the page and do not control Windows or access files. The other exercises are carried out by the learner on their Windows computer.

Lessons, checks, notes and practice pads work without Ollama. Progress and notes are independent of other courses under `jeff-computer-basics-v1`; notes are per lesson, while checks cover concepts shared by both Windows versions. Download lesson notes exports the selected version’s steps, task, checklist, notes and reference. Reset clears completed checks and retains notes and conversations. Clearing browser storage removes this browser’s progress.

Ask JEFF uses `/api/computer-tutor` and the existing local Ollama model with server-selected lesson and Windows-version context, bounded history and the existing access/origin/rate checks. Conversations and answer reuse are scoped by lesson and Windows version. Changing either cancels pending questions, speech and microphone capture. The PC and ChatGPT courses share `components/tutoring/LessonCoach.tsx`; paid OpenAI remains disabled. Microphone input uses installed local speech recognition, with browser recognition as a fallback when it is not installed. JEFF explains instructions but cannot see the screen or change the learner’s computer.

Course sources are in `lib/computer/course.ts`, with official references reviewed on 6 October 2026. No Windows virtual machine or remote-control integration is required to browse the lessons on this Mac.

## AI Made Simple course

Open **http://127.0.0.1:3000/chatgpt-basics**, or choose **AI Made Simple** from any tutor or the main assistant. Eight beginner modules cover AI basics, everyday ChatGPT use, effective prompting, Microsoft Copilot, Canva, combined workflows, safety and a reusable prompt library. The course is based on the Intensity IT student training manual.

Each lesson includes original practice material, an editable prompt, a task, a hint, a review checklist and a knowledge check. Prompts, practice notes and completed checks are stored separately under `jeff-chatgpt-basics-v1`. Each lesson has its own saved draft and conversation. Download practice exports the selected lesson's prompt, notes and checklist as a text file. Reset course progress clears completed checks while preserving drafts and conversations.

The lessons and practice editor work locally without Ollama. Ask JEFF uses the existing local model through `/api/chatgpt-tutor`, with the selected lesson as context, bounded conversation history, access/origin/rate checks and saved-answer reuse. Read-aloud and microphone controls use the same speech hooks as the other tutors. Microphone input requires browser permission and uses installed local speech recognition. Without that local runtime, it uses the browser's recognition service, which may process audio online.

In both the ChatGPT and PC & Windows courses, Read lesson is disabled while the microphone is active, including while permission is pending. It becomes available again when capture ends, is cancelled or fails, or when you change lessons or Windows version. Starting the microphone stops any current narration. All course speech switches wait for saved browser settings to load before accepting changes.

This course teaches practical use of ChatGPT, Microsoft Copilot and Canva; it does not connect JEFF to those accounts. The Open ChatGPT link opens a separate tab without sending a prompt. Practical work happens in the relevant product, subject to the learner's account tools, licences and limits. No paid API has been enabled in JEFF. Official supporting references are linked in each module and were checked on 8 October 2026. Source files are `lib/chatgpt/course.ts`, `components/chatgpt/` and `app/api/chatgpt-tutor/route.ts`.

## Web development & design tutor

Open **http://127.0.0.1:3000/web-development**, or choose **Web Tutor** from the assistant or Excel tutor. Excel remains a separate mode.

The web course has 40 introductory modules following the supplied learning path: HTML, CSS, layout, responsive design, UI/UX, accessibility, JavaScript, Git/GitHub, Node/Express, APIs, databases/SQL, authentication/security, React, SEO, performance, deployment, debugging and projects. Each module includes original teaching material, a code example, an exercise, a hint, a knowledge check and an official reference link. These are compact starting lessons, not a claim to replace the complete official documentation or certify mastery.

- Lessons, checks and the HTML/CSS/JavaScript playground do not require Ollama or internet access once JEFF is running locally.
- The playground saves a shared project across lessons. Run preview executes it in an opaque-origin iframe; it cannot read JEFF's document or storage. CSP blocks fetch requests and external assets, while sandbox flags block forms and popups. Links can still navigate within the frame. It is a browser preview, not a server execution sandbox, and long-running JavaScript can freeze a tab. Stop preview removes the frame. Code never runs automatically on reload.
- Download HTML exports the current project as one file. The exported file runs as a normal page when opened; the preview's restrictions are not a guarantee about downloaded code.
- Node.js, Express, React/JSX and SQL examples need a suitable project/runtime outside the plain browser playground. Code exercises are not automatically graded. Progress records correct knowledge checks.
- Progress, explanation level, spoken-answer preference and playground code are stored under `jeff-web-development-v1`, independently from Excel. Tutor conversations are saved separately per lesson and explanation level. Selecting another lesson cancels pending playback, microphone capture and answers, restores the selected lesson's conversation, and preserves playground edits.
- Ask JEFF uses the existing local Ollama model. Typed questions and retrieval stay on this computer. The microphone control prefers installed local speech recognition; without it, the browser's online recognition service may be used. Official reference links also need internet when opened.

### Local course retrieval

`knowledge/web-development/` holds one editable JSON file per module. The Next.js backend already supplies the Node server layer, so this implementation does not add a second Express service.

```text
Web Tutor → /api/web-tutor → local course search → selected excerpts → Ollama
```

The local search index uses sparse TF-IDF vectors, cosine similarity, topic matching and a small synonym map. Vectors are persisted in `search-index.json`; there is no paid embedding service, Chroma installation or separate database process. This is lexical vector retrieval, not neural semantic embeddings. It fits the current 40-module library and has a replaceable retrieval boundary in `lib/tutoring/retrieval.ts`.

Only up to three relevant lesson excerpts enter the prompt. The current lesson supplies exercise context; recent chat is bounded separately to fit the small local model. Source buttons show which local lessons were supplied to the model, not proof that every generated sentence is correct. Questions without matching course material receive an explicit missing-material response without a model call. The tutor is instructed to acknowledge missing detail rather than invent APIs. A local model can still be wrong, so verify generated code.

To extend the course, copy an existing numbered JSON file, choose a unique slug `id`, set its `order`, and write its goal, explanation, example, exercise and quiz. `quiz.correct` is a zero-based option index. The file name must match `NN-slug.json`; reference links must use HTTPS. Keep files free of secrets because lesson content is visible in the browser.

```sh
npm run knowledge:index
```

The index command validates the course and rebuilds the saved vectors; `npm run build` runs it automatically. Runtime retrieval hashes the course files and rebuilds an outdated index in memory, so changed course content cannot silently use old vectors. Refresh the web tutor page to load edited lessons. Existing saved progress is keyed by lesson id; use a new id when a material course revision should require another check.

## Start

Requires Node.js 22.6+ and npm. For a fresh checkout only:

```sh
npm ci
cp .env.example .env.local
```

Do not overwrite an existing `.env.local`. Start the app:

```sh
npm run dev
```

Open `/excel`, download the practice CSV, and open it in Excel. Save an `.xlsx` copy to retain formulas, formatting and additional worksheets. If the CSV appears in one column, import it via Data → From Text/CSV with a comma delimiter. The on-page sheet is a read-only reference, not an embedded Excel editor.

## What works without AI

- Eleven guided lessons: cells/ranges, currency formatting, multiplication, SUM, AVERAGE, absolute references, IF, SUMIF, lookups, filters and PivotTables.
- Worked examples, hints, solutions and answer checks. Showing a solution does not complete an exercise; entering a recognised correct answer does.
- Progress, selected lesson and Excel version saved to this browser. Reset clears that progress. Private browsing or clearing site data can remove it.
- Newer Excel uses XLOOKUP; the 2016/2019 option uses exact-match VLOOKUP. Switching versions clears the lookup completion so the alternate method can be practised.
- Answers are spoken automatically by default. The Speak answers aloud switch saves your preference; Stop speaking interrupts playback. Read lesson / Read answer also allow manual playback. All tutor speech uses installed local English voices only. The Talk to JEFF button requests browser microphone permission when clicked. Speak and pause to send a question automatically; Cancel microphone discards it. Typing remains available. Microphone capture uses the browser’s default input device. With local recognition installed, audio is transcribed on this Mac; otherwise the browser's speech service may process audio online. It does not call the OpenAI API. Choose your microphone in browser/system input settings. If no local voice is available, written lessons still work.
- JEFF's animated face, speech movement and five-second blinking. Animation can be disabled; reduced-motion preferences are respected. Narration movement indicates speech playback; it does not analyse the OS voice's audio waveform.
- In the main assistant on Windows, an explicit typed or spoken request such as **Open Google Chrome** launches Chrome from a known installation location. **Open Spotify in Google Chrome** opens the fixed official Spotify web-player address in Chrome. These allow-listed desktop actions run only from JEFF's local loopback address; they do not execute arbitrary commands or accept a user-supplied website address.

The checker is deliberately limited to the method requested in each exercise. It is not an Excel calculation engine and does not read or grade a workbook. Formula checks tolerate case/spacing outside string literals and comma/semicolon separators, while preserving quoted text and reference semantics.

## Optional local questions

Install and open [Ollama](https://ollama.com/download), then pull the model named by `OLLAMA_MODEL` in `.env.local`. The setup panel also shows its name. On this Mac, if `ollama` is not on PATH, use `/Applications/Ollama.app/Contents/Resources/ollama` instead.

```sh
ollama pull qwen3:1.7b
```

Use these settings for a modest CPU:

```dotenv
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3:1.7b
JEFF_ENABLE_OPENAI=false
```

Open Ollama or run `OLLAMA_NO_CLOUD=1 ollama serve`, then refresh the tutor's connection status. Downloads need internet and disk space once; inference runs locally. The first answer can be slower while the model loads. A small model trades answer quality for speed: check its formulas in Excel. The UI supports cancelling a slow question and retrying a failed question without losing the draft. Changing lessons cancels the request and restores the selected lesson's saved conversation.

The server restricts Ollama to loopback addresses. `/api/tutor` sends the selected lesson, practice data, version and up to seven recent chat messages to Ollama. Typed questions and recognised transcripts go to local Ollama. With local speech recognition installed, microphone audio is transcribed on this Mac; otherwise browser recognition may process audio online. Tutor questions and replies are saved in browser storage under `jeff-tutor-history-v1:` keys, scoped by course, lesson, and Excel version or web explanation level. This includes submitted questions whose answer fails. Reloading restores the conversation; only recent messages enter the next model request. Storage failures are shown in the tutor. Local model software may have its own logging behaviour.

## Local speech recognition

JEFF now checks for its local English speech recognizer in `/api/status` and selects it in the assistant and all four courses. The more accurate `base.en` model and Python runtime are installed under `.jeff-data/speech/`. Refresh an open JEFF tab once after setup so it receives the updated status. Recognition uses a five-candidate decoding pass and allows a natural pause before automatically submitting; this is more accurate than the earlier `tiny.en` setup, with a modest increase in transcription time and disk use.

For a fresh installation on a Mac:

```sh
python3 scripts/setup-speech.py
```

Setup downloads the recognition runtime and model once. Local transcription then runs offline on the CPU, without a paid API or the browser's remote speech service. Click the microphone, grant access, speak and pause, or click **Stop and send**. The page shows **Transcribing on this Mac…** while it converts the recording to text. **Cancel microphone** discards a recording or pending transcription. Recognized text is submitted once to the existing local question endpoint.

Recordings are limited to one minute and 4 MiB. Audio is sent to JEFF's local `/api/transcribe` endpoint; temporary audio files are removed after processing, including errors and cancellation. Transcripts and answers use the existing conversation and answer-memory storage. If local recognition is not installed, the browser recognition fallback may process audio online. The microphone panel identifies which mode is selected. An error in installed local recognition is shown for retry and does not silently switch audio to an online service.

## Saved answers

Main-chat and tutor requests that reach Ollama's adapter are recorded in `.jeff-data/tutor-memory/questions.jsonl`. Successful answers are stored as separate JSON cache files in that directory, which is excluded from version control. These files stay on this Mac and survive server restarts. Browser conversation history remains specific to the browser and site address; clearing browser storage removes that visible history but does not remove the disk archive. Earlier conversations that were never saved cannot be recovered.

Standalone general questions such as “What is HTML?” are answered independently of earlier topics and can reuse a saved answer after switching topics. Matching tolerates casing, spacing, final punctuation and “what’s” versus “what is”; different question wording remains separate. Questions recognised as contextual, code, formulas or time-sensitive retain their supplied conversation. This classification is heuristic. An identical question with the same supplied conversation, model name and lesson instructions reuses the saved answer without running inference. An immediate verbatim repeat also reuses it when the preceding answer matches the saved answer. Changes to course excerpts, Excel version, web level or retained conversation context require a fresh answer. Retrying an unanswered question in either tutor preserves one question in the conversation, including after a reload. The UI labels reused answers. This is answer reuse, not model training; new questions still need CPU inference. Disk write failures do not discard an answer and are shown in the tutor. To erase disk memory, stop JEFF and remove `.jeff-data/tutor-memory`; clear the browser history keys separately. Answer reuse applies to main text/microphone chat and both tutors. Live weather responses bypass this cache. The main chat labels cache hits “Saved answer”; tutors label them “Reused saved answer”. Requests from before main-chat caching was enabled were not archived and need one fresh answer first.

## No paid API required

`JEFF_ENABLE_OPENAI=false` blocks both paid voice-session and OpenAI search routes on the server, even if an API key is still present. Text chat uses Ollama; the built-in Johannesburg weather response uses Open-Meteo. No OpenAI key or API credit is required for Excel tutoring. Legacy OpenAI integrations remain in the source but require explicit server configuration to re-enable. Keep the flag false for this local setup.

## Project layout

```text
app/excel                 tutor page
components/excel          lesson, practice, progress, face and question UI
lib/excel                 course content, answer checks, stored progress validation
hooks/useLocalNarration    local browser speech synthesis
app/api/tutor             validated, lesson-aware local question endpoint
lib/local/ollama           loopback-only Ollama adapter
public/practice           downloadable CSV data
components/JeffApp        original assistant and link to Excel tutor
components/jeff            procedural holographic face
```

The existing access-code gate, same-origin POST checks, bounded JSON bodies and in-process rate limits also apply to local AI requests. Private production deployments require `JEFF_ACCESS_CODE`; configure HTTPS and `APP_ORIGIN` as appropriate. This app is designed for a private single instance, not a multi-user hosted learning platform. Public hosting needs separate authentication and shared rate-limit storage. The browser's localhost is not a hosted server's localhost: Ollama must be reachable on the same machine as the Next.js server.

## Verify

```sh
npm run lint
npm run typecheck
npm run build
npm test
```

Playwright uses installed Chrome, with desktop and mobile viewport projects. Browser chat/voice tests use fixtures, not paid APIs. Excel coverage includes offline practice, wrong/correct answers, saved progress, version switching, CSV download, failed local questions, request validation and disabled paid endpoints. Production build and dev should not run against the same `.next` output simultaneously.

The API integration checks expect the local development configuration. Stop any production (`npm start`) server on port 3000 before running `npm test`; Playwright can start the development server automatically.
