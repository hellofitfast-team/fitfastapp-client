/**
 * Server-side OneSignal REST API v2 client.
 * Used to send push notifications from API routes / server actions.
 */

const ONESIGNAL_API_URL = "https://api.onesignal.com/notifications";

interface SendOptions {
  url?: string;
  data?: Record<string, string>;
}

class OneSignalClient {
  private appId: string;
  private restApiKey: string;

  constructor(appId: string, restApiKey: string) {
    this.appId = appId;
    this.restApiKey = restApiKey;
  }

  /** Send a push notification to a single user by Supabase user ID */
  async sendToUser(
    userId: string,
    title: string,
    message: string,
    options?: SendOptions
  ) {
    return this.send({
      include_aliases: { external_id: [userId] },
      target_channel: "push",
      headings: { en: title },
      contents: { en: message },
      ...(options?.url && { url: options.url }),
      ...(options?.data && { data: options.data }),
    });
  }

  /** Send a push notification to multiple users by Supabase user IDs */
  async sendToUsers(
    userIds: string[],
    title: string,
    message: string,
    options?: SendOptions
  ) {
    return this.send({
      include_aliases: { external_id: userIds },
      target_channel: "push",
      headings: { en: title },
      contents: { en: message },
      ...(options?.url && { url: options.url }),
      ...(options?.data && { data: options.data }),
    });
  }

  /** Send a push notification to all subscribed users */
  async sendToAll(
    title: string,
    message: string,
    options?: SendOptions
  ) {
    return this.send({
      included_segments: ["Subscribed Users"],
      headings: { en: title },
      contents: { en: message },
      ...(options?.url && { url: options.url }),
      ...(options?.data && { data: options.data }),
    });
  }

  private async send(body: Record<string, unknown>) {
    const response = await fetch(ONESIGNAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${this.restApiKey}`,
      },
      body: JSON.stringify({
        app_id: this.appId,
        ...body,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OneSignal API error:", response.status, error);
      return { success: false, error };
    }

    return { success: true, data: await response.json() };
  }
}

let client: OneSignalClient | null = null;

export function getOneSignalClient(): OneSignalClient {
  if (client) return client;

  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!appId || !restApiKey) {
    throw new Error(
      "Missing OneSignal configuration: NEXT_PUBLIC_ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY are required"
    );
  }

  client = new OneSignalClient(appId, restApiKey);
  return client;
}
