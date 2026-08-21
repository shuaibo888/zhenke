import { defineConfig } from 'umi';

export default defineConfig({
  routes: [
    { path: '/', component: '@/pages/home' },
    { path: '/mall', component: '@/pages/mall' },
    { path: '/products/:productId', component: '@/pages/products/detail' },
    { path: '/merchants/:merchantId', component: '@/pages/merchants/detail' },
    { path: '/reports/:reportId', component: '@/pages/reports/detail' },
    { path: '/profile', component: '@/pages/profile' },
    { path: '/profile/points', component: '@/pages/profile/points' },
    { path: '/profile/point-records', component: '@/pages/profile/point-records' },
    { path: '/profile/orders', component: '@/pages/profile/orders' },
    { path: '/profile/coupons', component: '@/pages/profile/coupons' },
    { path: '/profile/trials', component: '@/pages/profile/trials' },
    { path: '/checkout/success', component: '@/pages/checkout/success' },
    { path: '/checkout', component: '@/pages/checkout' },
    { path: '/profile/reports', component: '@/pages/profile/reports' },
    { path: '/auth', component: '@/pages/auth' },
    { path: '/sso/callback', component: '@/pages/sso/callback' },
    { path: '/*', component: '@/pages/404' },
  ],
  proxy: {
    '/admin': {
      target: 'http://127.0.0.1:8001',
      changeOrigin: true,
      ws: true,
    },
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
  npmClient: 'npm',
  esbuildMinifyIIFE: true,
});
