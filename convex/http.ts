import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    const eventType = body.type as string;
    const data = body.data;

    switch (eventType) {
      case "user.created": {
        const userId = data.id as string;

        // Extract email from Clerk webhook data
        const primaryEmailId = data.primary_email_address_id as string | null;
        const emailObj = primaryEmailId
          ? (data.email_addresses as Array<{ id: string; email_address: string }>)?.find(
              (e) => e.id === primaryEmailId,
            )
          : undefined;
        const email = emailObj?.email_address;

        const firstName = data.first_name as string | null;
        const lastName = data.last_name as string | null;
        const fullName =
          firstName && lastName
            ? `${firstName} ${lastName}`
            : firstName || lastName || undefined;

        // Check if profile already exists (idempotent)
        const existing = await ctx.runQuery(
          internal.helpers.getProfileInternal,
          { userId },
        );

        if (!existing) {
          await ctx.runMutation(
            internal.profiles.createProfileForNewUser,
            { userId, email, fullName },
          );
        }
        break;
      }

      case "user.updated": {
        const userId = data.id as string;
        const firstName = data.first_name as string | null;
        const lastName = data.last_name as string | null;
        const phone = (data.primary_phone_number_id
          ? data.phone_numbers?.find(
              (p: { id: string }) => p.id === data.primary_phone_number_id,
            )?.phone_number
          : undefined) as string | undefined;

        const primaryEmailId = data.primary_email_address_id as string | null;
        const emailObj = primaryEmailId
          ? (data.email_addresses as Array<{ id: string; email_address: string }>)?.find(
              (e) => e.id === primaryEmailId,
            )
          : undefined;
        const email = emailObj?.email_address;

        const fullName =
          firstName && lastName
            ? `${firstName} ${lastName}`
            : firstName || lastName || undefined;

        await ctx.runMutation(internal.profiles.updateProfileFromClerk, {
          userId,
          fullName,
          phone,
          email,
        });
        break;
      }

      case "user.deleted": {
        const userId = data.id as string;
        if (userId) {
          await ctx.runMutation(internal.profiles.deleteProfileFromClerk, {
            userId,
          });
        }
        break;
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// ---------------------------------------------------------------------------
// Stream plan endpoint — returns real-time AI generation text
// ---------------------------------------------------------------------------

http.route({
  path: "/stream-plan",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const streamId = url.searchParams.get("streamId");

    if (!streamId) {
      return new Response(JSON.stringify({ error: "streamId required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch the stream body from the persistent text streaming component
    const body = await ctx.runQuery(
      internal.streamingManager.getStreamBody,
      { streamId },
    );

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }),
});

// ---------------------------------------------------------------------------
// Marketing upload URL — unauthenticated endpoint for checkout payment screenshots
// Prospects are not logged in at checkout time, so auth cannot be required here.
// ---------------------------------------------------------------------------

http.route({
  path: "/marketing/upload-url",
  method: "POST",
  handler: httpAction(async (ctx, _request) => {
    const uploadUrl = await ctx.storage.generateUploadUrl();
    return new Response(JSON.stringify({ uploadUrl }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }),
});

// CORS preflight for /marketing/upload-url
http.route({
  path: "/marketing/upload-url",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, _request) => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

export default http;
