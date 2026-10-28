import { createRoot } from 'react-dom/client';
import { Router } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';

import './index.css';

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <Router
      hook={import.meta.env.VITE_GITHUB_PAGES === 'true' ? useHashLocation : undefined}
      base={import.meta.env.VITE_GITHUB_PAGES === 'true' ? undefined : import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}
    >
      <App />
    </Router>
  </ErrorBoundary>,
);
