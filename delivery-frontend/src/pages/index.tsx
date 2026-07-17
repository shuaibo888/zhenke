import {
  AccountBookOutlined,
  ArrowLeftOutlined,
  BellOutlined,
  CameraOutlined,
  CheckCircleFilled,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  HeartOutlined,
  HomeOutlined,
  LockOutlined,
  LoginOutlined,
  MessageOutlined,
  MinusOutlined,
  PlusOutlined,
  ProfileOutlined,
  SafetyCertificateOutlined,
  ShoppingCartOutlined,
  StarFilled,
  RightOutlined,
  UploadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Badge, Button, Cascader, ConfigProvider, Drawer, Form, Input, message, Modal, Radio, Segmented, Select, Spin, Switch, Tag, Upload } from 'antd';
import type { KeyboardEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import pcaCode from 'china-division/dist/pca-code.json';
import {
  earningRecords,
  notifications,
  productEvidence,
} from '@/mocks/commerce';
import type { EarningRecord, MemberRole, Merchant, Order, Product, ReportAttribution, TrialRecord, TrialRecruitment, VerifyReport } from '@/types';
import type { AuthUser } from '@/utils/authRules';
import {
  changeShopPassword,
  createShopShippingAddress,
  deleteShopShippingAddress,
  fetchMyMerchantApplication,
  fetchShopCaptcha,
  fetchShopShippingAddresses,
  loginShopUser,
  logoutShopUser,
  registerShopUser,
  restoreShopSession,
  setDefaultShopShippingAddress,
  submitMerchantApplication,
  updateShopProfile,
  updateShopShippingAddress,
  type CaptchaState,
  type ShopShippingAddress,
} from '@/services/shopAuth';
import {
  addShopCartItem,
  applyForTrial,
  cancelShopOrder,
  checkoutShopCart,
  confirmShopOrderReceived,
  confirmTrialReceived,
  createReportComment,
  createShopOrders,
  deleteReportComment,
  deleteShopCartItem,
  fetchHomeFeed,
  fetchShopCart,
  fetchShopOrders,
  fetchMyTrialApplications,
  fetchProductCategories,
  fetchPublicProduct,
  fetchPublishedReport,
  fetchReportComments,
  payShopOrder,
  publishVerificationReport,
  updateShopCartItem,
  uploadShopContentFile,
  type HomeFeedItemDto,
  type ProductCategoryDto,
  type PublicProductDto,
  type ReportCommentDto,
  type ShopCartItemDto,
  type ShopOrderDto,
  type TrialApplicationDto,
  type VerificationReportDto,
} from '@/services/shopContent';
import { uploadAvatarFile } from '@/utils/avatarUpload';
import { getCartCount, getCartTotal, type CartItem } from '@/utils/cart';
import { canCancelOrder, orderStatusMeta } from '@/utils/orders';
import { findProductForReport, getCatalogProducts, type ProductCategoryFilter, type ProductSortKey } from '@/utils/productCatalog';
import { getProductJourneyState } from '@/utils/productJourney';
import {
  calculateEarningAmount,
  getLogisticsView,
  getTrialDeadlineMeta,
  summarizeEarnings,
} from '@/utils/profileData';
import styles from './index.less';

type TabKey = 'reviews' | 'profile';
type JourneyView = 'feed' | 'product' | 'report' | 'purchase';
type ProfileView = 'menu' | 'orders' | 'trials' | 'reports' | 'earnings' | 'messages';
type ProfileSection = Exclude<ProfileView, 'menu'>;
type AuthFormValues = {
  username: string;
  password: string;
  code?: string;
};

const roleMeta = {
  zhenke: { label: '甄客', tone: 'silver', next: '验甄客', returnDays: 7 },
  yanzhenke: { label: '验甄客', tone: 'gold', next: '信甄客', returnDays: 15 },
  xinzhenke: { label: '信甄客', tone: 'diamond', next: '已满级', returnDays: 30 },
};

const tabItems = [
  { key: 'reviews', label: '甄客验', icon: <SafetyCertificateOutlined /> },
  { key: 'profile', label: '我的', icon: <UserOutlined /> },
] as const;

const profileSectionMeta: Record<ProfileSection, { title: string; description: string }> = {
  orders: { title: '我的订单', description: '查看付款、物流、收货与评价' },
  trials: { title: '我的试用', description: '跟进试用任务与甄客验发布进度' },
  reports: { title: '我的甄客验', description: '查看我发布的真实体验' },
  earnings: { title: '我的收益', description: '查看佣金返点与公益捐赠明细' },
  messages: { title: '消息', description: '查看平台通知与账户提醒' },
};

const commerceTheme = {
  token: {
    colorPrimary: '#1f6f5b',
    borderRadius: 8,
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
  },
};

type ProfileDialog = 'name' | 'password' | 'avatar' | null;
type ReportFormValues = {
  productId: number;
  experience: string;
  shortcoming: string;
  fitCrowd: string;
  recommend: boolean;
};
type MerchantFormValues = {
  accountUsername: string;
  password: string;
  code?: string;
  companyName: string;
  companyAddress: string;
  contactName: string;
  contactPhone: string;
  businessLicense: string;
  productIntro: string;
  originTraceability: string;
  acceptsVerificationRecruitment: boolean;
  acceptsPublicWelfare: boolean;
  agreeProtocol: boolean;
};
type AddressFormValues = { recipient: string; phone: string; region: string[]; detail: string };
type TrialApplyFormValues = { applyReason: string };
type ShippingAddress = ShopShippingAddress;
type RegionNode = { code: string; name: string; children?: RegionNode[] };
type RegionOption = { value: string; label: string; children?: RegionOption[] };

const orderConfirmModalZIndex = 1000;
const addressModalOverOrderZIndex = 1300;
const emptyAddressFormValues: AddressFormValues = { recipient: '', phone: '', region: [], detail: '' };

const regionOptions: RegionOption[] = (pcaCode as RegionNode[]).map((province) => ({
  value: province.code,
  label: province.name,
  children: province.children?.map((city) => ({
    value: city.code,
    label: city.name,
    children: city.children?.map((area) => ({
      value: area.code,
      label: area.name,
    })),
  })),
}));

function roleClass(role: keyof typeof roleMeta) {
  return `${styles.memberBadge} ${styles[roleMeta[role].tone]}`;
}

function formatPrice(price: number) {
  return `¥${price.toFixed(2)}`;
}

function getRegionLabelPath(codes: string[]) {
  const labels: string[] = [];
  let currentOptions = regionOptions;

  codes.forEach((code) => {
    const matchedOption = currentOptions.find((option) => option.value === code);
    if (!matchedOption) return;

    labels.push(matchedOption.label);
    currentOptions = matchedOption.children ?? [];
  });

  return labels;
}

function formatShippingAddress(address: AddressFormValues) {
  return `${address.recipient} ${address.phone} ${getRegionLabelPath(address.region).join('')}${address.detail}`;
}

function isAddressComplete(address?: AddressFormValues | null) {
  return Boolean(address?.recipient.trim() && address.phone.trim() && address.region.length === 3 && address.detail.trim());
}

function getAvatarLetter(user: AuthUser) {
  return user.name.trim().slice(0, 1).toUpperCase() || user.username.slice(0, 1).toUpperCase();
}

function renderUserAvatar(user: AuthUser, className: string) {
  if (user.avatarType === 'image' && user.avatarImage) {
    return <img className={className} src={user.avatarImage} alt={`${user.name}的头像`} />;
  }

  return <span className={className}>{getAvatarLetter(user)}</span>;
}

function mapPublicProduct(dto: PublicProductDto, verifyCount: number): Product {
  return {
    id: dto.productId,
    title: dto.productName,
    artisanName: dto.merchantName,
    category: dto.categoryCode,
    categoryName: dto.categoryName,
    imageUrl: dto.coverUrl,
    cover: `url("${dto.coverUrl}")`,
    price: Number(dto.price),
    isVerified: verifyCount > 0,
    verifyCount,
    detail: dto.detail,
    tags: [dto.categoryName, ...(dto.subtitle ? [dto.subtitle] : [])],
    stock: dto.stock,
    purchasable: dto.stock > 0,
  };
}

function mapVerificationReport(dto: VerificationReportDto): VerifyReport {
  const images = (dto.resources ?? [])
    .filter((item) => item.resourceType === 'IMAGE')
    .map((item) => item.resourceUrl);
  const video = (dto.resources ?? []).find((item) => item.resourceType === 'VIDEO')?.resourceUrl;
  return {
    id: dto.reportId,
    productId: dto.productId,
    productTitle: dto.productName,
    userId: dto.shopUserId,
    userName: dto.nickName || dto.userName,
    userRole: 'zhenke',
    images: images.length > 0 ? images : [dto.productCoverUrl],
    video,
    experience: dto.experience,
    shortcoming: dto.shortcoming,
    fitCrowd: dto.fitCrowd,
    recommend: dto.recommend === '0',
    usefulCount: 0,
    usefulByMe: false,
    createdAt: dto.publishedAt,
  };
}

function mapTrialApplication(dto: TrialApplicationDto): TrialRecord {
  const statusMap: Record<TrialApplicationDto['status'], TrialRecord['status']> = {
    APPLIED: 'applied',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    SHIPPED: 'shipped',
    RECEIVED: 'pending_report',
    COMPLETED: 'completed',
    EXPIRED: 'overdue',
  };
  return {
    id: dto.applicationId,
    applicationId: dto.applicationId,
    productId: dto.productId,
    productTitle: dto.productName,
    status: statusMap[dto.status],
    claimedAt: dto.createTime?.slice(0, 10) ?? '',
    deadline: dto.applicationDeadline?.slice(0, 10) ?? dto.createTime?.slice(0, 10) ?? '',
    completedAt: dto.completedAt?.slice(0, 10),
    carrier: dto.carrier,
    trackingNo: dto.trackingNo,
  };
}

function mapShopCartItem(dto: ShopCartItemDto): CartItem {
  return {
    cartItemId: dto.cartItemId,
    quantity: dto.quantity,
    product: {
      id: dto.productId,
      title: dto.productName,
      artisanName: dto.merchantName,
      category: dto.categoryCode,
      categoryName: dto.categoryName,
      imageUrl: dto.coverUrl,
      cover: `url("${dto.coverUrl}")`,
      price: Number(dto.price),
      isVerified: false,
      verifyCount: 0,
      detail: '',
      tags: [dto.categoryName],
      stock: dto.stock,
      purchasable: dto.productStatus === 'ON_SALE' && dto.stock > 0,
    },
  };
}

function mapShopOrder(dto: ShopOrderDto, role: MemberRole): Order {
  const statusMap: Record<ShopOrderDto['status'], Order['status']> = {
    PENDING_PAYMENT: 'unpaid',
    PAID: 'paid',
    SHIPPED: 'shipped',
    RECEIVED: 'completed',
    CANCELLED: 'canceled',
  };
  const firstItem = dto.items?.[0];
  const productTitle = dto.items.length > 1
    ? `${firstItem?.productName ?? '商品'}等${dto.items.length}种商品`
    : firstItem?.productName ?? '商品';
  return {
    id: dto.orderId,
    orderNo: dto.orderNo,
    productId: firstItem?.productId ?? 0,
    productTitle,
    status: statusMap[dto.status],
    quantity: dto.itemCount,
    amount: Number(dto.totalAmount),
    returnDays: roleMeta[role].returnDays,
    merchantName: dto.merchantName,
    createdAt: dto.createTime,
    paidAt: dto.payTime,
    carrier: dto.carrier,
    trackingNo: dto.trackingNo,
    shippedAt: dto.shipTime,
    receivedAt: dto.receiveTime,
    logistics: dto.carrier && dto.trackingNo ? {
      orderId: dto.orderId,
      carrier: dto.carrier,
      trackingNo: dto.trackingNo,
      events: (Array.isArray(dto.logisticsEvents) ? dto.logisticsEvents : []).map((event) => ({
        time: event.eventTime,
        description: event.description,
        eventCode: event.eventCode,
        location: event.location,
        source: event.source,
      })),
    } : undefined,
    items: dto.items.map((item) => ({
      productId: item.productId,
      productTitle: item.productName,
      coverUrl: item.coverUrl,
      unitPrice: Number(item.unitPrice),
      quantity: item.quantity,
      amount: Number(item.lineAmount),
    })),
  };
}

export default function HomePage() {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [captcha, setCaptcha] = useState<CaptchaState>({ enabled: false, image: '', uuid: '' });
  const [captchaReady, setCaptchaReady] = useState(false);
  const [captchaLoading, setCaptchaLoading] = useState(true);
  const [captchaLoadError, setCaptchaLoadError] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('reviews');
  const [profileView, setProfileView] = useState<ProfileView>('menu');
  const [category, setCategory] = useState<ProductCategoryFilter>('all');
  const [homeContentType, setHomeContentType] = useState<'ALL' | 'TRIAL' | 'REPORT'>('ALL');
  const [sortMode, setSortMode] = useState<ProductSortKey>('latestVerified');
  const [products, setProducts] = useState<Product[]>([]);
  const [homeFeed, setHomeFeed] = useState<HomeFeedItemDto[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategoryDto[]>([]);
  const [contentLoading, setContentLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [imageProduct, setImageProduct] = useState<Product | null>(null);
  const [reports, setReports] = useState<VerifyReport[]>([]);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [trials, setTrials] = useState<TrialRecord[]>([]);
  const [earnings, setEarnings] = useState<EarningRecord[]>(earningRecords);
  const [recruitments, setRecruitments] = useState<TrialRecruitment[]>([]);
  const [applyingRecruitment, setApplyingRecruitment] = useState<TrialRecruitment | null>(null);
  const [trialApplying, setTrialApplying] = useState(false);
  const [journeyView, setJourneyView] = useState<JourneyView>('feed');
  const [journeyReport, setJourneyReport] = useState<VerifyReport | null>(null);
  const [reportComments, setReportComments] = useState<ReportCommentDto[]>([]);
  const [reportCommentsLoading, setReportCommentsLoading] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentDeletingId, setCommentDeletingId] = useState<number | null>(null);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<ReportCommentDto | null>(null);
  const [selectedLogisticsOrder, setSelectedLogisticsOrder] = useState<Order | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartMutatingId, setCartMutatingId] = useState<number | null>(null);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportImageUrls, setReportImageUrls] = useState<string[]>([]);
  const [reportVideoUrl, setReportVideoUrl] = useState<string>();
  const [detailOpen, setDetailOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [addressEditorOpen, setAddressEditorOpen] = useState(false);
  const [addressPickerOpen, setAddressPickerOpen] = useState(false);
  const [shippingAddresses, setShippingAddresses] = useState<ShippingAddress[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addressSubmitting, setAddressSubmitting] = useState(false);
  const [addressMutatingId, setAddressMutatingId] = useState<number | null>(null);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [pendingBuyProduct, setPendingBuyProduct] = useState<Product | null>(null);
  const [pendingBuyAttribution, setPendingBuyAttribution] = useState<ReportAttribution | undefined>(undefined);
  const [payOrder, setPayOrder] = useState<Order | null>(null);
  const [paying, setPaying] = useState(false);
  const [orderMutatingId, setOrderMutatingId] = useState<number | null>(null);
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [reviewStars, setReviewStars] = useState({ productQuality: 5, logisticsService: 5, serviceAttitude: 5 });
  const [reviewContent, setReviewContent] = useState('');
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [profileDialog, setProfileDialog] = useState<ProfileDialog>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [merchantOpen, setMerchantOpen] = useState(false);
  const [merchantApplication, setMerchantApplication] = useState<Merchant | null>(null);
  const [merchantLoading, setMerchantLoading] = useState(false);
  const [merchantSubmitting, setMerchantSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [authForm] = Form.useForm();
  const [nameForm] = Form.useForm();
  const [merchantForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [addressForm] = Form.useForm();
  const [trialApplyForm] = Form.useForm<TrialApplyFormValues>();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const activeUser = currentUser;

  const loadCaptcha = async (showError = true) => {
    setCaptchaLoading(true);
    setCaptchaLoadError('');
    try {
      const nextCaptcha = await fetchShopCaptcha();
      setCaptcha(nextCaptcha);
      setCaptchaReady(true);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '验证码加载失败';
      setCaptcha({ enabled: true, image: '', uuid: '' });
      setCaptchaReady(false);
      setCaptchaLoadError(errorMessage);
      if (showError) message.error(errorMessage);
      return false;
    } finally {
      setCaptchaLoading(false);
    }
  };

  const loadHomeContent = async () => {
    setContentLoading(true);
    try {
      const categoryCode = category === 'all' ? undefined : category;
      const [feedResult, categories] = await Promise.all([
        fetchHomeFeed(categoryCode, homeContentType),
        fetchProductCategories(),
      ]);
      const rows = Array.isArray(feedResult.rows) ? feedResult.rows : [];
      const productIds = Array.from(new Set(rows.map((item) => item.productId)));
      const reportIds = rows.filter((item) => item.contentType === 'REPORT').map((item) => item.contentId);
      const [productDtos, reportDtos] = await Promise.all([
        Promise.all(productIds.map(fetchPublicProduct)),
        Promise.all(reportIds.map(fetchPublishedReport)),
      ]);
      const reportCountByProduct = rows.reduce((counts, item) => {
        if (item.contentType === 'REPORT') counts.set(item.productId, (counts.get(item.productId) ?? 0) + 1);
        return counts;
      }, new Map<number, number>());
      setProductCategories(categories);
      setHomeFeed(rows);
      setProducts(productDtos.map((item) => mapPublicProduct(item, reportCountByProduct.get(item.productId) ?? 0)));
      setReports(reportDtos.map(mapVerificationReport));
      setRecruitments(rows.flatMap((item) => item.contentType === 'TRIAL' && item.trial ? [{
        id: item.contentId,
        productId: item.productId,
        targetCount: item.trial.targetCount,
        claimedCount: item.trial.approvedCount,
        deadline: item.trial.applicationDeadline.slice(0, 10),
        applicantUserIds: [],
        campaignTitle: item.title,
        campaignSummary: item.summary,
      }] : []));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '首页内容加载失败');
    } finally {
      setContentLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    restoreShopSession()
      .then((user) => {
        if (mounted) setCurrentUser(user);
      })
      .finally(() => {
        if (mounted) setAuthLoading(false);
      });
    fetchShopCaptcha()
      .then((nextCaptcha) => {
        if (mounted) {
          setCaptcha(nextCaptcha);
          setCaptchaReady(true);
          setCaptchaLoadError('');
        }
      })
      .catch((error) => {
        if (mounted) {
          setCaptcha({ enabled: true, image: '', uuid: '' });
          setCaptchaReady(false);
          setCaptchaLoadError(error instanceof Error ? error.message : '验证码加载失败');
        }
      })
      .finally(() => {
        if (mounted) setCaptchaLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    void loadHomeContent();
  }, [category, homeContentType]);

  useEffect(() => {
    let mounted = true;
    if (journeyView !== 'report' || !journeyReport) {
      setReportComments([]);
      setReportCommentsLoading(false);
      return () => {
        mounted = false;
      };
    }
    setReportCommentsLoading(true);
    fetchReportComments(journeyReport.id)
      .then((items) => {
        if (mounted) setReportComments(items);
      })
      .catch((error) => {
        if (mounted) message.error(error instanceof Error ? error.message : '评论加载失败');
      })
      .finally(() => {
        if (mounted) setReportCommentsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [journeyReport?.id, journeyView]);

  useEffect(() => {
    if (!currentUser) {
      setTrials([]);
      return;
    }
    fetchMyTrialApplications()
      .then((items) => setTrials(items.map(mapTrialApplication)))
      .catch((error) => message.error(error instanceof Error ? error.message : '我的试用加载失败'));
  }, [currentUser?.id]);

  useEffect(() => {
    let mounted = true;
    if (!currentUser) {
      setCartItems([]);
      setUserOrders([]);
      setCartLoading(false);
      setOrdersLoading(false);
      return () => {
        mounted = false;
      };
    }

    setCartLoading(true);
    setOrdersLoading(true);
    Promise.all([fetchShopCart(), fetchShopOrders()])
      .then(([cart, orders]) => {
        if (!mounted) return;
        setCartItems(cart.map(mapShopCartItem));
        setUserOrders(orders.map((order) => mapShopOrder(order, currentUser.role)));
      })
      .catch((error) => {
        if (mounted) message.error(error instanceof Error ? error.message : '购物车和订单加载失败');
      })
      .finally(() => {
        if (mounted) {
          setCartLoading(false);
          setOrdersLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [currentUser?.id]);

  useEffect(() => {
    let mounted = true;
    if (!currentUser) {
      setShippingAddresses([]);
      setAddressesLoading(false);
      return () => {
        mounted = false;
      };
    }

    setAddressesLoading(true);
    fetchShopShippingAddresses()
      .then((items) => {
        if (mounted) setShippingAddresses(items);
      })
      .catch((error) => {
        if (mounted) message.error(error instanceof Error ? error.message : '收货地址加载失败');
      })
      .finally(() => {
        if (mounted) setAddressesLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [currentUser?.id]);

  useEffect(() => {
    let mounted = true;
    setMerchantLoading(true);
    fetchMyMerchantApplication()
      .then((application) => {
        if (mounted) setMerchantApplication(application);
      })
      .catch((error) => {
        if (mounted) message.error(error instanceof Error ? error.message : '商家入驻状态加载失败');
      })
      .finally(() => {
        if (mounted) setMerchantLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const submitAuthFormFromEnter = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    authForm.submit();
  };

  const handleAuthSubmit = async (values: AuthFormValues) => {
    if (authMode === 'login' && (!captchaReady || captchaLoading || (captcha.enabled && (!captcha.uuid || !captcha.image)))) {
      message.warning('验证码尚未准备好，请重新获取后再登录');
      await loadCaptcha();
      return;
    }
    setAuthSubmitting(true);
    try {
      if (authMode === 'register') {
        await registerShopUser(values.username, values.password);
        setAuthMode('login');
        authForm.setFieldsValue({ username: values.username.trim(), password: '', code: '' });
        await loadCaptcha();
        message.success('注册成功，请登录');
        return;
      }

      const user = await loginShopUser(values.username, values.password, values.code, captcha.uuid);
      setCurrentUser(user);
      message.success(`欢迎回来，${user.name}`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败，请稍后重试');
      if (authMode === 'login') {
        authForm.resetFields(['code']);
        await loadCaptcha();
      }
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logoutShopUser();
    setCurrentUser(null);
    setCartItems([]);
    setUserOrders([]);
    setActiveTab('reviews');
    setCartOpen(false);
    setDetailOpen(false);
    setReportOpen(false);
    setAddressOpen(false);
    setPendingBuyProduct(null);
    setProfileDialog(null);
    authForm.resetFields(['password', 'code']);
    await loadCaptcha();
    message.success('已退出登录');
  };

  const userMeta = activeUser ? roleMeta[activeUser.role] : roleMeta.zhenke;
  const selectedReports = reports.filter((item) => item.productId === selectedProduct?.id);
  const trialReviewableProducts = products.filter((product) =>
    trials.some((trial) => trial.productId === product.id && trial.status === 'pending_report'),
  );
  const reviewableProducts = trialReviewableProducts;
  const canReview = Boolean(
    activeUser &&
      selectedProduct &&
      reviewableProducts.some((product) => product.id === selectedProduct.id),
  );

  const catalogProducts = useMemo(() => getCatalogProducts(products, reports, category, sortMode), [category, products, reports, sortMode]);
  const cartCount = getCartCount(cartItems);
  const cartTotal = getCartTotal(cartItems);
  const earningsSummary = summarizeEarnings(earnings);
  const selectedLogisticsView = selectedLogisticsOrder
    ? getLogisticsView(selectedLogisticsOrder, selectedLogisticsOrder.logistics)
    : null;

  const usefulProgress = Math.min(100, Math.round(((activeUser?.usefulCount ?? 0) / 50) * 100));
  const defaultShippingAddress = shippingAddresses.find((address) => address.isDefault) ?? shippingAddresses[0] ?? null;
  const isShippingAddressReady = isAddressComplete(defaultShippingAddress);

  const handleUseful = (reportId: number) => {
    if (!activeUser) {
      message.info('请先登录');
      return;
    }
    setReports((prev) => {
      const updatedReports = prev.map((report) => {
        if (report.id !== reportId) return report;
        if (report.userId === activeUser.id) {
          message.warning('不能给自己的报告点有用');
          return report;
        }

        return {
          ...report,
          usefulByMe: !report.usefulByMe,
          usefulCount: report.usefulByMe ? report.usefulCount - 1 : report.usefulCount + 1,
        };
      });

      const updatedReport = updatedReports.find((r) => r.id === reportId);
      if (updatedReport && journeyReport && journeyReport.id === reportId) {
        setJourneyReport(updatedReport);
      }

      return updatedReports;
    });
  };

  useEffect(() => {
    setSelectedProduct((current) => {
      if (catalogProducts.length === 0) return null;
      if (current && catalogProducts.some((product) => product.id === current.id)) return current;
      return catalogProducts[0];
    });
  }, [catalogProducts]);

  const openReportModal = (product?: Product) => {
    form.resetFields();
    setReportImageUrls([]);
    setReportVideoUrl(undefined);

    if (product && reviewableProducts.some((item) => item.id === product.id)) {
      form.setFieldsValue({ productId: product.id });
    }

    setReportOpen(true);
  };

  const handlePublish = async (values: ReportFormValues) => {
    if (!activeUser) return;
    const reportProduct = reviewableProducts.find((product) => product.id === values.productId);

    if (!reportProduct) {
      message.warning('请选择已确认收货且尚未发布报告的试用商品');
      return;
    }

    if (reportImageUrls.length === 0) {
      message.warning('请上传至少1张实拍图');
      return;
    }

    if (!values.experience.trim() || values.experience.trim().length < 20) {
      message.warning('真实体验正文至少需要20字，请详细描述使用感受');
      return;
    }

    const shortcomingTrimmed = values.shortcoming.trim();
    if (!shortcomingTrimmed) {
      message.warning('不足/缺点必须填写');
      return;
    }

    const invalidShortcomings = ['无', '暂无', '没有', '都挺好', '暂时没有', '没什么', '还行', '还可以', '不错', '挺好'];
    if (invalidShortcomings.includes(shortcomingTrimmed)) {
      message.warning('不足/缺点不能填写无效内容，请客观描述产品的缺点');
      return;
    }

    const trial = trials.find((item) => item.productId === reportProduct.id && item.status === 'pending_report');
    if (!trial?.applicationId) {
      message.warning('没有找到已确认收货且尚未发布报告的试用');
      return;
    }
    try {
      const resources = [
        ...reportImageUrls.filter((url) => !url.startsWith('blob:')).map((resourceUrl) => ({ resourceType: 'IMAGE' as const, resourceUrl })),
        ...(reportVideoUrl && !reportVideoUrl.startsWith('blob:') ? [{ resourceType: 'VIDEO' as const, resourceUrl: reportVideoUrl }] : []),
      ];
      await publishVerificationReport({
        trialApplicationId: trial.applicationId,
        experience: values.experience.trim(),
        shortcoming: shortcomingTrimmed,
        fitCrowd: values.fitCrowd?.trim() || '真实使用后再判断',
        recommend: Boolean(values.recommend),
        resources,
      });
      const applications = await fetchMyTrialApplications();
      setTrials(applications.map(mapTrialApplication));
      await loadHomeContent();
      setSelectedProduct(reportProduct);
      setReportOpen(false);
      form.resetFields();
      setReportImageUrls([]);
      setReportVideoUrl(undefined);
      message.success('甄客验已发布，已进入首页内容流');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '验证报告发布失败');
    }
  };

  const handleAddToCart = async (product: Product, _attribution?: ReportAttribution) => {
    if (product.purchasable === false || product.stock === 0) {
      message.warning('该商品当前无库存，暂不能购买');
      return;
    }
    if (!activeUser) {
      message.info('请先登录后再加入购物车');
      return;
    }
    setCartMutatingId(product.id);
    try {
      const saved = mapShopCartItem(await addShopCartItem(product.id));
      setCartItems((items) => {
        const exists = items.some((item) => item.product.id === product.id);
        return exists
          ? items.map((item) => (item.product.id === product.id ? saved : item))
          : [saved, ...items];
      });
      message.success('已加入购物车');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加入购物车失败');
    } finally {
      setCartMutatingId(null);
    }
  };

  const handleCartQuantity = async (item: CartItem, quantity: number) => {
    if (!item.cartItemId) return;
    setCartMutatingId(item.product.id);
    try {
      if (quantity <= 0) {
        await deleteShopCartItem(item.cartItemId);
        setCartItems((items) => items.filter((current) => current.cartItemId !== item.cartItemId));
      } else {
        const saved = mapShopCartItem(await updateShopCartItem(item.cartItemId, quantity));
        setCartItems((items) => items.map((current) => current.cartItemId === item.cartItemId ? saved : current));
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : '购物车更新失败');
    } finally {
      setCartMutatingId(null);
    }
  };

  const handleRemoveCartItem = async (item: CartItem) => {
    if (!item.cartItemId) return;
    setCartMutatingId(item.product.id);
    try {
      await deleteShopCartItem(item.cartItemId);
      setCartItems((items) => items.filter((current) => current.cartItemId !== item.cartItemId));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '移除购物车商品失败');
    } finally {
      setCartMutatingId(null);
    }
  };

  const handleCheckout = async () => {
    if (!activeUser || cartItems.length === 0) return;
    if (!defaultShippingAddress || !isShippingAddressReady) {
      message.info('请先完善默认收货地址');
      openAddressDialog();
      return;
    }
    setOrderSubmitting(true);
    try {
      const created = await checkoutShopCart(defaultShippingAddress.id);
      setUserOrders((items) => [...created.map((order) => mapShopOrder(order, activeUser.role)), ...items]);
      setCartItems([]);
      setCartOpen(false);
      setActiveTab('profile');
      setProfileView('orders');
      message.success('下单成功，请在我的订单中继续付款');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '下单失败');
    } finally {
      setOrderSubmitting(false);
    }
  };

  const handleBuyNow = (product: Product, attribution?: ReportAttribution) => {
    if (product.purchasable === false || product.stock === 0) {
      message.warning('该商品当前无库存，暂不能购买');
      return;
    }
    if (!activeUser) return;

    setSelectedProduct(product);
    setPendingBuyProduct(product);
    setPendingBuyAttribution(attribution);
  };

  const handleAdvanceOrder = (orderId: number) => {
    const order = userOrders.find((item) => item.id === orderId);
    if (!order) return;

    if (order.status === 'unpaid') {
      setPayOrder(order);
      return;
    }

    if (order.status === 'shipped') {
      Modal.confirm({
        title: '确认收货？',
        content: '请确认您已经收到商品。确认后订单将完成。',
        okText: '确认收货',
        cancelText: '再想想',
        onOk: () => handleConfirmReceive(order),
      });
      return;
    }
  };

  const handleConfirmReceive = async (order: Order) => {
    if (!activeUser || orderMutatingId === order.id) return;
    setOrderMutatingId(order.id);
    try {
      const received = mapShopOrder(await confirmShopOrderReceived(order.id), activeUser.role);
      setUserOrders((items) => items.map((item) => (item.id === order.id ? received : item)));
      setSelectedLogisticsOrder((current) => current?.id === order.id ? received : current);
      message.success('确认收货成功');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '确认收货失败');
      throw error;
    } finally {
      setOrderMutatingId(null);
    }
  };

  const handleSubmitReview = () => {
    if (!reviewOrder) return;

    const review = {
      id: Date.now(),
      ...reviewStars,
      content: reviewContent,
      images: reviewImages,
      createdAt: '刚刚',
    };

    setUserOrders((items) =>
      items.map((item) => (item.id === reviewOrder.id ? { ...item, review } : item)),
    );

    setReviewOrder(null);
    message.success('评价发布成功');
  };

  const handleReviewImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      message.warning('请上传图片文件');
      return false;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setReviewImages((prev) => [...prev, String(reader.result)]);
    };
    reader.readAsDataURL(file);

    return false;
  };

  const handleRemoveReviewImage = (index: number) => {
    setReviewImages((prev) => prev.filter((_, i) => i !== index));
  };

  const openReviewModal = (order: Order) => {
    setReviewOrder(order);
    setReviewStars({ productQuality: 5, logisticsService: 5, serviceAttitude: 5 });
    setReviewContent(order.review?.content ?? '');
    setReviewImages(order.review?.images ?? []);
  };

  const handlePay = async () => {
    if (!payOrder || !activeUser || paying) return;
    setPaying(true);
    try {
      const paid = mapShopOrder(await payShopOrder(payOrder.id), activeUser.role);
      setUserOrders((items) => items.map((item) => (item.id === paid.id ? paid : item)));
      setPayOrder(null);
      message.success('模拟支付成功，等待商家发货');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '模拟支付失败');
    } finally {
      setPaying(false);
    }
  };

  const handleConfirmBuyNow = async () => {
    if (!activeUser || !pendingBuyProduct || !defaultShippingAddress || !isShippingAddressReady) return;
    setOrderSubmitting(true);
    try {
      const created = await createShopOrders({
        addressId: defaultShippingAddress.id,
        items: [{ productId: pendingBuyProduct.id, quantity: 1 }],
      });
      setSelectedProduct(pendingBuyProduct);
      setUserOrders((items) => [...created.map((order) => mapShopOrder(order, activeUser.role)), ...items]);
      setCartOpen(false);
      setPendingBuyProduct(null);
      setPendingBuyAttribution(undefined);
      setActiveTab('profile');
      setProfileView('orders');
      message.success('下单成功，请在我的订单中继续付款');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '下单失败');
    } finally {
      setOrderSubmitting(false);
    }
  };

  const handleCancelOrder = (orderId: number) => {
    if (!activeUser) return;

    Modal.confirm({
      title: '确认取消订单？',
      content: `当前身份为${roleMeta[activeUser.role].label}，支持 ${roleMeta[activeUser.role].returnDays} 天退换。取消后订单会变为已取消。`,
      okText: '确认取消',
      cancelText: '再想想',
      onOk: async () => {
        try {
          const cancelled = await cancelShopOrder(orderId);
          setUserOrders((items) => items.map((order) => order.id === orderId
            ? mapShopOrder(cancelled, activeUser.role)
            : order));
          message.success('订单已取消，库存已恢复');
        } catch (error) {
          message.error(error instanceof Error ? error.message : '订单取消失败');
          throw error;
        }
      },
    });
  };

  const openProfileDialog = (dialog: Exclude<ProfileDialog, null>) => {
    if (!activeUser) return;

    setProfileDialog(dialog);
    if (dialog === 'name') nameForm.setFieldsValue({ name: activeUser.name });
    if (dialog === 'password') passwordForm.resetFields();
  };

  const openAddressDialog = () => {
    if (!activeUser) return;
    setAddressOpen(true);
  };

  const handleAddressSubmit = async (values: AddressFormValues) => {
    if (!activeUser) return;
    const editingLabel = editingAddressId ? '收货地址已更新' : '收货地址已新增';
    setAddressSubmitting(true);
    try {
      if (editingAddressId) await updateShopShippingAddress(editingAddressId, values);
      else await createShopShippingAddress(values);
      setShippingAddresses(await fetchShopShippingAddresses());
      setEditingAddressId(null);
      addressForm.setFieldsValue(emptyAddressFormValues);
      setAddressEditorOpen(false);
      message.success(editingLabel);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '收货地址保存失败');
    } finally {
      setAddressSubmitting(false);
    }
  };

  const handleStartNewAddress = () => {
    setEditingAddressId(null);
    addressForm.setFieldsValue(emptyAddressFormValues);
    setAddressEditorOpen(true);
  };

  const handleEditAddress = (address: ShippingAddress) => {
    setEditingAddressId(address.id);
    addressForm.setFieldsValue(address);
    setAddressEditorOpen(true);
  };

  const handleSetDefaultAddress = async (addressId: number) => {
    if (shippingAddresses.some((address) => address.id === addressId && address.isDefault)) return true;
    setAddressMutatingId(addressId);
    try {
      const defaultAddress = await setDefaultShopShippingAddress(addressId);
      setShippingAddresses((items) => items.map((address) => ({
        ...address,
        isDefault: address.id === defaultAddress.id,
      })));
      message.success('默认地址已更新');
      return true;
    } catch (error) {
      message.error(error instanceof Error ? error.message : '默认地址设置失败');
      return false;
    } finally {
      setAddressMutatingId(null);
    }
  };

  const handleSelectAddress = async (addressId: number) => {
    if (await handleSetDefaultAddress(addressId)) setAddressPickerOpen(false);
  };

  const handleDeleteAddress = (address: ShippingAddress) => {
    Modal.confirm({
      title: '删除收货地址？',
      content: `确认删除 ${address.recipient} 的收货地址吗？`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        setAddressMutatingId(address.id);
        try {
          await deleteShopShippingAddress(address.id);
          setShippingAddresses(await fetchShopShippingAddresses());
          message.success('收货地址已删除');
        } catch (error) {
          message.error(error instanceof Error ? error.message : '收货地址删除失败');
          throw error;
        } finally {
          setAddressMutatingId(null);
        }
      },
    });
  };

  const handleNameSubmit = async (values: { name: string }) => {
    if (!activeUser) return;
    try {
      const user = await updateShopProfile({ nickname: values.name.trim() });
      setCurrentUser(user);
      setProfileDialog(null);
      message.success('昵称已更新');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '昵称更新失败');
    }
  };

  const handlePasswordSubmit = async (values: { oldPassword: string; newPassword: string }) => {
    if (!activeUser) return;
    try {
      await changeShopPassword(values.oldPassword, values.newPassword);
      setProfileDialog(null);
      passwordForm.resetFields();
      message.success('密码已更新');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '密码更新失败');
    }
  };

  const handleAvatarFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeUser) return;
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;
    if (!file.type.startsWith('image/')) {
      message.warning('请选择图片文件');
      return;
    }

    setAvatarUploading(true);

    try {
      const avatarUrl = await uploadAvatarFile(file, activeUser.id);
      const user = await updateShopProfile({ avatar: avatarUrl });
      setCurrentUser(user);
      setProfileDialog(null);
      message.success('头像已更新');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '头像上传失败，请重新选择图片');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleMerchantSubmit = async (values: MerchantFormValues) => {
    if (!captchaReady || captchaLoading || (captcha.enabled && (!captcha.uuid || !captcha.image))) {
      message.warning('验证码尚未准备好，请重新获取后再提交');
      await loadCaptcha();
      return;
    }
    setMerchantSubmitting(true);
    try {
      const application = await submitMerchantApplication({ ...values, uuid: captcha.uuid });
      setMerchantApplication(application);
      setMerchantOpen(false);
      merchantForm.resetFields();
      message.success('入驻申请已提交，请等待平台审核');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '商家入驻申请提交失败');
      merchantForm.resetFields(['code']);
      await loadCaptcha();
    } finally {
      setMerchantSubmitting(false);
    }
  };

  const openMerchantApplication = () => {
    if (merchantApplication?.auditStatus === 'REJECTED') {
      merchantForm.setFieldsValue({
        accountUsername: merchantApplication.accountUsername,
        companyName: merchantApplication.companyName,
        companyAddress: merchantApplication.companyAddress,
        contactName: merchantApplication.contactName,
        contactPhone: merchantApplication.contactPhone,
        businessLicense: merchantApplication.businessLicense,
        productIntro: merchantApplication.productIntro,
        originTraceability: merchantApplication.originTraceability,
        acceptsVerificationRecruitment: true,
        acceptsPublicWelfare: true,
        agreeProtocol: true,
      });
    }
    void loadCaptcha();
    setMerchantOpen(true);
  };

  const handleOpenReportProduct = (report: VerifyReport) => {
    const product = findProductForReport(products, report);

    if (!product) {
      message.warning('没有找到对应商品');
      return;
    }

    setSelectedProduct(product);
    setJourneyReport(report);
    setCommentText('');
    setReplyingTo(null);
    setJourneyView('report');
    setActiveTab('reviews');
  };

  const reloadReportComments = async (reportId: number) => {
    const items = await fetchReportComments(reportId);
    setReportComments(items);
  };

  const submitReportComment = async () => {
    if (!journeyReport) return;
    if (!activeUser) {
      message.info('请先登录后再评论');
      return;
    }
    const content = commentText.trim();
    if (!content) {
      message.warning('请输入评论内容');
      return;
    }
    setCommentSubmitting(true);
    try {
      await createReportComment(journeyReport.id, content, replyingTo?.commentId);
      await reloadReportComments(journeyReport.id);
      setCommentText('');
      setReplyingTo(null);
      message.success(replyingTo ? '回复发布成功' : '评论发布成功');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '评论发布失败');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const startReply = (comment: ReportCommentDto) => {
    if (!activeUser) {
      message.info('请先登录后再回复');
      return;
    }
    setReplyingTo(comment);
    setCommentText('');
  };

  const confirmDeleteComment = (comment: ReportCommentDto) => {
    if (!journeyReport || !activeUser || comment.shopUserId !== activeUser.id) return;
    const deletesReplies = !comment.parentCommentId && (comment.replies?.length ?? 0) > 0;
    Modal.confirm({
      title: deletesReplies ? '删除评论及其全部回复？' : '删除这条评论？',
      content: deletesReplies ? '删除后页面不再展示这条评论及其全部回复，但数据会保留在数据库中。' : '删除后页面不再展示，但数据会保留在数据库中。',
      okText: '确认删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        setCommentDeletingId(comment.commentId);
        try {
          await deleteReportComment(journeyReport.id, comment.commentId);
          await reloadReportComments(journeyReport.id);
          if (replyingTo?.commentId === comment.commentId || replyingTo?.parentCommentId === comment.commentId) {
            setReplyingTo(null);
            setCommentText('');
          }
          message.success('评论已删除');
        } catch (error) {
          message.error(error instanceof Error ? error.message : '评论删除失败');
          throw error;
        } finally {
          setCommentDeletingId(null);
        }
      },
    });
  };

  const openProductJourney = (product: Product) => {
    setSelectedProduct(product);
    setJourneyReport(null);
    setJourneyView('product');
    setActiveTab('reviews');
  };

  const handleApplyForVerification = (recruitment: TrialRecruitment) => {
    if (!activeUser) {
      message.info('请先登录');
      return;
    }
    if (!isShippingAddressReady || !defaultShippingAddress) {
      message.info('请先完善默认收货地址');
      openAddressDialog();
      return;
    }
    trialApplyForm.resetFields();
    setApplyingRecruitment(recruitment);
  };

  const submitTrialApplication = async (values: TrialApplyFormValues) => {
    if (!applyingRecruitment || !defaultShippingAddress) return;
    setTrialApplying(true);
    try {
      await applyForTrial(applyingRecruitment.id, {
        applyReason: values.applyReason.trim(),
        recipientName: defaultShippingAddress.recipient,
        recipientPhone: defaultShippingAddress.phone,
        shippingAddress: formatShippingAddress(defaultShippingAddress),
      });
      const applications = await fetchMyTrialApplications();
      setTrials(applications.map(mapTrialApplication));
      setApplyingRecruitment(null);
      trialApplyForm.resetFields();
      message.success('申请已提交，可在“我的试用”查看审核和寄送进度');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '试用申请提交失败');
    } finally {
      setTrialApplying(false);
    }
  };

  const handleConfirmTrialReceived = async (trial: TrialRecord) => {
    if (!trial.applicationId) return;
    try {
      await confirmTrialReceived(trial.applicationId);
      const applications = await fetchMyTrialApplications();
      setTrials(applications.map(mapTrialApplication));
      message.success('已确认收货，现在可以自愿发布验证报告');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '确认收货失败');
    }
  };

  const renderCartDrawer = () => (
    <Drawer
      title="购物车"
      open={cartOpen}
      onClose={() => setCartOpen(false)}
      size={420}
      className={styles.cartDrawer}
      footer={
        <div className={styles.cartFooter}>
          <div className={styles.cartSummary}>
            <span>合计</span>
            <strong>{formatPrice(cartTotal)}</strong>
          </div>
          <Button
            className={styles.checkoutButton}
            type="primary"
            size="large"
            disabled={cartItems.length === 0}
            loading={orderSubmitting}
            onClick={handleCheckout}
          >
            结算 {cartCount} 件
          </Button>
        </div>
      }
    >
      {cartLoading ? (
        <div className={styles.emptyCart}><Spin /></div>
      ) : cartItems.length === 0 ? (
        <div className={styles.emptyCart}>
          <ShoppingCartOutlined />
          <strong>购物车还是空的</strong>
          <p>看到合适的好物，先加入购物车慢慢比较。</p>
        </div>
      ) : (
        <div className={styles.cartList}>
          {cartItems.map((item) => (
            <article className={styles.cartItem} key={item.product.id}>
              <div className={styles.cartItemImage} style={{ backgroundImage: item.product.cover }} />
              <div className={styles.cartItemBody}>
                <div className={styles.cartItemTitle}>
                  <strong>{item.product.title}</strong>
                  <Button
                    aria-label={`移除${item.product.title}`}
                    size="small"
                    type="text"
                    icon={<DeleteOutlined />}
                    loading={cartMutatingId === item.product.id}
                    onClick={() => void handleRemoveCartItem(item)}
                  />
                </div>
                <span>{formatPrice(item.product.price)}</span>
                <div className={styles.quantityRow}>
                  <Button
                    aria-label={`减少${item.product.title}`}
                    size="small"
                    icon={<MinusOutlined />}
                    disabled={cartMutatingId === item.product.id}
                    onClick={() => void handleCartQuantity(item, item.quantity - 1)}
                  />
                  <b>{item.quantity}</b>
                  <Button
                    aria-label={`增加${item.product.title}`}
                    size="small"
                    icon={<PlusOutlined />}
                    disabled={cartMutatingId === item.product.id || item.quantity >= (item.product.stock ?? 99)}
                    onClick={() => void handleCartQuantity(item, item.quantity + 1)}
                  />
                  <em>{formatPrice(item.product.price * item.quantity)}</em>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </Drawer>
  );

  const renderAuth = () => (
    <main className={styles.authShell}>
      <section className={styles.authIntro}>
        <div className={styles.brandMark}>㤫</div>
        <span className={styles.eyebrow}>Trust commerce</span>
        <h1>先验证，再相信。</h1>
        <p>登录后可以浏览好物、查看真实不足、发布验证报告。新注册用户默认成为甄客。</p>
        <div className={styles.authRules}>
          <span>密码必须包含字母和数字</span>
          <span>注册成功后回到登录页</span>
          <span>默认身份：甄客</span>
        </div>
      </section>
      <section className={styles.authCard}>
        <div className={styles.authHeader}>
          <h2>{authMode === 'login' ? '登录' : '注册'}</h2>
          <p>{authMode === 'login' ? '使用用户名和密码进入商城。' : '创建账号后，请回到登录页登录。'}</p>
        </div>
        <Form layout="vertical" form={authForm} onFinish={handleAuthSubmit} onKeyDown={submitAuthFormFromEnter}>
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input size="large" prefix={<UserOutlined />} placeholder="例如：xiaobai" />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '请输入密码' },
              {
                validator: (_, value) => {
                  if (!value || (/[A-Za-z]/.test(value) && /\d/.test(value))) return Promise.resolve();
                  return Promise.reject(new Error('密码必须同时包含字母和数字'));
                },
              },
            ]}
          >
            <Input.Password size="large" prefix={<LockOutlined />} placeholder="字母 + 数字" />
          </Form.Item>
          {authMode === 'login' && captchaReady && captcha.enabled && (
            <Form.Item name="code" label="验证码" rules={[{ required: true, message: '请输入验证码结果' }]}>
              <div className={styles.captchaRow}>
                <Input size="large" autoComplete="off" />
                <button type="button" className={styles.captchaButton} onClick={() => void loadCaptcha()} title="刷新验证码">
                  <img src={captcha.image} alt="验证码" />
                </button>
              </div>
            </Form.Item>
          )}
          {authMode === 'login' && !captchaReady && (
            <Form.Item label="验证码" required>
              <div className={styles.captchaRow}>
                <span className={styles.hint}>
                  {captchaLoading ? '验证码加载中，请稍候…' : captchaLoadError || '验证码暂时无法加载'}
                </span>
                <Button htmlType="button" onClick={() => void loadCaptcha()} loading={captchaLoading}>
                  重新获取
                </Button>
              </div>
            </Form.Item>
          )}
          <Button
            block
            type="primary"
            size="large"
            htmlType="submit"
            icon={<LoginOutlined />}
            loading={authSubmitting}
            disabled={authMode === 'login' && (!captchaReady || captchaLoading || (captcha.enabled && (!captcha.uuid || !captcha.image)))}
          >
            {authMode === 'login' ? '登录' : '注册'}
          </Button>
        </Form>
        <button
          className={styles.authSwitch}
          type="button"
          onClick={() => {
            const nextMode = authMode === 'login' ? 'register' : 'login';
            setAuthMode(nextMode);
            authForm.resetFields(['password', 'code']);
            if (nextMode === 'login') void loadCaptcha();
          }}
        >
          {authMode === 'login' ? '还没有账号？去注册' : '已有账号？回到登录'}
        </button>
        <Button
          block
          size="large"
          onClick={openMerchantApplication}
          icon={<SafetyCertificateOutlined />}
          className={styles.merchantButton}
        >
          {merchantApplication ? `商家申请：${({ PENDING: '审核中', APPROVED: '已通过', REJECTED: '已驳回' } as const)[merchantApplication.auditStatus]}` : '商家入驻'}
        </Button>
      </section>
    </main>
  );

  const renderMerchantModal = () => (
    <Modal
      title="商家入驻"
      open={merchantOpen}
      onCancel={() => {
        setMerchantOpen(false);
        merchantForm.resetFields();
      }}
      footer={null}
      width={600}
      className={styles.merchantModal}
      bodyStyle={{ maxHeight: 'calc(100vh - 240px)', overflowY: 'auto' }}
    >
      <div className={styles.merchantIntro}>
        <p>提交公司资质、联系人、产品介绍和产地溯源材料，平台审核通过后会创建商家后台账号。</p>
        <p className={styles.merchantWarning}>
          <SafetyCertificateOutlined />
          平台将保存申请与每次审核记录；请保证材料真实、完整且资源地址可访问。
        </p>
        {merchantLoading && <Spin size="small" />}
        {merchantApplication && (
          <p>
            申请编号：{merchantApplication.applicationNo} · 当前状态：
            <Tag color={merchantApplication.auditStatus === 'APPROVED' ? 'success' : merchantApplication.auditStatus === 'REJECTED' ? 'error' : 'processing'}>
              {({ PENDING: '审核中', APPROVED: '审核通过', REJECTED: '审核驳回' } as const)[merchantApplication.auditStatus]}
            </Tag>
            {merchantApplication.auditRemark ? `审核意见：${merchantApplication.auditRemark}` : ''}
          </p>
        )}
      </div>
      {(!merchantApplication || merchantApplication.auditStatus === 'REJECTED') && (
      <Form layout="vertical" form={merchantForm} onFinish={handleMerchantSubmit}>
        <Form.Item name="accountUsername" label="商家后台账号" rules={[{ required: true, message: '请输入商家后台账号' }, { pattern: /^[A-Za-z0-9_]{4,30}$/, message: '请输入4到30位字母、数字或下划线' }]}>
          <Input placeholder="审核通过后使用此账号登录商家后台" />
        </Form.Item>
        <Form.Item name="password" label="商家后台密码" rules={[{ required: true, message: '请输入商家后台密码' }, { min: 6, max: 50 }, { pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/, message: '密码必须同时包含字母和数字' }]}>
          <Input.Password placeholder="审核通过后使用此密码登录商家后台" />
        </Form.Item>
        <Form.Item name="companyName" label="公司名称" rules={[{ required: true, message: '请输入公司名称' }, { max: 100 }]}>
          <Input placeholder="请输入公司名称" />
        </Form.Item>
        <Form.Item name="companyAddress" label="公司地址" rules={[{ required: true, message: '请输入公司地址' }, { max: 255 }]}>
          <Input placeholder="请输入公司地址" />
        </Form.Item>
        <Form.Item name="contactName" label="联系人" rules={[{ required: true, message: '请输入联系人' }, { max: 30 }]}>
          <Input placeholder="请输入联系人姓名" />
        </Form.Item>
        <Form.Item
          name="contactPhone"
          label="联系电话"
          rules={[{ required: true, message: '请输入联系电话' }, { pattern: /^[0-9+\- ]{6,20}$/, message: '联系电话格式不正确' }]}
        >
          <Input placeholder="请输入手机号或固定电话" />
        </Form.Item>
        <Form.Item name="businessLicense" label="营业执照资源地址" rules={[{ required: true, message: '请输入营业执照图片或资源地址' }, { max: 500 }]}>
          <Input placeholder="https://...（正式文件上传将在上传模块接入）" />
        </Form.Item>
        <Form.Item name="productIntro" label="产品介绍" rules={[{ required: true, message: '请输入产品介绍' }, { max: 2000 }]}>
          <Input.TextArea rows={4} placeholder="请介绍您的产品特点、优势等" />
        </Form.Item>
        <Form.Item name="originTraceability" label="产地溯源" rules={[{ required: true, message: '请输入产地溯源信息' }, { max: 2000 }]}>
          <Input.TextArea rows={4} placeholder="请描述产品的产地来源、生产流程等溯源信息" />
        </Form.Item>
        <Form.Item
          name="acceptsVerificationRecruitment"
          label="入驻门槛"
          valuePropName="checked"
          extra="我承诺发起验证招募（不验证不上架）"
          rules={[{ validator: (_, value) => value ? Promise.resolve() : Promise.reject(new Error('必须承诺发起验证招募')) }]}
        >
          <Switch checkedChildren="已阅读" unCheckedChildren="未阅读" />
        </Form.Item>
        <Form.Item
          name="acceptsPublicWelfare"
          label="公益分成"
          valuePropName="checked"
          extra="我接受公益分成"
          rules={[{ validator: (_, value) => value ? Promise.resolve() : Promise.reject(new Error('必须接受公益分成约定')) }]}
        >
          <Switch checkedChildren="已同意" unCheckedChildren="未同意" />
        </Form.Item>
        <Form.Item
          name="agreeProtocol"
          label="协议"
          valuePropName="checked"
          extra="我已阅读并同意《商家入驻协议》，承诺所提交材料真实有效并接受平台审核与留痕"
          rules={[{ validator: (_, value) => value ? Promise.resolve() : Promise.reject(new Error('请阅读并同意商家入驻协议')) }]}
        >
          <Switch checkedChildren="已勾选" unCheckedChildren="未勾选" />
        </Form.Item>
        {captchaReady && captcha.enabled && (
          <Form.Item name="code" label="验证码" rules={[{ required: true, message: '请输入验证码' }]}>
            <div className={styles.captchaRow}>
              <Input placeholder="请输入验证码" />
              <button type="button" className={styles.captchaButton} onClick={() => void loadCaptcha()} title="刷新验证码">
                <img src={captcha.image} alt="验证码" />
              </button>
            </div>
          </Form.Item>
        )}
        {!captchaReady && (
          <Form.Item label="验证码" required>
            <div className={styles.captchaRow}>
              <span className={styles.hint}>
                {captchaLoading ? '验证码加载中，请稍候…' : captchaLoadError || '验证码暂时无法加载'}
              </span>
              <Button htmlType="button" onClick={() => void loadCaptcha()} loading={captchaLoading}>
                重新获取
              </Button>
            </div>
          </Form.Item>
        )}
        <Form.Item>
          <Button
            block
            type="primary"
            size="large"
            htmlType="submit"
            loading={merchantSubmitting}
            disabled={!captchaReady || captchaLoading || (captcha.enabled && (!captcha.uuid || !captcha.image))}
          >
            提交入驻申请
          </Button>
        </Form.Item>
      </Form>
      )}
    </Modal>
  );

  const renderGoods = () => (
    <main className={styles.contentGrid}>
      <section className={styles.catalog}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>Good goods</span>
            <h2>先看真实验证，再决定要不要买</h2>
          </div>
          <div className={styles.catalogControls}>
            <Segmented
              value={category}
              onChange={(value) => setCategory(value as ProductCategoryFilter)}
              options={[
                { label: '全部', value: 'all' },
                { label: '已得验', value: 'verified' },
                { label: '在地特产', value: 'local' },
              ]}
            />
            <Select<ProductSortKey>
              aria-label="商品排序"
              className={styles.sortSelect}
              value={sortMode}
              onChange={setSortMode}
              options={[
                { label: '最新验证', value: 'latestVerified' },
                { label: '价格从低到高', value: 'priceAsc' },
                { label: '价格从高到低', value: 'priceDesc' },
              ]}
            />
          </div>
        </div>

        <div className={styles.productGrid}>
          {catalogProducts.map((product) => (
            <article
              key={product.id}
              className={`${styles.productCard} ${selectedProduct?.id === product.id ? styles.activeProduct : ''}`}
            >
              <button
                className={styles.productImageButton}
                type="button"
                aria-label={`查看${product.title}图片详情`}
                onClick={() => {
                  setSelectedProduct(product);
                  setImageProduct(product);
                }}
              >
                <span className={styles.productVisual} style={{ backgroundImage: product.cover }} />
              </button>
              <button
                className={styles.productBodyButton}
                type="button"
                aria-pressed={selectedProduct?.id === product.id}
                onClick={() => {
                  setSelectedProduct(product);
                }}
              >
                <div className={styles.cardTopline}>
                  {product.isVerified ? (
                    <Tag color="success" icon={<CheckCircleFilled />}>
                      已得验
                    </Tag>
                  ) : (
                    <Tag>待验证</Tag>
                  )}
                  <span>{product.verifyCount} 人验证</span>
                </div>
                <h3 title={product.title}>{product.title}</h3>
                <p>{product.artisanName}</p>
                <div className={styles.tags}>
                  {product.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <strong>{formatPrice(product.price)}</strong>
              </button>
              <div className={styles.productQuickActions}>
                <Button onClick={() => handleAddToCart(product)}>
                  加入购物车
                </Button>
                <Button type="primary" onClick={() => handleBuyNow(product)}>
                  立即购买
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <aside className={styles.trustPanel}>
        {selectedProduct && (
          <>
            <div className={styles.panelCover} style={{ backgroundImage: selectedProduct.cover }}>
              <div>
                <span>信任区</span>
                <h2>{selectedProduct.title}</h2>
              </div>
            </div>
            <div className={styles.panelBody}>
              <div className={styles.trustSummary}>
                <span>{selectedProduct.verifyCount}</span>
                <p>份真实验证把“不足”放在明处。</p>
              </div>
              {selectedReports.slice(0, 2).map((report) => (
                <ReportCard key={report.id} report={report} onUseful={handleUseful} compact />
              ))}
              <p className={styles.productDetail}>{selectedProduct.detail}</p>
              <div className={styles.panelActions}>
                <Button
                  size="large"
                  icon={<ShoppingCartOutlined />}
                  onClick={() => {
                    handleAddToCart(selectedProduct);
                  }}
                >
                  加入购物车
                </Button>
          <Button type="primary" size="large" onClick={() => openReportModal(selectedProduct)} disabled={!canReview}>
                  写验证报告
                </Button>
              </div>
              <Button block icon={<ProfileOutlined />} onClick={() => setDetailOpen(true)}>
                查看完整详情
              </Button>
              {!canReview && <p className={styles.hint}>只有买过且未写过报告的商品可以验证。</p>}
            </div>
          </>
        )}
      </aside>
    </main>
  );

  const renderReviews = () => {
    const mixedItems = homeFeed.reduce<Array<
      | { type: 'report'; data: VerifyReport }
      | { type: 'recruitment'; data: TrialRecruitment & { product: Product } }
    >>((items, item) => {
      if (item.contentType === 'REPORT') {
        const report = reports.find((candidate) => candidate.id === item.contentId);
        if (report) items.push({ type: 'report', data: report });
        return items;
      }
      const recruitment = recruitments.find((candidate) => candidate.id === item.contentId);
      const product = products.find((candidate) => candidate.id === item.productId);
      if (recruitment && product) {
        items.push({ type: 'recruitment', data: { ...recruitment, product } });
      }
      return items;
    }, []);
    return (
      <main className={styles.singleColumn}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>Verified stories</span>
            <h2>甄客验</h2>
          </div>
          <Button type="primary" onClick={() => openReportModal()} disabled={reviewableProducts.length === 0}>
            发布甄客验
          </Button>
        </div>
        <div className={styles.catalogControls} style={{ marginBottom: 20 }}>
          <Segmented
            value={category}
            onChange={(value) => setCategory(value as ProductCategoryFilter)}
            options={[
              { label: '全部', value: 'all' },
              ...productCategories.map((item) => ({ label: item.categoryName, value: item.categoryCode })),
            ]}
          />
          <Segmented
            value={homeContentType}
            onChange={(value) => setHomeContentType(value as 'ALL' | 'TRIAL' | 'REPORT')}
            options={[
              { label: '全部', value: 'ALL' },
              { label: '试用招募', value: 'TRIAL' },
              { label: '验证报告', value: 'REPORT' },
            ]}
          />
        </div>
        {contentLoading && <div className={styles.sessionLoading}><Spin /></div>}
        <div className={styles.reportGrid}>
          {mixedItems.map((item, index) => {
            if (item.type === 'report') {
              return (
                <ReportCard
                  key={`report-${item.data.id}`}
                  report={item.data}
                  onUseful={handleUseful}
                  onOpenProduct={handleOpenReportProduct}
                  gridMode
                />
              );
            }
            const { product, ...recruitment } = item.data;
            const remaining = recruitment.targetCount - recruitment.claimedCount;
            const aspectRatios = ['80%', '100%', '120%'];
            const imageHeightRatio = aspectRatios[index % aspectRatios.length];
            return (
              <article
                key={`recruit-${recruitment.id}`}
                className={styles.recruitGridCard}
                onClick={() => openProductJourney(product)}
              >
                <div className={styles.reportGridImage} style={{ paddingTop: imageHeightRatio }}>
                  <img src={product.imageUrl} alt={product.title} />
                  <div className={styles.recruitBadge}>招募中</div>
                </div>
                <div className={styles.reportGridContent}>
                  <p className={styles.reportGridTitle}>{product.title}</p>
                  <p className={styles.recruitGridDesc}>
                    {recruitment.campaignSummary || '申请通过后由商家寄送，确认收货后可自愿发布真实甄客验。'}
                  </p>
                  <div className={styles.recruitGridInfo}>
                    <span>寻找 {recruitment.targetCount} 人</span>
                    <span>剩余 {remaining} 个名额</span>
                  </div>
                  <div className={styles.reportGridFooter}>
                    <div className={styles.reportGridUser}>
                      <span className={`${styles.recruitTag}`}>招募</span>
                      <span className={styles.reportGridName}>截止 {recruitment.deadline}</span>
                    </div>
                    <Button size="small" type="primary" onClick={(e) => { e.stopPropagation(); handleApplyForVerification(recruitment); }}>
                      申请
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        {!contentLoading && mixedItems.length === 0 && <p className={styles.empty}>当前分类还没有正在招募的试用或已发布的验证报告。</p>}
      </main>
    );
  };

  const renderProductJourney = () => {
    if (!selectedProduct) return renderReviews();
    const state = getProductJourneyState(selectedProduct.id, reports);
    const productReports = reports.filter((report) => report.productId === selectedProduct.id);
    const recruitment = recruitments.find((item) => item.productId === selectedProduct.id);
    const evidence = productEvidence.find((item) => item.productId === selectedProduct.id);
    const alreadyApplied = Boolean(activeUser && recruitment?.applicantUserIds.includes(activeUser.id));
    const isFull = Boolean(recruitment && recruitment.claimedCount >= recruitment.targetCount);

    return (
      <main className={styles.journeyPage}>
        <Button onClick={() => setJourneyView('feed')}>返回甄客验</Button>
        <section className={styles.productHero}>
          <img src={selectedProduct.imageUrl} alt={selectedProduct.title} />
          <div>
            <Tag color={state === 'verified' ? 'success' : 'processing'}>
              {state === 'verified' ? '已得验' : '招募中'}
            </Tag>
            <h1>{selectedProduct.title}</h1>
            <p>{selectedProduct.artisanName}</p>
            <strong>{formatPrice(selectedProduct.price)}</strong>
          </div>
        </section>

        {state === 'recruiting' && recruitment ? (
          <section className={styles.recruitmentHero}>
            <span className={styles.eyebrow}>Cold start</span>
            <h2>正在寻找甄客</h2>
            <p>
              寻找 {recruitment.targetCount} 位甄客，已有 {recruitment.claimedCount} 人报名，剩余{' '}
              {recruitment.targetCount - recruitment.claimedCount} 个名额。
            </p>
            <div className={styles.recruitmentProgress}>
              <i style={{ width: `${Math.min(100, (recruitment.claimedCount / recruitment.targetCount) * 100)}%` }} />
            </div>
            <span>报名截止 {recruitment.deadline}</span>
            <Button
              type="primary"
              size="large"
              disabled={alreadyApplied || isFull}
              onClick={() => handleApplyForVerification(recruitment)}
            >
              {alreadyApplied ? '已申请' : isFull ? '名额已满' : '申请验证'}
            </Button>
          </section>
        ) : (
          <section className={styles.productReportFlow}>
            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.eyebrow}>Verified first</span>
                <h2>先看这件商品的甄客验</h2>
              </div>
              <span>{productReports.length} 份独立验证</span>
            </div>
            {productReports.map((report) => (
              <ReportCard key={report.id} report={report} onUseful={handleUseful} onOpenProduct={handleOpenReportProduct} />
            ))}
          </section>
        )}

        <section className={styles.evidencePanel}>
          <h2>{state === 'recruiting' ? '商家自证与溯源' : '产品信息（附带）'}</h2>
          <p>{selectedProduct.detail}</p>
          {evidence && (
            <div className={styles.evidenceGrid}>
              <span>商家：{evidence.merchantName}</span>
              <span>产地：{evidence.origin}</span>
              <span>溯源码：{evidence.traceCode}</span>
              {evidence.statements.map((statement) => (
                <span key={statement}>✓ {statement}</span>
              ))}
            </div>
          )}
        </section>
      </main>
    );
  };

  const renderReportDetail = () => {
    if (!journeyReport) return renderReviews();
    const product = findProductForReport(products, journeyReport);
    if (!product) return renderReviews();

    const commentCount = reportComments.reduce((count, item) => count + 1 + (item.replies?.length ?? 0), 0);
    const renderComment = (comment: ReportCommentDto, reply = false) => {
      const displayName = comment.nickName || comment.userName;
      const replyToName = comment.replyToNickName || comment.replyToUserName;
      const isOwner = activeUser?.id === comment.shopUserId;
      return (
        <article key={comment.commentId} className={`${styles.commentItem} ${reply ? styles.commentReply : ''}`}>
          <div className={styles.commentAvatar}>
            {comment.avatar ? <img src={comment.avatar} alt={displayName} /> : displayName.slice(0, 1)}
          </div>
          <div className={styles.commentBody}>
            <div className={styles.commentMeta}>
              <strong>{displayName}</strong>
              <span>{comment.createTime}</span>
            </div>
            <p>
              {reply && replyToName && <em>回复 {replyToName}：</em>}
              {comment.content}
            </p>
            <div className={styles.commentActions}>
              <Button type="link" size="small" onClick={() => startReply(comment)}>回复</Button>
              {isOwner && (
                <Button
                  type="link"
                  danger
                  size="small"
                  loading={commentDeletingId === comment.commentId}
                  onClick={() => confirmDeleteComment(comment)}
                >
                  删除
                </Button>
              )}
            </div>
          </div>
        </article>
      );
    };

    return (
      <main className={styles.journeyPage}>
        <Button onClick={() => setJourneyView('feed')}>返回甄客验</Button>
        <section className={styles.reportDetail}>
          <div className={styles.reportDetailImage}>
            <img src={journeyReport.images[0] || product.imageUrl} alt={`${product.title}实拍`} />
          </div>
          <div className={styles.reportDetailContent}>
            <div className={styles.reportAuthor}>
              <span className={roleClass(journeyReport.userRole)}>{roleMeta[journeyReport.userRole].label}</span>
              <strong>{journeyReport.userName}</strong>
              <em>{journeyReport.createdAt}</em>
            </div>
            <h1>{journeyReport.productTitle}</h1>
            <p>{journeyReport.experience}</p>
            <div className={styles.shortcoming}>不足：{journeyReport.shortcoming}</div>
            <p>适合人群：{journeyReport.fitCrowd}</p>
            <div className={styles.reportDetailActions}>
              <Button onClick={() => handleUseful(journeyReport.id)}>{journeyReport.usefulCount} 人认为有用</Button>
            </div>
            <Button type="primary" size="large" onClick={() => setJourneyView('purchase')}>
              查看 / 购买该商品
            </Button>
          </div>
        </section>
        <section className={styles.reportComments}>
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.eyebrow}>Discussion</span>
              <h2>评论区</h2>
            </div>
            <span>{commentCount} 条评论</span>
          </div>
          <div className={styles.commentComposer}>
            {replyingTo && (
              <div className={styles.replyingHint}>
                <span>回复 {replyingTo.nickName || replyingTo.userName}</span>
                <Button type="link" size="small" onClick={() => setReplyingTo(null)}>取消回复</Button>
              </div>
            )}
            <Input.TextArea
              value={commentText}
              maxLength={500}
              showCount
              autoSize={{ minRows: 3, maxRows: 6 }}
              placeholder={activeUser ? (replyingTo ? '写下你的回复' : '说说你对这份甄客验的看法') : '登录后可以评论和回复'}
              disabled={!activeUser}
              onChange={(event) => setCommentText(event.target.value)}
            />
            <Button type="primary" loading={commentSubmitting} disabled={!activeUser} onClick={() => void submitReportComment()}>
              {replyingTo ? '发布回复' : '发布评论'}
            </Button>
          </div>
          <Spin spinning={reportCommentsLoading}>
            <div className={styles.commentList}>
              {reportComments.map((comment) => (
                <div key={comment.commentId} className={styles.commentThread}>
                  {renderComment(comment)}
                  {(comment.replies ?? []).map((reply) => renderComment(reply, true))}
                </div>
              ))}
              {!reportCommentsLoading && reportComments.length === 0 && <p className={styles.empty}>还没有评论，来发表第一条真实看法吧。</p>}
            </div>
          </Spin>
        </section>
      </main>
    );
  };

  const renderPurchasePage = () => {
    if (!selectedProduct || !journeyReport) return renderReviews();
    const attribution: ReportAttribution = {
      fromReviewId: journeyReport.id,
      fromVerifierId: journeyReport.userId,
    };
    const evidence = productEvidence.find((item) => item.productId === selectedProduct.id);

    return (
      <main className={styles.journeyPage}>
        <Button onClick={() => setJourneyView('report')}>返回甄客验详情</Button>
        <section className={styles.purchasePage}>
          <img src={selectedProduct.imageUrl} alt={selectedProduct.title} />
          <div>
            <Tag color="success">来源：{journeyReport.userName} 的甄客验</Tag>
            <h1>{selectedProduct.title}</h1>
            <strong>{formatPrice(selectedProduct.price)}</strong>
            <p>{selectedProduct.detail}</p>
            {evidence && <p>{evidence.origin} · 溯源码 {evidence.traceCode}</p>}
            <div className={styles.purchaseActions}>
              <Button size="large" onClick={() => handleAddToCart(selectedProduct, attribution)}>
                加入购物车
              </Button>
              <Button type="primary" size="large" onClick={() => handleBuyNow(selectedProduct, attribution)}>
                立即购买
              </Button>
            </div>
            <small>本次成交产生的服务费归「{journeyReport.userName}」所有</small>
          </div>
        </section>
      </main>
    );
  };

  const renderProfile = () => {
    const profileReports = reports.filter((report) => report.userId === activeUser?.id);
    const unreadNotificationCount = notifications.filter((item) => !item.isRead).length;
    const profileMenuItems = [
      {
        key: 'orders' as const,
        icon: <ShoppingCartOutlined />,
        summary: `${userOrders.length} 笔订单`,
      },
      {
        key: 'trials' as const,
        icon: <SafetyCertificateOutlined />,
        summary: `${trials.length} 个试用`,
      },
      {
        key: 'reports' as const,
        icon: <ProfileOutlined />,
        summary: `${profileReports.length} 篇甄客验`,
      },
      {
        key: 'earnings' as const,
        icon: <AccountBookOutlined />,
        summary: `累计 ${formatPrice(earningsSummary.total)}`,
      },
      {
        key: 'messages' as const,
        icon: <BellOutlined />,
        summary: unreadNotificationCount > 0 ? `${unreadNotificationCount} 条未读` : '暂无未读',
      },
    ];

    if (profileView === 'menu') {
      return (
        <main className={styles.profileGrid}>
          <section className={styles.profileHero}>
            {activeUser && (
              <div className={styles.profileIdentity}>
                {renderUserAvatar(activeUser, styles.profileAvatar)}
                <div>
                  <span className={roleClass(activeUser.role)}>{userMeta.label}</span>
                  <h2>{activeUser.name}</h2>
                  <p>@{activeUser.username}</p>
                </div>
              </div>
            )}
            <p>当前退换天数 {userMeta.returnDays} 天。再获得 1 个有用，就能触发验甄客升级演示。</p>
            <div className={styles.progressTrack}>
              <i style={{ width: `${usefulProgress}%` }} />
            </div>
            <div className={styles.statRow}>
              <span>报告 {activeUser?.reportCount ?? 0}</span>
              <span>有用 {activeUser?.usefulCount ?? 0}</span>
              <span>下一阶 {userMeta.next}</span>
            </div>
            <div className={styles.profileActions}>
              <Button icon={<EditOutlined />} onClick={() => openProfileDialog('name')}>
                改昵称
              </Button>
              <Button icon={<LockOutlined />} onClick={() => openProfileDialog('password')}>
                改密码
              </Button>
              <Button icon={<UploadOutlined />} onClick={() => openProfileDialog('avatar')}>
                换头像
              </Button>
            </div>
          </section>

          <section className={`${styles.orderPanel} ${styles.profileMenuPanel}`}>
            <div className={styles.profileMenuHeading}>
              <div>
                <span>个人中心</span>
                <h3>我的服务</h3>
              </div>
              <p>选择要查看的内容</p>
            </div>
            <div className={styles.profileMenuGrid}>
              {profileMenuItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={styles.profileMenuItem}
                  onClick={() => setProfileView(item.key)}
                >
                  <span className={styles.profileMenuIcon}>{item.icon}</span>
                  <span className={styles.profileMenuCopy}>
                    <strong>{profileSectionMeta[item.key].title}</strong>
                    <small>{profileSectionMeta[item.key].description}</small>
                  </span>
                  <span className={styles.profileMenuMeta}>{item.summary}</span>
                  <RightOutlined className={styles.profileMenuArrow} />
                </button>
              ))}
            </div>
          </section>
        </main>
      );
    }

    return (
      <main className={styles.profileDetailPage}>
        <div className={styles.profileDetailToolbar}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => setProfileView('menu')}>
            返回“我的”
          </Button>
          <span>{profileSectionMeta[profileView].description}</span>
        </div>

        {profileView === 'orders' && (
          <section className={styles.orderPanel}>
            <h3>我的订单</h3>
            {ordersLoading ? <Spin /> : userOrders.map((order) => (
              <div className={styles.orderItem} key={order.id}>
                <div>
                  <strong>{order.productTitle}</strong>
                  <p>
                    {order.orderNo} · x{order.quantity} · {order.returnDays} 天退换
                  </p>
                  {(order.status === 'shipped' || order.status === 'completed') && order.carrier && order.trackingNo && (
                    <p className={styles.orderLogisticsSummary}>
                      物流：{order.carrier} · {order.trackingNo}
                    </p>
                  )}
                </div>
                <div>
                  <Tag color={orderStatusMeta[order.status].color}>{orderStatusMeta[order.status].label}</Tag>
                  <span>{formatPrice(order.amount)}</span>
                  <div className={styles.orderActions}>
                    {order.status !== 'unpaid' && order.status !== 'canceled' && (
                      <Button size="small" onClick={() => setSelectedLogisticsOrder(order)}>
                        查看物流
                      </Button>
                    )}
                    {orderStatusMeta[order.status].actionLabel && (
                      <Button size="small" type="primary" loading={orderMutatingId === order.id} onClick={() => handleAdvanceOrder(order.id)}>
                        {orderStatusMeta[order.status].actionLabel}
                      </Button>
                    )}
                    {order.status === 'completed' && (
                      <Button size="small" onClick={() => openReviewModal(order)}>
                        {order.review ? '查看评价' : '去评价'}
                      </Button>
                    )}
                    {canCancelOrder(order) && (
                      <Button size="small" onClick={() => handleCancelOrder(order.id)}>
                        取消订单
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {!ordersLoading && userOrders.length === 0 && <p className={styles.empty}>还没有订单。</p>}
          </section>
        )}

        {profileView === 'trials' && (
          <section className={styles.orderPanel}>
            <h3>我的试用</h3>
            {trials.map((trial) => {
              const deadlineMeta = getTrialDeadlineMeta(trial, '2026-07-05');
              const trialProduct = products.find((product) => product.id === trial.productId);

              return (
                <div
                  className={`${styles.trialItem} ${deadlineMeta.tone === 'danger' ? styles.trialDanger : ''}`}
                  key={trial.id}
                >
                  <div>
                    <strong>{trial.productTitle}</strong>
                    <p>
                      领取：{trial.claimedAt} · 截止：{trial.deadline}
                    </p>
                  </div>
                  <div>
                    <Tag color={deadlineMeta.tone === 'danger' ? 'error' : deadlineMeta.tone}>{deadlineMeta.label}</Tag>
                    {trial.status === 'shipped' && (
                      <Button size="small" type="primary" onClick={() => void handleConfirmTrialReceived(trial)}>
                        确认收货
                      </Button>
                    )}
                    {trial.status === 'pending_report' && trialProduct && (
                      <Button size="small" type="primary" onClick={() => openReportModal(trialProduct)}>
                        自愿发布甄客验
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {trials.length === 0 && <p className={styles.empty}>还没有领取过试用。</p>}
          </section>
        )}

        {profileView === 'reports' && (
          <section className={styles.orderPanel}>
            <h3>我的甄客验</h3>
            {profileReports.map((report) => (
              <div className={styles.orderItem} key={report.id}>
                <div>
                  <strong>{report.productTitle}</strong>
                  <p>{report.shortcoming}</p>
                </div>
                <Tag>{report.usefulCount} 有用</Tag>
              </div>
            ))}
            {profileReports.length === 0 && <p className={styles.empty}>还没有发布过甄客验。</p>}
          </section>
        )}

        {profileView === 'earnings' && (
          <section className={styles.orderPanel}>
            <h3>我的收益</h3>
            <div className={styles.profileSummaryGrid}>
              <div className={styles.profileSummaryItem}>
                <span>累计收益</span>
                <strong>{formatPrice(earningsSummary.total)}</strong>
              </div>
              <div className={styles.profileSummaryItem}>
                <span>待结算</span>
                <strong>{formatPrice(earningsSummary.pending)}</strong>
              </div>
              <div className={styles.profileSummaryItem}>
                <span>已结算</span>
                <strong>{formatPrice(earningsSummary.settled)}</strong>
              </div>
            </div>
            {earnings.map((earning) => (
              <div className={styles.earningItem} key={earning.id}>
                <div>
                  <strong>{earning.reportTitle}</strong>
                  <p>{earning.orderNo} · 订单 {formatPrice(earning.orderAmount)}</p>
                  <p className={styles.earningBreakdown}>
                    <span>佣金返点 {formatPrice(earning.commissionAmount)}</span>
                    <span className={styles.publicWelfare}>公益捐赠 {formatPrice(earning.publicWelfareAmount)}</span>
                  </p>
                </div>
                <div>
                  <Tag color={earning.status === 'settled' ? 'success' : 'processing'}>
                    {earning.status === 'settled' ? '已结算' : '待结算'}
                  </Tag>
                  <strong>{formatPrice(earning.commissionAmount)}</strong>
                </div>
              </div>
            ))}
            {earnings.length === 0 && <p className={styles.empty}>还没有产生甄客验收益。</p>}
          </section>
        )}

        {profileView === 'messages' && (
          <section className={styles.orderPanel}>
            <h3>消息</h3>
            <div className={styles.noticeList}>
              {notifications.map((item) => (
                <div className={`${styles.noticeItem} ${!item.isRead ? styles.unreadNotice : ''}`} key={item.id}>
                  <MessageOutlined />
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.content}</p>
                    <span>{item.createdAt}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>
    );
  };

  if (authLoading) {
    return (
      <ConfigProvider theme={commerceTheme}>
        <main className={styles.authShell}>
          <Spin size="large" />
        </main>
      </ConfigProvider>
    );
  }

  if (!activeUser) {
    return (
      <ConfigProvider theme={commerceTheme}>
        <div className={`${styles.appShell} ${styles.authPage}`}>
          {renderAuth()}
          {renderMerchantModal()}
        </div>
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider theme={commerceTheme}>
      <div className={styles.appShell}>
        <header className={styles.masthead}>
          <button
            type="button"
            className={styles.brandLockup}
            onClick={() => {
              setActiveTab('reviews');
              setJourneyView('feed');
            }}
          >
              <span>㤫</span>
              <div>
                <strong>㤫者商城</strong>
                <em>真正的消费指南，信任就从一次次验证里长出来。</em>
              </div>
            </button>
            <div className={styles.headerActions}>
              <Button icon={<ShoppingCartOutlined />} onClick={() => setCartOpen(true)}>
                购物车 {cartCount}
              </Button>
              <Button className={styles.addressButton} icon={<EnvironmentOutlined />} onClick={openAddressDialog}>
                收货地址
              </Button>
              <div className={styles.accountMenu}>
                <button type="button" className={styles.accountButton} onClick={() => setActiveTab('profile')}>
                  {renderUserAvatar(activeUser, styles.accountAvatar)}
                  <span className={styles.accountText}>
                    <span className={styles.accountName}>{activeUser.name}</span>
                    <span className={styles.accountRole}>{userMeta.label}</span>
                  </span>
                </button>
                <div className={styles.accountDropdown}>
                  <button type="button" className={styles.logoutButton} onClick={handleLogout}>
                    退出登录
                  </button>
                </div>
              </div>
            </div>
        </header>

        <nav className={styles.navBar} aria-label="主导航">
          <div className={styles.topNav}>
            {tabItems.map((item) => (
              <button
                key={item.key}
                type="button"
                className={activeTab === item.key ? styles.activeTab : ''}
                onClick={() => {
                  setActiveTab(item.key);
                  if (item.key === 'reviews') setJourneyView('feed');
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {activeTab === 'reviews' && journeyView === 'feed' && renderReviews()}
        {activeTab === 'reviews' && journeyView === 'product' && renderProductJourney()}
        {activeTab === 'reviews' && journeyView === 'report' && renderReportDetail()}
        {activeTab === 'reviews' && journeyView === 'purchase' && renderPurchasePage()}
        {activeTab === 'profile' && renderProfile()}
      </div>

      <Badge count={cartCount} size="small" className={styles.fixedCartBadge}>
        <Button
          aria-label="打开购物车"
          className={styles.fixedCartButton}
          type="primary"
          shape="circle"
          icon={<ShoppingCartOutlined />}
          onClick={() => setCartOpen(true)}
        />
      </Badge>

      <Drawer
        title={selectedProduct?.title}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        size={460}
        className={styles.detailDrawer}
      >
        {selectedProduct && (
          <div>
            <div className={styles.drawerImage} style={{ backgroundImage: selectedProduct.cover }} />
            <h3>信任区</h3>
            {selectedReports.map((report) => (
              <ReportCard key={report.id} report={report} onUseful={handleUseful} compact />
            ))}
            <h3>商品详情</h3>
            <p className={styles.productDetail}>{selectedProduct.detail}</p>
          </div>
        )}
      </Drawer>

      <Modal
        title="物流详情"
        open={Boolean(selectedLogisticsOrder)}
        onCancel={() => setSelectedLogisticsOrder(null)}
        footer={null}
        width={560}
      >
        {selectedLogisticsOrder && selectedLogisticsView && (
          <div className={styles.logisticsOverview}>
            <div>
              <strong>{selectedLogisticsOrder.productTitle}</strong>
              <span>订单号：{selectedLogisticsOrder.orderNo}</span>
            </div>
            <Tag color={selectedLogisticsView.kind === 'none' ? 'default' : 'processing'}>
              {selectedLogisticsView.title}
            </Tag>
            {selectedLogisticsView.logistics && (
              <>
                <div className={styles.logisticsMeta}>
                  <span>快递公司：{selectedLogisticsView.logistics.carrier}</span>
                  <span>运单号：{selectedLogisticsView.logistics.trackingNo}</span>
                </div>
                <div className={styles.logisticsTimeline}>
                  {selectedLogisticsView.logistics.events.length === 0 && (
                    <span>承运信息已登记，暂未收到物流轨迹。</span>
                  )}
                  {selectedLogisticsView.logistics.events.map((event) => (
                    <div className={styles.logisticsEvent} key={`${event.time}-${event.description}`}>
                      <i />
                      <div>
                        <strong>{event.description}</strong>
                        {event.location && <span>{event.location}</span>}
                        <span>{event.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      <Modal
        title="申请线上试用"
        open={Boolean(applyingRecruitment)}
        onCancel={() => setApplyingRecruitment(null)}
        footer={null}
        destroyOnHidden
      >
        <Form form={trialApplyForm} layout="vertical" onFinish={submitTrialApplication}>
          <p>{applyingRecruitment?.campaignTitle}</p>
          <Form.Item name="applyReason" label="申请理由" rules={[{ required: true, message: '请填写申请理由' }, { max: 1000 }]}>
            <Input.TextArea rows={5} showCount maxLength={1000} placeholder="请说明你的使用场景，以及愿意如何客观体验产品" />
          </Form.Item>
          {defaultShippingAddress && <p className={styles.hint}>寄送至：{formatShippingAddress(defaultShippingAddress)}</p>}
          <Button block type="primary" htmlType="submit" loading={trialApplying}>提交申请</Button>
        </Form>
      </Modal>

      <Modal title="写验证报告" open={reportOpen} onCancel={() => setReportOpen(false)} footer={null}>
        <Form layout="vertical" form={form} onFinish={handlePublish}>
          <Form.Item name="productId" label="选择可发布商品" rules={[{ required: true, message: '请选择可发布商品' }]}>
            <Select
              size="large"
              placeholder="选择已购买或已领取试用的商品"
              options={reviewableProducts.map((product) => ({
                label: product.title,
                value: product.id,
              }))}
            />
          </Form.Item>
          {reviewableProducts.length === 0 && <p className={styles.hint}>暂无可发布甄客验的商品：线上试用确认收货后才可发布。</p>}
          <Form.Item label="实拍图（必填，至少1张）" required>
            <Upload
              listType="picture-card"
              maxCount={9}
              customRequest={async (options) => {
                try {
                  const url = await uploadShopContentFile(options.file as File);
                  setReportImageUrls((current) => current.includes(url) ? current : [...current, url]);
                  options.onSuccess?.({ url });
                } catch (error) {
                  options.onError?.(error as Error);
                  message.error(error instanceof Error ? error.message : '图片上传失败');
                }
              }}
              onRemove={(file) => {
                setReportImageUrls((current) => current.filter((url) => url !== file.url));
              }}
              fileList={reportImageUrls.map((url: string, index: number) => ({
                uid: String(index),
                name: `图片${index + 1}`,
                status: 'done',
                url,
              }))}
            >
              <div>
                <PlusOutlined />
                <div style={{ marginTop: 8 }}>上传图片</div>
              </div>
            </Upload>
          </Form.Item>
          <Form.Item label="短视频（可选，开箱/使用）">
            <Upload
              accept="video/*"
              maxCount={1}
              customRequest={async (options) => {
                try {
                  const url = await uploadShopContentFile(options.file as File);
                  setReportVideoUrl(url);
                  options.onSuccess?.({ url });
                } catch (error) {
                  options.onError?.(error as Error);
                  message.error(error instanceof Error ? error.message : '视频上传失败');
                }
              }}
              onRemove={() => { setReportVideoUrl(undefined); }}
              fileList={reportVideoUrl ? [{ uid: '1', name: '视频', status: 'done', url: reportVideoUrl }] : []}
            >
              <Button icon={<UploadOutlined />}>上传视频</Button>
            </Upload>
          </Form.Item>
          <Form.Item name="experience" label="真实体验（必填，至少20字）" rules={[{ required: true, message: '请写下真实体验' }]}>
            <Input.TextArea rows={4} placeholder="用了以后真实感觉如何？请详细描述使用体验..." />
          </Form.Item>
          <Form.Item name="shortcoming" label="不足/缺点（必填）" rules={[{ required: true, message: '不足必须填写' }]}>
            <Input placeholder="请客观描述产品的缺点，不可填写无、暂无、没有、都挺好等无效内容" />
          </Form.Item>
          <Form.Item name="fitCrowd" label="适合人群">
            <Input placeholder="例如：深烘爱好者、送礼、通勤使用" />
          </Form.Item>
          <Form.Item name="recommend" valuePropName="checked" label="是否推荐">
            <Switch checkedChildren="推荐" unCheckedChildren="不推荐" defaultChecked />
          </Form.Item>
          <Button block type="primary" htmlType="submit" size="large" disabled={reviewableProducts.length === 0}>
            发布
          </Button>
        </Form>
      </Modal>
      <Modal
        title="确认订单"
        open={Boolean(pendingBuyProduct)}
        onCancel={() => {
          setPendingBuyProduct(null);
          setPendingBuyAttribution(undefined);
        }}
        footer={null}
        width={560}
        zIndex={orderConfirmModalZIndex}
      >
        {pendingBuyProduct && (
          <div className={styles.buyConfirm}>
            <section className={styles.buyConfirmSection}>
              <div className={styles.buyConfirmHeader}>
                <strong>商品信息</strong>
                <span>数量 x1</span>
              </div>
              <div className={styles.buyProductRow}>
                <div className={styles.buyProductImage} style={{ backgroundImage: pendingBuyProduct.cover }} />
                <div>
                  <h3>{pendingBuyProduct.title}</h3>
                  <p>{pendingBuyProduct.artisanName}</p>
                  <strong>{formatPrice(pendingBuyProduct.price)}</strong>
                </div>
              </div>
            </section>

            <section className={styles.buyConfirmSection}>
              <div className={styles.buyConfirmHeader}>
                <strong>收货地址</strong>
                <Button
                  size="small"
                  icon={<EnvironmentOutlined />}
                  onClick={() => {
                    setAddressPickerOpen(true);
                  }}
                >
                  更换其他地址
                </Button>
              </div>
              {isShippingAddressReady && defaultShippingAddress ? (
                <p className={styles.buyAddress}>{formatShippingAddress(defaultShippingAddress)}</p>
              ) : (
                <p className={styles.buyAddressWarning}>请先补全收货人、手机号、省市区和详细地址。</p>
              )}
            </section>

            <div className={styles.buyConfirmFooter}>
              <div>
                <span>应付金额</span>
                <strong>{formatPrice(pendingBuyProduct.price)}</strong>
              </div>
              <Button type="primary" size="large" disabled={!isShippingAddressReady} loading={orderSubmitting} onClick={handleConfirmBuyNow}>
                确认下单
              </Button>
            </div>
          </div>
        )}
      </Modal>
      <Modal
        title="订单支付"
        open={Boolean(payOrder)}
        onCancel={() => {
          if (!paying) setPayOrder(null);
        }}
        footer={null}
        width={480}
      >
        {payOrder && (
          <div className={styles.payModal}>
            <div className={styles.payAmount}>
              <span>应付金额</span>
              <strong>{formatPrice(payOrder.amount)}</strong>
            </div>
            <div className={styles.payOrderInfo}>
              <span>订单号：{payOrder.orderNo}</span>
              <span>{payOrder.productTitle}</span>
            </div>
            <div className={styles.payMethods}>
              <p className={styles.payMethodsTitle}>当前支付方式</p>
              <div className={`${styles.payMethodItem} ${styles.selectedPayMethod}`}>
                <div className={styles.payMethodLeft}>
                  <div className={`${styles.payIcon} ${styles.wechatIcon}`}>
                    <span>模</span>
                  </div>
                  <div>
                    <strong>模拟支付</strong>
                    <p>仅用于当前订单履约联调，不会发起真实扣款</p>
                  </div>
                </div>
                <Tag color="processing">联调模式</Tag>
              </div>
            </div>
            <Button
              type="primary"
              size="large"
              block
              loading={paying}
              onClick={handlePay}
              className={styles.payButton}
            >
              {paying ? '支付处理中...' : `确认支付 ${formatPrice(payOrder.amount)}`}
            </Button>
            <p className={styles.payHint}>
              提示：微信商户申请完成后，此处将切换为真实微信支付。
            </p>
          </div>
        )}
      </Modal>
      <Modal
        title={reviewOrder?.review ? '查看评价' : '订单评价'}
        open={Boolean(reviewOrder)}
        onCancel={() => setReviewOrder(null)}
        footer={null}
        width={560}
      >
        {reviewOrder && (
          <div className={styles.reviewModal}>
            <div className={styles.reviewOrderInfo}>
              <strong>{reviewOrder.productTitle}</strong>
              <Tag color="success">交易成功</Tag>
            </div>

            {reviewOrder.review ? (
              <div className={styles.reviewDetail}>
                <div className={styles.reviewStarsRow}>
                  <div className={styles.reviewStarItem}>
                    <span>物品质量</span>
                    <div className={styles.starsDisplay}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <StarFilled
                          key={star}
                          className={star <= reviewOrder.review!.productQuality ? styles.starActive : styles.starInactive}
                        />
                      ))}
                    </div>
                  </div>
                  <div className={styles.reviewStarItem}>
                    <span>物流服务</span>
                    <div className={styles.starsDisplay}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <StarFilled
                          key={star}
                          className={star <= reviewOrder.review!.logisticsService ? styles.starActive : styles.starInactive}
                        />
                      ))}
                    </div>
                  </div>
                  <div className={styles.reviewStarItem}>
                    <span>服务态度</span>
                    <div className={styles.starsDisplay}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <StarFilled
                          key={star}
                          className={star <= reviewOrder.review!.serviceAttitude ? styles.starActive : styles.starInactive}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                {reviewOrder.review.content && (
                  <div className={styles.reviewContent}>
                    <p>{reviewOrder.review.content}</p>
                  </div>
                )}
                {reviewOrder.review.images.length > 0 && (
                  <div className={styles.reviewImages}>
                    {reviewOrder.review.images.map((img, idx) => (
                      <div key={idx} className={styles.reviewImageItem}>
                        <img src={img} alt={`评价图片${idx + 1}`} />
                      </div>
                    ))}
                  </div>
                )}
                <p className={styles.reviewTime}>发布于 {reviewOrder.review.createdAt}</p>
              </div>
            ) : (
              <>
                <div className={styles.reviewStarsRow}>
                  <div className={styles.reviewStarItem}>
                    <span>物品质量</span>
                    <div className={styles.starsInteractive}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <StarFilled
                          key={star}
                          className={star <= reviewStars.productQuality ? styles.starActive : styles.starInactive}
                          onClick={() => setReviewStars((prev) => ({ ...prev, productQuality: star }))}
                        />
                      ))}
                    </div>
                  </div>
                  <div className={styles.reviewStarItem}>
                    <span>物流服务</span>
                    <div className={styles.starsInteractive}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <StarFilled
                          key={star}
                          className={star <= reviewStars.logisticsService ? styles.starActive : styles.starInactive}
                          onClick={() => setReviewStars((prev) => ({ ...prev, logisticsService: star }))}
                        />
                      ))}
                    </div>
                  </div>
                  <div className={styles.reviewStarItem}>
                    <span>服务态度</span>
                    <div className={styles.starsInteractive}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <StarFilled
                          key={star}
                          className={star <= reviewStars.serviceAttitude ? styles.starActive : styles.starInactive}
                          onClick={() => setReviewStars((prev) => ({ ...prev, serviceAttitude: star }))}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className={styles.reviewTextarea}>
                  <Input.TextArea
                    rows={5}
                    placeholder="写下您的真实评价，帮助其他买家做出更好的选择~"
                    value={reviewContent}
                    onChange={(e) => setReviewContent(e.target.value)}
                    showCount
                    maxLength={500}
                  />
                </div>

                <div className={styles.reviewUpload}>
                  <div className={styles.reviewImages}>
                    {reviewImages.map((img, idx) => (
                      <div key={idx} className={styles.reviewImageItem}>
                        <img src={img} alt={`评价图片${idx + 1}`} />
                        <button
                          type="button"
                          className={styles.removeImageBtn}
                          onClick={() => handleRemoveReviewImage(idx)}
                        >
                          <DeleteOutlined />
                        </button>
                      </div>
                    ))}
                    {reviewImages.length < 9 && (
                      <label className={styles.uploadImageBtn}>
                        <CameraOutlined />
                        <span>上传图片</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => {
                            const files = e.target.files;
                            if (files) {
                              Array.from(files).forEach((file) => handleReviewImageUpload(file));
                            }
                            e.target.value = '';
                          }}
                          hidden
                        />
                      </label>
                    )}
                  </div>
                  <p className={styles.uploadHint}>{reviewImages.length}/9 张</p>
                </div>

                <div className={styles.reviewActions}>
                  <Button onClick={() => setReviewOrder(null)}>
                    取消
                  </Button>
                  <Button type="primary" size="large" onClick={handleSubmitReview}>
                    发布评价
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
      <Modal title="改昵称" open={profileDialog === 'name'} onCancel={() => setProfileDialog(null)} footer={null}>
        <Form layout="vertical" form={nameForm} onFinish={handleNameSubmit}>
          <Form.Item name="name" label="昵称" rules={[{ required: true, message: '请输入昵称' }]}>
            <Input size="large" placeholder="输入新的昵称" />
          </Form.Item>
          <Button block type="primary" htmlType="submit" size="large">
            保存昵称
          </Button>
        </Form>
      </Modal>
      <Modal title="改密码" open={profileDialog === 'password'} onCancel={() => setProfileDialog(null)} footer={null}>
        <Form layout="vertical" form={passwordForm} onFinish={handlePasswordSubmit}>
          <Form.Item name="oldPassword" label="旧密码" rules={[{ required: true, message: '请输入旧密码' }]}>
            <Input.Password size="large" placeholder="当前密码" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              {
                validator: (_, value) => {
                  if (!value || (/[A-Za-z]/.test(value) && /\d/.test(value))) return Promise.resolve();
                  return Promise.reject(new Error('新密码必须同时包含字母和数字'));
                },
              },
            ]}
          >
            <Input.Password size="large" placeholder="字母 + 数字" />
          </Form.Item>
          <Button block type="primary" htmlType="submit" size="large">
            保存密码
          </Button>
        </Form>
      </Modal>
      <Modal title="换头像" open={profileDialog === 'avatar'} onCancel={() => setProfileDialog(null)} footer={null}>
        {activeUser && (
          <div className={styles.avatarPicker}>
            <div className={styles.avatarPreview}>{renderUserAvatar(activeUser, styles.profileAvatar)}</div>
            <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarFileChange} />
            <Button
              block
              type="primary"
              icon={<UploadOutlined />}
              size="large"
              loading={avatarUploading}
              onClick={() => avatarInputRef.current?.click()}
            >
              选择图片
            </Button>
            <p>图片会保存到项目根目录的 img 文件夹，用于本地演示。</p>
          </div>
        )}
      </Modal>
      <Modal
        title="选择收货地址"
        open={addressPickerOpen}
        onCancel={() => setAddressPickerOpen(false)}
        footer={null}
        width={520}
        zIndex={pendingBuyProduct ? addressModalOverOrderZIndex + 100 : undefined}
      >
        <Spin spinning={addressesLoading}>
        <div className={styles.addressPickerList}>
          {shippingAddresses.length === 0 ? (
            <p className={styles.empty}>暂无保存的地址</p>
          ) : (
            shippingAddresses.map((address) => (
              <div
                key={address.id}
                className={`${styles.addressPickerItem} ${address.isDefault ? styles.selectedAddress : ''}`}
                onClick={() => void handleSelectAddress(address.id)}
              >
                <div className={styles.addressPickerContent}>
                  <div className={styles.addressPickerTop}>
                    <strong>{address.recipient}</strong>
                    <em>{address.phone}</em>
                    {address.isDefault && <Tag color="success">默认地址</Tag>}
                  </div>
                  <p>{formatShippingAddress(address)}</p>
                </div>
                <CheckCircleFilled className={styles.addressPickerCheck} />
              </div>
            ))
          )}
        </div>
        </Spin>
      </Modal>
      <Modal
        title="我的地址"
        open={addressOpen}
        onCancel={() => setAddressOpen(false)}
        footer={null}
        width={620}
        zIndex={pendingBuyProduct ? addressModalOverOrderZIndex : undefined}
      >
        <div className={styles.addressManager}>
          <div className={styles.addressManagerHeader}>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleStartNewAddress} disabled={addressesLoading}>
              新增地址
            </Button>
          </div>
          <Spin spinning={addressesLoading}>
          <div className={styles.addressList}>
            {shippingAddresses.length === 0 ? (
              <p className={styles.empty}>暂无保存的地址</p>
            ) : (
              shippingAddresses.map((address) => (
                <div className={styles.addressItem} key={address.id}>
                  <Radio
                    checked={address.isDefault}
                    disabled={addressMutatingId !== null}
                    onChange={() => void handleSetDefaultAddress(address.id)}
                  >
                    设为默认
                  </Radio>
                  <div className={styles.addressContent}>
                    <span>
                      <strong>{address.recipient}</strong>
                      <em>{address.phone}</em>
                      {address.isDefault && <Tag color="success">默认地址</Tag>}
                    </span>
                    <p>{formatShippingAddress(address)}</p>
                  </div>
                  <Button size="small" disabled={addressMutatingId !== null} onClick={() => handleEditAddress(address)}>
                    编辑
                  </Button>
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    loading={addressMutatingId === address.id}
                    disabled={addressMutatingId !== null && addressMutatingId !== address.id}
                    onClick={() => handleDeleteAddress(address)}
                  >
                    删除
                  </Button>
                </div>
              ))
            )}
          </div>
          </Spin>
        </div>
      </Modal>
      <Modal
        title={editingAddressId ? '编辑地址' : '新增地址'}
        open={addressEditorOpen}
        onCancel={() => {
          setEditingAddressId(null);
          setAddressEditorOpen(false);
          addressForm.setFieldsValue(emptyAddressFormValues);
        }}
        footer={null}
        width={520}
        zIndex={addressOpen ? addressModalOverOrderZIndex + 100 : undefined}
      >
        <Form layout="vertical" form={addressForm} initialValues={emptyAddressFormValues} onFinish={handleAddressSubmit}>
          <Form.Item name="recipient" label="收货人" rules={[{ required: true, message: '请输入收货人' }]}>
            <Input size="large" placeholder="收货人姓名" />
          </Form.Item>
          <Form.Item
            name="phone"
            label="手机号"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1\d{10}$/, message: '请输入 11 位手机号' },
            ]}
          >
            <Input size="large" placeholder="11 位手机号" />
          </Form.Item>
          <Form.Item name="region" label="所在地区" rules={[{ required: true, message: '请选择省市区' }]}>
            <Cascader
              size="large"
              options={regionOptions}
              placeholder="请选择省 / 市 / 区"
              showSearch
            />
          </Form.Item>
          <Form.Item name="detail" label="详细地址" rules={[{ required: true, message: '请输入详细地址' }]}>
            <Input.TextArea rows={3} placeholder="街道、门牌号" />
          </Form.Item>
          <Button block type="primary" htmlType="submit" size="large" loading={addressSubmitting}>
            {editingAddressId ? '保存地址' : '添加地址'}
          </Button>
        </Form>
      </Modal>
      <Modal
        title={imageProduct?.title}
        open={Boolean(imageProduct)}
        onCancel={() => setImageProduct(null)}
        footer={null}
        width={760}
        className={styles.imagePreviewModal}
      >
        {imageProduct && (
          <div className={styles.imagePreviewBody}>
            <img className={styles.imagePreviewImage} src={imageProduct.imageUrl} alt={imageProduct.title} />
            <p>{imageProduct.detail}</p>
          </div>
        )}
      </Modal>
      {renderCartDrawer()}
    </ConfigProvider>
  );
}

function ReportCard({
  report,
  onUseful,
  onOpenProduct,
  compact,
  gridMode,
}: {
  report: VerifyReport;
  onUseful: (id: number) => void;
  onOpenProduct?: (report: VerifyReport) => void;
  compact?: boolean;
  gridMode?: boolean;
}) {
  if (gridMode) {
    const aspectRatios = ['75%', '100%', '125%', '140%', '60%'];
    const imageHeightRatio = aspectRatios[report.id % aspectRatios.length];
    return (
      <article className={styles.reportGridCard} onClick={() => onOpenProduct?.(report)}>
        <div className={styles.reportGridImage} style={{ paddingTop: imageHeightRatio }}>
          <img src={report.images[0]} alt={`${report.productTitle}实拍`} />
        </div>
        <div className={styles.reportGridContent}>
          <p className={styles.reportGridTitle}>{report.productTitle}</p>
          <p className={styles.reportGridDesc}>{report.experience}</p>
          <div className={styles.reportGridShortcoming}>不足：{report.shortcoming}</div>
          <div className={styles.reportGridFooter}>
            <div className={styles.reportGridUser}>
              <span className={`${roleClass(report.userRole)} ${styles.gridRoleTag}`}>
                {roleMeta[report.userRole].label}
              </span>
              <span className={styles.reportGridName}>{report.userName}</span>
            </div>
            <Button
              size="small"
              type="text"
              icon={<HeartOutlined />}
              className={`${styles.usefulButton} ${report.usefulByMe ? styles.usefulActive : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onUseful(report.id);
              }}
            >
              {report.usefulCount}
            </Button>
          </div>
        </div>
      </article>
    );
  }
  return (
    <article className={`${styles.reportCard} ${compact ? styles.compactReport : ''}`}>
      {!compact && report.images[0] && (
        <button className={styles.reportImageButton} type="button" onClick={() => onOpenProduct?.(report)}>
          <img src={report.images[0]} alt={`${report.productTitle}实拍`} />
        </button>
      )}
      <div className={styles.reportMeta}>
        <span className={roleClass(report.userRole)}>{roleMeta[report.userRole].label}</span>
        <strong>{report.userName}</strong>
        <em>{report.createdAt}</em>
      </div>
      {!compact && (
        <h3>
          {onOpenProduct ? (
            <button className={styles.reportProductLink} type="button" onClick={() => onOpenProduct(report)}>
              {report.productTitle}
            </button>
          ) : (
            report.productTitle
          )}
        </h3>
      )}
      <p>{report.experience}</p>
      <div className={styles.shortcoming}>不足：{report.shortcoming}</div>
      <div className={styles.reportFooter}>
        <span>适合：{report.fitCrowd}</span>
        <Button
          size="small"
          icon={<HeartOutlined />}
          type={report.usefulByMe ? 'primary' : 'default'}
          onClick={(e) => {
            e.stopPropagation();
            onUseful(report.id);
          }}
        >
          {report.usefulCount} 有用
        </Button>
      </div>
    </article>
  );
}
