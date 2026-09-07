import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import PageContainer from "@/components/layout/PageContainer";
import AuthGuard from "@/components/auth/AuthGuard";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background text-foreground">
        {/* =========================================
            SIDEBAR
            ========================================= */}

        <Sidebar />

        {/* =========================================
            MAIN APPLICATION AREA
            ========================================= */}

        <div className="ml-60 lg:ml-64 flex min-h-screen min-w-0 flex-1 flex-col bg-background">
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
    </AuthGuard>
  );
}