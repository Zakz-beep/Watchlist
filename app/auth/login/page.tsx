// app/auth/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, Mail, Lock, Loader2, Eye, EyeOff, AlertCircle, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Check URL query/hash params for OAuth errors
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      
      const errorMsg = searchParams.get("error_description") || hashParams.get("error_description");
      if (errorMsg) {
        setError(decodeURIComponent(errorMsg).replace(/\+/g, " "));
      } else if (searchParams.get("error") === "oauth_failed") {
        setError("OAuth authentication failed. Check your Google Client ID/Secret in Supabase Dashboard.");
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes("placeholder.supabase.co")) {
      setError("Supabase project URL is not configured. Please add NEXT_PUBLIC_SUPABASE_URL & ANON_KEY to .env.local.");
      setLoading(false);
      return;
    }

    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  const handleOAuthLogin = async (provider: "google" | "github") => {
    setLoading(true);
    setError("");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes("placeholder.supabase.co")) {
      setError("Supabase credentials (.env.local) are missing. Please add NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.");
      setLoading(false);
      return;
    }

    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
      },
    });
    if (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-mesh px-4 relative overflow-hidden">
      {/* Toast Error Notification */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md glass border border-destructive/30 rounded-2xl p-4 shadow-2xl flex items-start gap-3 bg-background/80 backdrop-blur-xl"
          >
            <div className="p-2 rounded-full bg-destructive/10 text-destructive shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="flex-1 mt-0.5">
              <h3 className="text-sm font-semibold text-foreground">Authentication Error</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed break-words">{error}</p>
            </div>
            <button
              onClick={() => setError("")}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[380px]"
      >
        {/* Card */}
        <div className="glass border border-border/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-foreground/5 to-transparent pointer-events-none" />
          
          {/* Logo */}
          <div className="flex justify-center mb-6 relative">
            <div className="p-2.5 rounded-2xl bg-foreground text-background shadow-lg shadow-foreground/10 ring-1 ring-border/50">
              <BarChart3 className="w-6 h-6" />
            </div>
          </div>

          <h1 className="text-xl font-bold text-center mb-1.5 tracking-tight">Welcome back</h1>
          <p className="text-muted-foreground text-xs text-center mb-6">
            Sign in to access your watchlist
          </p>

          {/* Social OAuth Buttons */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => handleOAuthLogin("google")}
              disabled={loading}
              className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/80 transition-all text-xs font-medium shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.28v3.15C3.27 21.35 7.37 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.28C.46 8.21 0 10.05 0 12s.46 3.79 1.28 5.42l4-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.27 2.65 1.28 6.58l4 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              Google
            </button>

            <button
              type="button"
              onClick={() => handleOAuthLogin("github")}
              disabled={loading}
              className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/80 transition-all text-xs font-medium shadow-sm"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub
            </button>
          </div>

          <div className="relative flex items-center justify-center mb-6">
            <div className="border-t border-border/40 w-full" />
            <span className="bg-background px-2 text-[10px] uppercase text-muted-foreground font-medium absolute">
              Or continue with email
            </span>
          </div>

          <form onSubmit={handleLogin} className="space-y-3.5">
            {/* Email */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full pl-9 pr-4 py-2 bg-background/50 border border-border/40 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-all hover:bg-background/80"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2 bg-background/50 border border-border/40 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-all hover:bg-background/80"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 mt-2 rounded-xl text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 disabled:opacity-60 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Sign In
            </button>
          </form>

          <div className="mt-6 flex flex-col items-center gap-2">
            <p className="text-xs text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/auth/register" className="text-foreground font-semibold hover:underline">
                Register
              </Link>
            </p>
            <Link href="/dashboard" className="text-[11px] text-muted-foreground/70 hover:text-foreground transition-colors flex items-center gap-1 group">
              Continue as guest
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
