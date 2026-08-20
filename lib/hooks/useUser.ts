// lib/hooks/useUser.ts
"use client";

import { useEffect, useState, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/types/market";

const GUEST_PROFILE_KEY = "marketwatch_guest_profile";

const DEFAULT_PROFILE: UserProfile = {
  fullName: "Guest Trader",
  username: "guest_trader",
  avatarUrl: "",
  bio: "Tracking multi-source crypto, stocks & indices",
  socials: {},
};

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Parse user_metadata into UserProfile
  const parseProfile = (currentUser: User | null): UserProfile => {
    if (!currentUser) {
      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem(GUEST_PROFILE_KEY);
          if (stored) return { ...DEFAULT_PROFILE, ...JSON.parse(stored) };
        } catch {
          // fallback to default
        }
      }
      return DEFAULT_PROFILE;
    }

    const meta = currentUser.user_metadata || {};
    return {
      fullName: meta.full_name || meta.name || currentUser.email?.split("@")[0] || "Trader",
      username: meta.username || currentUser.email?.split("@")[0] || "trader",
      avatarUrl: meta.avatar_url || meta.picture || "",
      bio: meta.bio || "",
      socials: meta.socials || {},
    };
  };

  useEffect(() => {
    let isMounted = true;

    // 1. Fetch current session/user
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!isMounted) return;
      setUser(user);
      setProfile(parseProfile(user));
      setLoading(false);
    });

    // 2. Listen to auth changes (sign in, sign out, token refresh, user updated)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setProfile(parseProfile(currentUser));
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const updateProfile = useCallback(
    async (updated: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> => {
      const merged: UserProfile = {
        ...profile,
        ...updated,
        socials: {
          ...(profile.socials || {}),
          ...(updated.socials || {}),
        },
      };

      // Optimistic update
      setProfile(merged);

      if (user) {
        try {
          const { data, error } = await supabase.auth.updateUser({
            data: {
              full_name: merged.fullName,
              name: merged.fullName,
              username: merged.username,
              avatar_url: merged.avatarUrl,
              bio: merged.bio,
              socials: merged.socials,
            },
          });

          if (error) throw error;
          if (data.user) {
            setUser(data.user);
            setProfile(parseProfile(data.user));
          }
          return { success: true };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Failed to update profile";
          console.error("[useUser] Profile update error:", err);
          // Revert on error
          setProfile(parseProfile(user));
          return { success: false, error: message };
        }
      } else {
        // Guest mode persistence
        if (typeof window !== "undefined") {
          localStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(merged));
        }
        return { success: true };
      }
    },
    [user, profile, supabase]
  );

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(DEFAULT_PROFILE);
  };

  return { user, profile, loading, updateProfile, signOut };
}

