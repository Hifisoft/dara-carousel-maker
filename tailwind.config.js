/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        workspace: "#19191b",
        surface: {
          DEFAULT: "#242426",
          elevated: "#303033",
          hover: "#3b3b3e"
        },
        border: {
          subtle: "#333336",
          DEFAULT: "#414145",
          default: "#414145",
          focus: "#0A84FF"
        },
        text: {
          primary: "#f5f5f7",
          secondary: "#a6a6ad",
          tertiary: "#82828a"
        },
        accent: {
          blue: "#0A84FF",
          green: "#2ECA71",
          purple: "#A65EFE",
          red: "#FF4D4D",
          orange: "#FF9500",
          cyan: "#00F0FF"
        }
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "SF Pro Text", "sans-serif"],
        mono: ["Fira Code", "JetBrains Mono", "monospace"],
        grotesk: ["Space Grotesk", "sans-serif"],
        playfair: ["Playfair Display", "serif"],
        outfit: ["Outfit", "sans-serif"]
      }
    },
  },
  plugins: [],
}
