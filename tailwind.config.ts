import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif:  ["'Playfair Display'", "Georgia", "serif"],
        mono:   ["'IBM Plex Mono'", "monospace"],
        sans:   ["'IBM Plex Sans'", "sans-serif"],
      },
      colors: {
        bg:       "#0D1117",
        surface:  "#161B22",
        surface2: "#1C2333",
        border:   "#2D333B",
        border2:  "#373E47",
        accent:   "#2F81F7",
        cream:    "#F0EAD6",
        text:     "#CDD9E5",
        muted:    "#768390",
        muted2:   "#545D68",
        danger:   "#F85149",
        warn:     "#D29922",
        safe:     "#3FB950",
        gold:     "#E3B341",
      },
      animation: {
        "fade-up":    "fadeUp 0.5s ease forwards",
        "line-grow":  "lineGrow 0.8s ease forwards",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        lineGrow: {
          from: { width: "0%" },
          to:   { width: "100%" },
        },
      },
    },
  },
  plugins: [],
};

export default config;