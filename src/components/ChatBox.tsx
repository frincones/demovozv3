import { motion, AnimatePresence } from "framer-motion";
import { Mic, Send, Globe, Subtitles, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import OrbMini from "./3d-orb-mini";
import { useState, useEffect } from "react";
import type { UserLocation, Executive, WhatsAppRedirection } from "@/types/business";

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatBoxProps {
  isOpen: boolean;
  onClose: () => void;
  isListening?: boolean;
  isSpeaking?: boolean;
  onToggleListening?: () => void;
  currentTranscript?: string;
  language?: "es" | "en";
  onLanguageToggle?: () => void;
  showCaptions?: boolean;
  onToggleCaptions?: () => void;
  messages?: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    type: 'text' | 'audio';
  }>;
  onSendMessage?: (message: string) => void;
  connectionState?: 'connected' | 'connecting' | 'disconnected';
  userLocation?: UserLocation | null;
  assignedExecutive?: Executive | null;
  onRedirectToWhatsApp?: (redirection: WhatsAppRedirection) => void;
  // 3D Orb props
  currentVolume?: number;
  isSessionActive?: boolean;
  connectionStatus?: 'disconnected' | 'requesting_mic' | 'fetching_token' | 'establishing_connection' | 'connected' | 'error';
}

export const ChatBox = ({
  isOpen,
  onClose,
  isListening = false,
  isSpeaking = false,
  onToggleListening,
  currentTranscript = "",
  language = "es",
  onLanguageToggle,
  showCaptions = true,
  onToggleCaptions,
  messages: externalMessages = [],
  onSendMessage,
  connectionState = 'disconnected',
  userLocation,
  assignedExecutive,
  onRedirectToWhatsApp,
  currentVolume = 0,
  isSessionActive = false,
  connectionStatus = 'disconnected',
}: ChatBoxProps) => {
  const [inputValue, setInputValue] = useState("");

  // Use external messages if provided, otherwise use default
  const messages = externalMessages.length > 0 ? externalMessages : [
    {
      id: "1",
      role: "assistant" as const,
      content: "¡Hola! Soy Lirvana. Para ayudarte de la mejor manera, ¿podrías decirme en qué país, ciudad y departamento te encuentras?",
      timestamp: new Date(),
      type: "text" as const,
    },
  ];

  const handleSend = () => {
    if (!inputValue.trim()) return;

    // Send message through external handler if available
    if (onSendMessage) {
      onSendMessage(inputValue);
    }

    setInputValue("");
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="fixed bottom-4 right-4 w-[90vw] max-w-[480px] h-[80vh] max-h-[720px] md:bottom-8 md:right-8 md:w-[480px] md:h-[720px] z-50"
      >
        <div className="relative h-full bg-card/80 backdrop-blur-2xl border border-border rounded-3xl shadow-elegant overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-3 md:p-4 border-b border-border bg-background/50">
            <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shadow-glow ${
                connectionState === 'connected' ? 'bg-gradient-primary' :
                connectionState === 'connecting' ? 'bg-yellow-500' : 'bg-gray-500'
              }`}>
                <span className="text-white font-bold text-xs md:text-sm">L</span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-foreground text-sm md:text-base">Lirvana</h3>
                <p className="text-xs text-muted-foreground truncate">
                  {connectionState === 'connected' ? 'Conectado' :
                   connectionState === 'connecting' ? 'Conectando...' : 'Desconectado'}
                  {userLocation && (
                    <span className="hidden sm:inline"> • {userLocation.city}, {userLocation.country}</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 md:gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={onLanguageToggle}
                className="h-8 w-8 md:h-9 md:w-9"
              >
                <Globe className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleCaptions}
                className={`h-8 w-8 md:h-9 md:w-9 ${showCaptions ? "text-primary" : ""}`}
              >
                <Subtitles className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 md:h-9 md:w-9"
              >
                <X className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
            </div>
          </div>

          {/* Executive assignment banner */}
          {assignedExecutive && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-3 md:mx-6 mt-3 md:mt-4 p-3 bg-green-50 border border-green-200 rounded-xl"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-green-800 truncate">
                    Ejecutivo asignado: {assignedExecutive.name}
                  </p>
                  <p className="text-xs text-green-600 truncate">
                    Zona: {assignedExecutive.zone}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                  onClick={() => {
                    if (onRedirectToWhatsApp && assignedExecutive) {
                      const redirection: WhatsAppRedirection = {
                        executive: assignedExecutive,
                        message: `Hola ${assignedExecutive.name}, me comunico desde la web de Lirvan. Necesito información sobre productos solares.`,
                        link: assignedExecutive.whatsapp_link,
                        context: {
                          user_location: userLocation,
                          assigned_executive: assignedExecutive,
                          products_discussed: [],
                          intent: 'purchase_intent',
                          stage: 'redirection',
                          metadata: {}
                        },
                        timestamp: new Date()
                      };
                      onRedirectToWhatsApp(redirection);
                    }
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  WhatsApp
                </Button>
              </div>
            </motion.div>
          )}

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-3 md:space-y-4">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] md:max-w-[80%] rounded-2xl px-3 py-2 md:px-4 md:py-3 ${
                    message.role === "user"
                      ? "bg-primary text-white shadow-glow"
                      : "bg-secondary text-foreground"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Live transcript */}
          {showCaptions && currentTranscript && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-3 md:px-6 pb-2"
            >
              <div className="bg-muted/50 rounded-xl px-3 py-2 md:px-4 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Transcripción en vivo:</p>
                <p className="text-sm text-foreground break-words">{currentTranscript}</p>
              </div>
            </motion.div>
          )}

          {/* Orb area */}
          <div className="flex justify-center py-4 md:py-6 bg-background/30">
            <div className="w-16 h-16 md:w-20 md:h-20">
              <OrbMini
                currentVolume={currentVolume}
                isSessionActive={isSessionActive}
                connectionStatus={connectionStatus}
                isSpeaking={isSpeaking}
                isListening={isListening}
                onClick={onToggleListening}
                className="w-full h-full"
              />
            </div>
          </div>

          {/* Input area */}
          <div className="p-3 md:p-4 border-t border-border bg-background/50">
            <div className="flex gap-2">
              <Button
                variant={isListening ? "default" : "secondary"}
                size="icon"
                onClick={onToggleListening}
                className={`h-10 w-10 md:h-11 md:w-11 ${isListening ? "bg-primary shadow-glow" : ""}`}
              >
                <Mic className="h-4 w-4 md:h-5 md:w-5" />
              </Button>

              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                placeholder="Escribe un mensaje..."
                className="flex-1 bg-background/50 border-border h-10 md:h-11 text-sm md:text-base"
              />

              <Button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className="bg-primary hover:bg-primary/90 shadow-glow h-10 w-10 md:h-11 md:w-11"
                size="icon"
              >
                <Send className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
