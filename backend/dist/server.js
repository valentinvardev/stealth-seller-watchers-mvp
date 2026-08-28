"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const express_2 = require("@trpc/server/adapters/express");
const db_1 = require("./db");
const trpc_1 = require("./trpc");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Initialize demo data
const demoUserId = (0, db_1.initializeDemo)();
console.log(`Demo user ID: ${demoUserId}`);
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Serve frontend static files
const frontendPath = path_1.default.join(__dirname, "../../frontend/dist");
app.use(express_1.default.static(frontendPath));
// tRPC endpoint
app.use("/trpc", (0, express_2.createExpressMiddleware)({
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
// Fallback to index.html for React Router
app.get("*", (req, res) => {
    res.sendFile(path_1.default.join(frontendPath, "index.html"));
});
// On Vercel the platform invokes the exported handler; there is no port to bind.
// Locally we still need a listening server.
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Watchers running on http://localhost:${PORT}`);
        console.log(`tRPC endpoint: http://localhost:${PORT}/trpc`);
    });
}
exports.default = app;
//# sourceMappingURL=server.js.map