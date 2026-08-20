// app/dashboard/layout.tsx
import { Sidebar } from "@/components/layout/Sidebar";
import { DashboardNav } from "@/components/layout/DashboardNav";
import { MobileTabBar } from "@/components/layout/MobileTabBar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <DashboardNav />
        <main className="flex-1 overflow-y-auto px-4 py-5 pb-28 sm:p-6 md:pb-6 gradient-mesh">
          {children}
        </main>
      </div>
      <MobileTabBar />
    </div>
  );
}
