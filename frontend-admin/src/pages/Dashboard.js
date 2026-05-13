import React, { useEffect, useState } from 'react';
import api from '../api/client';

/**
 * Dashboard. Shows daily intake counts per gudang.
 *
 * Hooks were added in 2020 — pages written after that use functions, pages from
 * before are class components. Yes, this is inconsistent. No, we are not going
 * to refactor it.
 */
function Dashboard() {
  const [intake, setIntake] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/admin/intake/today')
      .then((res) => {
        if (!cancelled) setIntake(res.data);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || 'failed to load');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div style={{ color: '#a40' }}>
        Error: {error}. Check backend-modern is up. (Or refresh — sometimes the old service
        worker serves a stale 5xx response. We know.)
      </div>
    );
  }

  if (!intake) {
    return <div>Loading…</div>;
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>
        Intake hari ini / Today's intake
      </h1>
      <table cellPadding="8" style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 720 }}>
        <thead>
          <tr style={{ background: '#f0f4f8' }}>
            <th align="left">Gudang</th>
            <th align="left">Kota</th>
            <th align="right">Pallets</th>
            <th align="right">AWBs</th>
          </tr>
        </thead>
        <tbody>
          {(intake.warehouses || []).map((w) => (
            <tr key={w.id} style={{ borderTop: '1px solid #eee' }}>
              <td>{w.name}</td>
              <td>{w.city}</td>
              <td align="right">{w.pallets_today}</td>
              <td align="right">{w.awbs_today}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ color: '#888', fontSize: 12, marginTop: 16 }}>
        Counts refresh every ~5 minutes (cached on backend-modern). For real-time, ssh
        into a gudang server. (Don't.)
      </p>
    </div>
  );
}

export default Dashboard;
