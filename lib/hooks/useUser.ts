// lib/hooks/useUser.ts
"use client";

import { useEffect, useState, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/types/market";

const GUEST_PROFILE_KEY = "marketwatch_guest_profile";
const LOCAL_AVATAR_KEY = "marketwatch_local_avatar";

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

  // Parse user_metadata into UserProfile safely without huge cookie bloat
  const parseProfile = (currentUser: User | null): UserProfile => {
    let localAvatar = "";
    if (typeof window !== "undefined") {
      try {
        localAvatar = localStorage.getItem(LOCAL_AVATAR_KEY) || "";
      } catch {
        // ignore
      }
    }

    if (!currentUser) {
      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem(GUEST_PROFILE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            return {
              ...DEFAULT_PROFILE,
              ...parsed,
              avatarUrl: parsed.avatarUrl || localAvatar || "",
            };
          }
        } catch {
          // fallback to default
        }
      }
      return { ...DEFAULT_PROFILE, avatarUrl: localAvatar || "" };
    }

    const meta = currentUser.user_metadata || {};
    let avatar = meta.avatar_url || meta.picture || "";

    // If metadata contains an oversized base64 string that bloats cookies (> 2000 chars), use localAvatar and purge from meta
    if (avatar.length > 2000) {
      if (typeof window !== "undefined" && !localAvatar) {
        try {
          localStorage.setItem(LOCAL_AVATAR_KEY, avatar);
        } catch {
          // ignore
        }
      }
      avatar = localAvatar || "";
    }

    return {
      fullName: meta.full_name || meta.name || currentUser.email?.split("@")[0] || "Trader",
      username: meta.username || currentUser.email?.split("@")[0] || "trader",
      avatarUrl: avatar || localAvatar || "",
      bio: meta.bio || "",
      socials: meta.socials || {},
      hyperliquidAddress: meta.hyperliquid_address || "",
    };
  };

  useEffect(() => {
    let isMounted = true;

    // 1. Fetch current session/user
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!isMounted) return;
      setUser(user);
      const parsed = parseProfile(user);
      setProfile(parsed);
      setLoading(false);

      // Auto-purge huge base64 from Supabase JWT if present to prevent 494 REQUEST_HEADER_TOO_LARGE
      if (user?.user_metadata?.avatar_url && user.user_metadata.avatar_url.length > 2000) {
        supabase.auth.updateUser({
          data: {
            avatar_url: "", // clear from cookie JWT payload
          },
        }).catch(() => {});
      }
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

      // If avatarUrl is a local base64 data URL, store in localStorage ONLY to avoid cookie explosion
      const isBase64 = merged.avatarUrl?.startsWith("data:");
      if (typeof window !== "undefined") {
        if (isBase64 && merged.avatarUrl) {
          try {
            localStorage.setItem(LOCAL_AVATAR_KEY, merged.avatarUrl);
          } catch {
            // ignore
          }
        } else if (!merged.avatarUrl) {
          localStorage.removeItem(LOCAL_AVATAR_KEY);
        }
      }

      if (user) {
        try {
          // Never send large base64 data to Supabase auth metadata (keeps JWT cookie < 1KB)
          const safeAvatarUrl = isBase64 ? "" : (merged.avatarUrl?.slice(0, 1000) || "");

          const { data, error } = await supabase.auth.updateUser({
            data: {
              full_name: merged.fullName,
              name: merged.fullName,
              username: merged.username,
              avatar_url: safeAvatarUrl,
              bio: merged.bio,
              socials: merged.socials,
              hyperliquid_address: merged.hyperliquidAddress || "",
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
    if (typeof window !== "undefined") {
      localStorage.removeItem(LOCAL_AVATAR_KEY);
    }
    await supabase.auth.signOut();
    setUser(null);
    setProfile(DEFAULT_PROFILE);
  };


  return { user, profile, loading, updateProfile, signOut };
}

