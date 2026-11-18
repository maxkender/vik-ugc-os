import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { preloadPublic } from "./scripts/lib/preloadPublic";

export default defineConfig({
  plugins: [react(), tailwindcss(), preloadPublic()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "./supabase/functions/_shared/logic"),
    },
  },
  build: { chunkSizeWarningLimit: 900 },
});
