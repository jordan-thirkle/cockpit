import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

// The dashboard serves whatever is in the directory pointed at by HERMES_WEB_DIST.
// Hermes's own build outputs to ../hermes_cli/web_dist — we mirror that layout
// relative to THIS repo by outputting to ./dist, which is then symlinked/copied
// into the serve directory. Keep the same flat `assets/` + `index.html` shape.
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
    alias: [
      // @nous-research/ui@1.5.2 ships subpath modules as
      // dist/<area>/<name>/index.js, but its exports map only declares the flat
      // `./ui/*` -> dist/ui/*.js pattern, which Rollup can't resolve. Map the
      // deep subpaths Hermes's vendored pages import straight onto dist/.
      // Path shim only — we integrate the published components, not reimplement.
      {
        find: /^@nous-research\/ui\/(ui|hooks|utils)\/(.*)$/,
        replacement: resolve(__dirname, "node_modules/@nous-research/ui/dist") + "/$1/$2",
      },
      { find: "@", replacement: resolve(__dirname, "src") },
    ],
  },
});
