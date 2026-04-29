/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "umsa-bg":       "#0f1621",
        "umsa-surface":  "#161e2d",
        "umsa-card":     "#1c2639",
        "umsa-hover":    "#1e2d42",
        "umsa-border":   "#243044",
        "umsa-text":     "#e2e8f0",
        "umsa-muted":    "#64748b",
        "light-bg":      "#f1f5f9",
        "light-surface": "#ffffff",
        "light-card":    "#f8fafc",
        "light-hover":   "#e2e8f0",
        "light-border":  "#cbd5e1",
        "light-text":    "#0f172a",
        "light-muted":   "#94a3b8",
        "umsa-green":      "#22c55e",
        "umsa-green-dark": "#16a34a",
        "umsa-blue":       "#1e40af",
        "umsa-blue-mid":   "#2563eb",
        "umsa-highlight":  "#0ea5e9",
      },
      fontFamily: {
        display: ["'DM Sans'", "sans-serif"],
        body:    ["'Inter'", "sans-serif"],
        mono:    ["'JetBrains Mono'", "monospace"],
      },
      boxShadow: {
        "umsa-glow":  "0 0 20px rgba(34, 197, 94, 0.15)",
        "umsa-panel": "0 4px 24px rgba(0, 0, 0, 0.4)",
      },
    },
  },
  plugins: [],
};
