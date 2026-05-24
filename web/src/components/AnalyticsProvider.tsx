'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { trackClientEvent } from '@/lib/analytics-client';

export function AnalyticsProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const enteredAtRef = useRef<number>(Date.now());
  const previousPathRef = useRef<string | null>(null);

  useEffect(() => {
    const search = searchParams.toString();
    const path = search ? `${pathname}?${search}` : pathname;
    const now = Date.now();

    if (previousPathRef.current) {
      trackClientEvent('time_on_page', {
        path: previousPathRef.current,
      }, Math.max(0, now - enteredAtRef.current));
    } else {
      trackClientEvent('session_start');
    }

    previousPathRef.current = path;
    enteredAtRef.current = now;
    trackClientEvent('page_view', { path });
  }, [pathname, searchParams]);

  useEffect(() => {
    function flushTimeOnPage() {
      if (!previousPathRef.current) return;
      trackClientEvent('time_on_page', {
        path: previousPathRef.current,
        visibility_state: document.visibilityState,
      }, Math.max(0, Date.now() - enteredAtRef.current));
      enteredAtRef.current = Date.now();
    }

    window.addEventListener('pagehide', flushTimeOnPage);
    document.addEventListener('visibilitychange', flushTimeOnPage);

    return () => {
      window.removeEventListener('pagehide', flushTimeOnPage);
      document.removeEventListener('visibilitychange', flushTimeOnPage);
    };
  }, []);

  return null;
}
