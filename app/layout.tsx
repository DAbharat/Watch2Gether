import type { Metadata } from "next";
import { Host_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toast";

const hostGrotesk = Host_Grotesk({
  variable: "--font-host-grotesk",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Watch2Gether | Real-Time Synchronized Watch Parties",
  description: "Watch YouTube videos together with friends in real-time sync with role-based controls and chat.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${hostGrotesk.variable} ${hostGrotesk.className} h-full antialiased dark`}
    >
      <body className={`${hostGrotesk.className} min-h-full flex flex-col bg-[#05090a] text-zinc-100`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
