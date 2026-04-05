import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Malaviya AI Studio",
  description: "A bold Next.js dashboard for logo generation, text to video, and secure mobile lookup."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
