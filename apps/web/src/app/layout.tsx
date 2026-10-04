import { Toaster } from "@/components/ui/sonner";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/site";
import PlausibleProvider from "@/providers/plausible-provider";
import { QueryProvider } from "@/providers/query-provider";
import { SessionWrapper } from "@/providers/session-wrapper";
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
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "Trackmania",
    "Trackmania server",
    "Trackmania dedicated server",
    "server controller",
    "server administration",
    "TMControlPanel",
  ],
  authors: [
    {
      name: "Marijn Regterschot",
      url: "https://github.com/MRegterschot",
    },
  ],
  creator: "Marijn Regterschot",
  category: "games",
  icons: {
    icon: [{ url: "/branding/icon.svg", type: "image/svg+xml", sizes: "any" }],
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  // The share images come from app/opengraph-image.png and app/twitter-image.png
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    siteName: SITE_NAME,
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
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
        suppressHydrationWarning
      >
        <PlausibleProvider apiHost={process.env.PLAUSIBLE_API_HOST}>
          <SessionWrapper>
            <QueryProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
              >
                {children}
                <Toaster />
              </ThemeProvider>
            </QueryProvider>
          </SessionWrapper>
        </PlausibleProvider>
      </body>
    </html>
  );
}
