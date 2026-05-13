import React from 'react';
import api from '../api/client';

/**
 * ShipmentList. Class component because written 2019 and never had a reason to convert.
 *
 * Ops uses this to look up shipments and (for a small allowlist of users) manually
 * correct stuck states. The "manually correct" path is gated by a server-side role
 * check; this UI only shows the buttons to allowlisted users.
 */
class ShipmentList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      query: '',
      results: null,
      loading: false,
      error: null,
    };
    this.handleSearch = this.handleSearch.bind(this);
  }

  handleSearch(e) {
    e.preventDefault();
    const q = this.state.query.trim().toUpperCase();
    if (!q) return;
    this.setState({ loading: true, error: null });

    // Allow searching by AWB or by shipper name. Backend differentiates.
    api
      .get('/admin/shipments/search', { params: { q } })
      .then((res) => this.setState({ results: res.data.items, loading: false }))
      .catch((e) =>
        this.setState({
          loading: false,
          error: (e.response && e.response.data && e.response.data.error) || e.message,
        })
      );
  }

  render() {
    return (
      <div>
        <h1 style={{ fontSize: 22, marginBottom: 16 }}>
          Pengiriman / Shipments
        </h1>

        <form onSubmit={this.handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <input
            value={this.state.query}
            onChange={(e) => this.setState({ query: e.target.value })}
            placeholder="AWB atau nama shipper"
            style={{ padding: '8px 10px', flex: 1, maxWidth: 360, border: '1px solid #ccc' }}
          />
          <button
            type="submit"
            disabled={this.state.loading}
            style={{
              padding: '8px 14px',
              background: '#0a4d8c',
              color: 'white',
              border: 'none',
            }}
          >
            {this.state.loading ? 'Searching…' : 'Search'}
          </button>
        </form>

        {this.state.error && (
          <div style={{ color: '#a40', marginBottom: 12 }}>Error: {this.state.error}</div>
        )}

        {this.state.results && (
          <table cellPadding="6" style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr style={{ background: '#f0f4f8' }}>
                <th align="left">AWB</th>
                <th align="left">Origin → Destination</th>
                <th align="left">Status</th>
                <th align="right">kg</th>
                <th align="left">Source</th>
              </tr>
            </thead>
            <tbody>
              {this.state.results.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ color: '#888', padding: 12 }}>
                    Tidak ada hasil / No results.
                  </td>
                </tr>
              )}
              {this.state.results.map((r) => (
                <tr key={r.awb} style={{ borderTop: '1px solid #eee' }}>
                  <td>
                    <code>{r.awb}</code>
                  </td>
                  <td>
                    {r.origin} → {r.destination}
                  </td>
                  <td>{r.status_code}</td>
                  <td align="right">{r.kg}</td>
                  <td>
                    <span style={{ color: r.source === 'legacy' ? '#a76' : '#666', fontSize: 12 }}>
                      {r.source}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }
}

export default ShipmentList;
