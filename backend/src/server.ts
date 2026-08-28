import express from "express";
import cors from "cors";
import path from "path";
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

// Serve frontend static files
const frontendPath = path.join(__dirname, "../../frontend/dist");
app.use(express.static(frontendPath));

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

// Fallback to index.html for React Router
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// On Vercel the platform invokes the exported handler; there is no port to bind.
// Locally we still need a listening server.
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Watchers running on http://localhost:${PORT}`);
    console.log(`tRPC endpoint: http://localhost:${PORT}/trpc`);
  });
}

export default app;
