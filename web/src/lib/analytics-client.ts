'use client';

export type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

const anonStorageKey = 'moncem_analytics_anon_id_v1';
const sessionStorageKey = 'moncem_analytics_session_id_v1';

function fallbackId(): string {
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function getStorageId(storage: Storage, key: string): string {
  const existing = storage.getItem(key);
  if (existing) return existing;

  const next = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : fallbackId();
  storage.setItem(key, next);
  return next;
}

function getIds(): { anonId: string | null; sessionId: string | null } {
  try {
    return {
      anonId: getStorageId(window.localStorage, anonStorageKey),
      sessionId: getStorageId(window.sessionStorage, sessionStorageKey),
    };
  } catch {
    return { anonId: null, sessionId: null };
  }
}

export function trackClientEvent(
  eventName: string,
  properties: AnalyticsProperties = {},
  durationMs?: number,
): void {
  if (typeof window === 'undefined') return;

  const { anonId, sessionId } = getIds();
  const payload = JSON.stringify({
    eventName,
    anonId,
    sessionId,
    path: `${window.location.pathname}${window.location.search}`,
    referrer: document.referrer || null,
    durationMs,
    properties,
  });

  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: 'application/json' });
    const sent = navigator.sendBeacon('/api/analytics/events', blob);
    if (sent) return;
  }

  void fetch('/api/analytics/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {
    // Analytics must never interrupt product flows.
  });
}
