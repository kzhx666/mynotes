import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MyNotes - 建筑材料课件系统",
  description: "私有化教案管理与思维导图",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
