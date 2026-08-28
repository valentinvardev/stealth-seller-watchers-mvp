// Local rehearsal of the Vercel layout: static public/ at the root, every
// /api/* request handed to the same function Vercel will invoke. Not part of
// the deploy -- it exists so the assembly can be checked before pushing.
const path = require("path");
const express = require("express");
const api = require("./api/index.js");

const app = express();
app.use("/api", (req, res) => { req.url = "/api" + req.url; api(req, res); });
app.use(express.static("public"));
app.get("*", (_req, res) => res.sendFile(path.resolve("public/index.html")));
app.listen(3010, () => console.log("verify on http://localhost:3010"));
