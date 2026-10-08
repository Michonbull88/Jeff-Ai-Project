import { test, expect } from "@playwright/test";

declare global {
  interface Window {
    __courseMic: {
      aborted: boolean;
      onstart?: () => void;
      onend?: () => void;
      onerror?: (event: { error: string }) => void;
    };
  }
}

for (const path of ["/chatgpt-basics", "/computer-basics"]) {
  test(`lesson narration waits for the microphone and recovers on ${path}`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "SpeechSynthesisUtterance", {
        value: class {
          constructor(public text: string) {}
          voice = null;
        },
      });
      Object.defineProperty(window.speechSynthesis, "getVoices", {
        value: () => [{ name: "Daniel", lang: "en-GB", localService: true }],
      });
      Object.defineProperty(window.speechSynthesis, "speak", {
        value: (item: SpeechSynthesisUtterance) => {
          item.onstart?.(new Event("start") as SpeechSynthesisEvent);
        },
      });
      Object.defineProperty(window.speechSynthesis, "cancel", {
        value: () => {},
      });
      class Recognition {
        aborted = false;
        onend?: () => void;
        constructor() {
          window.__courseMic = this;
        }
        start() {
          // Remain pending until the test simulates permission being granted.
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
    await page.route("**/api/status", (route) =>
      route.fulfill({ json: { configured: true, locked: false } }),
    );
    await page.goto(path);
    const read = page.getByRole("button", { name: "Read lesson", exact: true });
    const talk = page.getByRole("button", {
      name: "Talk to JEFF",
      exact: true,
    });
    const face = page.locator(".jeff-face");

    await read.click();
    await expect(face).toHaveAttribute("aria-label", "JEFF is speaking");
    await talk.click();
    await expect(read).toBeDisabled();
    await expect(face).toHaveAttribute("aria-label", "JEFF is idle");
    await page.evaluate(() => window.__courseMic.onstart?.());
    await expect(face).toHaveAttribute("aria-label", "JEFF is listening");
    await expect(read).toBeDisabled();

    await page.getByRole("button", { name: "Cancel microphone" }).click();
    await expect(read).toBeEnabled();
    expect(await page.evaluate(() => window.__courseMic.aborted)).toBe(true);
    await read.click();
    await expect(face).toHaveAttribute("aria-label", "JEFF is speaking");

    await talk.click();
    await expect(read).toBeDisabled();
    await page.evaluate(() =>
      window.__courseMic.onerror?.({ error: "not-allowed" }),
    );
    await expect(read).toBeEnabled();

    await talk.click();
    await expect(read).toBeDisabled();
    await page.evaluate(() => window.__courseMic.onend?.());
    await expect(read).toBeEnabled();

    await talk.click();
    await expect(read).toBeDisabled();
    await page
      .getByRole("button", { name: "Next lesson", exact: true })
      .click();
    await expect(read).toBeEnabled();
    expect(await page.evaluate(() => window.__courseMic.aborted)).toBe(true);
    await read.click();
    await expect(face).toHaveAttribute("aria-label", "JEFF is speaking");

    if (path === "/computer-basics") {
      await talk.click();
      await expect(read).toBeDisabled();
      await page
        .getByRole("combobox", { name: "Windows version" })
        .selectOption("10");
      await expect(read).toBeEnabled();
      expect(await page.evaluate(() => window.__courseMic.aborted)).toBe(true);
    }
  });
}
