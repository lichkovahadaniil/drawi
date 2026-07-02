import "@livekit/components-styles";
import "@excalidraw/excalidraw/index.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeBootScript } from "@/components/theme-boot-script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "drawi",
  description: "Think together. Learn visibly.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      data-drawi-theme="day"
      style={{ colorScheme: "light" }}
      suppressHydrationWarning
    >
      <body className="drawi-shell antialiased">
        <ThemeBootScript initialTheme="day" />
        {children}
      </body>
    </html>
  );
}
