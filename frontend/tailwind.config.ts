import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F4F6FA",
        ink: "#16213E",
        muted: "#55617F",
        rule: "#CBD3E3",
        pass: { DEFAULT: "#146C47", tint: "#D3EBDF" },
        fail: { DEFAULT: "#B3213F", tint: "#F7D7DE" },
        unsure: { tint: "#E1E6F0" },
        mark: "#FFD84A",
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ['"Public Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
