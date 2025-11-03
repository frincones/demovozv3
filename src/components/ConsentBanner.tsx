import { motion } from "framer-motion";
import { Mic, MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConsentBannerProps {
  onActivateVoice: () => void;
  onUseChatOnly: () => void;
  onDismiss: () => void;
}

export const ConsentBanner = ({ onActivateVoice, onUseChatOnly, onDismiss }: ConsentBannerProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-4 md:top-8 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 z-50 max-w-2xl md:w-full"
    >
      <div className="relative bg-card/90 backdrop-blur-xl border border-border rounded-2xl p-4 md:p-6 shadow-elegant">
        {/* Close button */}
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 md:top-4 md:right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4 md:w-5 md:h-5" />
        </button>

        {/* Content */}
        <div className="flex flex-col items-center text-center space-y-3 md:space-y-4 pr-8">
          <div className="flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary/20 animate-pulse-glow">
            <Mic className="w-6 h-6 md:w-8 md:h-8 text-primary" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg md:text-xl font-semibold text-foreground">
              ¿Te doy la bienvenida por voz?
            </h3>
            <p className="text-xs md:text-sm text-muted-foreground max-w-md leading-relaxed">
              Activa el micrófono para hablar directamente con Kike, tu asistente de seguridad de Fasecolda, o continúa solo con chat de texto
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-2 md:gap-3 pt-2 w-full max-w-xs">
            <Button
              onClick={onActivateVoice}
              className="bg-gradient-primary text-white hover:opacity-90 transition-opacity shadow-glow w-full sm:w-auto"
              size="sm"
            >
              <Mic className="w-4 h-4 mr-2" />
              Activar voz
            </Button>

            <Button
              onClick={onUseChatOnly}
              variant="secondary"
              className="bg-secondary hover:bg-secondary/80 w-full sm:w-auto"
              size="sm"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Solo chat
            </Button>
          </div>

          {/* Privacy note */}
          <p className="text-xs text-muted-foreground/70 max-w-md leading-relaxed">
            Tu privacidad es importante. El audio se procesa en tiempo real con OpenAI para ofrecerte la mejor experiencia. No se almacenan grabaciones sin tu consentimiento explícito.
          </p>
        </div>
      </div>
    </motion.div>
  );
};
