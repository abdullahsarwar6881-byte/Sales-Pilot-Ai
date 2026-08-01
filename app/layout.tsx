import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sales Pilot | Your AI Sales & Customer Support Employee',
  description: 'Train an AI on your business in minutes.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://googleapis.com" />
        <link rel="preconnect" href="https://gstatic.com" crossOrigin="anonymous" />
        <link href="https://googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="h-full bg-[#0F172A] text-slate-100 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
