'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const baseNavLinks = [
  { href: '/feed', label: 'Read' },
  { href: '/founders', label: 'Founders' },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader({
  isAuthenticated = false,
  profileUsername,
}: {
  isAuthenticated?: boolean;
  profileUsername?: string | null;
}) {
  const pathname = usePathname();
  const actionHref = isAuthenticated ? '/post/new' : '/join?next=/post/new';
  const actionLabel = isAuthenticated ? 'Write' : 'Join';
  const profileHref = profileUsername ? `/u/${profileUsername}` : '/feed';
  const navLinks = isAuthenticated
    ? [...baseNavLinks, { href: '/inbox', label: 'Inbox' }]
    : baseNavLinks;

  return (
    <header className="site-header">
      <div className="shell site-header-inner">
        <Link href="/" className="brand" aria-label="Moncem home">
          <Image
            className="brand-logo"
            src="/logos/moncem-wordmark.png"
            alt="Moncem"
            width={197}
            height={27}
            priority
          />
        </Link>
        <div className="header-right">
          <nav className="nav" aria-label="Primary navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={isActive(pathname, link.href) ? 'active' : undefined}
                aria-current={isActive(pathname, link.href) ? 'page' : undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="nav-actions" aria-label="Account actions">
            {isAuthenticated ? (
              <Link href={profileHref} className="nav-link" prefetch={false}>
                Profile
              </Link>
            ) : (
              <Link href="/login" className="nav-link" prefetch={false}>
                Sign in
              </Link>
            )}
            <Link href={actionHref} className="nav-cta" prefetch={false}>
              {actionLabel}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
