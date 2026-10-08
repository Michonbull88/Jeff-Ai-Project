import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AccountMenu } from "@/components/AccountMenu";
export const metadata: Metadata = {
  title: "JEFF — Personal Intelligence",
  description:
    "A little more human. Meet JEFF, your visual AI companion for natural voice conversations, thoughtful answers and live research.",
  icons: { icon: "/icon.svg" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#030508",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}<AccountMenu /></body>
    </html>
  );
}
