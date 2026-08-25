# delivery-frontend

当前最新用户端拆分版工程。该目录原先曾命名为 `delivery-frontend1`，2026-07-27 与旧版目录完成名称对调后，后续开发、构建、测试和发布均以当前 `delivery-frontend` 为准。

原来的单文件版本现保留在 `delivery-frontend1`，只可按需读取作视觉和业务参考，不能修改、清理、发布，也不能作为当前项目的运行时依赖。

## 页面结构

```text
src/
├─ app/                 全局登录态与真实服务端业务数据
├─ components/          购物车、地址、物流、发布表单等复用组件
├─ layouts/             全局微信入口、顶部栏和底部导航
├─ pages/
│  ├─ home/             首页内容流
│  ├─ products/         商品与试用详情
│  ├─ reports/          甄客验详情、评论和分享
│  ├─ auth/             登录、注册和商家入驻
│  └─ profile/          我的、订单、试用和甄客验
├─ services/            真实后端 API
├─ styles/              从原用户端保留的视觉样式
└─ utils/               分享、支付与展示工具
```

## 路由与分享

- `/`：首页。
- `/products/:productId`：商品详情。
- `/reports/:reportId`：甄客验详情。
- `/profile/orders`：我的订单。
- `/profile/orders/:orderId`：订单详情。
- `/profile/trials`：我的试用。
- `/profile/trials/:applicationId`：试用详情。
- `/profile/coupons`：我的优惠券。
- `/profile/coupons/:userCouponId`：优惠券详情、固定核销码和适用门店。
- `/profile/reports`：我的甄客验。
- `/?report=3`：兼容分享链接，直接加载报告 `3` 的真实详情。
- `/?product=3`：兼容商品分享链接，直接加载商品 `3` 的真实详情。

分享链接选择查询参数形式，避免依赖服务器对多级 SPA 路径的回退配置。页面加载后仍调用真实商品、甄客验、评论和业务接口。

## 边界

- 不读取 `delivery-frontend1` 目录中的运行时代码。
- 不包含 seed/mock 订单、购物车、甄客验或本地成功状态。
- 支付、退款、物流、确认收货、试用和发布均由服务端状态驱动。
- 当前仍保持“仅在微信中打开”的产品限制。
