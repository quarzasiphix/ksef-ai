// vite.config.ts
import { defineConfig } from "file:///C:/Users/Administrator/Documents/projects/ksef-ai/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Administrator/Documents/projects/ksef-ai/node_modules/@vitejs/plugin-react-swc/index.mjs";
import sitemap from "file:///C:/Users/Administrator/Documents/projects/ksef-ai/node_modules/vite-plugin-sitemap/dist/index.js";
import path from "path";
import { componentTagger } from "file:///C:/Users/Administrator/Documents/projects/ksef-ai/node_modules/lovable-tagger/dist/index.js";
var __vite_injected_original_dirname = "C:\\Users\\Administrator\\Documents\\projects\\ksef-ai";
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080
  },
  plugins: [
    react(),
    sitemap({
      hostname: "https://ksiegai.pl",
      outDir: "dist",
      generateRobotsTxt: true,
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
    }),
    mode === "development" && componentTagger()
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxBZG1pbmlzdHJhdG9yXFxcXERvY3VtZW50c1xcXFxwcm9qZWN0c1xcXFxrc2VmLWFpXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxBZG1pbmlzdHJhdG9yXFxcXERvY3VtZW50c1xcXFxwcm9qZWN0c1xcXFxrc2VmLWFpXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9BZG1pbmlzdHJhdG9yL0RvY3VtZW50cy9wcm9qZWN0cy9rc2VmLWFpL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcclxuaW1wb3J0IHNpdGVtYXAgZnJvbSBcInZpdGUtcGx1Z2luLXNpdGVtYXBcIjtcclxuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0IHsgY29tcG9uZW50VGFnZ2VyIH0gZnJvbSBcImxvdmFibGUtdGFnZ2VyXCI7XHJcblxyXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiAoe1xyXG4gIHNlcnZlcjoge1xyXG4gICAgaG9zdDogXCI6OlwiLFxyXG4gICAgcG9ydDogODA4MCxcclxuICB9LFxyXG4gIHBsdWdpbnM6IFtcclxuICAgIHJlYWN0KCksXHJcbiAgICBzaXRlbWFwKHtcclxuICAgICAgaG9zdG5hbWU6ICdodHRwczovL2tzaWVnYWkucGwnLFxyXG4gICAgICBvdXREaXI6ICdkaXN0JyxcclxuICAgICAgZ2VuZXJhdGVSb2JvdHNUeHQ6IHRydWUsXHJcbiAgICAgIGV4Y2x1ZGU6IFsnLzQwNCcsICcvNTAwJywgJy9hcGkvKicsICcvXyonXSxcclxuICAgICAgLy8gTGlzdCBvZiBVUkxzIHRvIGluY2x1ZGUgaW4gdGhlIHNpdGVtYXBcclxuICAgICAgdXJsczogW1xyXG4gICAgICAgIHsgbG9jOiAnLycsIGNoYW5nZWZyZXE6ICdkYWlseScsIHByaW9yaXR5OiAxLjAgfSxcclxuICAgICAgICB7IGxvYzogJy9kYXNoYm9hcmQnLCBjaGFuZ2VmcmVxOiAnZGFpbHknLCBwcmlvcml0eTogMC45IH0sXHJcbiAgICAgICAgeyBsb2M6ICcvaW52b2ljZXMnLCBjaGFuZ2VmcmVxOiAnZGFpbHknLCBwcmlvcml0eTogMC45IH0sXHJcbiAgICAgICAgeyBsb2M6ICcvaW52b2ljZXMvbmV3JywgY2hhbmdlZnJlcTogJ2RhaWx5JywgcHJpb3JpdHk6IDAuOCB9LFxyXG4gICAgICAgIHsgbG9jOiAnL2N1c3RvbWVycycsIGNoYW5nZWZyZXE6ICdkYWlseScsIHByaW9yaXR5OiAwLjggfSxcclxuICAgICAgICB7IGxvYzogJy9wcm9kdWN0cycsIGNoYW5nZWZyZXE6ICdkYWlseScsIHByaW9yaXR5OiAwLjggfSxcclxuICAgICAgICB7IGxvYzogJy9leHBlbnNlcycsIGNoYW5nZWZyZXE6ICdkYWlseScsIHByaW9yaXR5OiAwLjcgfSxcclxuICAgICAgICB7IGxvYzogJy9zZXR0aW5ncycsIGNoYW5nZWZyZXE6ICd3ZWVrbHknLCBwcmlvcml0eTogMC41IH0sXHJcbiAgICAgICAgeyBsb2M6ICcvaW52ZW50b3J5JywgY2hhbmdlZnJlcTogJ2RhaWx5JywgcHJpb3JpdHk6IDAuNyB9LFxyXG4gICAgICAgIHsgbG9jOiAnL2NvbnRyYWN0cycsIGNoYW5nZWZyZXE6ICd3ZWVrbHknLCBwcmlvcml0eTogMC42IH0sXHJcbiAgICAgICAgeyBsb2M6ICcvZW1wbG95ZWVzJywgY2hhbmdlZnJlcTogJ3dlZWtseScsIHByaW9yaXR5OiAwLjYgfSxcclxuICAgICAgICB7IGxvYzogJy9hY2NvdW50aW5nJywgY2hhbmdlZnJlcTogJ2RhaWx5JywgcHJpb3JpdHk6IDAuOSB9LFxyXG4gICAgICAgIHsgbG9jOiAnL3JlcG9ydHMnLCBjaGFuZ2VmcmVxOiAnd2Vla2x5JywgcHJpb3JpdHk6IDAuNyB9LFxyXG4gICAgICAgIHsgbG9jOiAnL2FuYWx5dGljcycsIGNoYW5nZWZyZXE6ICdkYWlseScsIHByaW9yaXR5OiAwLjggfSxcclxuICAgICAgICB7IGxvYzogJy9oZWxwJywgY2hhbmdlZnJlcTogJ21vbnRobHknLCBwcmlvcml0eTogMC41IH1cclxuICAgICAgXVxyXG4gICAgfSksXHJcbiAgICBtb2RlID09PSAnZGV2ZWxvcG1lbnQnICYmXHJcbiAgICBjb21wb25lbnRUYWdnZXIoKSxcclxuICBdLmZpbHRlcihCb29sZWFuKSxcclxuICByZXNvbHZlOiB7XHJcbiAgICBhbGlhczoge1xyXG4gICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcclxuICAgIH0sXHJcbiAgfSxcclxufSkpO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQWlWLFNBQVMsb0JBQW9CO0FBQzlXLE9BQU8sV0FBVztBQUNsQixPQUFPLGFBQWE7QUFDcEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMsdUJBQXVCO0FBSmhDLElBQU0sbUNBQW1DO0FBT3pDLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxPQUFPO0FBQUEsRUFDekMsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLEVBQ1I7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLFFBQVE7QUFBQSxNQUNOLFVBQVU7QUFBQSxNQUNWLFFBQVE7QUFBQSxNQUNSLG1CQUFtQjtBQUFBLE1BQ25CLFNBQVMsQ0FBQyxRQUFRLFFBQVEsVUFBVSxLQUFLO0FBQUE7QUFBQSxNQUV6QyxNQUFNO0FBQUEsUUFDSixFQUFFLEtBQUssS0FBSyxZQUFZLFNBQVMsVUFBVSxFQUFJO0FBQUEsUUFDL0MsRUFBRSxLQUFLLGNBQWMsWUFBWSxTQUFTLFVBQVUsSUFBSTtBQUFBLFFBQ3hELEVBQUUsS0FBSyxhQUFhLFlBQVksU0FBUyxVQUFVLElBQUk7QUFBQSxRQUN2RCxFQUFFLEtBQUssaUJBQWlCLFlBQVksU0FBUyxVQUFVLElBQUk7QUFBQSxRQUMzRCxFQUFFLEtBQUssY0FBYyxZQUFZLFNBQVMsVUFBVSxJQUFJO0FBQUEsUUFDeEQsRUFBRSxLQUFLLGFBQWEsWUFBWSxTQUFTLFVBQVUsSUFBSTtBQUFBLFFBQ3ZELEVBQUUsS0FBSyxhQUFhLFlBQVksU0FBUyxVQUFVLElBQUk7QUFBQSxRQUN2RCxFQUFFLEtBQUssYUFBYSxZQUFZLFVBQVUsVUFBVSxJQUFJO0FBQUEsUUFDeEQsRUFBRSxLQUFLLGNBQWMsWUFBWSxTQUFTLFVBQVUsSUFBSTtBQUFBLFFBQ3hELEVBQUUsS0FBSyxjQUFjLFlBQVksVUFBVSxVQUFVLElBQUk7QUFBQSxRQUN6RCxFQUFFLEtBQUssY0FBYyxZQUFZLFVBQVUsVUFBVSxJQUFJO0FBQUEsUUFDekQsRUFBRSxLQUFLLGVBQWUsWUFBWSxTQUFTLFVBQVUsSUFBSTtBQUFBLFFBQ3pELEVBQUUsS0FBSyxZQUFZLFlBQVksVUFBVSxVQUFVLElBQUk7QUFBQSxRQUN2RCxFQUFFLEtBQUssY0FBYyxZQUFZLFNBQVMsVUFBVSxJQUFJO0FBQUEsUUFDeEQsRUFBRSxLQUFLLFNBQVMsWUFBWSxXQUFXLFVBQVUsSUFBSTtBQUFBLE1BQ3ZEO0FBQUEsSUFDRixDQUFDO0FBQUEsSUFDRCxTQUFTLGlCQUNULGdCQUFnQjtBQUFBLEVBQ2xCLEVBQUUsT0FBTyxPQUFPO0FBQUEsRUFDaEIsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLElBQ3RDO0FBQUEsRUFDRjtBQUNGLEVBQUU7IiwKICAibmFtZXMiOiBbXQp9Cg==
