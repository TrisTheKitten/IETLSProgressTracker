import type { Metadata } from "next";
import { Newsreader } from "next/font/google";
import "./globals.css";
import SidebarNav from "@/components/SidebarNav";

const ledgerSerif = Newsreader({
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
  variable: "--font-ledger-serif",
});

export const metadata: Metadata = {
  title: "IELTS Tracker",
  description: "Track Cambridge IELTS practice sets, band scores, and progress.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${ledgerSerif.variable} h-full`}>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <a
          href="#main-content"
          className="fixed left-4 top-4 z-50 -translate-y-24 border border-primary bg-background px-4 py-2 text-sm font-semibold text-primary transition-transform focus:translate-y-0"
        >
          Skip to content
        </a>
        <SidebarNav />
        <main
          id="main-content"
          tabIndex={-1}
          className="min-h-dvh w-full min-w-0 scroll-mt-16 lg:pl-60 xl:pl-72"
        >
          <div className="mx-auto w-full min-w-0 max-w-[88rem] px-5 pb-12 pt-7 sm:px-8 sm:pt-9 lg:px-10 lg:pb-16 lg:pt-10 xl:px-14">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
