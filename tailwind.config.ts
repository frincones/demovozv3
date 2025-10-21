import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          glow: "hsl(var(--primary-glow))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          glow: "hsl(var(--accent-glow))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Futuristic ORB colors
        "electric-blue": "hsl(var(--electric-blue))",
        "deep-blue": "hsl(var(--deep-blue))",
        "neon-violet": "hsl(var(--neon-violet))",
        "neon-magenta": "hsl(var(--neon-magenta))",
        "vivid-fuchsia": "hsl(var(--vivid-fuchsia))",
        "soft-cyan": "hsl(var(--soft-cyan))",
        "dark-purple-bg": "hsl(var(--dark-purple-bg))",
        "darker-purple": "hsl(var(--darker-purple))",
        "base-dark": "hsl(var(--base-dark))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-glow": {
          "0%, 100%": { 
            opacity: "1",
            transform: "scale(1)",
            filter: "blur(0px)",
          },
          "50%": { 
            opacity: "0.8",
            transform: "scale(1.05)",
            filter: "blur(2px)",
          },
        },
        "breathe": {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.08)", opacity: "0.9" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        "breathe": "breathe 4s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "fade-in": "fade-in 0.5s ease-out",
        "slide-up": "slide-up 0.6s ease-out",
      },
      backgroundImage: {
        "gradient-primary": "var(--gradient-primary)",
        "gradient-accent": "var(--gradient-accent)",
        "gradient-hero": "var(--gradient-hero)",
        // New futuristic gradients
        "gradient-orb-primary": "var(--gradient-orb-primary)",
        "gradient-orb-glow": "var(--gradient-orb-glow)",
        "gradient-canvas-bg": "var(--gradient-canvas-bg)",
      },
      boxShadow: {
        "glow": "var(--shadow-glow)",
        "glow-accent": "var(--shadow-glow-accent)",
        "elegant": "var(--shadow-elegant)",
        // New futuristic shadows
        "orb-electric": "var(--shadow-orb-electric)",
        "orb-magenta": "var(--shadow-orb-magenta)",
        "orb-violet": "var(--shadow-orb-violet)",
        "orb-multi": "var(--shadow-orb-multi)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
