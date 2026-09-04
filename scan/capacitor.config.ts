import type { CapacitorConfig } from "@capacitor/cli";

// The native shell wraps whatever `vite build` puts in dist/. On the Mac or in
// CI: `npx cap add ios`, `npx cap sync`, `npx cap open ios`. Nothing here runs
// on Windows; the web part is what we test tonight.
const config: CapacitorConfig = {
  appId: "co.stealthseller.scan",
  appName: "Stealth Scan",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
