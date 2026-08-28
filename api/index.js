// Vercel entrypoint. vercel.json routes every path here, so this single
// function serves both the API and the built SPA -- there is no static/function
// split left to route wrong.
//
// Deliberately bracket-free: bracket filenames are a Next.js routing convention
// this project does not need, and they read as a glob character class in
// config, where they silently match nothing.
module.exports = require("../backend/dist/server.js").default;
