import axios from 'axios';

/**
 * Axios client for the admin tool.
 *
 * In dev: hits backend-modern via the CRA proxy or directly.
 * In prod: nginx routes /admin/api/* to backend-modern.
 *
 * Note: we set baseURL based on REACT_APP_API_BASE so the same build can run
 * in dev and prod without rebuilding (which is good, because rebuilding CRA
 * takes ~3 minutes).
 */

const baseURL = process.env.REACT_APP_API_BASE || 'http://localhost:8002';

const client = axios.create({
  baseURL,
  timeout: 8000,
  headers: {
    'X-Client': 'nusantara-admin/2.8.1',
  },
  withCredentials: true,
});

// Attach the bridge token if present in localStorage. (Used to authenticate the
// admin session against backend-modern; the modern issues, the legacy verifies.)
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('nus_bridge_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Crude global error logger. Sentry would be nicer; we keep meaning to add it.
client.interceptors.response.use(
  (r) => r,
  (err) => {
    // eslint-disable-next-line no-console
    console.warn('[admin api]', err && err.config && err.config.url, err && err.message);
    return Promise.reject(err);
  }
);

export default client;
