import { defineConfig } from 'umi';
import { DEFAULT_WECHAT_SHARE_FALLBACK } from './src/config/wechatShareDefaults';

export default defineConfig({
  title: '甄客行',
  metas: [
    { name: 'description', content: DEFAULT_WECHAT_SHARE_FALLBACK.description },
    { property: 'og:description', content: DEFAULT_WECHAT_SHARE_FALLBACK.description },
    { property: 'og:image', content: DEFAULT_WECHAT_SHARE_FALLBACK.imageUrl },
    { property: 'og:image:secure_url', content: DEFAULT_WECHAT_SHARE_FALLBACK.imageUrl },
    { itemprop: 'description', content: DEFAULT_WECHAT_SHARE_FALLBACK.description },
    { itemprop: 'image', content: DEFAULT_WECHAT_SHARE_FALLBACK.imageUrl },
  ],
  links: [
    { rel: 'image_src', href: DEFAULT_WECHAT_SHARE_FALLBACK.imageUrl },
  ],
  // Production HTML is not cached, while static assets are. Content hashes
  // ensure a newly deployed WeChat page cannot keep executing an old JS bundle.
  hash: true,
  routes: [
    { path: '/', component: '@/pages/home' },
    { path: '/posts/publish', component: '@/pages/posts/publish' },
    { path: '/posts/:postId', component: '@/pages/posts/detail' },
    { path: '/posts', component: '@/pages/posts' },
    { path: '/enjoy/:enjoyId', component: '@/pages/enjoy/detail' },
    { path: '/enjoy', component: '@/pages/enjoy' },
    { path: '/places/:placeId', component: '@/pages/places/detail' },
    { path: '/profile/messages', component: '@/pages/profile/messages' },
    { path: '/profile/useful', component: '@/pages/profile/useful' },
    { path: '/profile/posts', component: '@/pages/profile/posts' },
    { path: '/mall/products', component: '@/pages/mall/products' },
    { path: '/mall/content', component: '@/pages/mall/content' },
    { path: '/mall', component: '@/pages/mall' },
    { path: '/products/:productId', component: '@/pages/products/detail' },
    { path: '/merchants/:merchantId', component: '@/pages/merchants/detail' },
    { path: '/reports/:reportId', component: '@/pages/reports/detail' },
    { path: '/profile', component: '@/pages/profile' },
    { path: '/profile/points', component: '@/pages/profile/points' },
    { path: '/profile/point-records', component: '@/pages/profile/point-records' },
    { path: '/profile/orders', component: '@/pages/profile/orders' },
    { path: '/profile/orders/:orderId', component: '@/pages/profile/order-detail' },
    { path: '/profile/coupons', component: '@/pages/profile/coupons' },
    { path: '/profile/coupons/:userCouponId', component: '@/pages/profile/coupon-detail' },
    { path: '/profile/trials', component: '@/pages/profile/trials' },
    { path: '/profile/trials/:applicationId', component: '@/pages/profile/trial-detail' },
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
