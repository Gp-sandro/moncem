import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { AnalyticsProvider } from '@/components/AnalyticsProvider';
import { SiteHeader } from '@/components/SiteHeader';
import { getSiteUrl } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: 'Moncem - Student founder stories',
    template: '%s | Moncem',
  },
  description:
    'Moncem is where student founders share what they are building before the world notices.',
  openGraph: {
    title: 'Moncem - Student founder stories',
    description:
      'Stories, demos, ideas, and proof from student founders building before the world notices.',
    url: getSiteUrl(),
    siteName: 'Moncem',
    type: 'website',
  },
  icons: {
    icon: [
      {
        url: '/logos/moncem-icon-light.png',
        type: 'image/png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/logos/moncem-icon-dark.png',
        type: 'image/png',
        media: '(prefers-color-scheme: dark)',
      },
    ],
    shortcut: '/logos/moncem-icon-light.png',
    apple: '/logos/moncem-icon-light.png',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .maybeSingle()
    : { data: null };

  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <Suspense fallback={null}>
          <AnalyticsProvider />
        </Suspense>
        <SiteHeader isAuthenticated={Boolean(user)} profileUsername={profile?.username ?? null} />
        {children}
        <footer className="footer">
          <div className="shell">
            Moncem / student founder stories
          </div>
        </footer>
      </body>
    </html>
  );
}
