import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f8fb",
          100: "#e0f1f7",
          200: "#b9e2ef",
          300: "#7dc8e2",
          400: "#3aaad0",
          500: "#087AA4", // Cor principal solicitada
          600: "#076487",
          700: "#07516e",
          800: "#0a435b",
          900: "#0c394c",
          950: "#062432",
        },
        cardLight: "#F0F7FA",
        cardLightBorder: "#D3E8F1",
        approvedGreen: {
          50: "#f7fee7",
          100: "#ecfccb",
          200: "#d9f99d",
          500: "#84cc16",
          600: "#65a30d",
          700: "#4d7c0f",
        },
        reprintRed: {
          50: "#fef2f2",
          100: "#fee2e2",
          200: "#fecaca",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
        },
      },
      boxShadow: {
        subtle: "0 1px 3px 0 rgba(8, 122, 164, 0.08), 0 1px 2px 0 rgba(8, 122, 164, 0.04)",
        card: "0 4px 6px -1px rgba(8, 122, 164, 0.07), 0 2px 4px -1px rgba(8, 122, 164, 0.04)",
        elevated: "0 10px 15px -3px rgba(8, 122, 164, 0.1), 0 4px 6px -2px rgba(8, 122, 164, 0.05)",
      },
    },
  },
  plugins: [],
};

export default config;
