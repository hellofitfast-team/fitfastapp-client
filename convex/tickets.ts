import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "./auth";
import { openTicketsCount } from "./adminStats";

export const getMyTickets = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return ctx.db
      .query("tickets")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const getAllTickets = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile?.isCoach) throw new Error("Not authorized");

    return ctx.db.query("tickets").order("desc").collect();
  },
});

export const getTicketById = query({
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, { ticketId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const ticket = await ctx.db.get(ticketId);
    if (!ticket) return null;

    // Allow access if owner or coach
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (ticket.userId !== userId && !profile?.isCoach) {
      throw new Error("Not authorized");
    }

    // Get user profile for the ticket
    const ticketUserProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", ticket.userId))
      .unique();

    return { ...ticket, userName: ticketUserProfile?.fullName ?? "Unknown" };
  },
});

export const createTicket = mutation({
  args: {
    subject: v.string(),
    category: v.optional(
      v.union(
        v.literal("meal_issue"),
        v.literal("workout_issue"),
        v.literal("technical"),
        v.literal("bug_report"),
        v.literal("other"),
      ),
    ),
    description: v.optional(v.string()),
    screenshotId: v.optional(v.id("_storage")),
    deviceInfo: v.optional(v.any()),
    pageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const messages = args.description
      ? [{ sender: "client" as const, message: args.description, timestamp: Date.now() }]
      : [];

    const id = await ctx.db.insert("tickets", {
      userId,
      subject: args.subject,
      category: args.category,
      status: "open",
      messages,
      screenshotId: args.screenshotId,
      deviceInfo: args.deviceInfo,
      pageUrl: args.pageUrl,
      updatedAt: Date.now(),
    });
    // Track open ticket count for the admin dashboard
    await openTicketsCount.insert(ctx, { key: id, id });
    return id;
  },
});

export const replyToTicket = mutation({
  args: {
    ticketId: v.id("tickets"),
    message: v.string(),
  },
  handler: async (ctx, { ticketId, message }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const ticket = await ctx.db.get(ticketId);
    if (!ticket) throw new Error("Ticket not found");
    if (ticket.userId !== userId) throw new Error("Not authorized");

    await ctx.db.patch(ticketId, {
      messages: [
        ...ticket.messages,
        { sender: "client" as const, message, timestamp: Date.now() },
      ],
      updatedAt: Date.now(),
    });
  },
});

export const respondToTicket = mutation({
  args: {
    ticketId: v.id("tickets"),
    message: v.string(),
  },
  handler: async (ctx, { ticketId, message }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile?.isCoach) throw new Error("Not authorized");

    const ticket = await ctx.db.get(ticketId);
    if (!ticket) throw new Error("Ticket not found");

    await ctx.db.patch(ticketId, {
      messages: [
        ...ticket.messages,
        { sender: "coach" as const, message, timestamp: Date.now() },
      ],
      status: "coach_responded",
      updatedAt: Date.now(),
    });

    // Notify client via email
    await ctx.scheduler.runAfter(0, internal.email.sendTicketReplyEmail, {
      ticketId,
      coachMessage: message,
    });
  },
});

export const closeTicket = mutation({
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, { ticketId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const ticket = await ctx.db.get(ticketId);
    if (!ticket) throw new Error("Ticket not found");

    // Allow owner or coach to close
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (ticket.userId !== userId && !profile?.isCoach) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(ticketId, { status: "closed", updatedAt: Date.now() });
    // Decrement open ticket count — ticket is no longer open
    await openTicketsCount.deleteIfExists(ctx, { key: ticketId, id: ticketId });
  },
});
