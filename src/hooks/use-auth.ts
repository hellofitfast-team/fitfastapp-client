"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import useSWR from "swr";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/types/database";

interface UseAuthReturn {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  error: Error | null;
  signOut: () => Promise<void>;
  refetch: () => void;
}

const fetcher = async (key: string): Promise<Profile | null> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
};

export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const {
    data: profile,
    error,
    isLoading: profileLoading,
    mutate,
  } = useSWR(user ? "profile" : null, fetcher);

  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
      mutate(); // Refetch profile when auth state changes
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [mutate]);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return {
    user,
    profile: profile || null,
    loading: authLoading || profileLoading,
    error: error || null,
    signOut,
    refetch: mutate,
  };
}
