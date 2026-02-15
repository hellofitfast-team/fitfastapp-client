import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import * as Sentry from "@sentry/nextjs";

interface UseCheckInLockResult {
  isLocked: boolean;
  nextCheckInDate: Date | null;
  daysUntilNextCheckIn: number;
  isLoadingLockStatus: boolean;
}

export function useCheckInLock(userId: string | undefined): UseCheckInLockResult {
  const [isLocked, setIsLocked] = useState(false);
  const [nextCheckInDate, setNextCheckInDate] = useState<Date | null>(null);
  const [daysUntilNextCheckIn, setDaysUntilNextCheckIn] = useState<number>(0);
  const [isLoadingLockStatus, setIsLoadingLockStatus] = useState(true);

  useEffect(() => {
    const checkLockStatus = async () => {
      if (!userId) {
        setIsLoadingLockStatus(false);
        return;
      }

      try {
        const supabase = createClient();

        // Get the last check-in, frequency config, and latest plan for this user
        const [lastCheckInRes, freqRes, lastPlanRes] = await Promise.all([
          supabase
            .from("check_ins")
            .select("created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("system_config")
            .select("value")
            .eq("key", "check_in_frequency_days")
            .single<{ value: string }>(),
          supabase
            .from("meal_plans")
            .select("start_date")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        if (lastCheckInRes.error) throw lastCheckInRes.error;
        const lastCheckIn = lastCheckInRes.data;
        const lastPlan = lastPlanRes.data;

        // Determine baseline date: last check-in, or plan start if no check-ins yet
        let baselineDate: Date | null = null;

        if (lastCheckIn) {
          baselineDate = new Date((lastCheckIn as { created_at: string }).created_at);
        } else if (lastPlan) {
          baselineDate = new Date((lastPlan as { start_date: string }).start_date);
        }

        if (baselineDate) {
          const checkInFrequencyDays = parseInt(freqRes.data?.value || "14");

          const nextAllowedDate = new Date(baselineDate);
          nextAllowedDate.setDate(nextAllowedDate.getDate() + checkInFrequencyDays);

          const now = new Date();
          const isLockedStatus = now < nextAllowedDate;

          setIsLocked(isLockedStatus);
          setNextCheckInDate(nextAllowedDate);

          if (isLockedStatus) {
            const daysRemaining = Math.ceil(
              (nextAllowedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            );
            setDaysUntilNextCheckIn(daysRemaining);
          }
        }
      } catch (error) {
        Sentry.captureException(error, {
          tags: { feature: "check-in-lock-status" },
          extra: { userId },
        });
      } finally {
        setIsLoadingLockStatus(false);
      }
    };

    checkLockStatus();
  }, [userId]);

  return {
    isLocked,
    nextCheckInDate,
    daysUntilNextCheckIn,
    isLoadingLockStatus,
  };
}
