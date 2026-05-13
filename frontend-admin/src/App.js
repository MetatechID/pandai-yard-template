import React from 'react';
import { Switch, Route, NavLink, Redirect } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ShipmentList from './pages/ShipmentList';

/**
 * Top-level App. Class component because that's how we wrote things in 2019, and
 * we never had a reason to convert. Mixing function + class components is fine.
 */
class App extends React.Component {
  render() {
    return (
      <div className="nus-admin">
        <aside
          style={{
            width: 200,
            background: '#0a4d8c',
            color: 'white',
            minHeight: '100vh',
            padding: '20px 16px',
            float: 'left',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 24 }}>
            Nusantara Admin
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <NavLink
              exact
              to="/"
              activeStyle={{ fontWeight: 700 }}
              style={{ color: 'white', textDecoration: 'none' }}
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/shipments"
              activeStyle={{ fontWeight: 700 }}
              style={{ color: 'white', textDecoration: 'none' }}
            >
              Pengiriman / Shipments
            </NavLink>
            <a
              href="/admin/legacy/invoices"
              style={{ color: '#cbd9e7', textDecoration: 'none', fontSize: 13, marginTop: 24 }}
              title="Opens the legacy invoice UI — only Finance IT should use this"
            >
              ↗ Invoices (legacy)
            </a>
          </nav>
        </aside>

        <main style={{ marginLeft: 220, padding: '20px 24px' }}>
          <Switch>
            <Route exact path="/" component={Dashboard} />
            <Route path="/shipments" component={ShipmentList} />
            <Redirect to="/" />
          </Switch>
        </main>
      </div>
    );
  }
}

export default App;
