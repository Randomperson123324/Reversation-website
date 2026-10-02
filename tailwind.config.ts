/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Kanit'", "sans-serif"],
        body: ["'IBM Plex Sans Thai'", "'IBM Plex Sans'", "sans-serif"],
      },
      // Site-wide text made smaller: this custom scale used to run noticeably
      // larger than Tailwind's own defaults at every step; these values now
      // sit close to (or at) those defaults instead.
      fontSize: {
        xs: ["0.8125rem", { lineHeight: "1.125rem" }],
        sm: ["0.9375rem", { lineHeight: "1.375rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
      },
      // Site-wide text made thinner: every font-semibold/bold/extrabold/black
      // utility now maps to a lighter actual weight than Tailwind's default.
      fontWeight: {
        semibold: "500",
        bold: "600",
        extrabold: "700",
        black: "700",
      },
      borderRadius: {
        // The one radius every button in the app uses — `rounded-btn`.
        // Value lives in app/globals.css (--radius-btn); change it there
        // and every button site-wide updates, nothing to hardcode per-file.
        btn: "var(--radius-btn)",
      },
      // All actual color *values* live in app/globals.css (:root custom properties).
      // This theme only wires Tailwind class names to those variables, so the
      // entire palette can be re-themed from one place without touching any
      // component. Scales that need opacity modifiers (e.g. bg-primary-600/10)
      // read an "r g b" triplet var through the rgb(... / <alpha-value>) pattern.
      colors: {
        primary: {
          50: "rgb(var(--color-primary-50-rgb) / <alpha-value>)",
          100: "rgb(var(--color-primary-100-rgb) / <alpha-value>)",
          200: "rgb(var(--color-primary-200-rgb) / <alpha-value>)",
          300: "rgb(var(--color-primary-300-rgb) / <alpha-value>)",
          400: "rgb(var(--color-primary-400-rgb) / <alpha-value>)",
          500: "rgb(var(--color-primary-500-rgb) / <alpha-value>)",
          600: "rgb(var(--color-primary-600-rgb) / <alpha-value>)",
          700: "rgb(var(--color-primary-700-rgb) / <alpha-value>)",
          800: "rgb(var(--color-primary-800-rgb) / <alpha-value>)",
          900: "rgb(var(--color-primary-900-rgb) / <alpha-value>)",
          950: "rgb(var(--color-primary-950-rgb) / <alpha-value>)",
        },
        accent: {
          50: "rgb(var(--color-accent-50-rgb) / <alpha-value>)",
          100: "rgb(var(--color-accent-100-rgb) / <alpha-value>)",
          200: "rgb(var(--color-accent-200-rgb) / <alpha-value>)",
          300: "rgb(var(--color-accent-300-rgb) / <alpha-value>)",
          400: "rgb(var(--color-accent-400-rgb) / <alpha-value>)",
          500: "rgb(var(--color-accent-500-rgb) / <alpha-value>)",
          600: "rgb(var(--color-accent-600-rgb) / <alpha-value>)",
          700: "rgb(var(--color-accent-700-rgb) / <alpha-value>)",
        },
        // Neutral surface/text/border system — replaces hardcoded white/slate/black
        // utilities so the whole UI can flip from light to dark from globals.css.
        app: "rgb(var(--color-app-rgb) / <alpha-value>)",
        surface: {
          DEFAULT: "rgb(var(--color-surface-rgb) / <alpha-value>)",
          muted: "rgb(var(--color-surface-muted-rgb) / <alpha-value>)",
          hover: "rgb(var(--color-surface-hover-rgb) / <alpha-value>)",
        },
        line: {
          DEFAULT: "rgb(var(--color-line-rgb) / <alpha-value>)",
          strong: "rgb(var(--color-line-strong-rgb) / <alpha-value>)",
        },
        ink: {
          DEFAULT: "rgb(var(--color-ink-rgb) / <alpha-value>)",
          muted: "rgb(var(--color-ink-muted-rgb) / <alpha-value>)",
          subtle: "rgb(var(--color-ink-subtle-rgb) / <alpha-value>)",
          inverse: "rgb(var(--color-ink-inverse-rgb) / <alpha-value>)",
        },
        success: {
          DEFAULT: "rgb(var(--color-success-rgb) / <alpha-value>)",
          bg: "rgb(var(--color-success-bg-rgb) / <alpha-value>)",
          line: "rgb(var(--color-success-line-rgb) / <alpha-value>)",
        },
        danger: {
          DEFAULT: "rgb(var(--color-danger-rgb) / <alpha-value>)",
          bg: "rgb(var(--color-danger-bg-rgb) / <alpha-value>)",
          line: "rgb(var(--color-danger-line-rgb) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "rgb(var(--color-warning-rgb) / <alpha-value>)",
          bg: "rgb(var(--color-warning-bg-rgb) / <alpha-value>)",
          line: "rgb(var(--color-warning-line-rgb) / <alpha-value>)",
        },
      },
      backgroundImage: {
        "hero-gradient": "linear-gradient(180deg, rgb(var(--color-primary-50-rgb)) 0%, rgb(var(--color-app-rgb)) 100%)",
        "card-gradient": "linear-gradient(135deg, rgb(var(--color-surface-rgb)) 0%, rgb(var(--color-surface-muted-rgb)) 100%)",
        "accent-gradient": "linear-gradient(135deg, rgb(var(--color-accent-600-rgb)) 0%, rgb(var(--color-accent-400-rgb)) 100%)",
      },
      animation: {
        "fade-up": "fadeUp 0.6s ease forwards",
        "fade-in": "fadeIn 0.4s ease forwards",
        "slide-in": "slideIn 0.3s ease forwards",
        float: "float 3s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideIn: {
          from: { transform: "translateX(-10px)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      boxShadow: {
        glow: "0 10px 30px -5px rgb(var(--color-primary-600-rgb) / 0.25)",
        "glow-accent": "0 10px 24px -4px rgb(var(--color-accent-600-rgb) / 0.3)",
        card: "0 1px 2px rgb(var(--color-ink-rgb) / 0.04), 0 1px 3px rgb(var(--color-ink-rgb) / 0.06)",
        "card-hover": "0 12px 24px -8px rgb(var(--color-ink-rgb) / 0.12), 0 2px 6px rgb(var(--color-ink-rgb) / 0.06)",
      },
    },
  },
  plugins: [],
};
