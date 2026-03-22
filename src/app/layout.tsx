import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hybrid Funnel Editor",
  description: "Visual editor for creating booking funnels with reusable widget templates",
};

export const viewport: Viewport = {
  width: 1280,
  initialScale: 0.5,
  minimumScale: 0.25,
  maximumScale: 3,
  userScalable: true,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Serif:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen bg-surface">
        {children}
      </body>
    </html>
  );
}
