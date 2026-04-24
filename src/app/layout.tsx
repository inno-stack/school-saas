import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/providers/QueryProvider";
import type { Metadata } from "next";
// 1. Change the import source
import { GeistSans } from "geist/font/sans";
import "./globals.css";

// 2. Remove the 'const geist = ...' configuration line

export const metadata: Metadata = {
  title: "InnoCore — School Management System",
  description: "Modern SaaS School Management Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* 3. Use GeistSans.className here */}
      <body className={GeistSans.className}>
        <QueryProvider>
          {children}
          <Toaster richColors position="top-right" />
        </QueryProvider>
      </body>
    </html>
  );
}
