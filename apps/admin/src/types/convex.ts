import type { Doc, Id } from "@/convex/_generated/dataModel";

// Type aliases for convenience — maps Convex document types to friendly names
export type Profile = Doc<"profiles">;
export type InitialAssessment = Doc<"initialAssessments">;
export type CheckIn = Doc<"checkIns">;
export type MealPlan = Doc<"mealPlans">;
export type WorkoutPlan = Doc<"workoutPlans">;
export type MealCompletion = Doc<"mealCompletions">;
export type WorkoutCompletion = Doc<"workoutCompletions">;
export type DailyReflection = Doc<"dailyReflections">;
export type Ticket = Doc<"tickets">;
export type FAQ = Doc<"faqs">;
export type PendingSignup = Doc<"pendingSignups">;
export type SystemConfig = Doc<"systemConfig">;
export type PushSubscription = Doc<"pushSubscriptions">;

// Re-export Id for convenience
export type { Doc, Id };
