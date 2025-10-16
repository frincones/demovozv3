export interface Conversation {
  id: string; // Unique ID for react rendering and logging purposes
  role: "user" | "assistant"; // "user" or "assistant"
  text: string; // User or assistant message
  timestamp: string; // ISO string for message time
  isFinal: boolean; // Whether the transcription is final
  status?: "speaking" | "processing" | "final"; // Status for real-time conversation states
}

export interface Tool {
  name: string;
  description: string;
  parameters?: Record<string, any>;
}

export type ConnectionStatus =
  | "disconnected"
  | "requesting_mic"
  | "fetching_token"
  | "establishing_connection"
  | "connected"
  | "error";