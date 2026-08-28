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

// Middleware
app.use(cors());
app.use(express.json());

// tRPC endpoint
app.use(
  "/trpc",
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

// Start server
app.listen(PORT, () => {
  console.log(`Watchers backend running on http://localhost:${PORT}`);
  console.log(`tRPC endpoint: http://localhost:${PORT}/trpc`);
});
