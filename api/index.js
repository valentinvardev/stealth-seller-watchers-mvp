// Vercel entrypoint. vercel.json routes every path here, so this single
// function serves both the API and the built SPA -- there is no static/function
// split left to route wrong.
//
// Deliberately bracket-free: bracket filenames are a Next.js routing convention
// this project does not need, and they read as a glob character class in
// config, where they silently match nothing.
//
// The load is wrapped because a throw at module scope surfaces only as an
// opaque FUNCTION_INVOCATION_FAILED, with the real cause buried in runtime
// logs. Reporting it over HTTP instead makes a failed boot diagnosable with a
// single request.
let app = null;
let bootError = null;

try {
  app = require("../backend/dist/server.js").default;
} catch (err) {
  bootError = err;
}

module.exports = (req, res) => {
  if (bootError) {
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    return res.end(
      JSON.stringify(
        {
          error: "backend failed to load",
          message: bootError.message,
          code: bootError.code,
          stack: String(bootError.stack || "").split("\n").slice(0, 12),
          cwd: process.cwd(),
          dirname: __dirname,
        },
        null,
        2,
      ),
    );
  }
  return app(req, res);
};
