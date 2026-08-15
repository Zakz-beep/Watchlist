// components/landing/FeatureCards.tsx
"use client";

import { motion } from "framer-motion";
import { Cpu, Globe, Zap, Moon } from "lucide-react";

const FEATURES = [
  {
    icon: Globe,
    title: "Multi-Source Data",
    description:
      "Pull live prices from Yahoo Finance, Binance, OKX and more — all normalized into one unified view.",
    gradient: "from-blue-500/20 to-cyan-500/20",
    iconColor: "text-blue-400",
    border: "border-blue-500/20",
  },
  {
    icon: Cpu,
    title: "WASM Performance",
    description:
      "Sorting 10,000+ assets, RSI, Moving Averages — all computed in WebAssembly at near-native speed.",
    gradient: "from-purple-500/20 to-pink-500/20",
    iconColor: "text-purple-400",
    border: "border-purple-500/20",
  },
  {
    icon: Zap,
    title: "Real-Time Updates",
    description:
      "Binance WebSocket streams, auto-polling fallback. Your prices refresh every second, not every minute.",
    gradient: "from-yellow-500/20 to-orange-500/20",
    iconColor: "text-yellow-400",
    border: "border-yellow-500/20",
  },
  {
    icon: Moon,
    title: "Dark & Light Mode",
    description:
      "Eye-friendly theming with next-themes. Every chart, table, and card adapts instantly.",
    gradient: "from-green-500/20 to-teal-500/20",
    iconColor: "text-green-400",
    border: "border-green-500/20",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

export function FeatureCards() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Built for Serious Traders
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Professional-grade tools wrapped in a beautiful, intuitive interface.
          </p>
        </motion.div>

        {/* Cards grid */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                variants={item}
                whileHover={{ scale: 1.03, translateY: -4 }}
                className={`relative p-6 rounded-2xl border ${f.border} glass transition-all duration-300 group cursor-default overflow-hidden`}
              >
                {/* Gradient background */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${f.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl`}
                />

                <div className="relative z-10">
                  <div
                    className={`inline-flex p-3 rounded-xl bg-background/50 mb-4 border ${f.border}`}
                  >
                    <Icon className={`w-6 h-6 ${f.iconColor}`} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {f.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
