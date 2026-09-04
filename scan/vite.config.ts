import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served by the sandbox's Express app from public/scan/, so the build lands
// there with /scan/ as base. The same dist/ is what the Capacitor shell wraps.
// host: true exposes the dev server on the LAN; allowedHosts: true lets the
// Cloudflare quick tunnel hostname through (Vite blocks unknown hosts).
export default defineConfig({
  plugins: [react()],
  base: "/scan/",
  build: {
    outDir: "../public/scan",
    emptyOutDir: true,
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: true,
  },
});
