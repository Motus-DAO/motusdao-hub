import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["class", '[data-theme="matrix"]'],
  theme: {
    extend: {
      colors: {
        // Base design tokens
        'primary-black': '#1a1a1a',
        'primary-blue': '#6366f1',
        'primary-gray': '#6b7280',
        'pastel-purple': '#e0e7ff',
        'pastel-pink': '#fce7f3',
        'pastel-cyan': '#ecfeff',
        'soft-white': '#fafafa',
        
        // shadcn/ui colors
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
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
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Custom MotusDAO colors — RGB channels from CSS so accent picker can retheme them
        mauve: {
          50: "rgb(var(--mauve-50) / <alpha-value>)",
          100: "rgb(var(--mauve-100) / <alpha-value>)",
          200: "rgb(var(--mauve-200) / <alpha-value>)",
          300: "rgb(var(--mauve-300) / <alpha-value>)",
          400: "rgb(var(--mauve-400) / <alpha-value>)",
          500: "rgb(var(--mauve-500) / <alpha-value>)",
          600: "rgb(var(--mauve-600) / <alpha-value>)",
          700: "rgb(var(--mauve-700) / <alpha-value>)",
          800: "rgb(var(--mauve-800) / <alpha-value>)",
          900: "rgb(var(--mauve-900) / <alpha-value>)",
          950: "rgb(var(--mauve-950) / <alpha-value>)",
        },
        // Matrix theme colors - neon green
        matrix: {
          bg: "#000000",
          text: "#39ff14",
          accent: "#00ff41",
          border: "rgba(0,255,65,0.6)",
          placeholder: "#32ff32",
        },
        iris: {
          50: "rgb(var(--iris-50) / <alpha-value>)",
          100: "rgb(var(--iris-100) / <alpha-value>)",
          200: "rgb(var(--iris-200) / <alpha-value>)",
          300: "rgb(var(--iris-300) / <alpha-value>)",
          400: "rgb(var(--iris-400) / <alpha-value>)",
          500: "rgb(var(--iris-500) / <alpha-value>)",
          600: "rgb(var(--iris-600) / <alpha-value>)",
          700: "rgb(var(--iris-700) / <alpha-value>)",
          800: "rgb(var(--iris-800) / <alpha-value>)",
          900: "rgb(var(--iris-900) / <alpha-value>)",
          950: "rgb(var(--iris-950) / <alpha-value>)",
        },
        // Glass and neumorphism colors (aligned with --glass-* / Chat topbar)
        glass: {
          light: "rgba(255, 255, 255, 0.55)",
          dark: "rgba(255, 255, 255, 0.06)",
          border: "rgba(255, 255, 255, 0.14)",
          'border-light': "rgba(0, 0, 0, 0.08)",
        },
        neo: {
          light: "rgba(255, 255, 255, 0.8)",
          dark: "rgba(0, 0, 0, 0.1)",
          shadow: "rgba(0, 0, 0, 0.1)",
          highlight: "rgba(255, 255, 255, 0.6)",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        heading: ["Jura", "sans-serif"],
        accent: ["Playfair Display", "serif"],
        matrix: ["Share Tech Mono", "Courier New", "monospace"],
        matrixHeading: ["Orbitron", "Share Tech Mono", "monospace"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        // New gradient system
        "grad-primary": "var(--grad-primary)",
        "grad-secondary": "linear-gradient(to right, #3b82f6, #06b6d4)",
        "grad-background": "var(--grad-background)",
        // Soft gradient details
        "grad-soft-purple": "radial-gradient(circle at 30% 30%, rgba(147, 51, 234, 0.15) 0%, transparent 50%)",
        "grad-soft-pink": "radial-gradient(circle at 70% 70%, rgba(236, 72, 153, 0.12) 0%, transparent 50%)",
        "grad-soft-blue": "radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)",
        "grad-glass-overlay": "linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)",
        // Legacy gradients
        "gradient-iridescent": "linear-gradient(135deg, #7c3aed 0%, #a855f7 25%, #6366f1 50%, #ec4899 75%, #7c3aed 100%)",
        "gradient-mauve": "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
        "gradient-iris": "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
        // Matrix theme gradients
        "gradient-matrix": "linear-gradient(135deg, #39ff14 0%, #00ff41 100%)",
        "gradient-matrix-neon": "linear-gradient(135deg, #39ff14 0%, #32ff32 50%, #00ff41 100%)",
      },
      backdropBlur: {
        xs: "2px",
        'glass': "20px",
        'glass-strong': "32px",
      },
      boxShadow: {
        // Glass shadows
        "glass": "0 8px 32px rgba(0, 0, 0, 0.1), 0 0 20px rgba(255, 255, 255, 0.08)",
        "glass-light": "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
        "glass-dark": "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        // Neumorphism shadows
        "neo-inset": "inset 2px 2px 4px rgba(0, 0, 0, 0.1), inset -2px -2px 4px rgba(255, 255, 255, 0.1)",
        "neo-outset": "2px 2px 4px rgba(0, 0, 0, 0.1), -2px -2px 4px rgba(255, 255, 255, 0.1)",
        // Legacy shadows
        "soft": "0 4px 20px 0 rgba(0, 0, 0, 0.1)",
        "glow": "0 0 20px rgb(var(--accent-rgb) / 0.3)",
        "glow-matrix": "0 0 20px rgba(16, 185, 129, 0.3)",
        // Matrix theme shadows
        "matrix": "0 8px 24px rgba(0,0,0,0.5)",
        "matrix-glow": "0 0 20px rgba(0, 255, 65, 0.3)",
        "matrix-glow-strong": "0 0 30px rgba(57, 255, 20, 0.4), 0 0 60px rgba(0, 255, 65, 0.2)",
        "matrix-glow-button": "0 0 20px rgba(57,255,20,0.3), 0 0 40px rgba(0,255,65,0.2)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.5s ease-out",
        "float": "float 6s ease-in-out infinite",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite alternate",
        "gradient-shift": "gradientShift 8s ease-in-out infinite",
        "hover-lift": "hoverLift 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "press-down": "pressDown 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        pulseGlow: {
          "0%": { boxShadow: "0 0 20px rgba(124, 58, 237, 0.3)" },
          "100%": { boxShadow: "0 0 30px rgba(124, 58, 237, 0.6)" },
        },
        gradientShift: {
          "0%, 100%": { 
            backgroundPosition: "0% 50%",
            opacity: "0.8"
          },
          "50%": { 
            backgroundPosition: "100% 50%",
            opacity: "1"
          },
        },
        hoverLift: {
          "0%": { transform: "translateY(0) scale(1)" },
          "100%": { transform: "translateY(-2px) scale(1.02)" },
        },
        pressDown: {
          "0%": { transform: "translateY(0) scale(1)" },
          "100%": { transform: "translateY(1px) scale(0.98)" },
        },
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'smooth-slow': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        'smooth': '300ms',
        'smooth-slow': '600ms',
      },
    },
  },
  plugins: [],
};

export default config;
