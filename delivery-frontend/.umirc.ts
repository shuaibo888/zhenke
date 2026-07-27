import { defineConfig } from "umi";

export default defineConfig({
  routes: [
    { path: "/", component: "index" },
  ],
  proxy: {
    '/admin': {
      target: 'http://127.0.0.1:8001',
      changeOrigin: true,
      ws: true,
    },
    '/api': {
      target: 'http://127.0.0.1:8080',
      // target: 'https://miniats.cboo.cloud',
      changeOrigin: true,
      pathRewrite: { '^/api': '' },
    },
  },
  npmClient: 'npm',
});
