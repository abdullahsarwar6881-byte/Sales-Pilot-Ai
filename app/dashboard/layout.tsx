import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import PageContainer from "@/components/layout/PageContainer";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />

      <div className="ml-72 flex min-h-screen flex-1 flex-col bg-background">
        <Navbar />

        <PageContainer>
          {children}
        </PageContainer>
      </div>
    </div>
  );
}