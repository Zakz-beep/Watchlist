// components/landing/HeroSection.tsx
"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, BarChart3, Zap } from "lucide-react";
import { useUser } from "@/lib/hooks/useUser";

const STAT_ITEMS = [
  { label: "Data Sources", value: "5+" },
  { label: "Assets Tracked", value: "10K+" },
  { label: "Update Speed", value: "<1s" },
  { label: "WASM Powered", value: "✓" },
];

export function HeroSection() {
  const { user } = useUser();

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden gradient-mesh px-4">
      {/* Animated background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            background: "radial-gradient(circle, hsl(217 91% 60% / 0.12) 0%, transparent 70%)",
            top: "-10%",
            left: "-10%",
          }}
          animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full"
          style={{
            background: "radial-gradient(circle, hsl(262 83% 58% / 0.10) 0%, transparent 70%)",
            bottom: "-5%",
            right: "-5%",
          }}
          animate={{ x: [0, -30, 0], y: [0, -20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
        <motion.div
          className="absolute w-[300px] h-[300px] rounded-full"
          style={{
            background: "radial-gradient(circle, hsl(43 96% 56% / 0.08) 0%, transparent 70%)",
            top: "40%",
            right: "20%",
          }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        />
      </div>

      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-6 flex items-center gap-2 glass rounded-full px-4 py-2 text-sm"
      >
        <Zap className="w-4 h-4 text-yellow-400" />
        <span className="text-muted-foreground">
          WebAssembly-powered • Multi-source • Real-time
        </span>
      </motion.div>

      {/* Headline */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1 }}
        className="text-center max-w-4xl mx-auto"
      >
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-tight mb-6">
          Track Every{" "}
          <span className="relative">
            <span
              className="relative z-10 bg-clip-text text-transparent"
              style={{
                backgroundImage: "linear-gradient(135deg, hsl(217 91% 60%), hsl(262 83% 70%))",
              }}
            >
              Market
            </span>
          </span>
          ,{" "}
          <br className="hidden sm:block" />
          All in One Place
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Aggregate live price data from Yahoo Finance, Binance, OKX and more.
          Blazing fast WASM-powered sorting and technical indicators.
          Your watchlist. Your rules.
        </p>
      </motion.div>

      {/* CTA Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mt-10 flex flex-col sm:flex-row items-center gap-4"
      >
        <Link
          href="/dashboard"
          className="group flex items-center gap-2 px-8 py-4 rounded-xl font-semibold bg-foreground text-background hover:bg-foreground/90 text-base transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-1"
        >
          {user ? "Go to Dashboard" : "Open Dashboard"}
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
        {!user && (
          <Link
            href="/auth/login"
            className="flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-foreground text-base border border-border glass transition-all duration-300 hover:scale-105"
          >
            <BarChart3 className="w-4 h-4" />
            Sign In
          </Link>
        )}
      </motion.div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10"
      >
        {STAT_ITEMS.map((s) => (
          <div key={s.label} className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-foreground">{s.value}</div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center pt-2">
          <div className="w-1.5 h-3 rounded-full bg-muted-foreground/50" />
        </div>
      </motion.div>
    </section>
  );
}
