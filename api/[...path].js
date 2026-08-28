// Vercel serverless entrypoint (catch-all).
//
// The filename matters: api/index.js would only answer /api, but the frontend
// calls /api/trpc/... and /api/auth/get-session. The [...path] catch-all takes
// every /api/* request and hands Express the full original path, which is what
// the app already mounts.
//
// Anything under api/ is auto-detected as a function, so no hand-written
// `builds` array is needed. Vercel traces this require and bundles
// backend/dist alongside it.
module.exports = require("../backend/dist/server.js").default;
