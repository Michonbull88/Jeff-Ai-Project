import { test, expect } from "@playwright/test";

declare global {
  interface Window {
    __voiceFixture: {
      stream: MediaStream;
      sent: Record<string, unknown>[];
      emit: (event: Record<string, unknown>) => void;
      releasePermission: () => void;
    };
  }
}
async function prepare(
  page: import("@playwright/test").Page,
  delayPermission = false,
) {
  await page.addInitScript(
    ({ delayPermission }) => {
      sessionStorage.setItem("jeff-ready", "1");
      const fixture = {
        stream: new MediaStream(),
        sent: [] as Record<string, unknown>[],
        emit: (_event: Record<string, unknown>) => {
          void _event;
        },
        releasePermission: () => {},
      };
      window.__voiceFixture = fixture;
      Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
        value: () =>
          new Promise<MediaStream>((resolve) => {
            const release = () => {
              const ctx = new AudioContext();
              const destination = ctx.createMediaStreamDestination();
              fixture.stream = destination.stream;
              resolve(destination.stream);
            };
            fixture.releasePermission = release;
            if (!delayPermission) release();
          }),
      });
      class TestChannel {
        readyState = "open";
        onopen: (() => void) | null = null;
        onmessage: ((e: { data: string }) => void) | null = null;
        onclose: (() => void) | null = null;
        send(data: string) {
          fixture.sent.push(JSON.parse(data));
        }
        close() {
          this.readyState = "closed";
        }
      }
      class TestPeer {
        channel = new TestChannel();
        connectionState = "new";
        onconnectionstatechange = null;
        addTrack() {}
        close() {
          this.connectionState = "closed";
        }
        createDataChannel() {
          fixture.emit = (event) => {
            this.channel.onmessage?.({ data: JSON.stringify(event) });
          };
          return this.channel;
        }
        async createOffer() {
          return { type: "offer", sdp: "v=0\r\ntest-offer" };
        }
        async setLocalDescription() {}
        async setRemoteDescription() {
          this.channel.onopen?.();
        }
      }
      Object.defineProperty(window, "RTCPeerConnection", { value: TestPeer });
    },
    { delayPermission },
  );
  await page.route("**/api/status", (route) =>
    route.fulfill({ json: { configured: true, locked: false } }),
  );
  await page.route("**/api/realtime", (route) =>
    route.fulfill({
      contentType: "application/sdp",
      body: "v=0\r\ntest-answer",
    }),
  );
  await page.goto("/");
  await expect(
    page.getByText("AI SYSTEM ONLINE", { exact: true }),
  ).toBeVisible();
}

test("voice states, interruption, search sources, muting and teardown", async ({
  page,
}) => {
  await prepare(page);
  await page.route("**/api/search", (route) =>
    route.fulfill({
      json: {
        content: "Verified test information.",
        sources: [
          { url: "https://developers.openai.com/", title: "Documentation" },
        ],
        live: true,
      },
    }),
  );
  await page.getByRole("button", { name: "Voice", exact: true }).click();
  await page.getByRole("button", { name: "Start a conversation" }).click();
  await expect(
    page.getByText("VOICE CONNECTED", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Microphone active · audio sent to OpenAI"),
  ).toBeVisible();
  await page.evaluate(() =>
    window.__voiceFixture.emit({ type: "output_audio_buffer.started" }),
  );
  await expect(
    page.getByRole("img", { name: "JEFF is speaking" }),
  ).toBeVisible();
  await page.evaluate(() =>
    window.__voiceFixture.emit({ type: "input_audio_buffer.speech_started" }),
  );
  await expect(
    page.getByRole("img", { name: "JEFF is listening" }),
  ).toBeVisible();
  await page.evaluate(() => {
    window.__voiceFixture.emit({
      type: "conversation.item.added",
      item: { id: "u1", role: "user", content: [{ type: "input_audio" }] },
    });
    window.__voiceFixture.emit({
      type: "conversation.item.input_audio_transcription.completed",
      item_id: "u1",
      transcript: "What is new today?",
    });
    window.__voiceFixture.emit({
      type: "response.function_call_arguments.done",
      name: "search_web",
      call_id: "call1",
      arguments: JSON.stringify({ query: "What is new today?" }),
    });
  });
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__voiceFixture.sent.some(
          (e) => (e.item as { type?: string })?.type === "function_call_output",
        ),
      ),
    )
    .toBeTruthy();
  await page.evaluate(() =>
    window.__voiceFixture.emit({
      type: "response.output_audio_transcript.done",
      item_id: "a1",
      transcript: "Here is the current information.",
    }),
  );
  await expect(page.getByRole("log")).toContainText("What is new today?");
  await expect(
    page.getByRole("link", { name: "developers.openai.com" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mic is live" }).click();
  expect(
    await page.evaluate(
      () => window.__voiceFixture.stream.getAudioTracks()[0].enabled,
    ),
  ).toBeFalsy();
  await page.getByRole("button", { name: "Unmute mic" }).click();
  expect(
    await page.evaluate(
      () => window.__voiceFixture.stream.getAudioTracks()[0].enabled,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "End conversation" }).click();
  expect(
    await page.evaluate(
      () => window.__voiceFixture.stream.getAudioTracks()[0].readyState,
    ),
  ).toBe("ended");
  await expect(
    page.getByText("Your microphone stays off until you say so"),
  ).toBeVisible();
});

test("cancelling pending permission stops a microphone granted later", async ({
  page,
}) => {
  await prepare(page, true);
  await page.getByRole("button", { name: "Voice", exact: true }).click();
  await page.getByRole("button", { name: "Start a conversation" }).click();
  await page.getByRole("button", { name: "Cancel connection" }).click();
  await page.evaluate(() => window.__voiceFixture.releasePermission());
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__voiceFixture.stream.getAudioTracks()[0]?.readyState,
      ),
    )
    .toBe("ended");
  await expect(page.getByText("VOICE CONNECTED", { exact: true })).toHaveCount(
    0,
  );
});

test("interrupting a web search cannot start a stale spoken response", async ({
  page,
}) => {
  await prepare(page);
  let release: () => void = () => {};
  let requested: () => void = () => {};
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  const requestSeen = new Promise<void>((resolve) => {
    requested = resolve;
  });
  await page.route("**/api/search", async (route) => {
    requested();
    await waiting;
    await route
      .fulfill({ json: { content: "Stale result", sources: [], live: true } })
      .catch(() => {});
  });
  await page.getByRole("button", { name: "Voice", exact: true }).click();
  await page.getByRole("button", { name: "Start a conversation" }).click();
  await expect(
    page.getByText("VOICE CONNECTED", { exact: true }),
  ).toBeVisible();
  const initialResponses = await page.evaluate(
    () =>
      window.__voiceFixture.sent.filter((e) => e.type === "response.create")
        .length,
  );
  await page.evaluate(() =>
    window.__voiceFixture.emit({
      type: "response.function_call_arguments.done",
      name: "search_web",
      call_id: "old-search",
      arguments: JSON.stringify({ query: "Current news" }),
    }),
  );
  await requestSeen;
  await page.evaluate(() =>
    window.__voiceFixture.emit({
      type: "response.done",
      response: { status: "completed" },
    }),
  );
  await expect(
    page.getByRole("img", { name: "JEFF is thinking" }),
  ).toBeVisible();
  await page.evaluate(() =>
    window.__voiceFixture.emit({ type: "input_audio_buffer.speech_started" }),
  );
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__voiceFixture.sent.some((e) => {
          const item = e.item as
            { call_id?: string; output?: string } | undefined;
          return (
            item?.call_id === "old-search" && item.output?.includes("cancelled")
          );
        }),
      ),
    )
    .toBeTruthy();
  release();
  expect(
    await page.evaluate(
      () =>
        window.__voiceFixture.sent.filter((e) => e.type === "response.create")
          .length,
    ),
  ).toBe(initialResponses);
  await expect(
    page.getByRole("img", { name: "JEFF is listening" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "End conversation" }).click();
});

test("late voice transcription keeps chronological order", async ({ page }) => {
  await prepare(page);
  await page.getByRole("button", { name: "Voice", exact: true }).click();
  await page.getByRole("button", { name: "Start a conversation" }).click();
  await expect(
    page.getByText("VOICE CONNECTED", { exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    window.__voiceFixture.emit({
      type: "conversation.item.added",
      item: {
        id: "late-user",
        role: "user",
        content: [{ type: "input_audio" }],
      },
    });
    window.__voiceFixture.emit({
      type: "response.output_audio_transcript.done",
      item_id: "early-answer",
      transcript: "An answer to your question.",
    });
    window.__voiceFixture.emit({
      type: "conversation.item.input_audio_transcription.completed",
      item_id: "late-user",
      transcript: "My voice question.",
    });
  });
  await expect(
    page.getByRole("log").getByRole("article").first(),
  ).toContainText("My voice question.");
  await expect(page.getByRole("log").getByRole("article").nth(1)).toContainText(
    "An answer to your question.",
  );
  await page.getByRole("button", { name: "End conversation" }).click();
});

test("weather tool returns live forecast sources to a voice conversation", async ({
  page,
}) => {
  await prepare(page);
  await page.route("**/api/weather", async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      city: "Cape Town",
      country_code: "ZA",
      temperature_unit: "celsius",
    });
    await route.fulfill({
      json: {
        location: "Cape Town, South Africa",
        current: { temperature: 21, conditions: "Partly cloudy" },
        sources: [
          { title: "Open-Meteo live forecast", url: "https://open-meteo.com/" },
        ],
        live: true,
      },
    });
  });
  await page.getByRole("button", { name: "Voice", exact: true }).click();
  await page.getByRole("button", { name: "Start a conversation" }).click();
  await expect(
    page.getByText("VOICE CONNECTED", { exact: true }),
  ).toBeVisible();
  await page.evaluate(() =>
    window.__voiceFixture.emit({
      type: "response.function_call_arguments.done",
      name: "get_weather",
      call_id: "weather-call",
      arguments: JSON.stringify({
        city: "Cape Town",
        country_code: "ZA",
        temperature_unit: "celsius",
      }),
    }),
  );
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__voiceFixture.sent.some(
          (e) => (e.item as { call_id?: string })?.call_id === "weather-call",
        ),
      ),
    )
    .toBeTruthy();
  await page.evaluate(() =>
    window.__voiceFixture.emit({
      type: "response.output_audio_transcript.done",
      item_id: "weather-answer",
      transcript: "It is 21 degrees and partly cloudy in Cape Town.",
    }),
  );
  await expect(page.getByRole("log")).toContainText("21 degrees");
  await expect(
    page.getByRole("link", { name: "open-meteo.com" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "End conversation" }).click();
});
