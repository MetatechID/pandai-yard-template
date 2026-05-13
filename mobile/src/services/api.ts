/**
 * Mobile API client. Talks to backend-modern at the prod URL (or override via env).
 */

const API_BASE =
  process.env.NUSANTARA_API_BASE ?? 'https://api.nusantara.example';

export type TrackingResponse = {
  awb: string;
  origin: string;
  destination: string;
  status_code: string;
  status_label_id: string;
  status_label_en: string;
  created_at: string;
  last_event_at: string | null;
  source: 'modern' | 'legacy' | 'merged';
};

export async function fetchTracking(awb: string): Promise<TrackingResponse | null> {
  const url = `${API_BASE}/api/tracking/${encodeURIComponent(awb)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'X-Client': 'nusantara-mobile/3.4.0',
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`upstream ${res.status}`);
  }
  return (await res.json()) as TrackingResponse;
}
