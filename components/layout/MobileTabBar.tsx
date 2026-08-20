"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BellRing, BrainCircuit, CandlestickChart, LayoutDashboard, Star, Home, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Portfolio", href: "/dashboard/portfolio", icon: Wallet },
  { label: "Watchlist", href: "/dashboard/watchlist", icon: Star },
  { label: "Charts", href: "/dashboard/charts", icon: CandlestickChart },
  { label: "Signals", href: "/dashboard/signals", icon: BrainCircuit },
  { label: "Options", href: "/dashboard/options", icon: BarChart3 },
  { label: "Alerts", href: "/dashboard/alerts", icon: BellRing },
];

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed inset-x-2.5 bottom-2.5 z-50 rounded-2xl border border-border/50 glass px-1.5 py-1.5 shadow-xl shadow-black/10">
      <div className="grid grid-cols-7 gap-0.5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[9px] font-medium transition-all text-center min-w-0",
                active
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate max-w-full px-0.5">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

