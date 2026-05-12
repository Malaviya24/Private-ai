import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Malaviya AI Studio",
  description: "A bold Next.js dashboard for logo generation, classic image creation, 18+ image generation, text to video, and web-to-ZIP tools."
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
