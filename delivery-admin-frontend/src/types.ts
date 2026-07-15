export type LoginType = 'admin' | 'merchant';

export type ProductCategory = 'verified' | 'local' | 'other';

export type ProductStatus = 'onSale' | 'offSale';

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
  username: string;
  password: string;
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
  status: 'active' | 'disabled';
}

export interface ManagedProduct {
  id: number;
  merchantId: number;
  title: string;
  artisanName: string;
  category: ProductCategory;
  status: ProductStatus;
  imageUrl: string;
  detail: string;
  price: number;
  cost: number;
  stock: number;
  sales: number;
  verifyCount: number;
}

export interface ManagedOrder {
  id: number;
  merchantId: number;
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
  targetCount: number;
  claimedCount: number;
  deadline: string;
  applicantCount: number;
  status: 'recruiting' | 'ended';
  createdAt: string;
}
