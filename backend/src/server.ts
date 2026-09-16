import fs from "fs";
import path from "path";
import express from "express";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { initializeDemo } from "./db";
import { getEmailHtml, initializeDealsDemo } from "./deals-seed";
import { router } from "./trpc";

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize demo data
const demoUserId = initializeDemo();
console.log(`Demo user ID: ${demoUserId}`);
initializeDealsDemo();

// Origin allowed to frame the promo email HTML. On Vercel the SPA and the API
// share an origin, so 'self' covers it; this is for the frontend dev server
// (:3002) pointed at this backend through VITE_API_URL.
const DEALS_APP_ORIGIN = process.env.APP_ORIGIN ?? "http://localhost:3002";

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

// Serve the built SPA from this same process, so the deploy is one function
// and there is no static/function routing split to get wrong.
//
// The bundler decides the on-disk layout, so resolve public/ by probing the
// plausible roots instead of assuming one. Picking it once at startup means a
// wrong guess shows up in the boot log rather than as mystery 404s.
const PUBLIC_CANDIDATES = [
  path.join(__dirname, "../../public"), // repo layout: backend/dist -> root
  path.join(process.cwd(), "public"), // function invoked from the deploy root
  path.join(__dirname, "../../../public"),
];
const publicDir = PUBLIC_CANDIDATES.find((p) => fs.existsSync(path.join(p, "index.html")));

if (publicDir) {
  console.log(`serving SPA from ${publicDir}`);
  app.use(
    express.static(publicDir, {
      // Chunks are content-hashed, so they can cache forever; the HTML must
      // revalidate on every navigation or a browser keeps the previous
      // deploy's index.html and asks for chunks that no longer exist.
      setHeaders: (res, filePath) => {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        } else {
          res.setHeader("Cache-Control", "no-cache");
        }
      },
    }),
  );
} else {
  console.warn(`no SPA build found; tried: ${PUBLIC_CANDIDATES.join(", ")}`);
}

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

// Sanitized promo email HTML for the Deals pages, with the CSP the deals-engine
// API sends (apps/api/src/server.ts): images and inline styles only, framed by
// our own app only, no forms. The sandbox has no blob store, so the body comes
// out of deals-seed. Registered before the SPA fallback, which would otherwise
// answer this extensionless path with index.html.
app.get("/emails/:id/html", (req, res) => {
  const id = req.params.id;
  if (!/^[0-9a-f-]{36}$/.test(id)) return res.status(400).send("bad id");
  const html = getEmailHtml(id);
  if (!html) return res.status(404).send("no html");
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.setHeader(
    "content-security-policy",
    `default-src 'none'; img-src https: http: data:; style-src 'unsafe-inline'; font-src https: data:; frame-ancestors 'self' ${DEALS_APP_ORIGIN}; form-action 'none'; base-uri 'none'`,
  );
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("referrer-policy", "no-referrer");
  res.setHeader("cache-control", "private, max-age=3600");
  return res.send(html);
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

// An unmatched /api path is a real miss, so answer JSON there -- returning the
// SPA shell for an API call is what made the auth stub look like a signed-out
// user. A miss that LOOKS like a file (an old deploy's hashed chunk, a missing
// image) must 404 too: falling back to index.html there hands the browser HTML
// where it expected a module script, and the whole app dies on an opaque
// MIME-type error. Only extensionless paths are client-side routes.
app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Not found", path: req.originalUrl });
  }
  if (path.extname(req.path)) {
    return res.status(404).type("text/plain").send("Not found");
  }
  if (publicDir) {
    res.setHeader("Cache-Control", "no-cache");
    return res.sendFile(path.join(publicDir, "index.html"));
  }
  res.status(404).json({ error: "No SPA build available" });
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
