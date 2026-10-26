import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./pages/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}", "./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        gourmet: {
          bg: "#F8F6F2", gold: "#B08B57", "gold-hover": "#997545", brown: "#6B4A2E", "brown-dark": "#4A321E", green: "#6A8B44", purple: "#9B6BAA"
        }
      }
    }
  },
  plugins: []
};
export default config;