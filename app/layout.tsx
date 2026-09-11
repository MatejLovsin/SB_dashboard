import type { Metadata, Viewport } from 'next';
import { Archivo, Martian_Mono, Newsreader, Spline_Sans_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

// Type system — see the DESIGN LANGUAGE block in app/globals.css.
// Display + every number (wide, industrial, tabular by nature).
const martianMono = Martian_Mono({
  variable: '--font-martian',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
});

// Micro-labels, units, meta lines.
const splineMono = Spline_Sans_Mono({
  variable: '--font-spline',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

// Body / UI text.
const archivo = Archivo({
  variable: '--font-archivo',
  subsets: ['latin'],
});

// Long-form reading face (`--type-longform`) — journal entries, work notes,
// study session notes. Optical sizing is what makes it hold up from a phone
// body size up to an overlay heading, so the variable axis is loaded.
const newsreader = Newsreader({
  variable: '--font-newsreader',
  subsets: ['latin'],
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'A personal second brain for fitness, school, and work.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Dashboard',
  },
};

export const viewport: Viewport = {
  themeColor: '#09090b',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${martianMono.variable} ${splineMono.variable} ${archivo.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
