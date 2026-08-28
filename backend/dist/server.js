"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_2 = require("@trpc/server/adapters/express");
const db_1 = require("./db");
const trpc_1 = require("./trpc");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Initialize demo data
const demoUserId = (0, db_1.initializeDemo)();
console.log(`Demo user ID: ${demoUserId}`);
// The frontend sends credentials: "include" on every tRPC and auth call. A
// wildcard Access-Control-Allow-Origin is rejected by the browser for
// credentialed requests, so reflect the caller's origin instead. curl never
// sees this; only the browser enforces it.
app.use((0, cors_1.default)({
    origin: (origin, cb) => cb(null, origin ?? true),
    credentials: true,
}));
app.use(express_1.default.json());
// Serve the built SPA from this same process, so the deploy is one function
// and there is no static/function routing split to get wrong.
//
// The bundler decides the on-disk layout, so resolve public/ by probing the
// plausible roots instead of assuming one. Picking it once at startup means a
// wrong guess shows up in the boot log rather than as mystery 404s.
const PUBLIC_CANDIDATES = [
    path_1.default.join(__dirname, "../../public"), // repo layout: backend/dist -> root
    path_1.default.join(process.cwd(), "public"), // function invoked from the deploy root
    path_1.default.join(__dirname, "../../../public"),
];
const publicDir = PUBLIC_CANDIDATES.find((p) => fs_1.default.existsSync(path_1.default.join(p, "index.html")));
if (publicDir) {
    console.log(`serving SPA from ${publicDir}`);
    app.use(express_1.default.static(publicDir));
}
else {
    console.warn(`no SPA build found; tried: ${PUBLIC_CANDIDATES.join(", ")}`);
}
// The real frontend's tRPC client posts to `${VITE_API_URL}/api/trpc`, so the
// sandbox mounts there. /trpc stays as an alias for direct curl testing.
app.use(["/api/trpc", "/trpc"], (0, express_2.createExpressMiddleware)({
    router: trpc_1.router,
    createContext: () => ({
        userId: demoUserId,
        marketplace: 1,
    }),
}));
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
// An unmatched /api path is a real miss, so answer JSON there -- returning the
// SPA shell for an API call is what made the auth stub look like a signed-out
// user. Everything else falls through to index.html for client-side routing.
app.use((req, res) => {
    if (req.path.startsWith("/api/")) {
        return res.status(404).json({ error: "Not found", path: req.originalUrl });
    }
    if (publicDir)
        return res.sendFile(path_1.default.join(publicDir, "index.html"));
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
exports.default = app;
//# sourceMappingURL=server.js.map