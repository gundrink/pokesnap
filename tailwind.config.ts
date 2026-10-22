import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        neon: "#86EFAC",
        pump: "#4ADE80",
        volt: "#FACC15",
        coal: { 950: "#0b0d0c", 900: "#121513", 800: "#1a1e1b", 700: "#252a26", 600: "#343b36" },
      },
      boxShadow: {
        neon: "0 0 18px rgba(74,222,128,.45)",
        volt: "0 0 18px rgba(250,204,21,.5)",
        danger: "0 0 24px rgba(239,68,68,.6)",
      },
    },
  },
  plugins: [],
};
export default config;
