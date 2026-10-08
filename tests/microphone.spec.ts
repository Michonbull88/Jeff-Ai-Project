import { test, expect } from "@playwright/test";

declare global {
  interface Window {
    __mic: {
      onstart?: () => void;
      onresult?: (e: unknown) => void;
      onerror?: (e: { error: string }) => void;
      onend?: () => void;
      aborted: boolean;
    };
  }
}
for (const route of [
  "/excel",
  "/web-development",
  "/chatgpt-basics",
  "/computer-basics",
  "/",
]) {
  test(`microphone sends one final question and typing still works on ${route}`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem("jeff-ready", "1");
      localStorage.setItem("jeff-excel-spoken-answers", "false");
      Object.defineProperty(window.speechSynthesis, "speak", {
        value: () => {},
      });
      class Recognition {
        aborted = false;
        onstart?: () => void;
        onend?: () => void;
        constructor() {
          window.__mic = this;
        }
        start() {
          this.onstart?.();
        }
        stop() {
          this.onend?.();
        }
        abort() {
          this.aborted = true;
          this.onend?.();
        }
      }
      Object.defineProperty(window, "SpeechRecognition", {
        configurable: true,
        value: Recognition,
      });
    });
    await page.route("**/api/status", (r) =>
      r.fulfill({
        json: { configured: true, locked: false, voiceConfigured: false },
      }),
    );
    const requests: string[] = [];
    await page.route(
      route === "/excel"
        ? "**/api/tutor"
        : route === "/web-development"
          ? "**/api/web-tutor"
          : route === "/chatgpt-basics"
            ? "**/api/chatgpt-tutor"
            : route === "/computer-basics"
              ? "**/api/computer-tutor"
              : "**/api/chat",
      async (r) => {
        requests.push(r.request().postDataJSON().messages.at(-1).content);
        await r.fulfill({ json: { content: "Microphone test answer." } });
      },
    );
    await page.goto(route);
    const mic = page.getByRole("button", {
      name: route !== "/" ? "Talk to JEFF" : "Start voice conversation",
      exact: true,
    });
    await mic.click();
    await expect(
      page.getByRole("img", { name: "JEFF is listening" }),
    ).toBeVisible();
    await page.evaluate(() =>
      window.__mic.onresult?.({
        results: [{ isFinal: false, 0: { transcript: "How do I" } }],
      }),
    );
    expect(requests).toEqual([]);
    await page.evaluate(() => {
      window.__mic.onresult?.({
        results: [
          { isFinal: true, 0: { transcript: "How do I add cells in Excel?" } },
        ],
      });
      window.__mic.onend?.();
      window.__mic.onend?.();
    });
    await expect.poll(() => requests.length).toBe(1);
    expect(requests[0]).toBe("How do I add cells in Excel?");
    const input = page.getByRole("textbox", {
      name:
        route === "/excel"
          ? "Ask JEFF about this lesson"
          : route === "/web-development"
            ? "Ask JEFF about web development"
            : route === "/chatgpt-basics"
            ? "Ask JEFF about AI Made Simple"
              : route === "/computer-basics"
                ? "Ask JEFF about PC and Windows"
                : "Ask JEFF anything",
    });
    await expect(
      page.getByText("Microphone test answer.", { exact: true }),
    ).toBeVisible();
    await input.fill("Now explain averages.");
    await page
      .getByRole("button", {
        name: route !== "/" ? "Ask JEFF" : "Send message",
        exact: true,
      })
      .click();
    await expect.poll(() => requests.length).toBe(2);
    expect(requests[1]).toBe("Now explain averages.");
    await expect(
      page.getByText("Microphone test answer.", { exact: true }),
    ).toHaveCount(2);
    await mic.click();
    await page.getByRole("button", { name: "Cancel microphone" }).click();
    expect(await page.evaluate(() => window.__mic.aborted)).toBe(true);
    await page.evaluate(() => {
      window.__mic.onstart?.();
      window.__mic.onresult?.({
        results: [{ isFinal: true, 0: { transcript: "Do not send this" } }],
      });
      window.__mic.onend?.();
    });
    await expect(input).toBeEnabled();
    expect(requests).toHaveLength(2);
    await mic.click();
    await page.evaluate(() => window.__mic.onerror?.({ error: "not-allowed" }));
    await expect(page.getByText(/Microphone access was denied/)).toBeVisible();
    await expect(input).toBeEnabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

test("unsupported browser keeps the tutor keyboard available", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "SpeechRecognition", { value: undefined });
    Object.defineProperty(window, "webkitSpeechRecognition", {
      value: undefined,
    });
  });
  await page.route("**/api/status", (r) =>
    r.fulfill({
      json: { configured: true, locked: false, voiceConfigured: false },
    }),
  );
  await page.goto("/excel");
  await page.getByRole("button", { name: "Talk to JEFF" }).click();
  await expect(
    page.getByText(/Microphone recognition is unavailable/),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Ask JEFF about this lesson" }),
  ).toBeEnabled();
});
