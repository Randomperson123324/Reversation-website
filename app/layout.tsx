import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { PageTransitionProvider } from "@/components/PageTransition";

export const metadata: Metadata = {
  title: "SMC Room Booking | ระบบจองห้องประชุม",
  description: "ระบบจองห้องประชุม SMC 601 และ SMC 605",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700;800&family=IBM+Plex+Sans+Thai:wght@300;400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body bg-app text-ink antialiased">
        <PageTransitionProvider>{children}</PageTransitionProvider>
        <Toaster
          theme="light"
          position="top-right"
          toastOptions={{
            style: {
              background: "rgb(var(--color-surface-rgb))",
              border: "1px solid rgb(var(--color-line-strong-rgb))",
              color: "rgb(var(--color-ink-rgb))",
            },
          }}
        />
      </body>
    </html>
  );
}
