import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import PageContainer from "@/components/layout/PageContainer";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* =========================================
          SIDEBAR
          ========================================= */}

      <Sidebar />

      {/* =========================================
          MAIN APPLICATION AREA
          ========================================= */}

      <div className="ml-72 flex min-h-screen min-w-0 flex-1 flex-col bg-background">
        {/* =======================================
            TOP NAVBAR
            ======================================= */}

        <Navbar />

        {/* =======================================
            PAGE CONTENT
            ======================================= */}

        <main className="min-w-0 flex-1">
          <PageContainer>
            {children}
          </PageContainer>
        </main>
      </div>
    </div>
  );
}