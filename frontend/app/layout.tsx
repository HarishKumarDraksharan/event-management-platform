import type { Metadata } from "next";
import { siteMetadata } from "../lib/metadata";
import "./globals.css";

export const metadata: Metadata = siteMetadata;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
