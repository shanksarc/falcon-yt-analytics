import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Register Service Worker for PWA / Browser-Based Desktop App
if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.debug('ServiceWorker registration optional notice:', err);
    });
  });
}

// Global fetch wrapper: supports VITE_API_BASE_URL (for Vercel deployment) & x-admin-key header
const originalFetch = window.fetch;
window.fetch = async (input, init = {}) => {
  let url = input;
  if (typeof input === 'string' && input.startsWith('/api')) {
    const apiBase = import.meta.env.VITE_API_BASE_URL;
    if (apiBase) {
      url = `${apiBase.replace(/\/$/, '')}${input}`;
    }
  }

  const token = localStorage.getItem('falcon_admin_token') || '';
  const headers = new Headers(init.headers || {});
  if (!headers.has('x-admin-key') && token) {
    headers.set('x-admin-key', token);
  }

  return originalFetch(url, { ...init, headers });
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
