import type { Metadata } from 'next';
import { Newsreader, Outfit } from 'next/font/google';
import './globals.css';

const sans = Outfit({ subsets: ['latin'], variable: '--font-sans' });
const serif = Newsreader({ subsets: ['latin'], variable: '--font-serif' });

export const metadata: Metadata = {
  title: 'LABAS Private · Coach',
  description: 'Private coach dashboard for LABAS Private.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${serif.variable} ${sans.className}`}>{children}</body>
    </html>
  );
}
