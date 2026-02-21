import { WorkflowManager } from "@convex-dev/workflow";
import { components } from "./_generated/api";

/**
 * Singleton WorkflowManager instance.
 * Kept in its own file so both checkInWorkflow.ts (defines workflows) and
 * checkIns.ts (starts workflows) can import it without creating a circular
 * type-inference chain through _generated/api.d.ts.
 */
export const workflow = new WorkflowManager(components.workflow);
