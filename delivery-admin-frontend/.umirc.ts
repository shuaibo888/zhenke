import { defineConfig } from "umi";

export default defineConfig({
  routes: [
    { path: "/", component: "index" },
  ],
  npmClient: "npm",
  utoopack: {},
  base: "/admin/",
  publicPath: "/admin/",
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:8080',
      changeOrigin: true,
      pathRewrite: { '^/api': '' },
    },
  },
});
