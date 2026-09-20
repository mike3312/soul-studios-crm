import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
// oxlint-disable-next-line typescript/TS2882 -- Next.js resolves global CSS imports.
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  ),
  title: 'Soul Studios CRM',
  description: 'CRM comercial con IA para Soul Studios',
  openGraph: {
    title: 'Soul Studios CRM',
    description: 'Prospectos, conversaciones e IA en un solo lugar',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Soul Studios CRM',
    description: 'Prospectos, conversaciones e IA en un solo lugar',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
