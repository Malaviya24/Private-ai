import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Malaviya AI Studio",
  description: "A polished Next.js dashboard for logo and text-to-video generation."
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
