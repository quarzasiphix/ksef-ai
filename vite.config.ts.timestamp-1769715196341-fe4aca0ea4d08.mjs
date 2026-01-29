// vite.config.ts
import { defineConfig } from "file:///C:/Users/Administrator/Documents/projects/ksiegai/ksef-ai/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Administrator/Documents/projects/ksiegai/ksef-ai/node_modules/@vitejs/plugin-react-swc/index.mjs";
import sitemap from "file:///C:/Users/Administrator/Documents/projects/ksiegai/ksef-ai/node_modules/vite-plugin-sitemap/dist/index.js";
import path from "path";
var __vite_injected_original_dirname = "C:\\Users\\Administrator\\Documents\\projects\\ksiegai\\ksef-ai";
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080
  },
  plugins: [
    react(),
    mode === "production" && sitemap({
      hostname: "https://ksiegai.pl",
      outDir: "dist",
      generateRobotsTxt: false,
      // Don't generate robots.txt since it already exists in public
      exclude: ["/404", "/500", "/api/*", "/_*"],
      // List of URLs to include in the sitemap
      urls: [
        { loc: "/", changefreq: "daily", priority: 1 },
        { loc: "/dashboard", changefreq: "daily", priority: 0.9 },
        { loc: "/invoices", changefreq: "daily", priority: 0.9 },
        { loc: "/invoices/new", changefreq: "daily", priority: 0.8 },
        { loc: "/customers", changefreq: "daily", priority: 0.8 },
        { loc: "/products", changefreq: "daily", priority: 0.8 },
        { loc: "/expenses", changefreq: "daily", priority: 0.7 },
        { loc: "/settings", changefreq: "weekly", priority: 0.5 },
        { loc: "/inventory", changefreq: "daily", priority: 0.7 },
        { loc: "/contracts", changefreq: "weekly", priority: 0.6 },
        { loc: "/employees", changefreq: "weekly", priority: 0.6 },
        { loc: "/accounting", changefreq: "daily", priority: 0.9 },
        { loc: "/reports", changefreq: "weekly", priority: 0.7 },
        { loc: "/analytics", changefreq: "daily", priority: 0.8 },
        { loc: "/help", changefreq: "monthly", priority: 0.5 }
      ]
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxBZG1pbmlzdHJhdG9yXFxcXERvY3VtZW50c1xcXFxwcm9qZWN0c1xcXFxrc2llZ2FpXFxcXGtzZWYtYWlcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXEFkbWluaXN0cmF0b3JcXFxcRG9jdW1lbnRzXFxcXHByb2plY3RzXFxcXGtzaWVnYWlcXFxca3NlZi1haVxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvQWRtaW5pc3RyYXRvci9Eb2N1bWVudHMvcHJvamVjdHMva3NpZWdhaS9rc2VmLWFpL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcclxuaW1wb3J0IHNpdGVtYXAgZnJvbSBcInZpdGUtcGx1Z2luLXNpdGVtYXBcIjtcclxuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcclxuXHJcbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+ICh7XHJcbiAgc2VydmVyOiB7XHJcbiAgICBob3N0OiBcIjo6XCIsXHJcbiAgICBwb3J0OiA4MDgwLFxyXG4gIH0sXHJcbiAgcGx1Z2luczogW1xyXG4gICAgcmVhY3QoKSxcclxuICAgIG1vZGUgPT09ICdwcm9kdWN0aW9uJyAmJiBzaXRlbWFwKHtcclxuICAgICAgaG9zdG5hbWU6ICdodHRwczovL2tzaWVnYWkucGwnLFxyXG4gICAgICBvdXREaXI6ICdkaXN0JyxcclxuICAgICAgZ2VuZXJhdGVSb2JvdHNUeHQ6IGZhbHNlLCAvLyBEb24ndCBnZW5lcmF0ZSByb2JvdHMudHh0IHNpbmNlIGl0IGFscmVhZHkgZXhpc3RzIGluIHB1YmxpY1xyXG4gICAgICBleGNsdWRlOiBbJy80MDQnLCAnLzUwMCcsICcvYXBpLyonLCAnL18qJ10sXHJcbiAgICAgIC8vIExpc3Qgb2YgVVJMcyB0byBpbmNsdWRlIGluIHRoZSBzaXRlbWFwXHJcbiAgICAgIHVybHM6IFtcclxuICAgICAgICB7IGxvYzogJy8nLCBjaGFuZ2VmcmVxOiAnZGFpbHknLCBwcmlvcml0eTogMS4wIH0sXHJcbiAgICAgICAgeyBsb2M6ICcvZGFzaGJvYXJkJywgY2hhbmdlZnJlcTogJ2RhaWx5JywgcHJpb3JpdHk6IDAuOSB9LFxyXG4gICAgICAgIHsgbG9jOiAnL2ludm9pY2VzJywgY2hhbmdlZnJlcTogJ2RhaWx5JywgcHJpb3JpdHk6IDAuOSB9LFxyXG4gICAgICAgIHsgbG9jOiAnL2ludm9pY2VzL25ldycsIGNoYW5nZWZyZXE6ICdkYWlseScsIHByaW9yaXR5OiAwLjggfSxcclxuICAgICAgICB7IGxvYzogJy9jdXN0b21lcnMnLCBjaGFuZ2VmcmVxOiAnZGFpbHknLCBwcmlvcml0eTogMC44IH0sXHJcbiAgICAgICAgeyBsb2M6ICcvcHJvZHVjdHMnLCBjaGFuZ2VmcmVxOiAnZGFpbHknLCBwcmlvcml0eTogMC44IH0sXHJcbiAgICAgICAgeyBsb2M6ICcvZXhwZW5zZXMnLCBjaGFuZ2VmcmVxOiAnZGFpbHknLCBwcmlvcml0eTogMC43IH0sXHJcbiAgICAgICAgeyBsb2M6ICcvc2V0dGluZ3MnLCBjaGFuZ2VmcmVxOiAnd2Vla2x5JywgcHJpb3JpdHk6IDAuNSB9LFxyXG4gICAgICAgIHsgbG9jOiAnL2ludmVudG9yeScsIGNoYW5nZWZyZXE6ICdkYWlseScsIHByaW9yaXR5OiAwLjcgfSxcclxuICAgICAgICB7IGxvYzogJy9jb250cmFjdHMnLCBjaGFuZ2VmcmVxOiAnd2Vla2x5JywgcHJpb3JpdHk6IDAuNiB9LFxyXG4gICAgICAgIHsgbG9jOiAnL2VtcGxveWVlcycsIGNoYW5nZWZyZXE6ICd3ZWVrbHknLCBwcmlvcml0eTogMC42IH0sXHJcbiAgICAgICAgeyBsb2M6ICcvYWNjb3VudGluZycsIGNoYW5nZWZyZXE6ICdkYWlseScsIHByaW9yaXR5OiAwLjkgfSxcclxuICAgICAgICB7IGxvYzogJy9yZXBvcnRzJywgY2hhbmdlZnJlcTogJ3dlZWtseScsIHByaW9yaXR5OiAwLjcgfSxcclxuICAgICAgICB7IGxvYzogJy9hbmFseXRpY3MnLCBjaGFuZ2VmcmVxOiAnZGFpbHknLCBwcmlvcml0eTogMC44IH0sXHJcbiAgICAgICAgeyBsb2M6ICcvaGVscCcsIGNoYW5nZWZyZXE6ICdtb250aGx5JywgcHJpb3JpdHk6IDAuNSB9XHJcbiAgICAgIF1cclxuICAgIH0pLFxyXG4gIF0uZmlsdGVyKEJvb2xlYW4pLFxyXG4gIHJlc29sdmU6IHtcclxuICAgIGFsaWFzOiB7XHJcbiAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpLFxyXG4gICAgfSxcclxuICB9LFxyXG59KSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBMlcsU0FBUyxvQkFBb0I7QUFDeFksT0FBTyxXQUFXO0FBQ2xCLE9BQU8sYUFBYTtBQUNwQixPQUFPLFVBQVU7QUFIakIsSUFBTSxtQ0FBbUM7QUFNekMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE9BQU87QUFBQSxFQUN6QyxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsRUFDUjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sU0FBUyxnQkFBZ0IsUUFBUTtBQUFBLE1BQy9CLFVBQVU7QUFBQSxNQUNWLFFBQVE7QUFBQSxNQUNSLG1CQUFtQjtBQUFBO0FBQUEsTUFDbkIsU0FBUyxDQUFDLFFBQVEsUUFBUSxVQUFVLEtBQUs7QUFBQTtBQUFBLE1BRXpDLE1BQU07QUFBQSxRQUNKLEVBQUUsS0FBSyxLQUFLLFlBQVksU0FBUyxVQUFVLEVBQUk7QUFBQSxRQUMvQyxFQUFFLEtBQUssY0FBYyxZQUFZLFNBQVMsVUFBVSxJQUFJO0FBQUEsUUFDeEQsRUFBRSxLQUFLLGFBQWEsWUFBWSxTQUFTLFVBQVUsSUFBSTtBQUFBLFFBQ3ZELEVBQUUsS0FBSyxpQkFBaUIsWUFBWSxTQUFTLFVBQVUsSUFBSTtBQUFBLFFBQzNELEVBQUUsS0FBSyxjQUFjLFlBQVksU0FBUyxVQUFVLElBQUk7QUFBQSxRQUN4RCxFQUFFLEtBQUssYUFBYSxZQUFZLFNBQVMsVUFBVSxJQUFJO0FBQUEsUUFDdkQsRUFBRSxLQUFLLGFBQWEsWUFBWSxTQUFTLFVBQVUsSUFBSTtBQUFBLFFBQ3ZELEVBQUUsS0FBSyxhQUFhLFlBQVksVUFBVSxVQUFVLElBQUk7QUFBQSxRQUN4RCxFQUFFLEtBQUssY0FBYyxZQUFZLFNBQVMsVUFBVSxJQUFJO0FBQUEsUUFDeEQsRUFBRSxLQUFLLGNBQWMsWUFBWSxVQUFVLFVBQVUsSUFBSTtBQUFBLFFBQ3pELEVBQUUsS0FBSyxjQUFjLFlBQVksVUFBVSxVQUFVLElBQUk7QUFBQSxRQUN6RCxFQUFFLEtBQUssZUFBZSxZQUFZLFNBQVMsVUFBVSxJQUFJO0FBQUEsUUFDekQsRUFBRSxLQUFLLFlBQVksWUFBWSxVQUFVLFVBQVUsSUFBSTtBQUFBLFFBQ3ZELEVBQUUsS0FBSyxjQUFjLFlBQVksU0FBUyxVQUFVLElBQUk7QUFBQSxRQUN4RCxFQUFFLEtBQUssU0FBUyxZQUFZLFdBQVcsVUFBVSxJQUFJO0FBQUEsTUFDdkQ7QUFBQSxJQUNGLENBQUM7QUFBQSxFQUNILEVBQUUsT0FBTyxPQUFPO0FBQUEsRUFDaEIsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLElBQ3RDO0FBQUEsRUFDRjtBQUNGLEVBQUU7IiwKICAibmFtZXMiOiBbXQp9Cg==
