import type { Metadata } from "next";
import "./globals.css";
import { TopNav } from "@/components/TopNav";

export const metadata: Metadata = {
  title: "Sprint Coach — Your AI Track & Field Assistant",
  description:
    "An AI-powered training assistant for sprint athletes (60m, 100m, 200m, 400m).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground">
        <TopNav />
        <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
