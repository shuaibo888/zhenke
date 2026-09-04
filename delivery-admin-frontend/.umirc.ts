import { defineConfig } from "umi";

export default defineConfig({
  routes: [
    {
      path: "/",
      component: "@/app/AdminWorkspace",
      routes: [
        { path: "/", component: "@/pages/dashboard" },
        { path: "/dashboard", component: "@/pages/dashboard" },
        { path: "/users", component: "@/pages/users" },
        { path: "/coupons", component: "@/pages/coupons" },
        { path: "/products", component: "@/pages/products" },
        { path: "/trials", component: "@/pages/trials" },
        { path: "/orders", component: "@/pages/orders" },
        { path: "/reports", component: "@/pages/reports" },
        { path: "/zhenke-posts", component: "@/pages/zhenke-posts" },
        { path: "/zhenke-enjoys", component: "@/pages/zhenke-enjoys" },
        { path: "/home-banners", component: "@/pages/home-banners" },
        { path: "/merchants", component: "@/pages/merchants" },
        { path: "*", component: "@/pages/not-found" },
      ],
    },
  ],
  npmClient: "npm",
  utoopack: {},
  hash: true,
  base: "/admin/",
  publicPath: "/admin/",
  proxy: {
    '/api': {
      // target: 'http://127.0.0.1:8080',
      // pathRewrite: { '^/api': '' },
      target: 'https://dzshop.vip',
      changeOrigin: true,
    },
    // '/profile': {
    //   target: 'https://dzshop.vip',
    //   changeOrigin: true,
    // },
  },

});
