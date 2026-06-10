import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  // Served from a subpath on GitHub Pages; root in local dev
  base: command === "build" ? "/property_management_app/" : "/",
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
}));
