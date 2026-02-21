"use client";

import { useRouter } from "next/navigation";
import { useConvexAuth } from "convex/react";
import { useQuery } from "convex/react";
import { useClerk } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";

export function useAuth() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const { signOut: clerkSignOut } = useClerk();
  const profile = useQuery(
    api.profiles.getMyProfile,
    isAuthenticated ? {} : "skip",
  );

  const signOut = async () => {
    await clerkSignOut();
    router.push("/login");
  };

  return {
    isAuthenticated,
    profile: profile ?? null,
    loading: authLoading || (isAuthenticated && profile === undefined),
    error: null,
    signOut,
  };
}
