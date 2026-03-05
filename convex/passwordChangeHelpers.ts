import { v } from "convex/values";
import { internalQuery, internalMutation } from "./_generated/server";

export const getPasswordAccount = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const account = await ctx.db
      .query("authAccounts")
      .filter((q) => q.and(q.eq(q.field("userId"), userId), q.eq(q.field("provider"), "password")))
      .first();
    if (!account) return null;
    return { accountId: account._id, secret: account.secret ?? "" };
  },
});

export const updateAccountSecret = internalMutation({
  args: {
    accountId: v.id("authAccounts"),
    newSecret: v.string(),
  },
  handler: async (ctx, { accountId, newSecret }) => {
    await ctx.db.patch(accountId, { secret: newSecret });
  },
});
