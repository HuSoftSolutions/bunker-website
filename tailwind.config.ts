import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
    "./providers/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
    "./data/**/*.{js,ts,jsx,tsx}",
    "./ui-kit/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#C12126",
        "primary-dark": "#8D2220",
        secondary: "#8D2220",
        tertiary: "#737373",
        success: "#00B74A",
        danger: "#F93154",
        warning: "#FFA900",
        dark: "#262626",
        light: "#dcdcdc",
        bunkerBlack: "#000000",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      },
      fontFamily: {
        sans: ["var(--font-aller)", "system-ui", "sans-serif"],
        display: ["var(--font-aller)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
