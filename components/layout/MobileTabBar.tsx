"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BellRing, BrainCircuit, CandlestickChart, LayoutDashboard, Star, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Watchlist", href: "/dashboard/watchlist", icon: Star },
  { label: "Charts", href: "/dashboard/charts", icon: CandlestickChart },
  { label: "Signals", href: "/dashboard/signals", icon: BrainCircuit },
  { label: "Options", href: "/dashboard/options", icon: BarChart3 },
  { label: "Alerts", href: "/dashboard/alerts", icon: BellRing },
];

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed inset-x-3 bottom-3 z-50 rounded-[1.65rem] border border-border/70 glass px-2 py-2 shadow-2xl shadow-slate-950/10">
      <div className="grid grid-cols-7 gap-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[10px] font-semibold transition-colors",
                active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/70"
              )}
            >
              <Icon className={cn("h-4 w-4", active && "fill-current/10")} />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
