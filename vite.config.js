import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * `base: "./"` keeps the build portable (it is served from a static host).
 * The dev proxy exists so browser code can always call the hub through a
 * relative `/api` path: the visitor's browser is never asked to reach
 * localhost, which would break every preview and every non-local setup.
 * In production the same `/api` prefix is served by the hub behind the CDN.
 */
export default defineConfig({
  plugins: [react()],
  base: "./",
  server: {
    host: "0.0.0.0",
    allowedHosts: [".e2b.app"],
    proxy: {
      "/api": {
        target: process.env.DEV_HUB_URL || "http://127.0.0.1:5174",
        changeOrigin: true,
      },
    },
  },
});
