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
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/lib/hooks/useUser";
import { EditProfileDialog } from "@/components/profile/EditProfileDialog";

const NAV_ITEMS = [
  { label: "Overview",   href: "/dashboard",            icon: LayoutDashboard },
  { label: "Portfolio",  href: "/dashboard/portfolio",  icon: Wallet },
  { label: "Watchlist",  href: "/dashboard/watchlist",  icon: Star },
  { label: "Charts",     href: "/dashboard/charts",     icon: CandlestickChart },
  { label: "Signals",    href: "/dashboard/signals",    icon: BrainCircuit },
  { label: "Options GEX", href: "/dashboard/options",   icon: BarChart3 },
  { label: "Alerts",     href: "/dashboard/alerts",      icon: BellRing },
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
    <aside className="hidden md:flex flex-col w-60 h-full border-r border-border/50 bg-card/60 shrink-0">
      {/* Logo */}
      <div className="p-4 border-b border-border/40">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-sm tracking-tight">
          <div className="p-1.5 rounded-xl bg-primary text-primary-foreground">
            <LayoutDashboard className="w-4 h-4" />
          </div>
          <div>
            <div>MarketWatch</div>
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Trading Terminal</div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto">
        <p className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Workspace</p>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 group",
                active
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="w-3 h-3 opacity-60" />}
            </Link>
          );
        })}
      </nav>


      {/* User Profile & Bottom actions */}
      <div className="p-3 border-t border-border/40 space-y-1.5">
        {/* Profile Card Widget */}
        <div
          onClick={() => setProfileOpen(true)}
          className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-muted/50 transition-all cursor-pointer group border border-transparent hover:border-border/30"
        >
          <div className="w-8 h-8 rounded-lg border border-border/60 bg-muted/40 overflow-hidden flex items-center justify-center shrink-0">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt={profile.fullName || "User Avatar"}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs font-bold text-primary uppercase">
                {profile.fullName ? profile.fullName.slice(0, 2) : "MW"}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold truncate group-hover:text-primary transition-colors">
              {profile.fullName || "Guest Trader"}
            </div>
            <div className="text-[10px] text-muted-foreground truncate">
              {profile.username ? `@${profile.username}` : user ? user.email : "Guest Mode"}
            </div>
          </div>
          <Pencil className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        </div>

        <button
          onClick={handleAuthAction}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all",
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
              Sign In
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

