import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
import "./globals.css";

const grotesk = Inter_Tight({ variable: "--font-grotesk", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Chairside",
  description: "The consultation before the chair. YouCam AI reads your hair and skin, shows the look, and plans every step to get there.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${grotesk.variable} antialiased`}>{children}</body>
    </html>
  );
}
