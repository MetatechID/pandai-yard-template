import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Nusantara Logistics — Lacak Pengiriman / Track Shipment',
  description:
    'Lacak status pengiriman Anda di seluruh Indonesia. Track your shipment across the archipelago.',
};

/**
 * Root layout. Bilingual <html lang> is intentionally "id" — Bahasa is primary.
 * English appears alongside in many strings; we don't switch the lang attribute.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>
        <header
          style={{
            borderBottom: '1px solid #eee',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          {/* Brand mark — placeholder. Marketing IT owns the actual SVG. */}
          <div
            style={{
              fontWeight: 700,
              fontSize: 18,
              letterSpacing: -0.2,
            }}
          >
            Nusantara <span style={{ color: '#888', fontWeight: 400 }}>Logistics</span>
          </div>
          <nav style={{ marginLeft: 'auto', display: 'flex', gap: 16, fontSize: 14 }}>
            <a href="/">Lacak / Track</a>
            <a href="https://nusantara.id/karir" rel="noreferrer">
              Karir / Careers
            </a>
            <a href="https://nusantara.id/about" rel="noreferrer">
              Tentang / About
            </a>
          </nav>
        </header>
        <main style={{ padding: '32px 24px', maxWidth: 980, margin: '0 auto' }}>
          {children}
        </main>
        <footer
          style={{
            borderTop: '1px solid #eee',
            padding: '16px 24px',
            color: '#666',
            fontSize: 12,
            textAlign: 'center',
          }}
        >
          © PT Nusantara Logistics — Jakarta · Surabaya · Makassar
        </footer>
      </body>
    </html>
  );
}
