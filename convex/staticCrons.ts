import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

/**
 * Native Convex cron jobs (always-on, unlike dynamic @convex-dev/crons).
 * These run on a fixed schedule regardless of user state.
 */
const crons = cronJobs();

crons.daily(
  "storage-orphan-cleanup",
  { hourUTC: 3, minuteUTC: 0 },
  internal.storage.runOrphanedStorageCleanup,
);

export default crons;
