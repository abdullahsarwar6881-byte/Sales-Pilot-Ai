import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
}

export default function PageContainer({
  children,
  className = "",
}: Props) {
  return (
    <div className={`mx-auto max-w-[1600px] px-4 py-4 md:px-6 md:py-5 min-w-0 ${className}`}>
      {children}
    </div>
  );
}