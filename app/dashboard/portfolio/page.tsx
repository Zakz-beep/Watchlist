// app/dashboard/portfolio/page.tsx
"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { motion } from "framer-motion";
import { Zap, Wallet, ShieldCheck, ArrowRight } from "lucide-react";
import { HyperliquidPortfolioWidget } from "@/components/portfolio/HyperliquidPortfolioWidget";
import { EditProfileDialog } from "@/components/profile/EditProfileDialog";
import { useUser } from "@/lib/hooks/useUser";

export default function PortfolioPage() {
  const { user, profile, updateProfile } = useUser();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className="space-y-6 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Hyperliquid Portfolio & Positions</h2>
              <p className="text-muted-foreground text-xs mt-0.5">
                Real-time L1 perpetuals margin, open contracts, and cumulative PnL performance trajectory.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setProfileOpen(true)}
          className="ios-button flex items-center gap-1.5 px-4 py-2 text-xs font-semibold"
        >
          <Wallet className="w-4 h-4" />
          {profile.hyperliquidAddress ? "Manage Wallet" : "Connect Hyperliquid Wallet"}
        </button>
      </div>

      {/* Main Portfolio Widget */}
      <HyperliquidPortfolioWidget
        walletAddress={profile.hyperliquidAddress}
        onOpenEditProfile={() => setProfileOpen(true)}
      />

      {/* Edit Profile & Socials / Wallet Dialog */}
      <EditProfileDialog
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        profile={profile}
        onSave={updateProfile}
        isGuest={!user}
      />
    </div>
  );
}
