import { redirect } from 'next/navigation';

/**
 * Landing page — the AWB tracker form.
 *
 * The "form" is a server-action style POST that reads the awb and bounces to
 * /tracking/[awb]. Keeps the URL clean for sharing.
 */
export default function HomePage() {
  async function lookup(formData: FormData) {
    'use server';
    const raw = String(formData.get('awb') ?? '').trim().toUpperCase();
    // We DO NOT auto-correct O→0 / I→1. See Bu Sari's note in /docs/00-WELCOME.
    // We also don't 400 here; the API will tell us if it's malformed.
    if (raw) {
      redirect(`/tracking/${encodeURIComponent(raw)}`);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>
        Lacak pengiriman Anda
      </h1>
      <p style={{ color: '#555', marginBottom: 24 }}>
        Track your shipment. Masukkan nomor resi (AWB) di bawah ini.
      </p>

      <form action={lookup} style={{ display: 'flex', gap: 8, maxWidth: 480 }}>
        <input
          name="awb"
          required
          autoFocus
          placeholder="Nomor resi / AWB number"
          aria-label="Nomor resi / AWB"
          style={{
            flex: 1,
            padding: '10px 12px',
            border: '1px solid #ccc',
            borderRadius: 6,
            fontSize: 16,
          }}
        />
        <button
          type="submit"
          style={{
            padding: '10px 16px',
            background: '#0a4d8c',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Lacak / Track
        </button>
      </form>

      <p style={{ color: '#888', fontSize: 13, marginTop: 12 }}>
        Tip: nomor resi biasanya berawalan <code>NL</code> diikuti 6–8 digit (e.g. <code>NL104821</code>).
      </p>

      <hr style={{ margin: '32px 0', border: 'none', borderTop: '1px solid #eee' }} />

      <h2 style={{ fontSize: 18, marginBottom: 8 }}>Butuh bantuan? / Need help?</h2>
      <p style={{ color: '#555', fontSize: 14 }}>
        Hubungi customer service kami:{' '}
        <a href="mailto:cs@nusantara.example">cs@nusantara.example</a> · 0800-1-NUSANTARA (jam kerja)
      </p>
    </div>
  );
}
