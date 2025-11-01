import { Toaster } from "@/components/ui/sonner";
import { SessionWrapper } from "@/providers/session-wrapper";
import SpacetimeDBProvider from "@/providers/spacetime-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "GoControlPanel",
  description: "Manage your trackmania servers with ease.",
  keywords: ["Trackmania", "Servers", "Administration", "GoControlPanel"],
  authors: [
    {
      name: "Marijn Regterschot",
      url: "https://github.com/MRegterschot",
    },
  ],
  creator: "Marijn Regterschot",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "GoControlPanel",
    description: "Manage your trackmania servers with ease.",
    url: "https://gocontrolpanel.com",
    siteName: "GoControlPanel",
    images: [
      {
        url: "https://gocontrolpanel.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "GoControlPanel Open Graph Image",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GoControlPanel",
    description: "Manage your trackmania servers with ease.",
    images: ["https://gocontrolpanel.com/twitter-image.png"],
    creator: "@MRegterschot",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-x-hidden`}
      >
        <SpacetimeDBProvider>
          <SessionWrapper>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <Toaster />
            </ThemeProvider>
          </SessionWrapper>
        </SpacetimeDBProvider>
      </body>
    </html>
  );
}
