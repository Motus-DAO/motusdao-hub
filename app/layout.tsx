import type { Metadata } from "next";
import { Inter, Jura } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { WaaPProviderWrapper } from "@/components/WaaPProviderWrapper";
import { AppShell } from "@/components/layout/AppShell";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jura = Jura({
  subsets: ["latin"],
  variable: "--font-jura",
});

export const metadata: Metadata = {
  title: "MotusDAO Hub - Mental Health & Wellness",
  description: "Plataforma integral de salud mental con IA, psicoterapia y academia",
  manifest: '/manifest.json',
  themeColor: '#8B5CF6',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MotusDAO Hub',
  },
  icons: {
    icon: [
      { url: '/logo.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/logo.svg',
    apple: [
      { url: '/logo.svg', sizes: '180x180', type: 'image/svg+xml' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jura.variable} font-sans antialiased`}
      >
        <WaaPProviderWrapper>
          <ThemeProvider>
            <AppShell>{children}</AppShell>
          </ThemeProvider>
        </WaaPProviderWrapper>
      </body>
    </html>
  );
}
