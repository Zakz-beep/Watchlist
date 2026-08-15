// app/dashboard/layout.tsx
import { Sidebar } from "@/components/layout/Sidebar";
import { DashboardNav } from "@/components/layout/DashboardNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <DashboardNav />
        <main className="flex-1 overflow-y-auto p-6 gradient-mesh">
          {children}
        </main>
      </div>
    </div>
  );
}
