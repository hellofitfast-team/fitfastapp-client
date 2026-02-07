export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          language: "en" | "ar";
          plan_tier: "3_months" | "6_months" | "12_months" | null;
          status: "pending_approval" | "active" | "inactive" | "expired";
          plan_start_date: string | null;
          plan_end_date: string | null;
          is_coach: boolean;
          notification_reminder_time: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          language?: "en" | "ar";
          plan_tier?: "3_months" | "6_months" | "12_months" | null;
          status?: "pending_approval" | "active" | "inactive" | "expired";
          plan_start_date?: string | null;
          plan_end_date?: string | null;
          is_coach?: boolean;
          notification_reminder_time?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          language?: "en" | "ar";
          plan_tier?: "3_months" | "6_months" | "12_months" | null;
          status?: "pending_approval" | "active" | "inactive" | "expired";
          plan_start_date?: string | null;
          plan_end_date?: string | null;
          is_coach?: boolean;
          notification_reminder_time?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      initial_assessments: {
        Row: {
          id: string;
          user_id: string;
          goals: string | null;
          current_weight: number | null;
          height: number | null;
          measurements: Json;
          schedule_availability: Json;
          food_preferences: string[] | null;
          allergies: string[] | null;
          dietary_restrictions: string[] | null;
          medical_conditions: string[] | null;
          injuries: string[] | null;
          exercise_history: string | null;
          experience_level: "beginner" | "intermediate" | "advanced" | null;
          lifestyle_habits: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          goals?: string | null;
          current_weight?: number | null;
          height?: number | null;
          measurements?: Json;
          schedule_availability?: Json;
          food_preferences?: string[] | null;
          allergies?: string[] | null;
          dietary_restrictions?: string[] | null;
          medical_conditions?: string[] | null;
          injuries?: string[] | null;
          exercise_history?: string | null;
          experience_level?: "beginner" | "intermediate" | "advanced" | null;
          lifestyle_habits?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          goals?: string | null;
          current_weight?: number | null;
          height?: number | null;
          measurements?: Json;
          schedule_availability?: Json;
          food_preferences?: string[] | null;
          allergies?: string[] | null;
          dietary_restrictions?: string[] | null;
          medical_conditions?: string[] | null;
          injuries?: string[] | null;
          exercise_history?: string | null;
          experience_level?: "beginner" | "intermediate" | "advanced" | null;
          lifestyle_habits?: Json;
          created_at?: string;
        };
      };
      check_ins: {
        Row: {
          id: string;
          user_id: string;
          weight: number | null;
          measurements: Json;
          workout_performance: string | null;
          energy_level: number | null;
          sleep_quality: number | null;
          dietary_adherence: number | null;
          new_injuries: string | null;
          progress_photo_urls: string[] | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          weight?: number | null;
          measurements?: Json;
          workout_performance?: string | null;
          energy_level?: number | null;
          sleep_quality?: number | null;
          dietary_adherence?: number | null;
          new_injuries?: string | null;
          progress_photo_urls?: string[] | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          weight?: number | null;
          measurements?: Json;
          workout_performance?: string | null;
          energy_level?: number | null;
          sleep_quality?: number | null;
          dietary_adherence?: number | null;
          new_injuries?: string | null;
          progress_photo_urls?: string[] | null;
          notes?: string | null;
          created_at?: string;
        };
      };
      meal_plans: {
        Row: {
          id: string;
          user_id: string;
          check_in_id: string | null;
          plan_data: Json;
          ai_generated_content: string | null;
          language: string;
          start_date: string;
          end_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          check_in_id?: string | null;
          plan_data: Json;
          ai_generated_content?: string | null;
          language?: string;
          start_date: string;
          end_date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          check_in_id?: string | null;
          plan_data?: Json;
          ai_generated_content?: string | null;
          language?: string;
          start_date?: string;
          end_date?: string;
          created_at?: string;
        };
      };
      workout_plans: {
        Row: {
          id: string;
          user_id: string;
          check_in_id: string | null;
          plan_data: Json;
          ai_generated_content: string | null;
          language: string;
          start_date: string;
          end_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          check_in_id?: string | null;
          plan_data: Json;
          ai_generated_content?: string | null;
          language?: string;
          start_date: string;
          end_date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          check_in_id?: string | null;
          plan_data?: Json;
          ai_generated_content?: string | null;
          language?: string;
          start_date?: string;
          end_date?: string;
          created_at?: string;
        };
      };
      meal_completions: {
        Row: {
          id: string;
          user_id: string;
          meal_plan_id: string;
          date: string;
          meal_index: number;
          completed: boolean;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          meal_plan_id: string;
          date: string;
          meal_index: number;
          completed?: boolean;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          meal_plan_id?: string;
          date?: string;
          meal_index?: number;
          completed?: boolean;
          notes?: string | null;
          created_at?: string;
        };
      };
      workout_completions: {
        Row: {
          id: string;
          user_id: string;
          workout_plan_id: string;
          date: string;
          workout_index: number;
          completed: boolean;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          workout_plan_id: string;
          date: string;
          workout_index: number;
          completed?: boolean;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          workout_plan_id?: string;
          date?: string;
          workout_index?: number;
          completed?: boolean;
          notes?: string | null;
          created_at?: string;
        };
      };
      daily_reflections: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          reflection: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          reflection?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          reflection?: string | null;
          created_at?: string;
        };
      };
      tickets: {
        Row: {
          id: string;
          user_id: string;
          subject: string;
          category:
            | "meal_issue"
            | "workout_issue"
            | "technical"
            | "bug_report"
            | "other"
            | null;
          description: string | null;
          status: "open" | "coach_responded" | "closed";
          coach_response: string | null;
          screenshot_url: string | null;
          device_info: Json | null;
          page_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subject: string;
          category?:
            | "meal_issue"
            | "workout_issue"
            | "technical"
            | "bug_report"
            | "other"
            | null;
          description?: string | null;
          status?: "open" | "coach_responded" | "closed";
          coach_response?: string | null;
          screenshot_url?: string | null;
          device_info?: Json | null;
          page_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          subject?: string;
          category?:
            | "meal_issue"
            | "workout_issue"
            | "technical"
            | "bug_report"
            | "other"
            | null;
          description?: string | null;
          status?: "open" | "coach_responded" | "closed";
          coach_response?: string | null;
          screenshot_url?: string | null;
          device_info?: Json | null;
          page_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      faqs: {
        Row: {
          id: string;
          question: string;
          answer: string;
          language: "en" | "ar";
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          question: string;
          answer: string;
          language?: "en" | "ar";
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          question?: string;
          answer?: string;
          language?: "en" | "ar";
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      pending_signups: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          phone: string | null;
          plan_tier: "3_months" | "6_months" | "12_months" | null;
          payment_screenshot_url: string | null;
          ocr_extracted_data: Json | null;
          status: "pending" | "approved" | "rejected";
          created_at: string;
          reviewed_at: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          full_name: string;
          phone?: string | null;
          plan_tier?: "3_months" | "6_months" | "12_months" | null;
          payment_screenshot_url?: string | null;
          ocr_extracted_data?: Json | null;
          status?: "pending" | "approved" | "rejected";
          created_at?: string;
          reviewed_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          phone?: string | null;
          plan_tier?: "3_months" | "6_months" | "12_months" | null;
          payment_screenshot_url?: string | null;
          ocr_extracted_data?: Json | null;
          status?: "pending" | "approved" | "rejected";
          created_at?: string;
          reviewed_at?: string | null;
        };
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          onesignal_subscription_id: string;
          device_type: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          onesignal_subscription_id: string;
          device_type?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          onesignal_subscription_id?: string;
          device_type?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      system_config: {
        Row: {
          key: string;
          value: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};

// Helper types
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// Commonly used types
export type Profile = Tables<"profiles">;
export type InitialAssessment = Tables<"initial_assessments">;
export type CheckIn = Tables<"check_ins">;
export type MealPlan = Tables<"meal_plans">;
export type WorkoutPlan = Tables<"workout_plans">;
export type MealCompletion = Tables<"meal_completions">;
export type WorkoutCompletion = Tables<"workout_completions">;
export type DailyReflection = Tables<"daily_reflections">;
export type Ticket = Tables<"tickets">;
export type FAQ = Tables<"faqs">;
export type PendingSignup = Tables<"pending_signups">;
export type PushSubscription = Tables<"push_subscriptions">;
export type SystemConfig = Tables<"system_config">;
