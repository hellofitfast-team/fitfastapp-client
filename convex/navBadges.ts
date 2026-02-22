import { query } from "./_generated/server";
import { getAuthUserId } from "./auth";
import { getCheckInFrequencyDays } from "./helpers";

/**
 * Single query returning badge counts for navigation items.
 * Used by both mobile bottom nav and desktop top nav.
 */
export const getNavBadges = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { checkInDue: false, unreadTicketCount: 0 };

    // Check if check-in is due (not locked)
    const latestCheckIn = await ctx.db
      .query("checkIns")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .first();

    let checkInDue = false;
    if (!latestCheckIn) {
      checkInDue = true;
    } else {
      const frequencyDays = await getCheckInFrequencyDays(ctx);
      const lastCheckInDate = new Date(latestCheckIn._creationTime);
      const nextCheckInDate = new Date(lastCheckInDate);
      nextCheckInDate.setDate(nextCheckInDate.getDate() + frequencyDays);
      checkInDue = Date.now() >= nextCheckInDate.getTime();
    }

    // Count tickets where coach responded but client hasn't read yet
    const coachRespondedTickets = await ctx.db
      .query("tickets")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("status"), "coach_responded"))
      .collect();

    return {
      checkInDue,
      unreadTicketCount: coachRespondedTickets.length,
    };
  },
});
