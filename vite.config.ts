import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import sitemap from "vite-plugin-sitemap";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    sitemap({
      hostname: 'https://ksiegai.pl',
      outDir: 'dist',
      generateRobotsTxt: true,
      exclude: ['/404', '/500', '/api/*', '/_*'],
      // List of URLs to include in the sitemap
      urls: [
        { loc: '/', changefreq: 'daily', priority: 1.0 },
        { loc: '/dashboard', changefreq: 'daily', priority: 0.9 },
        { loc: '/invoices', changefreq: 'daily', priority: 0.9 },
        { loc: '/invoices/new', changefreq: 'daily', priority: 0.8 },
        { loc: '/customers', changefreq: 'daily', priority: 0.8 },
        { loc: '/products', changefreq: 'daily', priority: 0.8 },
        { loc: '/expenses', changefreq: 'daily', priority: 0.7 },
        { loc: '/settings', changefreq: 'weekly', priority: 0.5 },
        { loc: '/inventory', changefreq: 'daily', priority: 0.7 },
        { loc: '/contracts', changefreq: 'weekly', priority: 0.6 },
        { loc: '/employees', changefreq: 'weekly', priority: 0.6 },
        { loc: '/accounting', changefreq: 'daily', priority: 0.9 },
        { loc: '/reports', changefreq: 'weekly', priority: 0.7 },
        { loc: '/analytics', changefreq: 'daily', priority: 0.8 },
        { loc: '/help', changefreq: 'monthly', priority: 0.5 }
      ]
    }),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
