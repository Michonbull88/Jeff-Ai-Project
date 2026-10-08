import { test, expect, type Page } from "@playwright/test";

test.use({
  launchOptions: {
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
    ],
  },
});

declare global {
  interface Window {
    __localMicStreams: MediaStream[];
    __browserSpeechStarts: number;
    __grantLocalMic?: () => void;
  }
}

test("cancelling recordings and pending transcription releases audio and ignores late replies", async ({
  page,
}) => {
  await localMicrophone(page);
  const questions: unknown[] = [];
  let uploads = 0;
  let finish!: () => void;
  const reply = new Promise<void>((resolve) => {
    finish = resolve;
  });
  await page.route("**/api/transcribe", async (route) => {
    uploads++;
    await reply;
    await route.fulfill({
      json: { text: "This cancelled question must not be sent" },
    });
  });
  await page.route("**/api/computer-tutor", (route) => {
    questions.push(route.request().postDataJSON());
    return route.fulfill({ json: { content: "Unexpected answer" } });
  });
  await page.goto("/computer-basics");
  const talk = page.getByRole("button", { name: "Talk to JEFF", exact: true });
  const listening = page
    .locator('p[role="status"]')
    .filter({ hasText: "Listening on this computer" });
  try {
    await talk.click();
    await expect(listening).toBeVisible();
    await page.getByRole("button", { name: "Cancel microphone" }).click();
    await expect(talk).toBeEnabled();
    expect(uploads).toBe(0);
    expect(
      await page.evaluate(() =>
        window.__localMicStreams.every((stream) =>
          stream.getTracks().every((track) => track.readyState === "ended"),
        ),
      ),
    ).toBe(true);

    await talk.click();
    await expect(listening).toBeVisible();
    await page.waitForTimeout(400);
    await page
      .getByRole("button", { name: "Stop and send", exact: true })
      .click();
    await expect.poll(() => uploads).toBe(1);
    await page.getByRole("button", { name: "Cancel microphone" }).click();
    await expect(talk).toBeEnabled();
  } finally {
    finish();
  }
  await page.getByRole("button", { name: "Next lesson", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Ask JEFF about PC and Windows" }),
  ).toBeEnabled();
  expect(questions).toEqual([]);
  expect(await page.evaluate(() => window.__browserSpeechStarts)).toBe(0);
});

test("cancelling pending permission stops a microphone granted later", async ({
  page,
}) => {
  await localMicrophone(page);
  await page.addInitScript(() => {
    const getUserMedia = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const stream = await getUserMedia(constraints);
      return new Promise<MediaStream>((resolve) => {
        window.__grantLocalMic = () => resolve(stream);
      });
    };
  });
  await page.goto("/computer-basics");
  await page.getByRole("button", { name: "Talk to JEFF", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => !!window.__grantLocalMic))
    .toBe(true);
  await page.getByRole("button", { name: "Cancel microphone" }).click();
  await page.evaluate(() => window.__grantLocalMic?.());
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__localMicStreams.every((stream) =>
          stream.getTracks().every((track) => track.readyState === "ended"),
        ),
      ),
    )
    .toBe(true);
  await expect(
    page.getByRole("button", { name: "Talk to JEFF", exact: true }),
  ).toBeEnabled();
});

test("failed local transcription can be retried without using browser speech", async ({
  page,
}) => {
  await localMicrophone(page);
  let attempts = 0;
  const questions: string[] = [];
  await page.route("**/api/transcribe", (route) => {
    attempts++;
    return route.fulfill(
      attempts === 1
        ? {
            status: 422,
            json: { error: "No speech was detected. Please try again." },
          }
        : { json: { text: "How do I save a file?" } },
    );
  });
  await page.route("**/api/computer-tutor", (route) => {
    questions.push(route.request().postDataJSON().messages.at(-1).content);
    return route.fulfill({ json: { content: "Your retry worked." } });
  });
  await page.goto("/computer-basics");
  await page.getByLabel("Speak answers aloud").uncheck();
  for (let attempt = 0; attempt < 2; attempt++) {
    await page
      .getByRole("button", { name: "Talk to JEFF", exact: true })
      .click();
    await expect(
      page
        .locator('p[role="status"]')
        .filter({ hasText: "Listening on this computer" }),
    ).toBeVisible();
    await page.waitForTimeout(400);
    await page
      .getByRole("button", { name: "Stop and send", exact: true })
      .click();
    if (attempt === 0) {
      await expect(
        page.getByRole("alert").filter({ hasText: "No speech was detected" }),
      ).toBeVisible();
      expect(questions).toEqual([]);
    }
  }
  await expect(
    page.getByText("Your retry worked.", { exact: true }),
  ).toBeVisible();
  expect(questions).toEqual(["How do I save a file?"]);
  expect(await page.evaluate(() => window.__browserSpeechStarts)).toBe(0);
});

test("transcription endpoint rejects foreign origins, unsupported media and oversized or empty recordings", async ({
  request,
}) => {
  const origin = { origin: "http://127.0.0.1:3000" };
  expect(
    (
      await request.post("/api/transcribe", {
        headers: {
          origin: "https://untrusted.example",
          "content-type": "audio/wav",
        },
        data: "audio",
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/transcribe", {
        headers: { ...origin, "content-type": "application/json" },
        data: "{}",
      })
    ).status(),
  ).toBe(415);
  expect(
    (
      await request.post("/api/transcribe", {
        headers: { ...origin, "content-type": "audio/wav" },
        data: Buffer.alloc(4 * 1024 * 1024 + 1),
      })
    ).status(),
  ).toBe(413);
  expect(
    (
      await request.post("/api/transcribe", {
        headers: { ...origin, "content-type": "audio/wav" },
        data: Buffer.alloc(0),
      })
    ).status(),
  ).toBe(400);
});

async function localMicrophone(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem("jeff-ready", "1");
    window.__localMicStreams = [];
    window.__browserSpeechStarts = 0;
    const getUserMedia = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const stream = await getUserMedia(constraints);
      window.__localMicStreams.push(stream);
      return stream;
    };
    Object.defineProperty(window, "SpeechRecognition", {
      configurable: true,
      value: class {
        start() {
          window.__browserSpeechStarts++;
          throw new Error("Browser speech service unavailable");
        }
      },
    });
    Object.defineProperty(window.speechSynthesis, "speak", { value: () => {} });
  });
  await page.route("**/api/status", (route) =>
    route.fulfill({
      json: {
        configured: true,
        locked: false,
        voiceConfigured: false,
        localSpeechAvailable: true,
      },
    }),
  );
}

const modes = [
  ["/", "/api/chat"],
  ["/excel", "/api/tutor"],
  ["/web-development", "/api/web-tutor"],
  ["/chatgpt-basics", "/api/chatgpt-tutor"],
  ["/computer-basics", "/api/computer-tutor"],
] as const;

for (const [path, endpoint] of modes) {
  test(`local recording sends one question without browser speech on ${path}`, async ({
    page,
  }) => {
    await localMicrophone(page);
    const questions: string[] = [];
    const uploads: Buffer[] = [];
    let finish!: () => void;
    const reply = new Promise<void>((resolve) => {
      finish = resolve;
    });
    await page.route("**/api/transcribe", async (route) => {
      uploads.push(route.request().postDataBuffer()!);
      expect(route.request().headers()["content-type"]).toMatch(/^audio\//);
      await reply;
      await route.fulfill({ json: { text: "How do I save my work?" } });
    });
    await page.route(`**${endpoint}`, (route) => {
      questions.push(route.request().postDataJSON().messages.at(-1).content);
      return route.fulfill({
        json: { content: "Local microphone answer.", sources: [] },
      });
    });
    await page.goto(path);
    if (path !== "/") await page.getByLabel("Speak answers aloud").uncheck();
    try {
      await page
        .getByRole("button", {
          name: path === "/" ? "Start voice conversation" : "Talk to JEFF",
          exact: true,
        })
        .click();
      await expect(
        page
          .locator('p[role="status"]')
          .filter({ hasText: "Listening on this computer" }),
      ).toBeVisible();
      // Capture enough audio for Chrome's real MediaRecorder to emit a chunk.
      await page.waitForTimeout(400);
      await page
        .getByRole("button", { name: "Stop and send", exact: true })
        .click();
      await expect.poll(() => uploads.length).toBe(1);
      expect(uploads[0].length).toBeGreaterThan(0);
      await expect(
        page
          .locator('p[role="status"]')
          .filter({ hasText: "Transcribing on this computer" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", {
          name: "Transcribing question",
          exact: true,
        }),
      ).toBeDisabled();
      expect(
        await page.evaluate(() =>
          window.__localMicStreams.every((stream) =>
            stream.getTracks().every((track) => track.readyState === "ended"),
          ),
        ),
      ).toBe(true);
    } finally {
      finish();
    }
    await expect(
      page.getByText("Local microphone answer.", { exact: true }),
    ).toBeVisible();
    expect(questions).toEqual(["How do I save my work?"]);
    expect(await page.evaluate(() => window.__browserSpeechStarts)).toBe(0);
  });
}
