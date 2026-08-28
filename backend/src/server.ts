import express from "express";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { initializeDemo } from "./db";
import { router } from "./trpc";

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize demo data
const demoUserId = initializeDemo();
console.log(`Demo user ID: ${demoUserId}`);

// The frontend sends credentials: "include" on every tRPC and auth call. A
// wildcard Access-Control-Allow-Origin is rejected by the browser for
// credentialed requests, so reflect the caller's origin instead. curl never
// sees this; only the browser enforces it.
app.use(
  cors({
    origin: (origin, cb) => cb(null, origin ?? true),
    credentials: true,
  }),
);
app.use(express.json());

// No static serving here on purpose: the deployed SPA is served straight from
// the CDN (public/, see vercel.json) and locally it runs off the Vite dev
// server with HMR. Express stays API-only, which also removes the __dirname
// path juggling that kept breaking in the bundled function.

// The real frontend's tRPC client posts to `${VITE_API_URL}/api/trpc`, so the
// sandbox mounts there. /trpc stays as an alias for direct curl testing.
app.use(
  ["/api/trpc", "/trpc"],
  createExpressMiddleware({
    router,
    createContext: () => ({
      userId: demoUserId,
      marketplace: 1,
    }),
  }),
);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Better Auth session stub. The real frontend gates every protected route on
// useSession(), which hits this path against VITE_API_URL. The sandbox has no
// auth, so it always answers with a signed-in session; a clean null here would
// bounce the app to /sign-in and the watchers page would never mount.
const SANDBOX_SESSION = {
  session: {
    id: "sandbox-session",
    userId: demoUserId,
    token: "sandbox-token",
    expiresAt: new Date(Date.now() + 30 * 24 * 3600000),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  user: {
    id: demoUserId,
    email: "claude@stealthseller.co",
    name: "Watchers Sandbox",
    emailVerified: true,
    image: null,
    role: "admin",
    banned: false,
    createdAt: new Date(Date.now() - 90 * 24 * 3600000),
    updatedAt: new Date(),
  },
};

app.get("/api/auth/get-session", (req, res) => {
  res.json(SANDBOX_SESSION);
});

// Unknown API path: answer JSON, never HTML. The SPA fallback is handled by
// the CDN rewrite, so anything reaching Express and not matching is a real miss.
app.use((req, res) => {
  res.status(404).json({ error: "Not found", path: req.originalUrl });
});

// Bind a port only when this file is run directly (`node dist/server.js`).
// When it is imported -- by the Vercel function or any local harness -- the
// caller owns the transport and binding here would either crash on a taken
// port or leak a listener. Keyed on require.main rather than a VERCEL env var
// so it behaves the same in every environment.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Watchers API on http://localhost:${PORT}`);
    console.log(`tRPC endpoint: http://localhost:${PORT}/api/trpc`);
  });
}

export default app;
