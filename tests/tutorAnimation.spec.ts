import { test, expect } from "@playwright/test";

declare global {
  interface Window {
    __tutorUtterance: SpeechSynthesisUtterance;
  }
}

for (const path of [
  "/excel",
  "/web-development",
  "/chatgpt-basics",
  "/computer-basics",
]) {
  test(`narration animates the face and handles playback lifecycle on ${path}`, async ({
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
          window.__tutorUtterance = item;
          item.onstart?.(new Event("start") as SpeechSynthesisEvent);
        },
      });
      Object.defineProperty(window.speechSynthesis, "cancel", {
        value: () => {},
      });
    });
    await page.route("**/api/status", (route) =>
      route.fulfill({ json: { configured: true, locked: false } }),
    );
    await page.goto(path);
    const face = page.locator(".jeff-face");
    const canvas = face.locator("canvas");
    const pixels = () =>
      canvas.evaluate((el: HTMLCanvasElement) => el.toDataURL());
    const read = page.getByRole("button", { name: "Read lesson", exact: true });
    await read.click();
    await expect(face).toHaveAttribute("aria-label", "JEFF is speaking");
    const first = await pixels();
    await expect.poll(pixels).not.toBe(first);

    await page.evaluate(() =>
      window.__tutorUtterance.onpause?.(
        new Event("pause") as SpeechSynthesisEvent,
      ),
    );
    await expect(face).toHaveAttribute("aria-label", "JEFF is idle");
    await page.evaluate(() =>
      window.__tutorUtterance.onresume?.(
        new Event("resume") as SpeechSynthesisEvent,
      ),
    );
    await expect(face).toHaveAttribute("aria-label", "JEFF is speaking");
    await page.evaluate(() =>
      window.__tutorUtterance.onend?.(new Event("end") as SpeechSynthesisEvent),
    );
    await expect(face).toHaveAttribute("aria-label", "JEFF is idle");

    await read.click();
    await page
      .getByRole("button", { name: "Stop reading", exact: true })
      .click();
    // A cancelled utterance must not restart motion via a late event.
    await page.evaluate(() =>
      window.__tutorUtterance.onresume?.(
        new Event("resume") as SpeechSynthesisEvent,
      ),
    );
    await expect(face).toHaveAttribute("aria-label", "JEFF is idle");
    await read.click();
    await page.evaluate(() =>
      window.__tutorUtterance.onerror?.(
        new Event("error") as SpeechSynthesisErrorEvent,
      ),
    );
    await expect(face).toHaveAttribute("aria-label", "JEFF is idle");
    await expect(
      page.getByRole("alert").filter({ hasText: "Voice playback stopped" }),
    ).toBeVisible();

    // Reduced motion keeps the rendered face still even during narration.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload();
    await read.click();
    await expect(face).toHaveAttribute("aria-label", "JEFF is speaking");
    const still = await pixels();
    await page.waitForTimeout(350);
    expect(await pixels()).toBe(still);
  });
}
