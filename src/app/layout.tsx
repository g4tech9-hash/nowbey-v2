import type { Metadata, Viewport } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'NowBey · Stay Safe, Bahamas',
    template: '%s · NowBey',
  },
  description:
    'NowBey is a community safety map and Bahamian news wire. Neighbour reports, local news and island-by-island alerts.',
};

export const viewport: Viewport = {
  themeColor: '#0c151d',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="ambient" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
