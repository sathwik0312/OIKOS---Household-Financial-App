import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import ClerkTokenProvider from "@/components/ClerkTokenProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "OIKOS — Household Financial AI",
  description: "The financial nervous system of your household",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider>
          <ClerkTokenProvider />
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
