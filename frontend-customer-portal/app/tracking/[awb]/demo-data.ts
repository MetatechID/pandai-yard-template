// Bundled sample shipments — used ONLY in the static export build
// (NEXT_PUBLIC_STATIC_EXPORT=1) where there is no backend to fetch from.
// Lets the GitHub Pages preview render the real UI with realistic data so
// students can see what they're building toward. Runtime/dev is unaffected.

import type { TrackingViewModel } from '../../../components/TrackingTimeline';

export const DEMO_TRACKING: Record<string, TrackingViewModel> = {
  NL104821: {
    awb: 'NL104821',
    origin: 'Jakarta (CGK)',
    destination: 'Surabaya (SUB)',
    statusCode: 'IN_TRANSIT',
    statusLabelId: 'Dalam perjalanan',
    statusLabelEn: 'In transit',
    createdAt: '2026-05-15T03:12:00Z',
    lastEventAt: '2026-05-17T22:40:00Z',
    source: 'modern',
    events: [
      { at: '2026-05-15T03:12:00Z', code: 'BOOKED', location: 'Jakarta Hub', label_id: 'Pesanan dibuat', label_en: 'Order created' },
      { at: '2026-05-15T09:48:00Z', code: 'PICKED_UP', location: 'Jakarta Hub', label_id: 'Paket diambil kurir', label_en: 'Picked up by courier' },
      { at: '2026-05-16T14:05:00Z', code: 'DEPARTED', location: 'Jakarta Sorting Center', label_id: 'Berangkat dari pusat sortir', label_en: 'Departed sorting center' },
      { at: '2026-05-17T22:40:00Z', code: 'IN_TRANSIT', location: 'Semarang Transit', label_id: 'Transit di Semarang', label_en: 'In transit at Semarang' },
    ],
  },
  NL900277: {
    awb: 'NL900277',
    origin: 'Bandung (BDO)',
    destination: 'Makassar (UPG)',
    statusCode: 'DELIVERED',
    statusLabelId: 'Terkirim',
    statusLabelEn: 'Delivered',
    createdAt: '2026-05-09T01:30:00Z',
    lastEventAt: '2026-05-12T08:15:00Z',
    source: 'merged',
    events: [
      { at: '2026-05-09T01:30:00Z', code: 'BOOKED', location: 'Bandung Hub', label_id: 'Pesanan dibuat', label_en: 'Order created' },
      { at: '2026-05-10T11:20:00Z', code: 'DEPARTED', location: 'Bandung Sorting Center', label_id: 'Berangkat', label_en: 'Departed' },
      { at: '2026-05-11T19:55:00Z', code: 'OUT_FOR_DELIVERY', location: 'Makassar', label_id: 'Sedang diantar', label_en: 'Out for delivery' },
      { at: '2026-05-12T08:15:00Z', code: 'DELIVERED', location: 'Makassar', label_id: 'Terkirim — diterima Andi', label_en: 'Delivered — received by Andi' },
    ],
  },
  NL550133: {
    awb: 'NL550133',
    origin: 'Medan (KNO)',
    destination: 'Denpasar (DPS)',
    statusCode: 'EXCEPTION',
    statusLabelId: 'Kendala pengiriman',
    statusLabelEn: 'Delivery exception',
    createdAt: '2026-04-28T06:00:00Z',
    lastEventAt: '2026-05-02T13:30:00Z',
    source: 'legacy',
    events: [
      { at: '2026-04-28T06:00:00Z', code: 'BOOKED', location: 'Medan Hub', label_id: 'Pesanan dibuat', label_en: 'Order created' },
      { at: '2026-05-01T10:10:00Z', code: 'DEPARTED', location: 'Medan Sorting Center', label_id: 'Berangkat', label_en: 'Departed' },
      { at: '2026-05-02T13:30:00Z', code: 'EXCEPTION', location: 'Denpasar', label_id: 'Alamat tidak ditemukan — menunggu konfirmasi', label_en: 'Address not found — awaiting confirmation' },
    ],
  },
};

export const DEMO_AWBS = Object.keys(DEMO_TRACKING);
