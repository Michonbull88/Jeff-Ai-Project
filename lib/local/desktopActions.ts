import "server-only";
import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";
import { HttpError } from "@/lib/server";
import { desktopActionIntent } from "./desktopIntent";

async function firstInstalled(paths: Array<string | undefined>) {
  for (const candidate of paths) {
    if (!candidate) continue;
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next standard installation location.
    }
  }
  return null;
}

async function openChrome(url?: "https://open.spotify.com/") {
  if (process.platform !== "win32")
    throw new HttpError(
      501,
      "Opening Google Chrome is currently available only in JEFF for Windows.",
    );
  const executable = await firstInstalled([
    process.env.PROGRAMFILES &&
      path.join(process.env.PROGRAMFILES, "Google", "Chrome", "Application", "chrome.exe"),
    process.env["PROGRAMFILES(X86)"] &&
      path.join(process.env["PROGRAMFILES(X86)"], "Google", "Chrome", "Application", "chrome.exe"),
    process.env.LOCALAPPDATA &&
      path.join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe"),
  ]);
  if (!executable)
    throw new HttpError(
      404,
      "Google Chrome is not installed in a standard location on this computer.",
    );
  await new Promise<void>((resolve, reject) => {
    const child = spawn(executable, url ? [url] : [], {
      detached: true,
      stdio: "ignore",
      windowsHide: false,
    });
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
    child.once("error", reject);
  }).catch(() => {
    throw new HttpError(502, "JEFF could not open Google Chrome. Please try again.");
  });
}

export async function performDesktopAction(messages: Array<{ role: string; content: string }>, request: Request) {
  const latest = messages.at(-1);
  if (latest?.role !== "user") return null;
  const action = desktopActionIntent(latest.content);
  if (!action) return null;
  const hostname = new URL(request.url).hostname;
  if (hostname !== "127.0.0.1" && hostname !== "localhost")
    throw new HttpError(403, "Desktop actions are available only from JEFF on this computer.");
  if (action === "open-chrome") {
    await openChrome();
    return { content: "Google Chrome is open.", action };
  }
  if (action === "open-spotify-in-chrome") {
    await openChrome("https://open.spotify.com/");
    return { content: "Spotify is open in Google Chrome.", action };
  }
  return null;
}
