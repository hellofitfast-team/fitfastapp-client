"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// ---------------------------------------------------------------------------
// Clerk Backend API actions — require Node.js runtime ("use node" above)
// These are called via ctx.scheduler.runAfter from mutations.
// ---------------------------------------------------------------------------

/**
 * Send a Clerk invitation to a prospect after coach approval.
 * Creates a one-time ticket link via Clerk Backend API, which sends
 * a branded email. The prospect clicks the link → /accept-invite page → sets password.
 */
export const sendInvitation = internalAction({
  args: {
    email: v.string(),
    fullName: v.string(),
    signupId: v.id("pendingSignups"),
  },
  handler: async (ctx, { email, fullName, signupId }): Promise<void> => {
    const { createClerkClient } = await import("@clerk/backend");
    const clerkClient = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY!,
    });
    const invitation = await clerkClient.invitations.createInvitation({
      emailAddress: email,
      redirectUrl: `${process.env.CLIENT_APP_URL}/en/accept-invite`,
      publicMetadata: { signupId, fullName },
      notify: true,
    });
    // Store the invitation ID back on the signup record for potential revocation on rejection
    await ctx.runMutation(internal.pendingSignups.patchInvitationId, {
      signupId,
      clerkInvitationId: invitation.id,
    });
  },
});

/**
 * Delete a Clerk user and revoke their pending invitation.
 * Called when coach rejects a signup.
 * Handles the case where the Clerk user may not exist yet (prospect hasn't accepted invite).
 */
export const deleteUserAndInvitation = internalAction({
  args: {
    email: v.string(),
    clerkInvitationId: v.optional(v.string()),
  },
  handler: async (_ctx, { email, clerkInvitationId }): Promise<void> => {
    const { createClerkClient } = await import("@clerk/backend");
    const clerkClient = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY!,
    });

    // Find user by email — they may not exist yet if they haven't accepted the invite
    const users = await clerkClient.users.getUserList({
      emailAddress: [email],
    });
    if (users.data.length > 0) {
      await clerkClient.users.deleteUser(users.data[0].id);
      // Clerk webhook user.deleted fires → convex/http.ts deleteProfileFromClerk runs
    }

    // Revoke the pending invitation if we have the ID
    // Wrap in try/catch — invitation may already be consumed or not exist
    if (clerkInvitationId) {
      try {
        await clerkClient.invitations.revokeInvitation(clerkInvitationId);
      } catch {
        // Invitation already consumed or expired — safe to ignore
      }
    }
  },
});
