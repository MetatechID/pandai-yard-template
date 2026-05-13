import { notFound } from 'next/navigation';
import { TrackingTimeline, type TrackingViewModel } from '../../../components/TrackingTimeline';

type PageProps = {
  params: { awb: string };
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8002/api';

/**
 * AWB tracking page.
 *
 * Server component — fetches from the modern backend (which itself may fall back to
 * the legacy for shipments older than 18 months).
 *
 * Cache: ISR with a 30-second revalidate. The cache rewarm cron (top-200-yesterday)
 * keeps hot AWBs warm post-deploy.
 */
export const revalidate = 30;

export default async function TrackingPage({ params }: PageProps) {
  const awb = decodeURIComponent(params.awb).toUpperCase();

  const data = await fetchTracking(awb);
  if (!data) {
    notFound();
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>
        Resi <code>{data.awb}</code>
      </h1>
      <p style={{ color: '#555', marginBottom: 24 }}>
        {data.origin} → {data.destination}
      </p>

      <div
        style={{
          background: '#f5f9ff',
          padding: '12px 16px',
          borderRadius: 8,
          marginBottom: 24,
          border: '1px solid #d6e6fb',
        }}
      >
        <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Status saat ini / Current status
        </div>
        <div style={{ fontSize: 18, marginTop: 4 }}>
          <strong>{data.statusLabelId}</strong>
          <span style={{ color: '#888', marginLeft: 8, fontSize: 14 }}>
            ({data.statusLabelEn})
          </span>
        </div>
      </div>

      <TrackingTimeline data={data} />

      {data.source === 'legacy' && (
        // Internal-only debug breadcrumb. Customers shouldn't notice; ops will.
        // (This is a small dev-mode signal that we hit the legacy fallback path.)
        <p style={{ marginTop: 32, color: '#aaa', fontSize: 11 }}>
          {/* prettier-ignore */}
          Sumber data / Data source: arsip historis / historical archive
        </p>
      )}
    </div>
  );
}

async function fetchTracking(awb: string): Promise<TrackingViewModel | null> {
  try {
    const res = await fetch(`${API_BASE}/tracking/${encodeURIComponent(awb)}`, {
      // Don't cache at the fetch layer — the page itself is ISR'd.
      cache: 'no-store',
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      // Log but don't crash — the customer portal should be resilient.
      console.error(`[tracking] upstream returned ${res.status} for ${awb}`);
      return null;
    }
    const body = await res.json();
    return {
      awb: body.awb,
      origin: body.origin,
      destination: body.destination,
      statusCode: body.status_code,
      statusLabelId: body.status_label_id,
      statusLabelEn: body.status_label_en,
      createdAt: body.created_at,
      lastEventAt: body.last_event_at,
      events: body.events ?? [],
      source: body.source ?? 'modern',
    };
  } catch (e) {
    console.error('[tracking] fetch failed', e);
    return null;
  }
}
