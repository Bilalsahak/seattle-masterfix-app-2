import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// GitHub Pages serves this repo at /seattle-masterfix-app-2/
export default defineConfig({
  base: "/seattle-masterfix-app-2/",
  plugins: [react(), tailwindcss()],
});
