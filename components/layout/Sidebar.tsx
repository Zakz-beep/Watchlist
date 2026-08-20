"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  LayoutDashboard,
  Star,
  BellRing,
  CandlestickChart,
  BrainCircuit,
  BarChart3,
  Pencil,
  LogOut,
  LogIn,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/lib/hooks/useUser";
import { EditProfileDialog } from "@/components/profile/EditProfileDialog";

const NAV_ITEMS = [
  { label: "Overview",  href: "/dashboard",           icon: LayoutDashboard },
  { label: "Watchlist", href: "/dashboard/watchlist",  icon: Star },
  { label: "Charts",    href: "/dashboard/charts",     icon: CandlestickChart },
  { label: "Signals",   href: "/dashboard/signals",    icon: BrainCircuit },
  { label: "Options GEX", href: "/dashboard/options",  icon: BarChart3 },
  { label: "Alerts",    href: "/dashboard/alerts",     icon: BellRing },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, updateProfile, signOut } = useUser();
  const [profileOpen, setProfileOpen] = useState(false);

  const handleAuthAction = async () => {
    if (user) {
      await signOut();
      router.push("/auth/login");
    } else {
      router.push("/auth/login");
    }
  };

  return (
    <aside className="hidden md:flex flex-col w-64 h-full border-r border-border/60 glass shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-border/50">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-base tracking-tight">
          <div className="p-2 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-blue-500/20">
            <LayoutDashboard className="w-4 h-4" />
          </div>
          <div>
            <div>MarketWatch</div>
            <div className="text-[10px] font-medium text-muted-foreground tracking-wide uppercase">Personal finance</div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <p className="px-3 pt-2 pb-1 text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">Workspace</p>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200 group",
                active
                  ? "bg-primary text-primary-foreground shadow-md shadow-blue-500/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* User Profile & Bottom actions */}
      <div className="p-3 border-t border-border/50 space-y-2">
        {/* Profile Card Widget */}
        <div
          onClick={() => setProfileOpen(true)}
          className="flex items-center gap-2.5 p-2 rounded-2xl hover:bg-muted/60 transition-all cursor-pointer group border border-transparent hover:border-border/40"
        >
          <div className="w-9 h-9 rounded-xl border border-primary/40 bg-muted/60 overflow-hidden flex items-center justify-center shrink-0">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt={profile.fullName || "User Avatar"}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs font-black text-primary uppercase">
                {profile.fullName ? profile.fullName.slice(0, 2) : "MW"}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold truncate group-hover:text-primary transition-colors">
              {profile.fullName || "Guest Trader"}
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              {profile.username ? `@${profile.username}` : user ? user.email : "Guest Mode"}
            </div>
          </div>
          <Pencil className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        </div>

        <button
          onClick={handleAuthAction}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-xs font-semibold transition-all",
            user
              ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              : "text-primary bg-primary/10 hover:bg-primary/20"
          )}
        >
          {user ? (
            <>
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </>
          ) : (
            <>
              <LogIn className="w-3.5 h-3.5" />
              Sign In with Supabase
            </>
          )}
        </button>
      </div>

      {/* Edit Profile Dialog */}
      <EditProfileDialog
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        profile={profile}
        onSave={updateProfile}
        isGuest={!user}
      />
    </aside>
  );
}

