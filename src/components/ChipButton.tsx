import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface ChipButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
}

export const ChipButton = ({ icon: Icon, label, onClick, variant = "primary" }: ChipButtonProps) => {
  return (
    <motion.button
      onClick={onClick}
      className={`
        group relative overflow-hidden rounded-full px-4 py-2 md:px-6 md:py-3
        flex items-center gap-2 md:gap-3 font-medium transition-all text-sm md:text-base
        ${
          variant === "primary"
            ? "bg-gradient-primary text-white shadow-glow hover:shadow-glow-accent"
            : "bg-secondary text-foreground hover:bg-secondary/80"
        }
      `}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Shimmer effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        initial={{ x: "-100%" }}
        whileHover={{ x: "100%" }}
        transition={{ duration: 0.6 }}
      />

      <Icon className="w-4 h-4 md:w-5 md:h-5 relative z-10" />
      <span className="relative z-10">{label}</span>
    </motion.button>
  );
};
