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
  logisticsRecords,
  notifications,
  orders as seedOrders,
  productEvidence,
  products,
  reports as seedReports,
  trialRecords as seedTrialRecords,
  trialRecruitments as seedTrialRecruitments,
} from '@/mocks/commerce';
import type { EarningRecord, Merchant, Order, Product, ReportAttribution, TrialRecord, TrialRecruitment, VerifyReport } from '@/types';
import type { AuthUser } from '@/utils/authRules';
import {
  changeShopPassword,
  fetchShopCaptcha,
  loginShopUser,
  logoutShopUser,
  registerShopUser,
  restoreShopSession,
  updateShopProfile,
  type CaptchaState,
} from '@/services/shopAuth';
import { uploadAvatarFile } from '@/utils/avatarUpload';
import { addProductToCart, changeCartItemQuantity, getCartCount, getCartTotal, removeCartItem, type CartItem } from '@/utils/cart';
import {
  advanceOrderStatus,
  cancelOrder,
  canCancelOrder,
  createOrdersFromCart,
  getReviewableProductsFromOrders,
  orderStatusMeta,
} from '@/utils/orders';
import { findProductForReport, getCatalogProducts, type ProductCategoryFilter, type ProductSortKey } from '@/utils/productCatalog';
import { applyForRecruitment, getProductJourneyState } from '@/utils/productJourney';
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
  images: string[];
  video?: string;
  experience: string;
  shortcoming: string;
  fitCrowd: string;
  recommend: boolean;
};
type MerchantFormValues = {
  companyName: string;
  companyAddress: string;
  businessLicense: string[];
  productIntro: string;
  originTraceability: string;
  acceptsVerificationRecruitment: boolean;
  acceptsPublicWelfare: boolean;
  agreeProtocol: boolean;
};
type AddressFormValues = { recipient: string; phone: string; region: string[]; detail: string };
type ShippingAddress = AddressFormValues & { id: number; isDefault: boolean };
type RegionNode = { code: string; name: string; children?: RegionNode[] };
type RegionOption = { value: string; label: string; children?: RegionOption[] };

const orderConfirmModalZIndex = 1000;
const addressModalOverOrderZIndex = 1300;
const emptyAddressFormValues: AddressFormValues = { recipient: '', phone: '', region: [], detail: '' };
const seedShippingAddresses: ShippingAddress[] = [
  {
    id: 1,
    recipient: '小白',
    phone: '13800000000',
    region: ['61', '6101', '610113'],
    detail: '验证路 18 号',
    isDefault: true,
  },
  {
    id: 2,
    recipient: '小白妈妈',
    phone: '13900000000',
    region: ['61', '6101', '610112'],
    detail: '未央路 66 号',
    isDefault: false,
  },
];

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

export default function HomePage() {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [captcha, setCaptcha] = useState<CaptchaState>({ enabled: false, image: '', uuid: '' });
  const [activeTab, setActiveTab] = useState<TabKey>('reviews');
  const [profileView, setProfileView] = useState<ProfileView>('menu');
  const [category, setCategory] = useState<ProductCategoryFilter>('all');
  const [sortMode, setSortMode] = useState<ProductSortKey>('latestVerified');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(products[0]);
  const [imageProduct, setImageProduct] = useState<Product | null>(null);
  const [reports, setReports] = useState<VerifyReport[]>(seedReports);
  const [userOrders, setUserOrders] = useState<Order[]>(seedOrders);
  const [trials, setTrials] = useState<TrialRecord[]>(seedTrialRecords);
  const [earnings, setEarnings] = useState<EarningRecord[]>(earningRecords);
  const [recruitments, setRecruitments] = useState<TrialRecruitment[]>(seedTrialRecruitments);
  const [journeyView, setJourneyView] = useState<JourneyView>('feed');
  const [journeyReport, setJourneyReport] = useState<VerifyReport | null>(null);
  const [selectedLogisticsOrder, setSelectedLogisticsOrder] = useState<Order | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [addressEditorOpen, setAddressEditorOpen] = useState(false);
  const [addressPickerOpen, setAddressPickerOpen] = useState(false);
  const [shippingAddresses, setShippingAddresses] = useState<ShippingAddress[]>(seedShippingAddresses);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(seedShippingAddresses[0]?.id ?? null);
  const [pendingBuyProduct, setPendingBuyProduct] = useState<Product | null>(null);
  const [pendingBuyAttribution, setPendingBuyAttribution] = useState<ReportAttribution | undefined>(undefined);
  const [payOrder, setPayOrder] = useState<Order | null>(null);
  const [payMethod, setPayMethod] = useState<'wechat' | 'alipay'>('wechat');
  const [paying, setPaying] = useState(false);
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [reviewStars, setReviewStars] = useState({ productQuality: 5, logisticsService: 5, serviceAttitude: 5 });
  const [reviewContent, setReviewContent] = useState('');
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [profileDialog, setProfileDialog] = useState<ProfileDialog>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [merchantOpen, setMerchantOpen] = useState(false);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [businessLicenseImages, setBusinessLicenseImages] = useState<string[]>([]);
  const [agreeProtocol, setAgreeProtocol] = useState(false);
  const [form] = Form.useForm();
  const [authForm] = Form.useForm();
  const [nameForm] = Form.useForm();
  const [merchantForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [addressForm] = Form.useForm();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const reportImages = Form.useWatch('images', form) as string[] | undefined;
  const reportVideo = Form.useWatch('video', form) as string | undefined;

  const activeUser = currentUser;

  const loadCaptcha = async () => {
    try {
      setCaptcha(await fetchShopCaptcha());
    } catch (error) {
      message.error(error instanceof Error ? error.message : '验证码加载失败');
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
        if (mounted) setCaptcha(nextCaptcha);
      })
      .catch(() => undefined);
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
  const purchasedReviewableProducts = activeUser
    ? getReviewableProductsFromOrders(products, userOrders, reports, activeUser.id)
    : [];
  const trialReviewableProducts = products.filter((product) =>
    trials.some((trial) => trial.productId === product.id && trial.status === 'pending_report'),
  );
  const reviewableProducts = Array.from(
    new Map([...purchasedReviewableProducts, ...trialReviewableProducts].map((product) => [product.id, product])).values(),
  );
  const canReview = Boolean(
    activeUser &&
      selectedProduct &&
      reviewableProducts.some((product) => product.id === selectedProduct.id),
  );

  const catalogProducts = useMemo(() => getCatalogProducts(products, reports, category, sortMode), [category, reports, sortMode]);
  const cartCount = getCartCount(cartItems);
  const cartTotal = getCartTotal(cartItems);
  const earningsSummary = summarizeEarnings(earnings);
  const selectedLogisticsView = selectedLogisticsOrder
    ? getLogisticsView(
        selectedLogisticsOrder,
        logisticsRecords.find((item) => item.orderId === selectedLogisticsOrder.id),
      )
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

    if (product && reviewableProducts.some((item) => item.id === product.id)) {
      form.setFieldsValue({ productId: product.id });
    }

    setReportOpen(true);
  };

  const handlePublish = (values: ReportFormValues) => {
    if (!activeUser) return;
    const reportProduct = reviewableProducts.find((product) => product.id === values.productId);

    if (!reportProduct) {
      message.warning('请选择已完成购买或已领取试用的商品');
      return;
    }

    if (!values.images || values.images.length === 0) {
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

    const nextReport: VerifyReport = {
      id: Date.now(),
      productId: reportProduct.id,
      productTitle: reportProduct.title,
      userId: activeUser.id,
      userName: activeUser.name,
      userRole: activeUser.role,
      images: values.images,
      video: values.video,
      experience: values.experience,
      shortcoming: values.shortcoming,
      fitCrowd: values.fitCrowd || '真实使用后再判断',
      recommend: values.recommend,
      usefulCount: 0,
      usefulByMe: false,
      createdAt: '刚刚',
    };

    setSelectedProduct(reportProduct);
    setReports((prev) => [nextReport, ...prev]);
    setTrials((items) =>
      items.map((trial) =>
        trial.productId === reportProduct.id && trial.status === 'pending_report'
          ? { ...trial, status: 'completed', completedAt: '2026-07-05' }
          : trial,
      ),
    );
    setReportOpen(false);
    form.resetFields();
    message.success('甄客验已发布，已进入信任区');
  };

  const handleAddToCart = (product: Product, attribution?: ReportAttribution) => {
    setCartItems((items) => addProductToCart(items, product, attribution));
    message.success('已加入购物车');
  };

  const handleCheckout = () => {
    if (!activeUser || cartItems.length === 0) return;

    const createdOrders = createOrdersFromCart(cartItems, activeUser.role);
    setUserOrders((items) => [...createdOrders, ...items]);
    setCartItems([]);
    setCartOpen(false);
    setActiveTab('profile');
    setProfileView('orders');
    message.success('下单成功，请在我的订单中继续付款');
  };

  const handleBuyNow = (product: Product, attribution?: ReportAttribution) => {
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
        content: '确认收货后，款项将打款给商家。请确认您已收到商品。',
        okText: '确认收货',
        cancelText: '再想想',
        onOk: () => {
          handleConfirmReceive(order);
        },
      });
      return;
    }

    setUserOrders((items) => items.map((item) => (item.id === orderId ? advanceOrderStatus(item) : item)));
  };

  const handleConfirmReceive = (order: Order) => {
    setUserOrders((items) => items.map((item) => {
      if (item.id === order.id) {
        const newOrder = advanceOrderStatus(item);
        if (newOrder.status === 'completed' && item.fromReviewId && item.fromVerifierId) {
          const commissionAmount = Math.round(item.amount * 0.05 * 100) / 100;
          const publicWelfareAmount = Math.round(item.amount * 0.05 * 100) / 100;
          const report = reports.find((r) => r.id === item.fromReviewId);
          const earning: EarningRecord = {
            id: Date.now(),
            reportId: item.fromReviewId,
            reportTitle: report?.productTitle ?? '',
            orderNo: item.orderNo,
            orderAmount: item.amount,
            commissionRate: 0.05,
            commissionAmount,
            publicWelfareRate: 0.05,
            publicWelfareAmount,
            status: 'pending',
            createdAt: '刚刚',
          };
          setEarnings((prev) => [...prev, earning]);
        }
        return newOrder;
      }
      return item;
    }));
    message.success('确认收货成功，款项已打给商家');
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

  const handlePay = () => {
    if (!payOrder) return;

    setPaying(true);
    setTimeout(() => {
      setUserOrders((items) => items.map((item) => (item.id === payOrder.id ? advanceOrderStatus(item) : item)));
      setPaying(false);
      setPayOrder(null);
      message.success('支付成功，商家将尽快为您发货');
    }, 1500);
  };

  const handleConfirmBuyNow = () => {
    if (!activeUser || !pendingBuyProduct || !isShippingAddressReady) return;

    const [createdOrder] = createOrdersFromCart(
      [{ product: pendingBuyProduct, quantity: 1, attribution: pendingBuyAttribution }],
      activeUser.role,
    );
    setSelectedProduct(pendingBuyProduct);
    setUserOrders((items) => [createdOrder, ...items]);
    setCartOpen(false);
    setPendingBuyProduct(null);
    setPendingBuyAttribution(undefined);
    setActiveTab('profile');
    setProfileView('orders');
    message.success('下单成功，请在我的订单中继续付款');
  };

  const handleCancelOrder = (orderId: number) => {
    if (!activeUser) return;

    Modal.confirm({
      title: '确认取消订单？',
      content: `当前身份为${roleMeta[activeUser.role].label}，支持 ${roleMeta[activeUser.role].returnDays} 天退换。取消后订单会变为已取消。`,
      okText: '确认取消',
      cancelText: '再想想',
      onOk: () => {
        setUserOrders((items) => items.map((order) => (order.id === orderId ? cancelOrder(order) : order)));
        message.success('订单已取消');
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

    setEditingAddressId(defaultShippingAddress?.id ?? null);
    addressForm.setFieldsValue(defaultShippingAddress ?? emptyAddressFormValues);
    setAddressOpen(true);
  };

  const handleAddressSubmit = (values: AddressFormValues) => {
    const nextAddressId = editingAddressId ?? Date.now();
    const editingLabel = editingAddressId ? '收货地址已更新' : '收货地址已新增';

    setShippingAddresses((items) => {
      const existingAddress = items.find((address) => address.id === nextAddressId);
      const shouldBecomeDefault = items.length === 0 || existingAddress?.isDefault || !items.some((address) => address.isDefault);
      const nextItems = existingAddress
        ? items.map((address) =>
            address.id === nextAddressId ? { ...values, id: nextAddressId, isDefault: shouldBecomeDefault } : address,
          )
        : [...items, { ...values, id: nextAddressId, isDefault: shouldBecomeDefault }];

      if (nextItems.some((address) => address.isDefault)) return nextItems;
      return nextItems.map((address, index) => ({ ...address, isDefault: index === 0 }));
    });

    setEditingAddressId(null);
    addressForm.setFieldsValue(emptyAddressFormValues);
    setAddressEditorOpen(false);
    message.success(editingLabel);
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

  const handleSetDefaultAddress = (addressId: number) => {
    setShippingAddresses((items) => items.map((address) => ({ ...address, isDefault: address.id === addressId })));
  };

  const handleSelectAddress = (addressId: number) => {
    handleSetDefaultAddress(addressId);
    setAddressPickerOpen(false);
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

  const handleMerchantSubmit = (values: Omit<MerchantFormValues, 'businessLicense'>) => {
    if (!values.companyName) {
      message.warning('请输入公司名称');
      return;
    }
    if (!values.companyAddress) {
      message.warning('请输入公司地址');
      return;
    }
    if (businessLicenseImages.length === 0) {
      message.warning('请上传营业执照');
      return;
    }
    if (!values.productIntro) {
      message.warning('请输入产品介绍');
      return;
    }
    if (!values.originTraceability) {
      message.warning('请输入产地溯源信息');
      return;
    }
    if (!agreeProtocol) {
      message.warning('请勾选协议');
      return;
    }

    const newMerchant: Merchant = {
      id: Date.now(),
      userId: 0,
      companyName: values.companyName,
      companyAddress: values.companyAddress,
      businessLicense: businessLicenseImages[0],
      productIntro: values.productIntro,
      originTraceability: values.originTraceability,
      acceptsPublicWelfare: values.acceptsPublicWelfare ?? false,
      acceptsVerificationRecruitment: values.acceptsVerificationRecruitment ?? false,
      registeredAt: new Date().toISOString(),
    };

    setMerchants((prev) => [...prev, newMerchant]);
    setMerchantOpen(false);
    setBusinessLicenseImages([]);
    setAgreeProtocol(false);
    merchantForm.resetFields();
    message.success('入驻申请已提交！平台已完成存证，不做审核。自证材料将作为未来纠纷的法律证据。');
  };

  const handleOpenReportProduct = (report: VerifyReport) => {
    const product = findProductForReport(products, report);

    if (!product) {
      message.warning('没有找到对应商品');
      return;
    }

    setSelectedProduct(product);
    setJourneyReport(report);
    setJourneyView('report');
    setActiveTab('reviews');
  };

  const openProductJourney = (product: Product) => {
    setSelectedProduct(product);
    setJourneyReport(null);
    setJourneyView('product');
    setActiveTab('reviews');
  };

  const handleApplyForVerification = (recruitment: TrialRecruitment) => {
    if (!activeUser) return;
    const result = applyForRecruitment(recruitment, activeUser.id);

    if (!result.ok) {
      message.info(result.reason === 'already_applied' ? '你已经申请过该商品' : '本期验证名额已满');
      return;
    }

    const product = products.find((item) => item.id === recruitment.productId);
    setRecruitments((items) => items.map((item) => (item.id === recruitment.id ? result.recruitment : item)));

    if (product && !trials.some((trial) => trial.productId === product.id && trial.status === 'pending_report')) {
      setTrials((items) => [
        {
          id: Date.now(),
          productId: product.id,
          productTitle: product.title,
          status: 'pending_report',
          claimedAt: '2026-07-05',
          deadline: '2026-07-12',
        },
        ...items,
      ]);
    }

    message.success('申请成功，试用任务已加入“我的试用”');
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
            onClick={handleCheckout}
          >
            结算 {cartCount} 件
          </Button>
        </div>
      }
    >
      {cartItems.length === 0 ? (
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
                    onClick={() => setCartItems((items) => removeCartItem(items, item.product.id))}
                  />
                </div>
                <span>{formatPrice(item.product.price)}</span>
                <div className={styles.quantityRow}>
                  <Button
                    aria-label={`减少${item.product.title}`}
                    size="small"
                    icon={<MinusOutlined />}
                    onClick={() => setCartItems((items) => changeCartItemQuantity(items, item.product.id, item.quantity - 1))}
                  />
                  <b>{item.quantity}</b>
                  <Button
                    aria-label={`增加${item.product.title}`}
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => setCartItems((items) => changeCartItemQuantity(items, item.product.id, item.quantity + 1))}
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
          {authMode === 'login' && captcha.enabled && (
            <Form.Item name="code" label="验证码" rules={[{ required: true, message: '请输入验证码结果' }]}>
              <div className={styles.captchaRow}>
                <Input size="large" autoComplete="off" />
                <button type="button" className={styles.captchaButton} onClick={loadCaptcha} title="刷新验证码">
                  <img src={captcha.image} alt="验证码" />
                </button>
              </div>
            </Form.Item>
          )}
          <Button block type="primary" size="large" htmlType="submit" icon={<LoginOutlined />} loading={authSubmitting}>
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
          onClick={() => setMerchantOpen(true)}
          icon={<SafetyCertificateOutlined />}
          className={styles.merchantButton}
        >
          商家入驻
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
        setBusinessLicenseImages([]);
        setAgreeProtocol(false);
      }}
      footer={null}
      width={600}
      className={styles.merchantModal}
      bodyStyle={{ maxHeight: 'calc(100vh - 240px)', overflowY: 'auto' }}
    >
      <div className={styles.merchantIntro}>
        <p>提交公司资质、产品介绍、产地溯源等"自证材料"。</p>
        <p className={styles.merchantWarning}>
          <SafetyCertificateOutlined />
          平台只做存证、不做审核（"我们不是工商局，没资格审核"）。自证材料 = 未来纠纷的法律证据。
        </p>
      </div>
      <Form layout="vertical" form={merchantForm} onFinish={handleMerchantSubmit}>
        <Form.Item name="companyName" label="公司名称">
          <Input placeholder="请输入公司名称" />
        </Form.Item>
        <Form.Item name="companyAddress" label="公司地址">
          <Input placeholder="请输入公司地址" />
        </Form.Item>
        <Form.Item label="营业执照">
          <Upload
            listType="picture"
            beforeUpload={(file) => {
              if (!file.type.startsWith('image/')) {
                message.warning('请上传图片文件');
                return false;
              }
              const reader = new FileReader();
              reader.onload = () => {
                setBusinessLicenseImages((prev) => [...prev, String(reader.result)]);
              };
              reader.readAsDataURL(file);
              return false;
            }}
            fileList={businessLicenseImages.map((url, index) => ({
              uid: String(index),
              name: `营业执照${index + 1}`,
              status: 'done' as const,
              url,
            }))}
            onRemove={(file) => {
              setBusinessLicenseImages((prev) => prev.filter((_, index) => String(index) !== file.uid));
            }}
          >
            <Button icon={<UploadOutlined />}>上传营业执照</Button>
          </Upload>
        </Form.Item>
        <Form.Item name="productIntro" label="产品介绍">
          <Input.TextArea rows={4} placeholder="请介绍您的产品特点、优势等" />
        </Form.Item>
        <Form.Item name="originTraceability" label="产地溯源">
          <Input.TextArea rows={4} placeholder="请描述产品的产地来源、生产流程等溯源信息" />
        </Form.Item>
        <Form.Item name="acceptsVerificationRecruitment" label="入驻门槛" valuePropName="checked" initialValue={false}>
          <Switch checkedChildren="已阅读" unCheckedChildren="未阅读" />
          <span className={styles.switchLabel}>我承诺发起验证招募（不验证不上架）</span>
        </Form.Item>
        <Form.Item name="acceptsPublicWelfare" label="公益分成" valuePropName="checked" initialValue={false}>
          <Switch checkedChildren="已同意" unCheckedChildren="未同意" />
          <span className={styles.switchLabel}>我接受公益分成</span>
        </Form.Item>
        <Form.Item label="协议">
          <Switch
            checked={agreeProtocol}
            onChange={setAgreeProtocol}
            checkedChildren="已勾选"
            unCheckedChildren="未勾选"
          />
          <span className={styles.switchLabel}>
            我已阅读并同意《商家入驻协议》，承诺所提交的自证材料真实有效，自愿接受平台存证
          </span>
        </Form.Item>
        <Form.Item>
          <Button block type="primary" size="large" htmlType="submit">
            提交入驻（仅存证，不审核）
          </Button>
        </Form.Item>
      </Form>
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
    const recruitingItems = recruitments.filter(
      (item) => getProductJourneyState(item.productId, reports) === 'recruiting',
    );
    const mixedItems: Array<
      | { type: 'report'; data: VerifyReport }
      | { type: 'recruitment'; data: TrialRecruitment & { product: Product } }
    > = [];
    let reportIdx = 0;
    let recruitIdx = 0;
    const step = 3;
    while (reportIdx < reports.length || recruitIdx < recruitingItems.length) {
      for (let i = 0; i < step && reportIdx < reports.length; i++) {
        mixedItems.push({ type: 'report', data: reports[reportIdx] });
        reportIdx++;
      }
      if (recruitIdx < recruitingItems.length) {
        const product = products.find((p) => p.id === recruitingItems[recruitIdx].productId);
        if (product) {
          mixedItems.push({
            type: 'recruitment',
            data: { ...recruitingItems[recruitIdx], product },
          });
        }
        recruitIdx++;
      }
    }
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
                    免费试用，7 天内提交真实甄客验
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
                    <Button size="small" type="primary" onClick={(e) => { e.stopPropagation(); openProductJourney(product); }}>
                      申请
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
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
            {userOrders.map((order) => (
              <div className={styles.orderItem} key={order.id}>
                <div>
                  <strong>{order.productTitle}</strong>
                  <p>
                    {order.orderNo} · x{order.quantity} · {order.returnDays} 天退换
                  </p>
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
                      <Button size="small" type="primary" onClick={() => handleAdvanceOrder(order.id)}>
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
            {userOrders.length === 0 && <p className={styles.empty}>还没有订单。</p>}
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
                    {trial.status === 'pending_report' && trialProduct && (
                      <Button size="small" type="primary" onClick={() => openReportModal(trialProduct)}>
                        去发布甄客验
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
                  {selectedLogisticsView.logistics.events.map((event) => (
                    <div className={styles.logisticsEvent} key={`${event.time}-${event.description}`}>
                      <i />
                      <div>
                        <strong>{event.description}</strong>
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
          {reviewableProducts.length === 0 && <p className={styles.hint}>暂无可发布甄客验的商品：需要完成购买或领取试用。</p>}
          <Form.Item name="images" label="实拍图（必填，至少1张）" rules={[{ required: true, message: '请上传至少1张实拍图' }]}>
            <Upload
              listType="picture-card"
              maxCount={9}
              beforeUpload={() => false}
              onChange={(info) => {
                const newFileList = info.fileList.map((file) => ({
                  ...file,
                  url: URL.createObjectURL(file.originFileObj!),
                }));
                form.setFieldsValue({ images: newFileList.map((f) => f.url) });
              }}
              fileList={reportImages?.map((url: string, index: number) => ({
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
          <Form.Item name="video" label="短视频（可选，开箱/使用）">
            <Upload
              accept="video/*"
              maxCount={1}
              beforeUpload={() => false}
              onChange={(info) => {
                if (info.file.originFileObj) {
                  form.setFieldsValue({ video: URL.createObjectURL(info.file.originFileObj) });
                }
              }}
              fileList={reportVideo ? [{ uid: '1', name: '视频', status: 'done', url: reportVideo }] : []}
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
              <Button type="primary" size="large" disabled={!isShippingAddressReady} onClick={handleConfirmBuyNow}>
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
              <p className={styles.payMethodsTitle}>选择支付方式</p>
              <div
                className={`${styles.payMethodItem} ${payMethod === 'wechat' ? styles.selectedPayMethod : ''}`}
                onClick={() => setPayMethod('wechat')}
              >
                <div className={styles.payMethodLeft}>
                  <div className={`${styles.payIcon} ${styles.wechatIcon}`}>
                    <span>微</span>
                  </div>
                  <div>
                    <strong>微信支付</strong>
                    <p>推荐使用微信扫码支付</p>
                  </div>
                </div>
                <Radio checked={payMethod === 'wechat'} onChange={() => setPayMethod('wechat')} />
              </div>
              <div
                className={`${styles.payMethodItem} ${payMethod === 'alipay' ? styles.selectedPayMethod : ''}`}
                onClick={() => setPayMethod('alipay')}
              >
                <div className={styles.payMethodLeft}>
                  <div className={`${styles.payIcon} ${styles.alipayIcon}`}>
                    <span>支</span>
                  </div>
                  <div>
                    <strong>支付宝支付</strong>
                    <p>支付宝安全、快捷支付</p>
                  </div>
                </div>
                <Radio checked={payMethod === 'alipay'} onChange={() => setPayMethod('alipay')} />
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
              提示：当前为模拟支付，后期对接后端后将接入真实支付接口。
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
        <div className={styles.addressPickerList}>
          {shippingAddresses.length === 0 ? (
            <p className={styles.empty}>暂无保存的地址</p>
          ) : (
            shippingAddresses.map((address) => (
              <div
                key={address.id}
                className={`${styles.addressPickerItem} ${address.isDefault ? styles.selectedAddress : ''}`}
                onClick={() => handleSelectAddress(address.id)}
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
            <Button type="primary" icon={<PlusOutlined />} onClick={handleStartNewAddress}>
              新增地址
            </Button>
          </div>
          <div className={styles.addressList}>
            {shippingAddresses.length === 0 ? (
              <p className={styles.empty}>暂无保存的地址</p>
            ) : (
              shippingAddresses.map((address) => (
                <div className={styles.addressItem} key={address.id}>
                  <Radio checked={address.isDefault} onChange={() => handleSetDefaultAddress(address.id)}>
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
                  <Button size="small" onClick={() => handleEditAddress(address)}>
                    编辑
                  </Button>
                </div>
              ))
            )}
          </div>
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
          <Button block type="primary" htmlType="submit" size="large">
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
