import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { PostHogProvider } from 'posthog-js/react';
import { HelmetProvider } from 'react-helmet-async';

const root = createRoot(document.getElementById('root')!);

// Detect if we are running on localhost (including IPv6 and common loopback IPs)
const isLocalhost = Boolean(
  window &&
  /^(localhost|127(\.\d+){0,2}|0\.0\.0\.0|\[::1])$/i.test(window.location.hostname)
);

const posthogApiKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
const shouldUsePosthog = !isLocalhost && Boolean(posthogApiKey);

root.render(
  <HelmetProvider>
    {shouldUsePosthog ? (
      <PostHogProvider
        apiKey={posthogApiKey}
        options={{
          api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
          capture_exceptions: true,
          debug: import.meta.env.MODE === 'development',
        }}
      >
        <App />
      </PostHogProvider>
    ) : (
      <App />
    )}
  </HelmetProvider>
);
