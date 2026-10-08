"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { watchAudio } from "@/lib/audio/analyser";
import type { JeffState, Message, Settings, Source } from "@/types";

type Event = {
  type: string;
  item?: { id: string; role?: string; content?: { type: string }[] };
  item_id?: string;
  delta?: string;
  transcript?: string;
  text?: string;
  name?: string;
  arguments?: string;
  call_id?: string;
  response?: { status?: string };
  error?: { message?: string };
};
export function useRealtime(
  settings: Settings,
  onMessage: (message: Message) => void,
  onError: (message: string) => void,
) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [state, setState] = useState<JeffState>("idle");
  const [audioLevel, setAudioLevel] = useState(0);
  const [muted, setMuted] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const peer = useRef<RTCPeerConnection | null>(null);
  const channel = useRef<RTCDataChannel | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const context = useRef<AudioContext | null>(null);
  const cleanups = useRef<(() => void)[]>([]);
  const generation = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbacks = useRef({ onMessage, onError });
  const currentSettings = useRef(settings);
  const transcripts = useRef(new Map<string, string>());
  const pendingSources = useRef<Source[]>([]);
  const outputActive = useRef(false);
  const turn = useRef(0);
  const searches = useRef(new Map<string, AbortController>());
  const isMuted = useRef(false);
  useEffect(() => {
    callbacks.current = { onMessage, onError };
    currentSettings.current = settings;
    if (audio.current) audio.current.muted = settings.speakerMuted;
  }, [onMessage, onError, settings]);
  const stop = useCallback(() => {
    generation.current++;
    turn.current++;
    searches.current.forEach((job) => job.abort());
    searches.current.clear();
    abort.current?.abort();
    abort.current = null;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    channel.current?.close();
    channel.current = null;
    if (peer.current) {
      peer.current.onconnectionstatechange = null;
      peer.current.close();
      peer.current = null;
    }
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    cleanups.current.forEach((fn) => fn());
    cleanups.current = [];
    void context.current?.close().catch(() => {});
    context.current = null;
    if (audio.current) {
      audio.current.pause();
      audio.current.srcObject = null;
      audio.current = null;
    }
    transcripts.current.clear();
    pendingSources.current = [];
    outputActive.current = false;
    isMuted.current = false;
    setConnected(false);
    setConnecting(false);
    setState("idle");
    setAudioLevel(0);
    setMuted(false);
    setMicActive(false);
  }, []);
  useEffect(() => () => stop(), [stop]);
  useEffect(() => {
    const offline = () => {
      if (peer.current) {
        stop();
        callbacks.current.onError(
          "You are offline. Reconnect to the internet, then start voice again.",
        );
      }
    };
    window.addEventListener("offline", offline);
    return () => window.removeEventListener("offline", offline);
  }, [stop]);
  const send = useCallback((event: unknown) => {
    if (channel.current?.readyState === "open")
      channel.current.send(JSON.stringify(event));
  }, []);
  const start = useCallback(
    async (history: Message[]) => {
      if (peer.current || abort.current) return;
      const id = ++generation.current;
      const valid = () => id === generation.current;
      const controller = new AbortController();
      abort.current = controller;
      setConnecting(true);
      const fail = (message: string) => {
        if (valid()) {
          stop();
          callbacks.current.onError(message);
        }
      };
      timer.current = setTimeout(
        () => fail("Voice took too long to connect. Please try again."),
        30000,
      );
      try {
        if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection)
          throw new Error(
            "Voice needs a supported browser on HTTPS or localhost. You can still use text chat.",
          );
        const mic = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            ...(currentSettings.current.microphone
              ? { deviceId: { exact: currentSettings.current.microphone } }
              : {}),
          },
        });
        if (!valid()) {
          mic.getTracks().forEach((t) => t.stop());
          return;
        }
        stream.current = mic;
        setMicActive(true);
        mic
          .getTracks()
          .forEach((t) =>
            t.addEventListener("ended", () =>
              fail("Your microphone disconnected. Reconnect it and try again."),
            ),
          );
        const ctx = new AudioContext();
        context.current = ctx;
        await ctx.resume();
        if (!valid()) return;
        cleanups.current.push(
          watchAudio(ctx, mic, (level) => {
            if (!outputActive.current && !isMuted.current) setAudioLevel(level);
          }),
        );
        const pc = new RTCPeerConnection();
        peer.current = pc;
        const player = new Audio();
        player.autoplay = true;
        player.muted = currentSettings.current.speakerMuted;
        audio.current = player;
        if (currentSettings.current.speaker && "setSinkId" in player)
          await player.setSinkId(currentSettings.current.speaker);
        if (!valid()) return;
        pc.ontrack = (e) => {
          if (!valid()) return;
          const remote = e.streams[0] || new MediaStream([e.track]);
          player.srcObject = remote;
          void player
            .play()
            .catch(() =>
              callbacks.current.onError(
                "Your browser blocked playback. Check its sound permissions and restart voice.",
              ),
            );
          cleanups.current.push(
            watchAudio(ctx, remote, (level) => {
              if (outputActive.current) setAudioLevel(level);
            }),
          );
        };
        pc.onconnectionstatechange = () => {
          if (["failed", "disconnected"].includes(pc.connectionState))
            fail(
              "The voice connection was interrupted. Please start it again.",
            );
        };
        mic.getTracks().forEach((track) => pc.addTrack(track, mic));
        const dc = pc.createDataChannel("oai-events");
        channel.current = dc;
        dc.onclose = () =>
          fail(
            "Voice has disconnected. Start a new conversation to reconnect.",
          );
        dc.onopen = () => {
          if (!valid()) return;
          if (timer.current) clearTimeout(timer.current);
          timer.current = null;
          setConnecting(false);
          setConnected(true);
          setState("listening");
          for (const message of history.filter((m) => !m.pending).slice(-30))
            send({
              type: "conversation.item.create",
              item: {
                type: "message",
                role: message.role,
                content: [
                  {
                    type: message.role === "user" ? "input_text" : "text",
                    text: message.content,
                  },
                ],
              },
            });
          if (!history.length)
            send({
              type: "response.create",
              response: {
                instructions:
                  "Briefly greet the user: Hello, I'm Jeff. How can I help you?",
              },
            });
        };
        dc.onmessage = async (raw) => {
          if (!valid()) return;
          let event: Event;
          try {
            event = JSON.parse(raw.data);
          } catch {
            return;
          }
          switch (event.type) {
            case "input_audio_buffer.speech_started":
              turn.current++;
              searches.current.forEach((job) => job.abort());
              searches.current.clear();
              outputActive.current = false;
              setState("listening");
              pendingSources.current = [];
              break;
            case "input_audio_buffer.speech_stopped":
              setState("thinking");
              break;
            case "response.created":
              setState("thinking");
              break;
            case "output_audio_buffer.started":
              outputActive.current = true;
              setState("speaking");
              break;
            case "output_audio_buffer.stopped":
            case "output_audio_buffer.cleared":
              outputActive.current = false;
              setAudioLevel(0);
              setState(isMuted.current ? "idle" : "listening");
              break;
            case "conversation.item.added":
            case "conversation.item.created":
              if (
                event.item?.role === "user" &&
                event.item.content?.some((c) => c.type === "input_audio")
              )
                callbacks.current.onMessage({
                  id: event.item.id,
                  role: "user",
                  content: "Transcribing…",
                  pending: true,
                });
              break;
            case "conversation.item.input_audio_transcription.failed":
              if (event.item_id)
                callbacks.current.onMessage({
                  id: event.item_id,
                  role: "user",
                  content: "Audio could not be transcribed.",
                  pending: true,
                });
              callbacks.current.onError(
                "That audio could not be transcribed. Please try again.",
              );
              break;
            case "conversation.item.input_audio_transcription.completed":
              if (event.transcript?.trim())
                callbacks.current.onMessage({
                  id: event.item_id || crypto.randomUUID(),
                  role: "user",
                  content: event.transcript,
                  pending: false,
                });
              break;
            case "response.output_audio_transcript.delta":
            case "response.output_text.delta": {
              const key = event.item_id || "response";
              const text =
                (transcripts.current.get(key) || "") + (event.delta || "");
              transcripts.current.set(key, text);
              callbacks.current.onMessage({
                id: key,
                role: "assistant",
                content: text,
                sources: pendingSources.current,
                live: pendingSources.current.length > 0,
              });
              break;
            }
            case "response.output_audio_transcript.done":
            case "response.output_text.done": {
              const key = event.item_id || "response";
              const text =
                event.transcript ||
                event.text ||
                transcripts.current.get(key) ||
                "";
              if (text)
                callbacks.current.onMessage({
                  id: key,
                  role: "assistant",
                  content: text,
                  sources: pendingSources.current,
                  live: pendingSources.current.length > 0,
                });
              transcripts.current.delete(key);
              break;
            }
            case "response.function_call_arguments.done": {
              if (
                !["search_web", "get_weather"].includes(event.name || "") ||
                !event.call_id ||
                searches.current.has(event.call_id)
              )
                break;
              const searchTurn = turn.current;
              const searchController = new AbortController();
              searches.current.set(event.call_id, searchController);
              setState("thinking");
              try {
                const args = JSON.parse(event.arguments || "{}");
                const response = await fetch(
                  event.name === "get_weather" ? "/api/weather" : "/api/search",
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(
                      event.name === "get_weather"
                        ? args
                        : { query: args.query },
                    ),
                    signal: AbortSignal.any([
                      controller.signal,
                      searchController.signal,
                    ]),
                  },
                );
                const result = await response.json();
                if (!valid()) return;
                if (searchTurn !== turn.current)
                  throw new DOMException("Interrupted", "AbortError");
                if (!response.ok)
                  throw new Error(result.error || "Search is unavailable.");
                pendingSources.current = result.sources || [];
                send({
                  type: "conversation.item.create",
                  item: {
                    type: "function_call_output",
                    call_id: event.call_id,
                    output: JSON.stringify(result),
                  },
                });
                send({ type: "response.create" });
              } catch (error) {
                if (!valid()) return;
                if (searchTurn !== turn.current) {
                  send({
                    type: "conversation.item.create",
                    item: {
                      type: "function_call_output",
                      call_id: event.call_id,
                      output: JSON.stringify({
                        error:
                          "Search cancelled because the user started a new turn. Do not answer the previous question.",
                      }),
                    },
                  });
                  break;
                }
                send({
                  type: "conversation.item.create",
                  item: {
                    type: "function_call_output",
                    call_id: event.call_id,
                    output: JSON.stringify({
                      error:
                        "The live information lookup failed. Tell the user you could not verify current information.",
                    }),
                  },
                });
                send({ type: "response.create" });
                callbacks.current.onError(
                  error instanceof Error
                    ? error.message
                    : "Live search is unavailable.",
                );
              } finally {
                searches.current.delete(event.call_id);
              }
              break;
            }
            case "response.done":
              if (event.response?.status === "failed")
                callbacks.current.onError(
                  "JEFF could not finish that response. Please try again.",
                );
              if (!outputActive.current)
                setState(
                  searches.current.size
                    ? "thinking"
                    : isMuted.current
                      ? "idle"
                      : "listening",
                );
              break;
            case "error":
              fail(
                "The voice service encountered a problem. Please reconnect.",
              );
              break;
          }
        };
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        if (!valid()) return;
        const response = await fetch("/api/realtime", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sdp: offer.sdp,
            voice: currentSettings.current.voice,
          }),
          signal: controller.signal,
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Voice could not connect.");
        }
        const sdp = await response.text();
        if (valid()) await pc.setRemoteDescription({ type: "answer", sdp });
      } catch (error) {
        if (!valid()) return;
        const name = error instanceof DOMException ? error.name : "";
        fail(
          name === "NotAllowedError"
            ? "Microphone access was denied. Allow it in your browser settings, or use text chat."
            : name === "NotFoundError"
              ? "No microphone was found. Connect one, or use text chat."
              : error instanceof Error
                ? error.message
                : "Voice could not connect. Please try again.",
        );
      }
    },
    [send, stop],
  );
  const toggleMute = () => {
    const next = !isMuted.current;
    isMuted.current = next;
    setMuted(next);
    stream.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
    if (!outputActive.current) setState(next ? "idle" : "listening");
    setAudioLevel(0);
  };
  const sendText = (text: string) => {
    turn.current++;
    searches.current.forEach((job) => job.abort());
    searches.current.clear();
    pendingSources.current = [];
    send({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text }],
      },
    });
    send({ type: "response.create" });
    setState("thinking");
  };
  return {
    connected,
    connecting,
    micActive,
    state,
    audioLevel,
    muted,
    start,
    stop,
    toggleMute,
    sendText,
  };
}
