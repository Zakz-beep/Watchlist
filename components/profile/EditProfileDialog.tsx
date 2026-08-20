// components/profile/EditProfileDialog.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  User,
  Upload,
  Link as LinkIcon,
  Send,
  Globe,
  Loader2,
  Check,
  Sparkles,
  Camera,
  Image as ImageIcon,
  Pencil,
} from "lucide-react";
import type { UserProfile, SocialLinks } from "@/types/market";
import { cn } from "@/lib/utils";

// Lightweight clean brand icons
function XTwitterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("fill-current", className)} width="1em" height="1em">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("fill-current", className)} width="1em" height="1em">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("fill-current", className)} width="1em" height="1em">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
    </svg>
  );
}


interface EditProfileDialogProps {
  open: boolean;
  onClose: () => void;
  profile: UserProfile;
  onSave: (updated: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
  isGuest?: boolean;
}

const PRESET_AVATARS = [
  { label: "Bull", url: "https://images.unsplash.com/photo-1544376798-89aa6b82c6cd?w=150&auto=format&fit=crop&q=80" },
  { label: "Trader", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" },
  { label: "Cyberpunk", url: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80" },
  { label: "Crypto", url: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80" },
  { label: "Whale", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80" },
  { label: "Diamond", url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80" },
];

export function EditProfileDialog({ open, onClose, profile, onSave, isGuest }: EditProfileDialogProps) {
  const [fullName, setFullName] = useState(profile.fullName || "");
  const [username, setUsername] = useState(profile.username || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || "");
  const [socials, setSocials] = useState<SocialLinks>(profile.socials || {});
  const [hyperliquidAddress, setHyperliquidAddress] = useState(profile.hyperliquidAddress || "");
  
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when profile changes or dialog opens
  useEffect(() => {
    if (open) {
      setFullName(profile.fullName || "");
      setUsername(profile.username || "");
      setBio(profile.bio || "");
      setAvatarUrl(profile.avatarUrl || "");
      setSocials(profile.socials || {});
      setHyperliquidAddress(profile.hyperliquidAddress || "");
      setErrorMsg("");
      setSavedSuccess(false);
    }
  }, [open, profile]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("File image too large (max 5MB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_DIM = 160;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", 0.75);
          setAvatarUrl(compressed);
          setErrorMsg("");
        }
      };
      if (typeof event.target?.result === "string") {
        img.src = event.target.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSocialChange = (key: keyof SocialLinks, value: string) => {
    setSocials((prev) => ({
      ...prev,
      [key]: value.trim(),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");

    const cleanHl = hyperliquidAddress.trim();
    if (cleanHl && !/^0x[a-fA-F0-9]{40}$/.test(cleanHl)) {
      setErrorMsg("Invalid Ethereum/Hyperliquid wallet address (must be 0x... 42 characters)");
      setSaving(false);
      return;
    }

    const result = await onSave({
      fullName: fullName.trim() || "Trader",
      username: username.trim().replace(/^@/, "") || "trader",
      bio: bio.trim(),
      avatarUrl: avatarUrl.trim(),
      socials,
      hyperliquidAddress: cleanHl,
    });

    setSaving(false);
    if (result.success) {
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 700);
    } else {
      setErrorMsg(result.error || "Failed to update profile");
    }
  };


  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto glass border border-border/60 rounded-3xl p-6 shadow-2xl z-10 space-y-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/40 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Edit Profile & Socials</h3>
                  <p className="text-xs text-muted-foreground">
                    {isGuest ? "Guest profile (saved locally)" : "Synced with your Supabase account"}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-muted/70 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-2xl">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* ── 1. Profile Picture / Avatar Section ── */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-primary" />
                  Profile Picture (Avatar)
                </label>

                <div className="flex items-center gap-4 flex-wrap">
                  {/* Current Preview */}
                  <div className="relative group">
                    <div className="w-20 h-20 rounded-full border-2 border-primary/40 bg-muted/60 overflow-hidden flex items-center justify-center shadow-lg shrink-0">
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatarUrl}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                          onError={() => setAvatarUrl("")}
                        />
                      ) : (
                        <div className="text-xl font-extrabold text-muted-foreground uppercase">
                          {fullName ? fullName.slice(0, 2) : "MW"}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                      title="Upload image file"
                    >
                      <Upload className="w-5 h-5" />
                    </button>
                  </div>

                  {/* URL Input & Upload Button */}
                  <div className="flex-1 min-w-[200px] space-y-2">
                    <div className="relative">
                      <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="url"
                        value={avatarUrl.startsWith("data:") ? "" : avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        placeholder="Paste image URL (https://...)"
                        className="w-full rounded-xl border border-border/60 bg-muted/40 py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 bg-card/60 hover:bg-muted text-xs font-semibold transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Upload File
                      </button>
                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={() => setAvatarUrl("")}
                          className="px-2.5 py-1.5 rounded-xl text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Presets */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" /> Or pick a preset:
                  </span>
                  <div className="flex items-center gap-2 overflow-x-auto py-1">
                    {PRESET_AVATARS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setAvatarUrl(preset.url)}
                        className={cn(
                          "flex items-center gap-1.5 p-1 rounded-xl border transition-all text-xs shrink-0",
                          avatarUrl === preset.url
                            ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                            : "border-border/60 hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={preset.url}
                          alt={preset.label}
                          className="w-6 h-6 rounded-lg object-cover"
                        />
                        <span className="text-[11px] font-medium pr-1">{preset.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── 2. Basic Info Section ── */}
              <div className="space-y-3 pt-2 border-t border-border/40">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Personal Details
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Satoshi Nakamoto"
                      className="w-full rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">Username</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-semibold">@</span>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="trader_xyz"
                        className="w-full rounded-xl border border-border/60 bg-muted/40 py-2 pl-7 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">Bio / Trading Motto</label>
                  <textarea
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="e.g. Perpetuals & Options swing trader. Systematic risk management."
                    className="w-full rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </div>
              </div>

              {/* ── 3. Social Media Links Section ── */}
              <div className="space-y-3 pt-2 border-t border-border/40">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-primary" />
                  Social Media & Profiles
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Twitter / X */}
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                      <XTwitterIcon className="w-3.5 h-3.5 text-sky-400" /> Twitter / X
                    </label>
                    <input
                      type="text"
                      value={socials.twitter || ""}
                      onChange={(e) => handleSocialChange("twitter", e.target.value)}
                      placeholder="https://x.com/username or @handle"
                      className="w-full rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  {/* Telegram */}
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                      <Send className="w-3.5 h-3.5 text-blue-400" /> Telegram
                    </label>
                    <input
                      type="text"
                      value={socials.telegram || ""}
                      onChange={(e) => handleSocialChange("telegram", e.target.value)}
                      placeholder="https://t.me/username or @handle"
                      className="w-full rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  {/* GitHub */}
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                      <GitHubIcon className="w-3.5 h-3.5 text-purple-400" /> GitHub
                    </label>
                    <input
                      type="text"
                      value={socials.github || ""}
                      onChange={(e) => handleSocialChange("github", e.target.value)}
                      placeholder="https://github.com/username"
                      className="w-full rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  {/* LinkedIn */}
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                      <LinkedInIcon className="w-3.5 h-3.5 text-blue-500" /> LinkedIn
                    </label>
                    <input
                      type="text"
                      value={socials.linkedin || ""}
                      onChange={(e) => handleSocialChange("linkedin", e.target.value)}
                      placeholder="https://linkedin.com/in/username"
                      className="w-full rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>


                  {/* Website */}
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 mb-1">
                      <Globe className="w-3.5 h-3.5 text-emerald-400" /> Personal Website / Portfolio
                    </label>
                    <input
                      type="url"
                      value={socials.website || ""}
                      onChange={(e) => handleSocialChange("website", e.target.value)}
                      placeholder="https://yourportfolio.com"
                      className="w-full rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
              </div>

              {/* ── 4. Hyperliquid L1 Account & Portfolio Connection ── */}
              <div className="space-y-3 pt-2 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Hyperliquid Account (L1 Wallet)
                  </label>
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Non-Custodial (Read-Only)
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                    EVM / Arbitrum Wallet Address (`0x...`)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={hyperliquidAddress}
                      onChange={(e) => setHyperliquidAddress(e.target.value.trim())}
                      placeholder="0x1234...5678 (42 characters)"
                      className="w-full rounded-xl border border-border/60 bg-muted/40 font-mono py-2 pl-3 pr-20 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    {hyperliquidAddress && (
                      <button
                        type="button"
                        onClick={() => setHyperliquidAddress("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-muted-foreground hover:text-destructive"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    Connects your Hyperliquid positions, account equity, and PnL performance graph to the dashboard.
                  </p>
                </div>

                {/* Quick Demo Addresses */}
                <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                  <span className="text-[10px] text-muted-foreground font-medium">Quick test addresses:</span>
                  <button
                    type="button"
                    onClick={() => setHyperliquidAddress("0x010461c14e146ac35fe42271bdc1134ee31c703a")}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-400 transition-colors"
                  >
                    Active Trader Whale (175 positions + history)
                  </button>
                </div>

              </div>

              {/* ── Footer Actions ── */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border/40">

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-2xl border border-border/60 text-xs font-semibold hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="ios-button flex items-center gap-1.5 px-5 py-2 text-xs font-semibold"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : savedSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Saved!
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
