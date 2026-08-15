// components/landing/FooterCTA.tsx
"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, LogIn, UserPlus, LayoutDashboard } from "lucide-react";
import { useUser } from "@/lib/hooks/useUser";

export function FooterCTA() {
  const { user } = useUser();

  return (
    <section className="py-24 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative p-12 rounded-3xl border border-border/40 glass overflow-hidden"
        >
          {/* Background glow */}
          <div
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 50% 0%, hsl(217 91% 60% / 0.3) 0%, transparent 60%)",
            }}
          />

          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              {user ? "Welcome Back!" : "Ready to Start Tracking?"}
            </h2>
            <p className="text-muted-foreground text-lg mb-10 max-w-lg mx-auto">
              {user
                ? `You are signed in as ${user.email}. Jump right back into your market watchlist.`
                : "Create your personalized watchlist in seconds. Free to use, no credit card required."}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {user ? (
                <Link
                  href="/dashboard"
                  className="group flex items-center gap-2 px-8 py-4 rounded-xl font-semibold bg-foreground text-background hover:bg-foreground/90 text-base transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-1"
                >
                  <LayoutDashboard className="w-5 h-5" />
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth/register"
                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-foreground text-background hover:bg-foreground/90 transition-all hover:-translate-y-0.5 shadow-sm"
                  >
                    <UserPlus className="w-4 h-4" />
                    Create Account
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>

                  <Link
                    href="/auth/login"
                    className="flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-foreground border border-border glass transition-all duration-300 hover:scale-105"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </Link>

                  <Link
                    href="/dashboard"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
                  >
                    Continue as guest →
                  </Link>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* Footer links */}
        <div className="mt-12 flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <span>© 2026 MarketWatch</span>
          <span>•</span>
          <span>Data from Yahoo Finance, Binance, OKX</span>
          <span>•</span>
          <span>Powered by WebAssembly</span>
        </div>
      </div>
    </section>
  );
}
