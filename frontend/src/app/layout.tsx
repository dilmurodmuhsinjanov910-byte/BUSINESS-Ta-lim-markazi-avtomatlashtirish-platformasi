import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Al-Xorazmiy | Ta'lim Markazi Avtomatlashtirish Platformasi (BUSINESS V1)",
  description: "AI-assisted lead qualification, trial booking engine, and human handoff CRM",
};

import { ToastProvider } from "@/components/Toast";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz">
      <body className="antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
