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
        workspace: "#0A0C10",
        surface: {
          DEFAULT: "#12151B",
          elevated: "#1B1E24",
          hover: "#242830"
        },
        border: {
          subtle: "#21242C",
          DEFAULT: "#2A2E39",
          focus: "#2A84FF"
        },
        text: {
          primary: "#F0F6FC",
          secondary: "#8B949E",
          tertiary: "#5B636D"
        },
        accent: {
          blue: "#2A84FF",
          green: "#2ECA71",
          purple: "#A65EFE",
          red: "#FF4D4D",
          orange: "#FF9500",
          cyan: "#00F0FF"
        }
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["Fira Code", "JetBrains Mono", "monospace"],
        grotesk: ["Space Grotesk", "sans-serif"],
        playfair: ["Playfair Display", "serif"],
        outfit: ["Outfit", "sans-serif"]
      }
    },
  },
  plugins: [],
}
