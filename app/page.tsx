// app/page.tsx — Welcome Dashboard (Landing Page)
import { HeroSection } from "@/components/landing/HeroSection";
import { MarketTicker } from "@/components/landing/MarketTicker";
import { FeatureCards } from "@/components/landing/FeatureCards";
import { MarketSnapshot } from "@/components/landing/MarketSnapshot";
import { FooterCTA } from "@/components/landing/FooterCTA";
import { Navbar } from "@/components/layout/Navbar";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* 1. Animated hero with headline + stats */}
        <HeroSection />

        {/* 2. Live scrolling market ticker */}
        <MarketTicker />

        {/* 3. Feature highlight cards */}
        <FeatureCards />

        {/* 4. Live market snapshot grid */}
        <MarketSnapshot />

        {/* 5. CTA + footer */}
        <FooterCTA />
      </main>
    </div>
  );
}
