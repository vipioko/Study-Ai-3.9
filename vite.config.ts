// vite.config.ts

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    // --- THIS IS THE FIX ---
    // We now configure the tagger to ONLY run on .tsx and .jsx files
    // within the src/components directory, which is the correct usage.
    // It will now ignore your /services and /utils folders.
    mode === 'development' &&
    componentTagger({
      // You can adjust this path if your components are elsewhere
      include: ['src/components/**/*.{tsx,jsx}'],
      // Exclude node_modules just to be safe
      exclude: ['node_modules/**'],
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));