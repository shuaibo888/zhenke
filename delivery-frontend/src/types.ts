export type MemberRole = 'zhenke' | 'yanzhenke' | 'xinzhenke';

export interface Merchant {
  merchantId: number;
  applicationNo: string;
  accountUsername: string;
  companyName: string;
  companyAddress: string;
  contactName: string;
  contactPhone: string;
  businessLicense: string;
  companyCreditCode?: string;
  legalPerson?: string;
  licenseVerified?: string;
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
