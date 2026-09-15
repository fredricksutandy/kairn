import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@kairn/sections/tokens.css';

/**
 * Preview deployments of the renderer must be noindex — a half-finished
 * invitation on a preview URL must never reach a search result.
 */
const isProduction = process.env.VERCEL_ENV === 'production';

export const metadata: Metadata = {
  title: 'Kairn',
  robots: isProduction ? undefined : { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
