import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Headphones, HelpCircle } from "lucide-react";
import Orb from "@/components/3d-orb";
import { ConsentBanner } from "@/components/ConsentBanner";
import { ChatBox } from "@/components/ChatBox";
import { ChipButton } from "@/components/ChipButton";
import { toast } from "sonner";
import { useLirvana } from "@/hooks/useLirvana";
import { appConfig, log } from "@/config/appConfig";

const Index = () => {
  const [showConsent, setShowConsent] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [language, setLanguage] = useState<'es' | 'en'>('es');

  // Initialize Lirvana system
  const lirvana = useLirvana({
    autoConnect: false,
    language,
    fallbackToSpeech: true
  });

  // Handle voice activation
  const handleActivateVoice = async () => {
    try {
      setShowConsent(false);
      setVoiceEnabled(true);

      toast.success("¡Bienvenido! Iniciando experiencia de voz...");

      // API key is now handled by backend, so we don't need to check it here
      // The WebRTC system will handle the connection and show appropriate errors

      // Connect to Lirvana system
      await lirvana.connect();

      // Show options after successful connection
      setTimeout(() => {
        setShowOptions(true);
      }, 2000);

      log('info', 'Voice activated successfully');
    } catch (error: any) {
      toast.error(`Error activando voz: ${error.message}`);
      log('error', 'Voice activation failed:', error);
      // Fallback to chat
      setChatOpen(true);
    }
  };

  // Handle chat-only mode
  const handleChatOnly = () => {
    setShowConsent(false);
    setChatOpen(true);
    toast.info("Modo chat activado");
    log('info', 'Chat-only mode activated');
  };

  // Handle orb click - main interaction
  const handleOrbClick = async () => {
    if (voiceEnabled && lirvana.isConnected) {
      if (lirvana.isListening) {
        lirvana.stopListening();
        toast.info("Escucha detenida");
      } else {
        try {
          await lirvana.startListening();
          toast.info("Escuchando...");
        } catch (error: any) {
          toast.error(`Error iniciando escucha: ${error.message}`);
        }
      }
    } else if (voiceEnabled && !lirvana.isConnected) {
      try {
        toast.info("Conectando...");
        await lirvana.connect();
      } catch (error: any) {
        toast.error("Error de conexión, abriendo chat");
        setChatOpen(true);
      }
    } else {
      setChatOpen(true);
    }
  };

  // Handle option selection
  const handleOptionClick = (option: string) => {
    toast.success(`Seleccionaste: ${option}`);

    // Send message to Lirvana if connected
    if (lirvana.isConnected) {
      const messages = {
        'Compra': 'Estoy interesado en comprar paneles solares',
        'Soporte': 'Necesito ayuda técnica con mi equipo',
        'Otro': 'Tengo una consulta general'
      };

      const message = messages[option as keyof typeof messages] || option;
      lirvana.sendMessage(message);
    }

    setChatOpen(true);
  };

  return (
    <div className="min-h-screen bg-white overflow-hidden relative" style={{ backgroundColor: 'white' }}>
      {/* Clean white background - no ambient effects */}

      {/* Consent banner */}
      <AnimatePresence>
        {showConsent && (
          <ConsentBanner
            onActivateVoice={handleActivateVoice}
            onUseChatOnly={handleChatOnly}
            onDismiss={() => setShowConsent(false)}
          />
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        {/* Logo/Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-8 md:mb-12 px-4"
        >
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
            Dani
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground">
            Tu asistente inteligente de voz
          </p>
        </motion.div>

        {/* 3D Voice Orb */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-12 md:mb-16 px-4"
        >
          <Orb
            intensity={3}
            className="w-64 h-64 md:w-96 md:h-96 max-w-[90vw] max-h-[90vw]"
            onClick={handleOrbClick}
            currentVolume={lirvana.audioLevel}
            isSessionActive={lirvana.isConnected}
            connectionStatus={lirvana.connectionStatus}
            isSpeaking={lirvana.isSpeaking}
            isListening={lirvana.isListening}
          />
        </motion.div>

        {/* Status text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mb-8 md:mb-12 px-4"
        >
          <p className="text-base md:text-lg text-muted-foreground break-words">
            {lirvana.isSpeaking && "🔊 Hablando..."}
            {lirvana.isListening && "🎤 Escuchando..."}
            {lirvana.isConnecting && "🔄 Conectando..."}
            {lirvana.connectionStatus === 'requesting_mic' && "🎤 Solicitando acceso al micrófono..."}
            {lirvana.connectionStatus === 'fetching_token' && "🔑 Conectando a Dani..."}
            {lirvana.connectionStatus === 'establishing_connection' && "🌐 Estableciendo conexión WebRTC..."}
            {lirvana.error && `❌ Error: ${lirvana.error}`}
            {lirvana.connectionStatus === 'disconnected' && !lirvana.error && "🚀 Toca el orbe para comenzar"}
          </p>
        </motion.div>

        {/* Option chips */}
        <AnimatePresence>
          {showOptions && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex flex-wrap gap-3 md:gap-4 justify-center max-w-2xl px-4"
            >
              <ChipButton
                icon={ShoppingCart}
                label="Compra"
                onClick={() => handleOptionClick("Compra")}
                variant="primary"
              />
              <ChipButton
                icon={Headphones}
                label="Soporte"
                onClick={() => handleOptionClick("Soporte")}
                variant="primary"
              />
              <ChipButton
                icon={HelpCircle}
                label="Otro"
                onClick={() => handleOptionClick("Otro")}
                variant="secondary"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating chat button (when chat is closed) - TEMPORARILY HIDDEN */}
      {false && !chatOpen && !showConsent && (
        <motion.button
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 }}
          onClick={() => setChatOpen(true)}
          className="fixed bottom-4 right-4 md:bottom-8 md:right-8 w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-primary shadow-glow flex items-center justify-center hover:scale-110 transition-transform z-40"
        >
          <svg
            className="w-6 h-6 md:w-8 md:h-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </motion.button>
      )}

      {/* Chat box */}
      <ChatBox
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        isListening={lirvana.isListening}
        isSpeaking={lirvana.isSpeaking}
        onToggleListening={handleOrbClick}
        currentTranscript={lirvana.currentTranscript}
        language={language}
        onLanguageToggle={() => {
          const newLang = language === 'es' ? 'en' : 'es';
          setLanguage(newLang);
          lirvana.setLanguage(newLang);
          toast.info(`Idioma cambiado a ${newLang === 'es' ? 'Español' : 'English'}`);
        }}
        showCaptions={true}
        onToggleCaptions={() => toast.info("Subtítulos alternados")}
        messages={lirvana.messages}
        onSendMessage={(message) => lirvana.sendMessage(message)}
        connectionState={lirvana.isConnected ? 'connected' : lirvana.isConnecting ? 'connecting' : 'disconnected'}
        userLocation={lirvana.userLocation}
        assignedExecutive={lirvana.assignedExecutive}
        onRedirectToWhatsApp={lirvana.redirectToWhatsApp}
        currentVolume={lirvana.audioLevel}
        isSessionActive={lirvana.isConnected}
        connectionStatus={lirvana.connectionStatus}
      />
    </div>
  );
};

export default Index;
