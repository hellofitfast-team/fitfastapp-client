import { query } from "./_generated/server";
import { DirectAggregate } from "@convex-dev/aggregate";
import { components } from "./_generated/api";
import { getAuthUserId } from "./auth";

/**
 * Three independent counters backed by separate named component instances.
 * Each DirectAggregate uses document IDs as both key and id — simple counting
 * without caring about sort order. Import these into the mutation files that
 * create/delete the tracked documents.
 */
export const pendingSignupsCount = new DirectAggregate<{ Key: string; Id: string }>(
  components.pendingSignups,
);
export const openTicketsCount = new DirectAggregate<{ Key: string; Id: string }>(
  components.openTickets,
);
export const activeClientsCount = new DirectAggregate<{ Key: string; Id: string }>(
  components.activeClients,
);

/**
 * Single query for the admin dashboard — avoids 3 separate full table scans.
 * Returns O(1) counts maintained incrementally as documents change.
 */
export const getAdminStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile?.isCoach) throw new Error("Not authorized");

    const [pendingSignups, openTickets, activeClients] = await Promise.all([
      pendingSignupsCount.count(ctx),
      openTicketsCount.count(ctx),
      activeClientsCount.count(ctx),
    ]);

    return { pendingSignups, openTickets, activeClients };
  },
});
