import type { Metadata } from "next";
import { APP_NAME } from "@/config/company";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s｜${APP_NAME}` },
  description: "エアコンクリーニングの見積・請求・売掛金をまとめて管理する社内システム",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
