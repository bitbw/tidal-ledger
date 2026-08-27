import type { Metadata } from "next";
import { ThemeProvider } from "@/components/themes/provider"
import "./globals.css";
import { inter } from "./fonts";

export const metadata: Metadata = {
  title: "潮汐账本 · Neon",
  description: "快速记账、账单导入与消费报表",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={inter.variable} suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
