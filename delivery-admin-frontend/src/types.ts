export type LoginType = 'admin' | 'merchant';

export type ProductCategory = 'verified' | 'local' | 'other' | `CATEGORY_${1 | 2 | 3 | 4}`;

export type ProductStatus = 'draft' | 'onSale' | 'offSale';

export type OrderStatus = 'unpaid' | 'paid' | 'shipped' | 'completed' | 'canceled' | 'refunded';

export type ReportStatus = 'published' | 'deleted';

export type NavKey = 'dashboard' | 'users' | 'products' | 'trials' | 'orders' | 'reports' | 'merchants';

export interface AdminSession {
  id: number;
  username: string;
  name: string;
  loginType: LoginType;
  merchantId?: number;
  permissions?: string[];
  roles?: string[];
}

export interface ShopUserAccount {
  userId: number;
  userName: string;
  nickName: string;
  phonenumber?: string;
  email?: string;
  avatar?: string;
  levelId: number;
  levelCode: string;
  levelName: string;
  reviewEligible: '0' | '1';
  trialEligible: '0' | '1';
  status: '0' | '1';
  loginIp?: string;
  loginDate?: string;
  createTime?: string;
}

export interface ShopMemberLevel {
  levelId: number;
  levelCode: string;
  levelName: string;
  levelOrder: number;
  badgeTone?: string;
  isDefault: '0' | '1';
  status: '0' | '1';
}

export interface MerchantAccount {
  id: number;
  merchantId?: number;
  applicationNo?: string;
  username?: string;
  /** 仅兼容旧演示数据；真实接口永不返回或回显密码。 */
  password?: string;
  name: string;
  ownerName: string;
  phone: string;
  companyAddress?: string;
  businessLicense?: string;
  productIntro?: string;
  originTraceability?: string;
  acceptsVerificationRecruitment?: boolean;
  acceptsPublicWelfare?: boolean;
  registeredAt?: string;
  productCount: number;
  orderCount: number;
  auditStatus?: 'pending' | 'approved' | 'rejected';
  auditRemark?: string;
  auditBy?: string;
  auditTime?: string;
  status: 'active' | 'disabled';
  auditLogs?: MerchantAuditLog[];
}

export interface MerchantAuditLog {
  logId: number;
  action: 'SUBMIT' | 'RESUBMIT' | 'APPROVE' | 'REJECT' | 'ENABLE' | 'DISABLE';
  fromStatus?: string;
  toStatus?: string;
  auditRemark?: string;
  operatorName: string;
  createTime?: string;
}

export interface ManagedProduct {
  id: number;
  merchantId: number;
  title: string;
  subtitle?: string;
  artisanName: string;
  category: ProductCategory;
  categoryId?: number;
  categoryName?: string;
  status: ProductStatus;
  imageUrl: string;
  detail: string;
  price: number;
  cost: number;
  stock: number;
  sales: number;
  verifyCount: number;
}

export interface ProductCategoryOption {
  categoryId: number;
  categoryCode: `CATEGORY_${1 | 2 | 3 | 4}`;
  categoryName: string;
  categorySort: number;
  status: '0' | '1';
}

export interface ManagedOrder {
  id: number;
  merchantId: number;
  merchantName?: string;
  orderNo: string;
  buyerName: string;
  status: OrderStatus;
  amount: number;
  itemCount: number;
  productTitles: string[];
  items: Array<{
    productTitle: string;
    quantity: number;
    unitPrice: number;
  }>;
  fromReviewId?: number;
  fromVerifierName?: string;
  address: string;
  returnDays: number;
  refundRequested: boolean;
  createdAt: string;
  paidAt?: string;
  carrier?: string;
  trackingNo?: string;
  shippedAt?: string;
  receivedAt?: string;
  logisticsEvents?: Array<{
    eventId: number;
    eventCode: string;
    description: string;
    location?: string;
    eventTime: string;
    source: 'SYSTEM' | 'PROVIDER';
  }>;
}

export interface ManagedReport {
  id: number;
  merchantId: number;
  productTitle: string;
  userName: string;
  status: ReportStatus;
  shortcoming: string;
  usefulCount: number;
  createdAt: string;
}

export interface ManagedTrialRecruitment {
  id: number;
  merchantId: number;
  productId: number;
  productTitle: string;
  trialType: 'ONLINE' | 'OFFLINE';
  targetCount: number;
  claimedCount: number;
  deadline: string;
  applicantCount: number;
  status: 'draft' | 'recruiting' | 'closed' | 'finished' | 'ended';
  createdAt: string;
}

export interface ManagedTrialApplication {
  applicationId: number;
  campaignId: number;
  merchantId: number;
  productId: number;
  productName: string;
  trialType: 'ONLINE' | 'OFFLINE';
  campaignTitle: string;
  shopUserId: number;
  userName: string;
  nickName?: string;
  applyReason: string;
  recipientName?: string;
  recipientPhone?: string;
  shippingAddress?: string;
  status: 'APPLIED' | 'APPROVED' | 'REJECTED' | 'SHIPPED' | 'RECEIVED' | 'COMPLETED' | 'EXPIRED';
  auditRemark?: string;
  carrier?: string;
  trackingNo?: string;
  createTime?: string;
}
