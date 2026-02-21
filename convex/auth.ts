import { QueryCtx, MutationCtx, ActionCtx } from "./_generated/server";

/**
 * Get the authenticated Clerk user ID from context.
 * Returns the Clerk user ID string (e.g. "user_2abc...") or null if not authenticated.
 */
export async function getAuthUserId(
  ctx: QueryCtx | MutationCtx | ActionCtx,
): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return identity.subject;
}

/**
 * Same as getAuthUserId but throws if not authenticated.
 */
export async function requireAuthUserId(
  ctx: QueryCtx | MutationCtx | ActionCtx,
): Promise<string> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  return userId;
}
