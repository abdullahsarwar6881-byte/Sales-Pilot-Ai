import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sales Pilot Widget",
  description: "AI Customer Support Chat Widget",
  robots: { index: false, follow: false },
};

export default function WidgetRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-transparent overflow-hidden text-slate-900 antialiased selection:bg-indigo-500 selection:text-white">
      {children}
    </div>
  );
}

