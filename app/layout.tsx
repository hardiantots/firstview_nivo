import { Outfit } from 'next/font/google'
import type { Metadata } from 'next'
import { Providers } from './providers'
import "./globals.css"

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'NIVO App',
    template: '%s | NIVO App',
  },
  description: 'Aplikasi pendamping untuk berhenti merokok.',
  applicationName: 'NIVO App',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: '/',
    title: 'NIVO App',
    description: 'Aplikasi pendamping untuk berhenti merokok.',
    siteName: 'NIVO App',
    images: [
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: 'NIVO App',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'NIVO App',
    description: 'Aplikasi pendamping untuk berhenti merokok.',
    images: ['/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: [
      { url: '/logo.png', sizes: '32x32', type: 'image/png' },
      { url: '/logo.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [{ url: '/logo.png', sizes: '180x180', type: 'image/png' }],
  },
  verification:{
    google: "JgjjHZGdBJGIHpBynvTfyZDr7VefTBqQOZYyeQUBOb8",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="shortcut icon" href="/logo.png" type="image/png" />
      </head>
      <body className={outfit.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}