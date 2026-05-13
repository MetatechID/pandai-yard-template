/**
 * TrackingTimeline.
 *
 * Bilingual timeline of tracking events. Server component (no client interactivity).
 *
 * The status labels are intentionally rendered as "Bahasa (English)" inline. This is
 * a deliberate UX choice — see Bu Sari's note in /docs/00-WELCOME-bu-sari.md about
 * never standardising to English-only.
 */

export type TrackingEvent = {
  at: string;
  code: string;
  location?: string | null;
  label_id: string;
  label_en: string;
};

export type TrackingViewModel = {
  awb: string;
  origin: string;
  destination: string;
  statusCode: string;
  statusLabelId: string;
  statusLabelEn: string;
  createdAt: string;
  lastEventAt: string | null;
  events: TrackingEvent[];
  source: 'modern' | 'legacy' | 'merged';
};

export function TrackingTimeline({ data }: { data: TrackingViewModel }) {
  const events = data.events.length
    ? data.events
    : // Fallback: fabricate a 1-event timeline from the top-level status.
      // Older legacy shipments often don't have an event history, only a current status.
      [
        {
          at: data.lastEventAt ?? data.createdAt,
          code: data.statusCode,
          location: null,
          label_id: data.statusLabelId,
          label_en: data.statusLabelEn,
        } satisfies TrackingEvent,
      ];

  return (
    <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {events.map((ev, i) => (
        <li
          key={`${ev.code}-${ev.at}-${i}`}
          style={{
            display: 'flex',
            gap: 16,
            padding: '12px 0',
            borderBottom: i < events.length - 1 ? '1px solid #f0f0f0' : 'none',
          }}
        >
          <div
            aria-hidden
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: i === 0 ? '#0a4d8c' : '#bbb',
              marginTop: 6,
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {ev.label_id}
              <span style={{ color: '#888', fontWeight: 400, marginLeft: 6, fontSize: 13 }}>
                ({ev.label_en})
              </span>
            </div>
            <div style={{ color: '#666', fontSize: 12, marginTop: 2 }}>
              {formatTime(ev.at)}
              {ev.location ? <> · {ev.location}</> : null}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function formatTime(iso: string): string {
  // Render in WIB (Asia/Jakarta) — most of our shippers are in Western Indonesia.
  // For Makassar / Eastern, we will eventually localise. Open ticket NUS-3110.
  try {
    const d = new Date(iso);
    return d.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}
