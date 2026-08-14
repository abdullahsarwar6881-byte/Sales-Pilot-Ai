import { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export default function PageContainer({
  children,
}: Props) {
  return (
    <main className="flex-1 bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-8 py-8">
        {children}
      </div>
    </main>
  );
}