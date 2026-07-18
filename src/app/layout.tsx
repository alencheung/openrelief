import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Suspense } from 'react'
import { Providers } from '@/components/providers/Providers'
import { Header, Footer } from '@/components/layout/Shell'
import { CookieConsent } from '@/components/layout/CookieConsent'
import { initSentry } from '@/lib/monitoring/sentry'
import './globals.css'

initSentry()

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'OpenRelief - Emergency Coordination Platform',
  description:
    'Offline-first emergency coordination platform for decentralized disaster response with 24+ hour offline capability',
  keywords: ['emergency', 'coordination', 'disaster', 'relief', 'open-source', 'pwa', 'offline'],
  authors: [{ name: 'OpenRelief Contributors' }],
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/icon-192x192.png'
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'OpenRelief'
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://openrelief.org',
    title: 'OpenRelief - Emergency Coordination Platform',
    description:
      'Offline-first emergency coordination platform for decentralized disaster response',
    siteName: 'OpenRelief'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OpenRelief - Emergency Coordination Platform',
    description: 'Offline-first emergency coordination platform for decentralized disaster response'
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'OpenRelief',
    'application-name': 'OpenRelief',
    'msapplication-TileColor': '#dc2626',
    'msapplication-config': '/browserconfig.xml'
  }
}

// Separate viewport export as required by Next.js 15+.
// Pinch-zoom is intentionally NOT disabled: blocking user scaling violates
// WCAG 1.4.4 (Resize text). Use `maximumScale: 5` instead of
// `maximumScale: 1`/`userScalable: false` so users who need larger text can zoom.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#dc2626'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta name="color-scheme" content="light dark" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-167x167.png" />
        <link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#dc2626" />
        <meta name="apple-mobile-web-app-title" content="OpenRelief" />
        <meta name="application-name" content="OpenRelief" />
        <meta name="msapplication-TileColor" content="#dc2626" />
        <meta name="theme-color" content="#dc2626" />
      </head>
      <body className={`${inter.className} h-full antialiased`}>
        <Providers>
          <div className="min-h-full flex flex-col">
            <Header />
            <main className="flex-1">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-20">
                    <div className="loading-spinner h-8 w-8" />
                  </div>
                }
              >
                {children}
              </Suspense>
            </main>
            <Footer />
            <CookieConsent />
          </div>
        </Providers>
      </body>
    </html>
  )
}
