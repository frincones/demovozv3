import { motion } from "framer-motion";
import { Mic, Volume2 } from "lucide-react";

interface VoiceOrbProps {
  isListening?: boolean;
  isSpeaking?: boolean;
  onClick?: () => void;
  audioLevel?: number;
  connectionState?: 'connected' | 'connecting' | 'disconnected';
}

export const VoiceOrb = ({
  isListening = false,
  isSpeaking = false,
  onClick,
  audioLevel = 0,
  connectionState = 'disconnected'
}: VoiceOrbProps) => {
  const orbSize = "w-64 h-64";
  const isActive = isListening || isSpeaking;
  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting';
  
  return (
    <motion.div
      className="relative flex items-center justify-center cursor-pointer"
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Outer glow rings */}
      <motion.div
        className={`absolute ${orbSize} rounded-full ${
          isSpeaking ? "bg-accent/20" : "bg-primary/20"
        }`}
        animate={{
          scale: isActive ? [1, 1.3, 1] : 1,
          opacity: isActive ? [0.5, 0.2, 0.5] : 0.3,
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          filter: `blur(20px)`,
          boxShadow: isSpeaking ? "var(--shadow-glow-accent)" : "var(--shadow-glow)",
        }}
      />
      
      {/* Middle ring */}
      <motion.div
        className={`absolute ${orbSize} rounded-full ${
          isSpeaking ? "bg-accent/30" : "bg-primary/30"
        }`}
        animate={{
          scale: isActive ? [1, 1.2, 1] : 1,
          opacity: isActive ? [0.6, 0.3, 0.6] : 0.4,
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.2,
        }}
        style={{
          filter: "blur(15px)",
        }}
      />

      {/* Main orb */}
      <motion.div
        className={`relative ${orbSize} rounded-full bg-gradient-to-br ${
          isSpeaking
            ? "from-accent via-accent-glow to-accent"
            : isConnecting
            ? "from-yellow-500 via-yellow-400 to-yellow-600"
            : isConnected
            ? "from-primary via-primary-glow to-primary"
            : "from-gray-500 via-gray-400 to-gray-600"
        } flex items-center justify-center`}
        animate={{
          scale: isActive ? [1, 1.05 + (audioLevel * 0.1), 1] : isConnecting ? [1, 1.02, 1] : 1,
        }}
        transition={{
          duration: isConnecting ? 0.8 : 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          boxShadow: isSpeaking
            ? "var(--shadow-glow-accent)"
            : isConnected
            ? "var(--shadow-glow)"
            : "0 0 20px rgba(128, 128, 128, 0.5)",
        }}
      >
        {/* Glassmorphism overlay */}
        <div className="absolute inset-0 rounded-full bg-white/10 backdrop-blur-sm" />
        
        {/* Icon */}
        <motion.div
          animate={{
            scale: isActive ? [1, 1.1, 1] : 1,
            rotate: isSpeaking ? [0, 5, -5, 0] : 0,
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {isSpeaking ? (
            <Volume2 className="w-24 h-24 text-white drop-shadow-2xl" />
          ) : (
            <Mic className="w-24 h-24 text-white drop-shadow-2xl" />
          )}
        </motion.div>
      </motion.div>

      {/* Listening indicator particles */}
      {isListening && (
        <>
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3 rounded-full bg-primary"
              style={{
                left: "50%",
                top: "50%",
              }}
              animate={{
                x: [0, Math.cos((i * Math.PI * 2) / 8) * 150],
                y: [0, Math.sin((i * Math.PI * 2) / 8) * 150],
                opacity: [0.8, 0],
                scale: [1, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeOut",
                delay: i * 0.2,
              }}
            />
          ))}
        </>
      )}
    </motion.div>
  );
};
