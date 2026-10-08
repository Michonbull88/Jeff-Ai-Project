export type JeffState =
  "idle" | "listening" | "thinking" | "speaking" | "error";
export interface Source {
  title: string;
  url: string;
}
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  pending?: boolean;
  live?: boolean;
  cached?: boolean;
}
export interface Settings {
  voice: "cedar" | "marin" | "alloy" | "ash" | "sage";
  microphone: string;
  speaker: string;
  intensity: number;
  speakerMuted: boolean;
}
export interface ServerStatus {
  configured: boolean;
  locked: boolean;
  voiceConfigured?: boolean;
  localSpeechAvailable?: boolean;
  model?: string;
}
