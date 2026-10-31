import type { Config } from "tailwindcss";
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "var(--primary)",
        accent: "var(--accent)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        ice: "var(--ice)",
        background: "var(--background)",
        surface: "var(--surface)",
        foreground: "var(--text)",
        muted: "var(--muted)",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        serif: ["Merriweather", "serif"],
      },
      borderRadius: { xl: "var(--radius)" },
    },
  },
  plugins: [],
} satisfies Config;
