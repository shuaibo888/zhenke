export type MemberRole = 'zhenke' | 'yanzhenke' | 'xinzhenke';

export type ProductCategory = 'verified' | 'local' | 'other' | `CATEGORY_${1 | 2 | 3 | 4}`;

export type OrderStatus = 'unpaid' | 'paid' | 'shipped' | 'completed' | 'canceled' | 'refunding' | 'refunded';

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
  trialType?: 'ONLINE' | 'OFFLINE';
  reportSource?: 'TRIAL' | 'PURCHASE';
  sourceReportId?: number;
  userId: number;
  userName: string;
  userRole: MemberRole;
  images: string[];
  video?: string;
  experience: string;
  shortcoming: string;
  fitCrowd: string;
  recommend: boolean;
  productQuality?: number;
  logisticsService?: number;
  serviceAttitude?: number;
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
  paymentExpiresAt?: string;
  paidAt?: string;
  carrier?: string;
  trackingNo?: string;
  shippedAt?: string;
  receivedAt?: string;
  refundStatus?: 'PENDING' | 'REFUNDING' | 'REFUNDED' | 'REJECTED';
  refundReason?: string;
  refundReviewRequired?: boolean;
  refundAuditRemark?: string;
  refundRequestedAt?: string;
  refundAuditedAt?: string;
  refundCompletedAt?: string;
  logistics?: LogisticsInfo;
  items?: Array<{
    orderItemId: number;
    productId: number;
    sourceReportId?: number;
    verificationReportId?: number;
    productTitle: string;
    coverUrl: string;
    unitPrice: number;
    quantity: number;
    amount: number;
  }>;
  sourceReportId?: number;
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
  eventCode?: string;
  location?: string;
  source?: 'SYSTEM' | 'PROVIDER';
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
  campaignId: number;
  trialType: 'ONLINE' | 'OFFLINE';
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
  trialType: 'ONLINE' | 'OFFLINE';
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
  sourceReportId: number;
}
