import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    tsconfigPaths(),
  ],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash]-v5.js`,
        chunkFileNames: `assets/[name]-[hash]-v5.js`,
        assetFileNames: `assets/[name]-[hash]-v5.[ext]`,
      },
    },
  },
  server: {
    allowedHosts: [".e2b.app"],
  },
});
