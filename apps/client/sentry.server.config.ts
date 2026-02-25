// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Enable structured logging
  enableLogs: true,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  integrations: [
    Sentry.consoleLoggingIntegration({
      levels: ["warn", "error"],
    }),
  ],

  // Scrub PII from structured logs before sending to Sentry
  beforeSendLog(log) {
    const sensitiveKeys = [
      "email", "password", "token", "userId", "user_id",
      "user.id", "user.email", "user.name",
    ];
    if (log.attributes) {
      for (const key of sensitiveKeys) {
        delete log.attributes[key];
      }
    }
    return log;
  },

  // Only send errors in production
  enabled: process.env.NODE_ENV === "production",
});
