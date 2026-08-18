import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sales Pilot | Your AI Sales & Customer Support Employee",
  description: "Train an AI on your business in minutes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const shopifyApiKey =
    process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || "";

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Shopify App Bridge */}
        <meta
          name="shopify-api-key"
          content={shopifyApiKey}
        />

        <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>

        {/* Fonts */}
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />

        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />

        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>

      <body
        className="
          min-h-screen
          bg-background
          text-foreground
          font-sans
          antialiased
          transition-colors
          duration-200
        "
      >
        {children}
      </body>
    </html>
  );
}