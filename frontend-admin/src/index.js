import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

// CRA 2019 entrypoint. Yes, ReactDOM.render — not createRoot. We're on React 16.
// Don't migrate to React 18 here without a plan. Migration to Next.js (NUS-2412)
// will probably leapfrog this.

ReactDOM.render(
  <BrowserRouter basename="/admin">
    <App />
  </BrowserRouter>,
  document.getElementById('root')
);
