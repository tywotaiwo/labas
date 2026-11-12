import type { Metadata, Viewport } from 'next';
import { Newsreader, Outfit } from 'next/font/google';
import './globals.css';

const sans = Outfit({ subsets: ['latin'], variable: '--font-sans' });
const serif = Newsreader({ subsets: ['latin'], variable: '--font-serif' });

export const metadata: Metadata = {
  title: 'LABAS Private',
  description: 'A private 90-day wellbeing journal for clients of LABAS Institute.',
  applicationName: 'LABAS Private',
  appleWebApp: { capable: true, title: 'LABAS', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: '#f3f1ea',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${serif.variable} ${sans.className}`}>{children}</body>
    </html>
  );
}
