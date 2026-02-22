import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useNavBadges() {
  const { isAuthenticated } = useConvexAuth();
  const badges = useQuery(api.navBadges.getNavBadges, isAuthenticated ? {} : "skip");
  return badges ?? { checkInDue: false, unreadTicketCount: 0 };
}
