import type {
  HomeFeedItemDto,
  ProductCategoryDto,
  PublicProductDto,
  ReportCommentDto,
  VerificationReportDto,
} from '@/services/shopContent';

export const previewCategories: ProductCategoryDto[] = [
  { categoryId: 1, categoryCode: 'CATEGORY_1', categoryName: '户外', categorySort: 1, status: '0' },
  { categoryId: 2, categoryCode: 'CATEGORY_2', categoryName: '运动服装', categorySort: 2, status: '0' },
  { categoryId: 3, categoryCode: 'CATEGORY_3', categoryName: '健康产品', categorySort: 3, status: '0' },
  { categoryId: 4, categoryCode: 'CATEGORY_4', categoryName: '生活优选', categorySort: 4, status: '0' },
];

export const previewProducts: PublicProductDto[] = [
  {
    productId: 101, merchantId: 11, merchantName: '山野装备店', categoryId: 1, categoryCode: 'CATEGORY_1',
    categoryName: '户外', productName: '轻量防风露营外套', subtitle: '户外实测款', detail: '适合徒步、露营和日常通勤。',
    coverUrl: '/goods/yanzhao.jpg', price: 329, stock: 36, salesCount: 82, status: 'ON_SALE',
  },
  {
    productId: 102, merchantId: 12, merchantName: '奔跑实验室', categoryId: 2, categoryCode: 'CATEGORY_2',
    categoryName: '运动服装', productName: '高弹速干训练套装', subtitle: '透气不黏身', detail: '覆盖力量训练和慢跑场景。',
    coverUrl: '/goods/qingbei.jpg', price: 259, stock: 48, salesCount: 126, status: 'ON_SALE',
  },
  {
    productId: 103, merchantId: 13, merchantName: '安心健康馆', categoryId: 3, categoryCode: 'CATEGORY_3',
    categoryName: '健康产品', productName: '家庭健康监测组合', subtitle: '线上试用', detail: '用于家庭日常健康数据记录。',
    coverUrl: '/goods/fengmi.jpg', price: 499, stock: 20, salesCount: 55, status: 'ON_SALE',
  },
  {
    productId: 104, merchantId: 14, merchantName: '日常优选', categoryId: 4, categoryCode: 'CATEGORY_4',
    categoryName: '生活优选', productName: '手冲咖啡体验礼盒', subtitle: '线下体验', detail: '包含咖啡豆、滤杯和体验课程。',
    coverUrl: '/goods/cafedou.jpg', price: 199, stock: 64, salesCount: 203, status: 'ON_SALE',
  },
];

export const previewReports: VerificationReportDto[] = [
  {
    reportId: 201, productId: 101, productName: '轻量防风露营外套', productCoverUrl: '/goods/yanzhao.jpg',
    merchantId: 11, merchantName: '山野装备店', categoryCode: 'CATEGORY_1', categoryName: '户外',
    reportSource: 'PURCHASE', orderItemId: 901, shopUserId: 31, userName: '户外甄客',
    title: '防风效果真的惊喜',
    experience: '山风环境下防风效果明显，活动时肩背没有束缚感。',
    shortcoming: '浅色面料比较容易留下泥点，需要及时清洁。', fitCrowd: '周末徒步、露营和通勤人群',
    recommend: '0', productQuality: 5, logisticsService: 4, serviceAttitude: 5,
    usefulCount: 128, usefulByMe: false, status: 'PUBLISHED', publishedAt: '2026-07-20 10:30:00',
    resources: [
      { resourceId: 1, resourceType: 'IMAGE', resourceUrl: '/goods/fengmi.jpg', resourceSort: 1 },
      { resourceId: 2, resourceType: 'IMAGE', resourceUrl: '/goods/cafedou.jpg', resourceSort: 2 },
      { resourceId: 3, resourceType: 'IMAGE', resourceUrl: '/goods/qingbei.jpg', resourceSort: 3 },
    ],
  },
  {
    reportId: 202, productId: 102, productName: '高弹速干训练套装', productCoverUrl: '/goods/qingbei.jpg',
    merchantId: 12, merchantName: '奔跑实验室', categoryCode: 'CATEGORY_2', categoryName: '运动服装',
    trialApplicationId: 801, trialType: 'OFFLINE', reportSource: 'TRIAL', shopUserId: 32, userName: '运动甄客',
    title: '深蹲不勒腿，透气到位',
    experience: '完成一小时训练后衣服没有明显贴身，弹性适合深蹲动作。',
    shortcoming: '口袋偏浅，跑步时不适合放较大的手机。', fitCrowd: '健身房训练和轻量跑步人群',
    recommend: '0', usefulCount: 76, usefulByMe: true, status: 'PUBLISHED', publishedAt: '2026-07-19 16:20:00',
    resources: [{ resourceId: 2, resourceType: 'IMAGE', resourceUrl: '/goods/qingbei.jpg', resourceSort: 1 }],
  },
];

export const previewFeed: HomeFeedItemDto[] = [
  {
    contentType: 'REPORT', contentId: 201, productId: 101, merchantId: 11, merchantName: '山野装备店',
    categoryCode: 'CATEGORY_1', categoryName: '户外', title: '轻量防风露营外套',
    summary: '购买甄客的真实户外体验', coverUrl: '/goods/yanzhao.jpg', publishedAt: '2026-07-20 10:30:00',
    purchasable: true, report: { shopUserId: 31, userName: '户外甄客', shortcoming: '浅色容易沾泥点', recommend: '0' },
  },
  {
    contentType: 'REPORT', contentId: 202, productId: 102, merchantId: 12, merchantName: '奔跑实验室',
    categoryCode: 'CATEGORY_2', categoryName: '运动服装', title: '高弹速干训练套装',
    summary: '线下试用甄客的训练反馈', coverUrl: '/goods/qingbei.jpg', publishedAt: '2026-07-19 16:20:00',
    purchasable: true, report: { shopUserId: 32, userName: '运动甄客', shortcoming: '口袋偏浅', recommend: '0' },
  },
  {
    contentType: 'TRIAL', contentId: 301, productId: 103, merchantId: 13, merchantName: '安心健康馆',
    categoryCode: 'CATEGORY_3', categoryName: '健康产品', title: '家庭健康监测组合线上试用',
    summary: '审核通过后寄送，确认收货后可发布甄客验。', coverUrl: '/goods/fengmi.jpg',
    publishedAt: '2026-07-21 09:00:00', purchasable: true,
    trial: { trialType: 'ONLINE', targetCount: 30, approvedCount: 18, applicationDeadline: '2026-08-15 23:59:59' },
  },
  {
    contentType: 'TRIAL', contentId: 302, productId: 104, merchantId: 14, merchantName: '日常优选',
    categoryCode: 'CATEGORY_4', categoryName: '生活优选', title: '手冲咖啡礼盒线下体验',
    summary: '审核通过后到店体验，完成后可发布甄客验。', coverUrl: '/goods/cafedou.jpg',
    publishedAt: '2026-07-22 11:00:00', purchasable: true,
    trial: { trialType: 'OFFLINE', targetCount: 20, approvedCount: 12, applicationDeadline: '2026-08-10 23:59:59' },
  },
];

export const previewComments: ReportCommentDto[] = [
  {
    commentId: 9001, reportId: 201, shopUserId: 41, userName: '徒步爱好者', nickName: '徒步爱好者',
    reportAuthor: false, content: '请问下雨天穿会不会透水？看着挺心动的。', createTime: '2026-07-21 09:12:00',
    replies: [
      {
        commentId: 9002, reportId: 201, parentCommentId: 9001, replyToCommentId: 9001,
        shopUserId: 31, userName: '户外甄客', nickName: '户外甄客', reportAuthor: true,
        replyToUserName: '徒步爱好者', replyToNickName: '徒步爱好者',
        content: '小雨完全没问题，大雨建议加冲锋衣，面料是防泼水的。', createTime: '2026-07-21 10:02:00',
      },
    ],
  },
  {
    commentId: 9003, reportId: 201, shopUserId: 42, userName: '周末露营团', nickName: '周末露营团',
    reportAuthor: false, content: '同款已入，确实轻，收纳进背包几乎不占地方。', createTime: '2026-07-21 14:30:00',
    replies: [],
  },
];
