export type MemberRole = 'zhenke' | 'yanzhenke' | 'xinzhenke';

export type ProductCategory = 'verified' | 'local' | 'other' | `CATEGORY_${1 | 2 | 3 | 4}`;

export type OrderStatus = 'unpaid' | 'paid' | 'shipped' | 'completed' | 'canceled';

export interface Merchant {
  merchantId: number;
  applicationNo: string;
  accountUsername: string;
  companyName: string;
  companyAddress: string;
  contactName: string;
  contactPhone: string;
  businessLicense: string;
  productIntro: string;
  originTraceability: string;
  acceptsPublicWelfare: '0' | '1';
  acceptsVerificationRecruitment: '0' | '1';
  protocolAgreed: '0' | '1';
  auditStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  auditRemark?: string;
  adminUserId?: number;
  adminUsername?: string;
  status: '0' | '1';
  auditBy?: string;
  auditTime?: string;
  createTime?: string;
}

export interface User {
  id: number;
  username: string;
  name: string;
  avatarType: 'letter' | 'image';
  avatarImage: string;
  role: MemberRole;
  reportCount: number;
  usefulCount: number;
}

export interface Product {
  id: number;
  title: string;
  artisanName: string;
  category: ProductCategory;
  categoryName?: string;
  imageUrl: string;
  cover: string;
  price: number;
  isVerified: boolean;
  verifyCount: number;
  detail: string;
  tags: string[];
  stock?: number;
  purchasable?: boolean;
}

export interface VerifyReport {
  id: number;
  productId: number;
  productTitle: string;
  userId: number;
  userName: string;
  userRole: MemberRole;
  images: string[];
  video?: string;
  experience: string;
  shortcoming: string;
  fitCrowd: string;
  recommend: boolean;
  usefulCount: number;
  usefulByMe?: boolean;
  createdAt: string;
}

export interface Order {
  id: number;
  orderNo: string;
  productId: number;
  productTitle: string;
  status: OrderStatus;
  quantity: number;
  amount: number;
  returnDays: number;
  merchantName?: string;
  createdAt?: string;
  items?: Array<{
    productId: number;
    productTitle: string;
    coverUrl: string;
    unitPrice: number;
    quantity: number;
    amount: number;
  }>;
  fromReviewId?: number;
  fromVerifierId?: number;
  review?: OrderReview;
}

export interface OrderReview {
  id: number;
  productQuality: number;
  logisticsService: number;
  serviceAttitude: number;
  content: string;
  images: string[];
  createdAt: string;
}

export interface NotificationItem {
  id: number;
  type: 'upgrade' | 'useful' | 'system';
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface LogisticsEvent {
  time: string;
  description: string;
}

export interface LogisticsInfo {
  orderId: number;
  carrier: string;
  trackingNo: string;
  events: LogisticsEvent[];
}

export type TrialStatus = 'applied' | 'approved' | 'rejected' | 'shipped' | 'pending_report' | 'completed' | 'overdue';

export interface TrialRecord {
  id: number;
  applicationId?: number;
  productId: number;
  productTitle: string;
  status: TrialStatus;
  claimedAt: string;
  deadline: string;
  completedAt?: string;
  carrier?: string;
  trackingNo?: string;
}

export type EarningStatus = 'pending' | 'settled';

export interface EarningRecord {
  id: number;
  reportId: number;
  reportTitle: string;
  orderNo: string;
  orderAmount: number;
  commissionRate: 0.05;
  commissionAmount: number;
  publicWelfareRate: 0.05;
  publicWelfareAmount: number;
  status: EarningStatus;
  createdAt: string;
}

export interface TrialRecruitment {
  id: number;
  productId: number;
  targetCount: number;
  claimedCount: number;
  deadline: string;
  applicantUserIds: number[];
  campaignTitle?: string;
  campaignSummary?: string;
}

export interface ProductEvidence {
  productId: number;
  merchantName: string;
  origin: string;
  traceCode: string;
  statements: string[];
}

export interface ReportAttribution {
  fromReviewId: number;
  fromVerifierId: number;
}
