import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Farguessr by ds8",
  description: "Guess the distance and the direction between two random countries",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
