// components/layout/Navbar.tsx
"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, BarChart3, Menu, X, LogOut, User as UserIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/lib/hooks/useUser";

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useUser();

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = user
    ? [{ label: "Dashboard", href: "/dashboard" }]
    : [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Login",     href: "/auth/login" },
        { label: "Register",  href: "/auth/register" },
      ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "glass border-b border-border/40 shadow-lg" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <div className="p-1.5 rounded-lg bg-foreground text-background">
            <BarChart3 className="w-4 h-4" />
          </div>
          <span>MarketWatch</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              {link.label}
            </Link>
          ))}

          {/* Theme toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg border border-border/40 glass hover:bg-muted/50 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
          )}

          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-primary" />
                <span className="truncate max-w-[140px]">{user.email}</span>
              </span>
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 transition-all hover:-translate-y-0.5 shadow-sm"
              >
                Go to Dashboard
              </Link>
              <button
                onClick={signOut}
                title="Sign Out"
                className="p-2 rounded-lg border border-border/40 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 transition-all hover:-translate-y-0.5 shadow-sm"
            >
              Open App
            </Link>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-2">
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg glass border border-border/40"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg glass border border-border/40"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden glass border-b border-border/40 px-4 pb-4 pt-2 space-y-2"
          >
            {user && (
              <div className="py-2 text-xs text-muted-foreground flex items-center gap-2 border-b border-border/20">
                <UserIcon className="w-3.5 h-3.5 text-primary" />
                <span className="truncate">{user.email}</span>
              </div>
            )}

            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block py-2.5 text-sm text-muted-foreground hover:text-foreground border-b border-border/20 last:border-0 transition-colors font-medium"
              >
                {link.label}
              </Link>
            ))}

            {user && (
              <button
                onClick={() => {
                  signOut();
                  setMobileOpen(false);
                }}
                className="w-full flex items-center gap-2 py-2.5 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors font-medium"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

