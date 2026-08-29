import { initTRPC } from "@trpc/server";
import superjson from "superjson";

export interface Context {
  userId: string;
  marketplace: number;
}

// superjson: the real frontend's tRPC client is configured with it, so the
// sandbox backend has to match or Date fields arrive as strings and the
// pages' formatRelative() calls blow up. One instance shared by every router
// file so they compose into a single app router.
export const t = initTRPC.context<Context>().create({ transformer: superjson });
