import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// Brand tokens (kept inline; Edge runtime can't import the CSS layer).
const PAPER = '#F7F4EC';
const INK = '#1A1916';
const FIELD_GREEN = '#2E5B34';

function clamp(value: string | null, max: number, fallback = ''): string {
  if (!value) return fallback;
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

// Load a full Google font as a TTF ArrayBuffer for satori. Falls back to null so
// the card still renders (in satori's default face) if the fetch fails. We fetch
// the full latin face (no &text subsetting) so spaces/punctuation/digits are
// always present — subsetting drops glyphs and breaks spacing.
async function loadGoogleFont(spec: string): Promise<ArrayBuffer | null> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=${spec}`;
    const css = await (await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; rv:1.0) Gecko' },
      cache: 'force-cache',
    })).text();
    const src = css.match(/src:\s*url\(([^)]+)\)\s*format\('(?:truetype|opentype)'\)/);
    if (!src) return null;
    return await (await fetch(src[1], { cache: 'force-cache' })).arrayBuffer();
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = clamp(searchParams.get('title'), 110, 'A student founder dispatch.');
  const proof = clamp(searchParams.get('proof'), 80);
  const author = clamp(searchParams.get('author'), 60, 'Moncem');
  const school = clamp(searchParams.get('school'), 60);
  const byline = [author, school].filter(Boolean).join(' · ');

  const fonts = [];
  // Pin Fraunces to a high optical size with SOFT/WONK at 0 — the default
  // variable instance confuses satori (it renders the "wonk" glyphs).
  const serif = await loadGoogleFont('Fraunces:opsz,wght,SOFT,WONK@144,600,0,0');
  const sans = await loadGoogleFont('Plus+Jakarta+Sans:wght@600');
  if (serif) fonts.push({ name: 'Fraunces', data: serif, weight: 600 as const, style: 'normal' as const });
  if (sans) fonts.push({ name: 'Jakarta', data: sans, weight: 600 as const, style: 'normal' as const });

  const serifFamily = serif ? 'Fraunces' : 'Georgia, serif';
  const sansFamily = sans ? 'Jakarta' : 'Helvetica, Arial, sans-serif';

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '1200px',
          height: '630px',
          background: PAPER,
          color: INK,
          padding: '24px',
        }}
      >
        {/* Thin green hairline frame inset 24px */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            flex: 1,
            border: `2px solid ${FIELD_GREEN}`,
            padding: '60px 68px',
          }}
        >
          <span
            style={{
              fontSize: '22px',
              letterSpacing: '5px',
              textTransform: 'uppercase',
              color: FIELD_GREEN,
              fontFamily: sansFamily,
            }}
          >
            Moncem · Student founder dispatch
          </span>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                fontFamily: serifFamily,
                fontSize: title.length > 64 ? '66px' : '80px',
                lineHeight: 1.04,
                letterSpacing: '-1.5px',
                maxWidth: '980px',
              }}
            >
              {title}
            </div>
            {proof ? (
              <div
                style={{
                  display: 'flex',
                  marginTop: '26px',
                  fontSize: '32px',
                  color: FIELD_GREEN,
                  fontFamily: sansFamily,
                }}
              >
                {proof}
              </div>
            ) : null}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              fontFamily: sansFamily,
            }}
          >
            <span style={{ fontSize: '27px', color: INK }}>{byline}</span>
            <span style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-0.5px' }}>moncem</span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts: fonts.length ? fonts : undefined },
  );
}
