import { test, expect } from "@playwright/test";
import { desktopActionIntent } from "../lib/local/desktopIntent";

test("recognises explicit requests to open Chrome", () => {
  for (const request of [
    "Open Google Chrome",
    "please launch chrome browser.",
    "Can you open Chrome on my laptop?",
    "Could you start the Google Chrome browser?",
  ])
    expect(desktopActionIntent(request)).toBe("open-chrome");
});

test("does not turn questions or extra instructions into desktop actions", () => {
  for (const request of [
    "How do I open Google Chrome?",
    "Why won't Chrome open?",
    "Open Firefox",
    "Open Chrome and visit example.com",
    "Open Spotify",
    "Open Spotify in Firefox",
    "Write instructions to launch Chrome",
  ])
    expect(desktopActionIntent(request)).toBeNull();
});

test("recognises explicit requests to open Spotify in Chrome", () => {
  for (const request of [
    "Open Spotify in Google Chrome",
    "please launch the Spotify website within Chrome.",
    "Can you open Spotify with in Google Chrome on my laptop?",
    "Start Spotify using the Chrome browser",
  ])
    expect(desktopActionIntent(request)).toBe("open-spotify-in-chrome");
});
