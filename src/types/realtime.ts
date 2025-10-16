// OpenAI Realtime API Types
export interface RealtimeEvent {
  type: string;
  event_id?: string;
  [key: string]: any;
}

export interface RealtimeAudioConfig {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  inputGain?: number;
  outputGain?: number;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
}

export interface RealtimeSessionConfig {
  apiKey: string;
  model: string;
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  temperature?: number;
  maxTokens?: number;
  instructions?: string;
  tools?: RealtimeTool[];
}

export interface RealtimeTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ConversationItem {
  id: string;
  type: 'message' | 'function_call' | 'function_call_output';
  role?: 'user' | 'assistant' | 'system';
  content?: Array<{
    type: 'input_text' | 'input_audio' | 'text';
    text?: string;
    audio?: string;
    transcript?: string;
  }>;
  call_id?: string;
  name?: string;
  arguments?: string;
  output?: string;
}

export interface RealtimeClient {
  connect(): Promise<void>;
  disconnect(): void;
  isConnected(): boolean;
  sendUserMessageContent(content: any[]): void;
  createResponse(): void;
  cancelResponse(): void;
  on(event: string, handler: Function): void;
  off(event: string, handler: Function): void;
  addTool(tool: RealtimeTool, handler: Function): void;
  updateSession(config: Partial<RealtimeSessionConfig>): void;
}

// Connection States
export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

// Audio States
export type AudioState =
  | 'idle'
  | 'recording'
  | 'processing'
  | 'playing';

// Conversation States
export type ConversationState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'interrupted';

export interface RealtimeError {
  type: string;
  code?: string;
  message: string;
  param?: string;
  event_id?: string;
}

export class RealtimeError extends Error {
  public type: string;
  public code?: string;
  public param?: string;
  public event_id?: string;
  public details?: any;

  constructor(data: { type: string; message: string; code?: string; param?: string; event_id?: string; details?: any }) {
    super(data.message);
    this.name = 'RealtimeError';
    this.type = data.type;
    this.code = data.code;
    this.param = data.param;
    this.event_id = data.event_id;
    this.details = data.details;
  }
}

export interface AudioBuffer {
  data: ArrayBuffer;
  sampleRate: number;
  channels: number;
  timestamp: number;
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  isFinal: boolean;
  timestamp: number;
}