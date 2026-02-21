"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useCheckInLock() {
  const { isAuthenticated } = useConvexAuth();
  const lockStatus = useQuery(
    api.checkIns.getLockStatus,
    isAuthenticated ? {} : "skip",
  );

  const nextCheckInDate = lockStatus?.nextCheckInDate
    ? new Date(lockStatus.nextCheckInDate)
    : null;

  let daysUntilNextCheckIn = 0;
  if (lockStatus?.isLocked && nextCheckInDate) {
    daysUntilNextCheckIn = Math.ceil(
      (nextCheckInDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
  }

  return {
    isLocked: lockStatus?.isLocked ?? false,
    nextCheckInDate,
    daysUntilNextCheckIn,
    isLoadingLockStatus: isAuthenticated && lockStatus === undefined,
  };
}
