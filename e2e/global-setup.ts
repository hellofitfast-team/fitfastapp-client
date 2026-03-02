import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

/**
 * Global setup runs once before the entire test suite.
 * - Seeds test users in Convex (admin + client)
 * - Generates a unique test email for this run
 * - Writes the email to .test-email.txt for cross-file sharing
 */
export default async function globalSetup() {
  console.log("[E2E Global Setup] Starting...");

  // 1. Seed test users (admin + client) — idempotent
  try {
    execSync("npx convex run seedActions:seedTestUsers", {
      cwd: path.resolve(__dirname, ".."),
      timeout: 30000,
      stdio: "pipe",
    });
    console.log("[E2E Global Setup] Test users seeded successfully");
  } catch (error) {
    // Non-fatal: test users may already exist
    console.warn(
      "[E2E Global Setup] Seed warning (users may already exist):",
      (error as Error).message?.slice(0, 200),
    );
  }

  // 2. Generate unique test email for this run
  const timestamp = Date.now();
  const testEmail = `e2e-${timestamp}@test.com`;

  const emailFilePath = path.join(__dirname, ".test-email.txt");
  fs.writeFileSync(emailFilePath, testEmail, "utf-8");
  console.log(`[E2E Global Setup] Test email: ${testEmail}`);

  // 3. Set as env var for test processes
  process.env.E2E_TEST_EMAIL = testEmail;

  console.log("[E2E Global Setup] Done.");
}
