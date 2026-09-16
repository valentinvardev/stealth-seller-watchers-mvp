// Local rehearsal of the Vercel layout: static public/ at the root, every
// /api/* request handed to the same function Vercel will invoke. Not part of
// the deploy -- it exists so the assembly can be checked before pushing.
const path = require("path");
const express = require("express");
const api = require("./api/index.js");

const app = express();
// On Vercel every path reaches the function (vercel.json routes /(.*) to it).
// Locally only the backend-owned prefixes are forwarded: the tRPC + auth API,
// and the sanitized email HTML the Deals pages frame at /emails/:id/html. The
// SPA fallback below would otherwise answer that route with index.html.
const forward = (prefix) => (req, res) => { req.url = prefix + req.url; api(req, res); };
app.use("/api", forward("/api"));
app.use("/emails", forward("/emails"));
app.use(express.static("public"));
app.get("*", (_req, res) => res.sendFile(path.resolve("public/index.html")));
app.listen(3010, () => console.log("verify on http://localhost:3010"));
