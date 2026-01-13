import type { Metadata } from "next";
import { Inter, Jura } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Topbar } from "@/components/layout/Topbar";
import { Footer } from "@/components/layout/Footer";
import { WaaPProviderWrapper } from "@/components/WaaPProviderWrapper";
import { SidebarWrapper } from "@/components/layout/SidebarWrapper";

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
            <div className="min-h-screen bg-background overflow-x-hidden">
              <div className="flex min-h-screen max-w-full">
                <SidebarWrapper />
                <div className="flex-1 lg:ml-64 flex flex-col min-h-screen overflow-y-auto overflow-x-hidden relative z-10">
                  <Topbar />
                  <main className="flex-1 pt-16 sm:pt-20 max-w-full relative z-10">
                    {children}
                  </main>
                  <Footer />
                </div>
              </div>
            </div>
          </ThemeProvider>
        </WaaPProviderWrapper>
      </body>
    </html>
  );
}
