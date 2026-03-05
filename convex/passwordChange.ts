"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { Scrypt } from "lucia";
import { getAuthUserId } from "@convex-dev/auth/server";

export const changePassword = action({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, { currentPassword, newPassword }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    if (newPassword.length < 8) {
      throw new Error("New password must be at least 8 characters");
    }

    // Get the user's password auth account
    const account = await ctx.runQuery(internal.passwordChangeHelpers.getPasswordAccount, {
      userId,
    });
    if (!account) {
      throw new Error("No password account found");
    }

    // Verify current password
    const scrypt = new Scrypt();
    const isValid = await scrypt.verify(account.secret, currentPassword);
    if (!isValid) {
      throw new Error("Current password is incorrect");
    }

    // Hash new password
    const newHash = await scrypt.hash(newPassword);

    // Update the auth account
    await ctx.runMutation(internal.passwordChangeHelpers.updateAccountSecret, {
      accountId: account.accountId,
      newSecret: newHash,
    });
  },
});
