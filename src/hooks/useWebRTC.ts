"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Conversation, Tool, ConnectionStatus } from "@/types/conversation";

interface UseWebRTCReturn {
  status: string;
  connectionStatus: ConnectionStatus;
  isSessionActive: boolean;
  audioIndicatorRef: React.RefObject<HTMLDivElement | null>;
  startSession: () => Promise<void>;
  stopSession: () => void;
  handleStartStopClick: () => void;
  registerFunction: (name: string, fn: Function) => void;
  msgs: any[];
  currentVolume: number;
  conversation: Conversation[];
  error: string | null;
  clearError: () => void;
  sendTextMessage: (message: string) => void;
  currentTranscript: string;
}

/**
 * Hook to manage a real-time session with OpenAI's Realtime API using WebRTC.
 * Based on the working implementation from openai-realtime-blocks.
 */
export default function useWebRTC(
  voice: string = "alloy",
  tools?: Tool[],
): UseWebRTCReturn {
  // Connection/session states
  const [status, setStatus] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Audio references for local mic
  const audioIndicatorRef = useRef<HTMLDivElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  // WebRTC references
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);

  // Keep track of all raw events/messages
  const [msgs, setMsgs] = useState<any[]>([]);

  // Main conversation state
  const [conversation, setConversation] = useState<Conversation[]>([]);

  // Current transcript for real-time display
  const [currentTranscript, setCurrentTranscript] = useState('');

  // For function calls (AI "tools")
  const functionRegistry = useRef<Record<string, Function>>({});

  // Volume analysis (assistant inbound audio)
  const [currentVolume, setCurrentVolume] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const volumeIntervalRef = useRef<number | null>(null);

  /**
   * We track only the ephemeral user message **ID** here.
   * While user is speaking, we update that conversation item by ID.
   */
  const ephemeralUserMessageIdRef = useRef<string | null>(null);

  /**
   * Register a function (tool) so the AI can call it.
   */
  const registerFunction = useCallback((name: string, fn: Function) => {
    functionRegistry.current[name] = fn;
  }, []);

  /**
   * Configure the data channel on open, sending a session update to the server.
   */
  const configureDataChannel = useCallback((dataChannel: RTCDataChannel) => {
    const sessionUpdate = {
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        tools: tools || [],
        input_audio_transcription: {
          model: "whisper-1",
        },
      },
    };
    dataChannel.send(JSON.stringify(sessionUpdate));
  }, [tools]);

  /**
   * Return an ephemeral user ID, creating a new ephemeral message in conversation if needed.
   */
  const getOrCreateEphemeralUserId = useCallback((): string => {
    let ephemeralId = ephemeralUserMessageIdRef.current;
    if (!ephemeralId) {
      // Use uuidv4 for a robust unique ID
      ephemeralId = uuidv4();
      ephemeralUserMessageIdRef.current = ephemeralId;

      const newMessage: Conversation = {
        id: ephemeralId,
        role: "user",
        text: "",
        timestamp: new Date().toISOString(),
        isFinal: false,
        status: "speaking",
      };

      // Append the ephemeral item to conversation
      setConversation((prev) => [...prev, newMessage]);
    }
    return ephemeralId;
  }, []);

  /**
   * Update the ephemeral user message (by ephemeralUserMessageIdRef) with partial changes.
   */
  const updateEphemeralUserMessage = useCallback((partial: Partial<Conversation>) => {
    const ephemeralId = ephemeralUserMessageIdRef.current;
    if (!ephemeralId) return; // no ephemeral user message to update

    setConversation((prev) =>
      prev.map((msg) => {
        if (msg.id === ephemeralId) {
          return { ...msg, ...partial };
        }
        return msg;
      }),
    );
  }, []);

  /**
   * Clear ephemeral user message ID so the next user speech starts fresh.
   */
  const clearEphemeralUserMessage = useCallback(() => {
    ephemeralUserMessageIdRef.current = null;
  }, []);

  /**
   * Main data channel message handler: interprets events from the server.
   */
  const handleDataChannelMessage = useCallback(async (event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data);
      console.log("[WEBRTC] Incoming message:", msg.type, msg);

      switch (msg.type) {
        /**
         * User speech started
         */
        case "input_audio_buffer.speech_started": {
          getOrCreateEphemeralUserId();
          updateEphemeralUserMessage({ status: "speaking" });
          break;
        }

        /**
         * User speech stopped
         */
        case "input_audio_buffer.speech_stopped": {
          updateEphemeralUserMessage({ status: "speaking" });
          break;
        }

        /**
         * Audio buffer committed => "Processing speech..."
         */
        case "input_audio_buffer.committed": {
          updateEphemeralUserMessage({
            text: "Processing speech...",
            status: "processing",
          });
          break;
        }

        /**
         * Partial user transcription
         */
        case "conversation.item.input_audio_transcription": {
          const partialText =
            msg.transcript ?? msg.text ?? "User is speaking...";
          updateEphemeralUserMessage({
            text: partialText,
            status: "speaking",
            isFinal: false,
          });
          break;
        }

        /**
         * Final user transcription
         */
        case "conversation.item.input_audio_transcription.completed": {
          console.log("[WEBRTC] Final user transcription:", msg.transcript);
          updateEphemeralUserMessage({
            text: msg.transcript || "",
            isFinal: true,
            status: "final",
          });
          clearEphemeralUserMessage();
          break;
        }

        /**
         * Streaming AI transcripts (assistant partial)
         */
        case "response.audio_transcript.delta": {
          // Update current transcript for real-time display
          setCurrentTranscript(prev => prev + msg.delta);

          const newMessage: Conversation = {
            id: uuidv4(), // generate a fresh ID for each assistant partial
            role: "assistant",
            text: msg.delta,
            timestamp: new Date().toISOString(),
            isFinal: false,
          };

          setConversation((prev) => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg && lastMsg.role === "assistant" && !lastMsg.isFinal) {
              // Append to existing assistant partial
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...lastMsg,
                text: lastMsg.text + msg.delta,
              };
              return updated;
            } else {
              // Start a new assistant partial
              return [...prev, newMessage];
            }
          });
          break;
        }

        /**
         * Mark the last assistant message as final
         */
        case "response.audio_transcript.done": {
          // Clear current transcript when response is done
          setCurrentTranscript('');

          setConversation((prev) => {
            if (prev.length === 0) return prev;
            const updated = [...prev];
            updated[updated.length - 1].isFinal = true;
            return updated;
          });
          break;
        }

        /**
         * AI calls a function (tool)
         */
        case "response.function_call_arguments.done": {
          const fn = functionRegistry.current[msg.name];
          if (fn) {
            const args = JSON.parse(msg.arguments);
            const result = await fn(args);

            // Respond with function output
            const response = {
              type: "conversation.item.create",
              item: {
                type: "function_call_output",
                call_id: msg.call_id,
                output: JSON.stringify(result),
              },
            };
            dataChannelRef.current?.send(JSON.stringify(response));
          }
          break;
        }

        default: {
          console.log("[WEBRTC] Unhandled message type:", msg.type);
          break;
        }
      }

      // Always log the raw message
      setMsgs((prevMsgs) => [...prevMsgs, msg]);
      return msg;
    } catch (error) {
      console.error("[WEBRTC] Error handling data channel message:", error);
      setError(`Message handling error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [getOrCreateEphemeralUserId, updateEphemeralUserMessage, clearEphemeralUserMessage]);

  /**
   * Fetch ephemeral token from our backend
   */
  const getEphemeralToken = useCallback(async () => {
    try {
      // Use relative path for Vercel serverless functions in production
      const apiUrl = import.meta.env.MODE === 'production'
        ? '/api/session'
        : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001') + '/api/session';

      console.log('[WEBRTC] Fetching ephemeral token from:', apiUrl);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get ephemeral token: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[WEBRTC] Ephemeral token received');
      return data.client_secret.value;
    } catch (err) {
      console.error("[WEBRTC] getEphemeralToken error:", err);
      throw err;
    }
  }, []);

  /**
   * Sets up a local audio visualization for mic input.
   */
  const setupAudioVisualization = useCallback((stream: MediaStream) => {
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyzer = audioContext.createAnalyser();
    analyzer.fftSize = 256;
    source.connect(analyzer);

    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateIndicator = () => {
      if (!audioContext) return;
      analyzer.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;

      // Toggle an "active" class if volume is above a threshold
      if (audioIndicatorRef.current) {
        audioIndicatorRef.current.classList.toggle("active", average > 30);
      }
      requestAnimationFrame(updateIndicator);
    };
    updateIndicator();

    audioContextRef.current = audioContext;
  }, []);

  /**
   * Calculate RMS volume from inbound assistant audio
   */
  const getVolume = useCallback((): number => {
    if (!analyserRef.current) return 0;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteTimeDomainData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const float = (dataArray[i] - 128) / 128;
      sum += float * float;
    }
    return Math.sqrt(sum / dataArray.length);
  }, []);

  /**
   * Start a new session:
   */
  const startSession = useCallback(async () => {
    try {
      setError(null);
      setConnectionStatus("requesting_mic");
      setStatus("Requesting microphone access...");

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      setupAudioVisualization(stream);

      setConnectionStatus("fetching_token");
      setStatus("Fetching ephemeral token...");
      const ephemeralToken = await getEphemeralToken();

      setConnectionStatus("establishing_connection");
      setStatus("Establishing connection...");

      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      // Hidden <audio> element for inbound assistant TTS
      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;

      // Inbound track => assistant's TTS
      pc.ontrack = (event) => {
        console.log('[WEBRTC] Received audio track');
        audioEl.srcObject = event.streams[0];

        // Measure inbound volume for orb animation
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const src = audioCtx.createMediaStreamSource(event.streams[0]);
        const inboundAnalyzer = audioCtx.createAnalyser();
        inboundAnalyzer.fftSize = 256;
        src.connect(inboundAnalyzer);
        analyserRef.current = inboundAnalyzer;

        // Start volume monitoring
        volumeIntervalRef.current = window.setInterval(() => {
          setCurrentVolume(getVolume());
        }, 50); // Update volume 20 times per second for smooth animation
      };

      // Data channel for transcripts
      const dataChannel = pc.createDataChannel("response");
      dataChannelRef.current = dataChannel;

      dataChannel.onopen = () => {
        console.log("[WEBRTC] Data channel open");
        configureDataChannel(dataChannel);
      };

      dataChannel.onmessage = handleDataChannelMessage;

      // Add local (mic) track
      pc.addTrack(stream.getTracks()[0]);

      // Create offer & set local description
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send SDP offer to OpenAI Realtime
      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-12-17";
      const response = await fetch(`${baseUrl}?model=${model}&voice=${voice}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralToken}`,
          "Content-Type": "application/sdp",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`WebRTC connection failed: ${response.status} - ${errorText}`);
      }

      // Set remote description
      const answerSdp = await response.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      setIsSessionActive(true);
      setConnectionStatus("connected");
      setStatus("Session established successfully!");

      console.log('[WEBRTC] ✅ Session established successfully');

    } catch (err) {
      console.error("[WEBRTC] startSession error:", err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setStatus(`Error: ${errorMessage}`);
      setConnectionStatus("error");
      stopSession();
    }
  }, [voice, setupAudioVisualization, getEphemeralToken, configureDataChannel, handleDataChannelMessage, getVolume]);

  /**
   * Stop the session & cleanup
   */
  const stopSession = useCallback(() => {
    console.log('[WEBRTC] Stopping session...');

    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
    if (audioIndicatorRef.current) {
      audioIndicatorRef.current.classList.remove("active");
    }
    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current);
      volumeIntervalRef.current = null;
    }
    analyserRef.current = null;

    ephemeralUserMessageIdRef.current = null;

    setCurrentVolume(0);
    setIsSessionActive(false);
    setConnectionStatus("disconnected");
    setStatus("Session stopped");
    setMsgs([]);
    setConversation([]);
  }, []);

  /**
   * Toggle start/stop from a single button
   */
  const handleStartStopClick = useCallback(() => {
    if (isSessionActive) {
      stopSession();
    } else {
      startSession();
    }
  }, [isSessionActive, startSession, stopSession]);

  /**
   * Send text message through the data channel
   */
  const sendTextMessage = useCallback((message: string) => {
    if (!dataChannelRef.current || !isSessionActive) {
      console.error('[WEBRTC] Cannot send text message: not connected');
      return;
    }

    try {
      // Add user message to conversation
      const userMessage: Conversation = {
        id: uuidv4(),
        role: "user",
        text: message,
        timestamp: new Date().toISOString(),
        isFinal: true,
        status: "final",
      };

      setConversation(prev => [...prev, userMessage]);

      // Send text input to the assistant via data channel
      const textInputEvent = {
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text: message
            }
          ]
        }
      };

      console.log('[WEBRTC] Sending text message:', message);
      dataChannelRef.current.send(JSON.stringify(textInputEvent));

      // Trigger response
      setTimeout(() => {
        if (dataChannelRef.current) {
          const responseEvent = {
            type: "response.create"
          };
          dataChannelRef.current.send(JSON.stringify(responseEvent));
        }
      }, 100);

    } catch (error) {
      console.error('[WEBRTC] Error sending text message:', error);
      setError(`Error sending message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [isSessionActive]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopSession();
  }, [stopSession]);

  return {
    status,
    connectionStatus,
    isSessionActive,
    audioIndicatorRef,
    startSession,
    stopSession,
    handleStartStopClick,
    registerFunction,
    msgs,
    currentVolume,
    conversation,
    error,
    clearError,
    sendTextMessage,
    currentTranscript,
  };
}