import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// The dashboard serves whatever is in the directory pointed at by HERMES_WEB_DIST.
// Hermes's own build outputs to ../hermes_cli/web_dist — we mirror that layout
// relative to THIS repo by outputting to ./dist, which is then symlinked/copied
// into the serve directory. Keep the same flat `assets/` + `index.html` shape.
export default defineConfig({
  plugins: [react()],
  build: {
    // Relative base so the same bundle works whether served at root or under a
    // proxy prefix (Hermes rewrites absolute /assets/ URLs when X-Forwarded-Prefix is set).
    base: "./",
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Deterministic-ish chunking; keep the main entry small.
        manualChunks: {
          xterm: ["@xterm/xterm", "@xterm/addon-fit", "@xterm/addon-web-links"],
        },
      },
    },
  },
  server: {
    // Vite dev proxy to the running Hermes dashboard so /api + /auth + /assets
    // resolve during development without CORS pain.
    proxy: {
      "/api": { target: "http://127.0.0.1:3001", changeOrigin: true },
      "/auth": { target: "http://127.0.0.1:3001", changeOrigin: true },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
