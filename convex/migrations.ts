import { Migrations } from "@convex-dev/migrations";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";

export const migrations = new Migrations<DataModel>(components.migrations);

export const run = migrations.runner();

// Example migration: backfill email field on profiles (Phase 2 bootstrapping).
// Uncomment and deploy when ready:
//
// export const backfillProfileEmail = migrations.define({
//   table: "profiles",
//   migrateOne: async (_ctx, doc) => {
//     // Profiles created before the email field was added get null.
//     // The Clerk webhook will populate this going forward.
//     if (doc.email === undefined) {
//       return { email: undefined };
//     }
//   },
// });
