import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

/** Find an auth account by email. Used by seedActions:seedDemoUsers to get userId. */
export const findAuthAccountByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return ctx.db
      .query("authAccounts")
      .filter((q) =>
        q.and(
          q.eq(q.field("provider"), "password"),
          q.eq(q.field("providerAccountId"), email),
        ),
      )
      .first();
  },
});
