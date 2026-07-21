import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Find Weirdo",
  description: "限時潛入霓虹浮島，在 3D 霓虹城市裡找到 8 位暴走的水瓶座怪人。",
  icons: {
    icon: "/assets/ui/alien-favicon.png",
    shortcut: "/assets/ui/alien-favicon.png",
    apple: "/assets/ui/alien-favicon.png",
  },
  openGraph: {
    title: "Find Weirdo",
    description: "水瓶座怪人觀測系統，進入霓虹浮島尋找野生水瓶座。",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
