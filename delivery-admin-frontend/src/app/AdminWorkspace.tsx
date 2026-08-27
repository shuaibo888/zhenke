import {
  BarChartOutlined,
  CheckCircleOutlined,
  EditOutlined,
  FileSearchOutlined,
  GiftOutlined,
  LogoutOutlined,
  MenuOutlined,
  SafetyCertificateOutlined,
  ShoppingOutlined,
  TeamOutlined,
  TruckOutlined,
  ReadOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import {
  Button,
  ConfigProvider,
  Drawer,
  Form,
  Input,
  Layout,
  Menu,
  Result,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  App as AntApp,
} from 'antd';
import zhCN from 'antd/locale/zh_CN';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from '@umijs/renderer-react';
import type { AdminSession, ManagedLogisticsTrace, ManagedOrder, ManagedProduct, ManagedReport, ManagedTrialApplication, ManagedTrialRecruitment, MerchantAccount, NavKey, ProductCategory, ProductCategoryOption, ProductStatus, ShopMemberLevel, ShopUserAccount } from '@/types';
import {
  auditMerchantOrderRefund,
  auditMerchantTrialApplication,
  createMerchantProduct,
  createProductCategory,
  createMerchantTrial,
  deleteAdminReport,
  deleteProductCategory,
  fetchAdminCaptcha,
  fetchAvailableTrialTypes,
  fetchDashboardSummary,
  fetchAdminOrder,
  fetchAdminOrders,
  auditMerchant,
  fetchAllProductCategories,
  fetchManagedProducts,
  fetchManagedTrials,
  fetchMerchantProduct,
  fetchMerchantDetail,
  fetchMerchantOrder,
  fetchMerchantOrderLogistics,
  fetchMerchantOrders,
  fetchMerchantReports,
  fetchMerchantTrialApplications,
  fetchMerchants,
  fetchProductCategories,
  fetchProductCertification,
  fetchShopMemberLevels,
  fetchShopUsers,
  loginAdmin,
  logoutAdmin,
  restoreAdminSession,
  updateShopUserLevel,
  updateShopUserStatus,
  updateMerchantStatus,
  updateMerchantProduct,
  updateMerchantProductSaleStatus,
  updateMerchantTrialStatus,
  updateProductCategory,
  shipMerchantTrialApplication,
  redeemMerchantTrialApplication,
  previewMerchantTrialApplicationRedeem,
  submitProductCertification,
  openProductCertificationMaterial,
  shipMerchantOrder,
  redeemShopOrder,
  previewShopOrderRedeem,
  type CaptchaState,
  type DashboardSummaryDto,
  type ProductCertificationDto,
  type ProductCertificationMaterialDto,
} from '@/services/adminApi';

import {
  MerchantAuditDialog,
  MerchantDetailDialog,
  type MerchantFormValues,
} from '@/modules/merchants/MerchantDialogs';
import OrderDialogs, {
  type OrderShipFormValues,
  type RefundAuditFormValues,
} from '@/modules/orders/OrderDialogs';
import ProductDialogs, { type ProductFormValues } from '@/modules/products/ProductDialogs';
import ProductCertificationDialog from '@/modules/products/ProductCertificationDialog';
import TrialDialogs, {
  type TrialApplicationActionFormValues,
  type TrialFormValues,
} from '@/modules/trials/TrialDialogs';
import RedeemScanModal from '@/modules/trials/RedeemScanModal';
import RedeemConfirmModal from '@/modules/trials/RedeemConfirmModal';
import { AdminPageContext, type AdminPagePropsMap } from '@/app/AdminPageContext';
import { adminNavPaths, getAdminNavKey } from '@/app/adminRoutes';
import { filterRowsForSession, getAvailableNavKeys, hasGlobalAccess } from '@/utils/access';
import { type OrderStatusFilter } from '@/utils/orderManagement';
import { type ProductCategoryFilter, type ProductStatusFilter } from '@/utils/productFilters';
import styles from '@/pages/index.less';

dayjs.locale('zh-cn');

const { Header, Sider, Content } = Layout;
const MANAGEMENT_PAGE_SIZE = 10;

const emptyDashboardSummary: DashboardSummaryDto = {
  productTotal: 0,
  onSaleCount: 0,
  orderTotal: 0,
  todayOrders: 0,
  salesAmount: 0,
  userTotal: 0,
  reportTotal: 0,
  orderStatusCounts: [],
  productStatusCounts: [],
  orderDailyCounts: [],
};

type LoginFormValues = {
  username: string;
  password: string;
  code?: string;
};

const adminTheme = {
  token: {
    colorPrimary: '#1f6f5b',
    borderRadius: 8,
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
  },
};

const responsiveDrawerProps = { rootClassName: styles.responsiveDrawer } as const;

const navMeta: Record<NavKey, { label: string; icon: React.ReactNode }> = {
  dashboard: { label: '数据看板', icon: <BarChartOutlined /> },
  users: { label: '用户管理', icon: <TeamOutlined /> },
  coupons: { label: '优惠券管理', icon: <GiftOutlined /> },
  products: { label: '商品管理', icon: <ShoppingOutlined /> },
  trials: { label: '试用招募', icon: <SafetyCertificateOutlined /> },
  orders: { label: '订单管理', icon: <TruckOutlined /> },
  reports: { label: '甄客验管理', icon: <FileSearchOutlined /> },
  zhenkePosts: { label: '甄客帖管理', icon: <ReadOutlined /> },
  banners: { label: '首页轮播管理', icon: <PictureOutlined /> },
  merchants: { label: '商家管理', icon: <TeamOutlined /> },
};

const categoryMeta: Partial<Record<ProductCategory, { label: string; color: string }>> = {
  verified: { label: '已得验', color: 'green' },
  local: { label: '在地特产', color: 'blue' },
  other: { label: '普通好物', color: 'default' },
};

const productStatusMeta: Record<ProductStatus, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'gold' },
  onSale: { label: '在售', color: 'green' },
  offSale: { label: '已下架', color: 'default' },
};

const orderStatusMeta: Record<ManagedOrder['status'], { label: string; color: string }> = {
  unpaid: { label: '待付款', color: 'default' },
  paid: { label: '待发货', color: 'gold' },
  shipped: { label: '待收货', color: 'blue' },
  completed: { label: '已完成', color: 'green' },
  canceled: { label: '已取消', color: 'red' },
  refunding: { label: '退款中', color: 'blue' },
  refunded: { label: '已退款', color: 'purple' },
};

function formatMoney(value: number) {
  return `¥${value.toFixed(2)}`;
}

function formatDateTime(value?: string, emptyText = '-') {
  if (!value) return emptyText;
  const match = value.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})/);
  return match ? `${match[1]} ${match[2]}` : value;
}

function getManagedReportTypeMeta(report: ManagedReport) {
  if (report.reportSource === 'PURCHASE') return { label: '购买评价', color: 'green' };
  return report.trialType === 'OFFLINE'
    ? { label: '线下试用报告', color: 'purple' }
    : { label: '线上试用报告', color: 'blue' };
}

/* 智能评分功能暂时隐藏，恢复时取消注释。
function getManagedAiScoreMeta(report: ManagedReport) {
  if (report.aiScoreStatus === 'SUCCEEDED' && report.aiScore != null) {
    return { label: `${report.aiScore.toFixed(1)}/5`, color: 'gold' };
  }
  if (report.aiScoreStatus === 'FAILED') {
    return { label: '评分暂不可用', color: 'default' };
  }
  return { label: '待评分', color: 'processing' };
}
*/

function AdminWorkspace() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeNav = getAdminNavKey(location.pathname) ?? 'dashboard';
  const [session, setSession] = useState<AdminSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [captcha, setCaptcha] = useState<CaptchaState>({ enabled: false, image: '', uuid: '' });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [products, setProducts] = useState<ManagedProduct[]>([]);
  const [productPage, setProductPage] = useState(1);
  const [productTotal, setProductTotal] = useState(0);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSaving, setProductSaving] = useState(false);
  const [productCategories, setProductCategories] = useState<ProductCategoryOption[]>([]);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryDrafts, setCategoryDrafts] = useState<ProductCategoryOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [orders, setOrders] = useState<ManagedOrder[]>([]);
  const [orderPage, setOrderPage] = useState(1);
  const [orderTotal, setOrderTotal] = useState(0);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [shippingOrder, setShippingOrder] = useState<ManagedOrder | null>(null);
  const [orderShipping, setOrderShipping] = useState(false);
  const [refundAuditOrder, setRefundAuditOrder] = useState<ManagedOrder | null>(null);
  const [refundAuditing, setRefundAuditing] = useState(false);
  const [reports, setReports] = useState<ManagedReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportPage, setReportPage] = useState(1);
  const [reportTotal, setReportTotal] = useState(0);
  const [trialRecruitments, setTrialRecruitments] = useState<ManagedTrialRecruitment[]>([]);
  const [trialPage, setTrialPage] = useState(1);
  const [trialTotal, setTrialTotal] = useState(0);
  const [trialsLoading, setTrialsLoading] = useState(false);
  const [trialSaving, setTrialSaving] = useState(false);
  const [trialProductOptions, setTrialProductOptions] = useState<ManagedProduct[]>([]);
  const [selectedTrialAvailableTypes, setSelectedTrialAvailableTypes] = useState<Array<'ONLINE' | 'OFFLINE'>>(
    ['ONLINE', 'OFFLINE'],
  );
  const [trialApplications, setTrialApplications] = useState<ManagedTrialApplication[]>([]);
  const [trialApplicationPage, setTrialApplicationPage] = useState(1);
  const [trialApplicationTotal, setTrialApplicationTotal] = useState(0);
  const [trialApplicationsLoading, setTrialApplicationsLoading] = useState(false);
  const [trialApplicationAction, setTrialApplicationAction] = useState<'ship' | null>(null);
  const [selectedTrialApplication, setSelectedTrialApplication] = useState<ManagedTrialApplication | null>(null);
  const [reviewApplication, setReviewApplication] = useState<ManagedTrialApplication | null>(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [redeemScanOpen, setRedeemScanOpen] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [trialRedeemPreview, setTrialRedeemPreview] = useState<{ code: string; application: ManagedTrialApplication } | null>(null);
  const [orderRedeemScanOpen, setOrderRedeemScanOpen] = useState(false);
  const [orderRedeeming, setOrderRedeeming] = useState(false);
  const [orderRedeemPreview, setOrderRedeemPreview] = useState<{ code: string; order: ManagedOrder } | null>(null);
  const [merchants, setMerchants] = useState<MerchantAccount[]>([]);
  const [merchantsLoading, setMerchantsLoading] = useState(false);
  const [merchantPage, setMerchantPage] = useState(1);
  const [merchantTotal, setMerchantTotal] = useState(0);
  const [shopUsers, setShopUsers] = useState<ShopUserAccount[]>([]);
  const [shopUserTotal, setShopUserTotal] = useState(0);
  const [shopUsersLoading, setShopUsersLoading] = useState(false);
  const [memberLevels, setMemberLevels] = useState<ShopMemberLevel[]>([]);
  const [userKeyword, setUserKeyword] = useState('');
  const [userStatus, setUserStatus] = useState<string>();
  const [userLevelId, setUserLevelId] = useState<number>();
  const [userPage, setUserPage] = useState(1);
  const [merchantModalOpen, setMerchantModalOpen] = useState(false);
  const [editingMerchantId, setEditingMerchantId] = useState<number | null>(null);
  const [merchantForm] = Form.useForm<MerchantFormValues>();
  const [productCategoryFilter, setProductCategoryFilter] = useState<ProductCategoryFilter>('all');
  const [productStatusFilter, setProductStatusFilter] = useState<ProductStatusFilter>('all');
  const [productKeyword, setProductKeyword] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatusFilter>('all');
  const [orderKeyword, setOrderKeyword] = useState('');
  const [productDrawerOpen, setProductDrawerOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [certificationProduct, setCertificationProduct] = useState<ManagedProduct | null>(null);
  const [productCertification, setProductCertification] = useState<ProductCertificationDto | null>(null);
  const [certificationOpen, setCertificationOpen] = useState(false);
  const [certificationLoading, setCertificationLoading] = useState(false);
  const [certificationSubmitting, setCertificationSubmitting] = useState(false);
  const [detailOrder, setDetailOrder] = useState<ManagedOrder | null>(null);
  const [orderLogisticsDialog, setOrderLogisticsDialog] = useState<{
    orderNo: string;
    trace: ManagedLogisticsTrace;
  } | null>(null);
  const [orderLogisticsLoading, setOrderLogisticsLoading] = useState(false);
  const [detailMerchant, setDetailMerchant] = useState<MerchantAccount | null>(null);
  const [trialModalOpen, setTrialModalOpen] = useState(false);
  const [productForm] = Form.useForm<ProductFormValues>();
  const [trialForm] = Form.useForm<TrialFormValues>();
  const selectedTrialProductId = Form.useWatch('productId', trialForm);
  const [trialApplicationActionForm] = Form.useForm<TrialApplicationActionFormValues>();
  const [orderShipForm] = Form.useForm<OrderShipFormValues>();
  const [refundAuditForm] = Form.useForm<RefundAuditFormValues>();
  const [loginForm] = Form.useForm<LoginFormValues>();
  const { message, modal } = AntApp.useApp();
  const merchantAuditDecision = Form.useWatch('decision', merchantForm);
  const refundAuditDecision = Form.useWatch('decision', refundAuditForm);
  const trialProductSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummaryDto>(emptyDashboardSummary);
  const getMerchantName = (merchantId: number) => merchants.find((merchant) => merchant.id === merchantId)?.name ?? '未知商家';

  const visibleProducts = useMemo(() => filterRowsForSession(products, session), [products, session]);
  const visibleOrders = useMemo(() => filterRowsForSession(orders, session), [orders, session]);
  const visibleReports = useMemo(() => filterRowsForSession(reports, session), [reports, session]);
  const visibleTrials = useMemo(() => filterRowsForSession(trialRecruitments, session), [trialRecruitments, session]);
  const filteredProducts = visibleProducts;
  const filteredOrders = visibleOrders;
  const isAdmin = hasGlobalAccess(session);
  const hasPermission = (permission: string) =>
    Boolean(session?.permissions?.includes('*:*:*') || session?.permissions?.includes(permission));
  const availableNavKeys = getAvailableNavKeys(session).filter(
    (key) => (key !== 'users' || hasPermission('shop:user:list'))
      && (key !== 'merchants' || hasPermission('shop:merchant:list'))
      && (key !== 'zhenkePosts' || hasPermission('shop:zhenkePost:list'))
      && (key !== 'banners' || hasPermission('shop:banner:list')),
  );

  const loadCaptcha = async () => {
    try {
      setCaptcha(await fetchAdminCaptcha());
    } catch (error) {
      message.error(error instanceof Error ? error.message : '验证码加载失败');
    }
  };

  const loadShopUsers = async (page = userPage) => {
    setShopUsersLoading(true);
    try {
      const result = await fetchShopUsers({
        pageNum: page,
        pageSize: 10,
        keyword: userKeyword.trim() || undefined,
        status: userStatus,
        levelId: userLevelId,
      });
      setShopUsers(result.rows);
      setShopUserTotal(result.total);
      setUserPage(page);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '用户列表加载失败');
    } finally {
      setShopUsersLoading(false);
    }
  };

  const loadMerchants = async (page = merchantPage) => {
    setMerchantsLoading(true);
    try {
      const result = await fetchMerchants({ pageNum: page, pageSize: MANAGEMENT_PAGE_SIZE });
      setMerchants(result.rows);
      setMerchantTotal(result.total);
      setMerchantPage(page);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '商家列表加载失败');
    } finally {
      setMerchantsLoading(false);
    }
  };

  const loadDashboard = async (currentSession = session) => {
    if (!currentSession) return;
    try {
      setDashboardSummary(await fetchDashboardSummary(currentSession));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '数据看板加载失败');
    }
  };

  const loadProducts = async (
    currentSession = session,
    page = productPage,
    filters = {
      keyword: productKeyword,
      category: productCategoryFilter,
      status: productStatusFilter,
    },
  ) => {
    if (!currentSession) return;
    setProductsLoading(true);
    try {
      const categoryId = filters.category === 'all'
        ? undefined
        : productCategories.find((item) => item.categoryCode === filters.category)?.categoryId;
      const status = filters.status === 'draft'
        ? 'DRAFT'
        : filters.status === 'onSale'
          ? 'ON_SALE'
          : filters.status === 'offSale'
            ? 'OFF_SALE'
            : undefined;
      const [productResult, categories] = await Promise.all([
        fetchManagedProducts(currentSession, {
          pageNum: page,
          pageSize: MANAGEMENT_PAGE_SIZE,
          keyword: filters.keyword.trim() || undefined,
          categoryId,
          status,
          trialOnly: filters.status === 'trial',
        }),
        productCategories.length > 0 ? Promise.resolve(productCategories) : fetchProductCategories(),
      ]);
      setProducts(productResult.rows);
      setProductTotal(productResult.total);
      setProductPage(page);
      setProductCategories(categories);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '商品列表加载失败');
    } finally {
      setProductsLoading(false);
    }
  };

  const loadTrials = async (currentSession = session, page = trialPage) => {
    if (!currentSession) return;
    setTrialsLoading(true);
    try {
      const result = await fetchManagedTrials(currentSession, {
        pageNum: page,
        pageSize: MANAGEMENT_PAGE_SIZE,
      });
      setTrialRecruitments(result.rows);
      setTrialTotal(result.total);
      setTrialPage(page);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '试用招募加载失败');
    } finally {
      setTrialsLoading(false);
    }
  };

  const loadTrialProductOptions = async (keyword = '', currentSession = session) => {
    if (currentSession?.loginType !== 'merchant') return;
    try {
      const result = await fetchManagedProducts(currentSession, {
        pageNum: 1,
        pageSize: 20,
        keyword: keyword.trim() || undefined,
        status: 'ON_SALE',
      });
      setTrialProductOptions(result.rows);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '可发布试用商品加载失败');
    }
  };

  const loadOrders = async (
    currentSession = session,
    page = orderPage,
    filters = { keyword: orderKeyword, status: orderStatusFilter },
  ) => {
    if (!currentSession) return;
    setOrdersLoading(true);
    try {
      const status = ({
        unpaid: 'PENDING_PAYMENT',
        paid: 'PAID',
        shipped: 'SHIPPED',
        completed: 'RECEIVED',
        canceled: 'CANCELLED',
        refunding: 'REFUNDING',
        refunded: 'REFUNDED',
      } as const)[filters.status as Exclude<OrderStatusFilter, 'all'>];
      const query = {
        pageNum: page,
        pageSize: MANAGEMENT_PAGE_SIZE,
        keyword: filters.keyword.trim() || undefined,
        status,
      };
      const result = currentSession.loginType === 'admin'
        ? await fetchAdminOrders(query)
        : await fetchMerchantOrders(query);
      setOrders(result.rows);
      setOrderTotal(result.total);
      setOrderPage(page);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '订单列表加载失败');
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadReports = async (currentSession = session, page = reportPage) => {
    if (!currentSession) return;
    setReportsLoading(true);
    try {
      const result = await fetchMerchantReports(currentSession, {
        pageNum: page,
        pageSize: MANAGEMENT_PAGE_SIZE,
      });
      setReports(result.rows);
      setReportTotal(result.total);
      setReportPage(page);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '验证报告加载失败');
    } finally {
      setReportsLoading(false);
    }
  };

  const loadTrialApplications = async (currentSession = session, page = trialApplicationPage) => {
    if (!currentSession) return;
    setTrialApplicationsLoading(true);
    try {
      const result = await fetchMerchantTrialApplications(currentSession, {
        pageNum: page,
        pageSize: MANAGEMENT_PAGE_SIZE,
      });
      setTrialApplications(result.rows);
      setTrialApplicationTotal(result.total);
      setTrialApplicationPage(page);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '试用申请加载失败');
    } finally {
      setTrialApplicationsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    restoreAdminSession()
      .then((restored) => {
        if (mounted) setSession(restored);
      })
      .finally(() => {
        if (mounted) setSessionLoading(false);
      });
    fetchAdminCaptcha().then((nextCaptcha) => {
      if (mounted) setCaptcha(nextCaptcha);
    }).catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => () => {
    if (trialProductSearchTimer.current) clearTimeout(trialProductSearchTimer.current);
  }, []);

  useEffect(() => {
    if (!session || availableNavKeys.includes(activeNav)) return;
    navigate(adminNavPaths.dashboard, { replace: true });
  }, [activeNav, navigate, session]);

  useEffect(() => {
    if (!session) return;
    const permissions = session.permissions ?? [];
    if (activeNav === 'dashboard') {
      void loadDashboard(session);
    } else if (activeNav === 'products'
      && (permissions.includes('*:*:*') || permissions.includes('shop:product:list'))) {
      void loadProducts(session, 1);
    } else if (activeNav === 'trials'
      && (permissions.includes('*:*:*') || permissions.includes('shop:trial:list'))) {
      void loadTrials(session, 1);
      void loadTrialApplications(session, 1);
      if (session.loginType === 'merchant') {
        void loadTrialProductOptions('', session);
      }
    } else if (activeNav === 'orders') {
      void loadOrders(session, 1);
    } else if (activeNav === 'reports') {
      void loadReports(session, 1);
    }
  }, [activeNav, session?.id]);

  useEffect(() => {
    if (session?.loginType !== 'admin') return;
    const permissions = session.permissions ?? [];
    if (activeNav === 'users'
      && (permissions.includes('*:*:*') || permissions.includes('shop:user:list'))) {
      fetchShopMemberLevels()
        .then(setMemberLevels)
        .catch((error) => message.error(error instanceof Error ? error.message : '会员等级加载失败'));
      void loadShopUsers(1);
    }
    if (activeNav === 'merchants'
      && (permissions.includes('*:*:*') || permissions.includes('shop:merchant:list'))) {
      void loadMerchants(1);
    }
  }, [activeNav, session?.id]);

  const handleLogin = async (values: LoginFormValues) => {
    setLoginSubmitting(true);
    try {
      const loggedIn = await loginAdmin({ ...values, uuid: captcha.uuid });
      setSession(loggedIn);
      loginForm.resetFields(['password', 'code']);
      message.success('已进入管理员后台');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '管理员登录失败');
      loginForm.resetFields(['code']);
      await loadCaptcha();
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logoutAdmin();
    setSession(null);
    navigate(adminNavPaths.dashboard, { replace: true });
    setProductDrawerOpen(false);
    setEditingProductId(null);
    setDetailOrder(null);
    setShippingOrder(null);
    resetProductFilters(false);
    resetOrderFilters(false);
    setShopUsers([]);
    setProducts([]);
    setProductCategories([]);
    setTrialRecruitments([]);
    setTrialProductOptions([]);
    setSelectedTrialAvailableTypes(['ONLINE', 'OFFLINE']);
    setTrialApplications([]);
    setOrders([]);
    setReports([]);
    setMerchants([]);
    setProductPage(1);
    setProductTotal(0);
    setOrderPage(1);
    setOrderTotal(0);
    setTrialPage(1);
    setTrialTotal(0);
    setTrialApplicationPage(1);
    setTrialApplicationTotal(0);
    setReportPage(1);
    setReportTotal(0);
    setMerchantPage(1);
    setMerchantTotal(0);
    setShopUserTotal(0);
    setDashboardSummary(emptyDashboardSummary);
    loginForm.resetFields();
    await loadCaptcha();
  };

  const resetProductFilters = (reload = true) => {
    setProductCategoryFilter('all');
    setProductStatusFilter('all');
    setProductKeyword('');
    if (reload && session) {
      void loadProducts(session, 1, { keyword: '', category: 'all', status: 'all' });
    }
  };

  const openCategorySettings = async () => {
    setCategoryModalOpen(true);
    setCategoriesLoading(true);
    try {
      setCategoryDrafts(await fetchAllProductCategories());
    } catch (error) {
      message.error(error instanceof Error ? error.message : '分类加载失败');
    } finally {
      setCategoriesLoading(false);
    }
  };

  const refreshProductCategories = async () => {
    const [allCategories, enabledCategories] = await Promise.all([
      fetchAllProductCategories(),
      fetchProductCategories(),
    ]);
    setCategoryDrafts(allCategories);
    setProductCategories(enabledCategories);
  };

  const createCategory = async (values: { categoryName: string; categorySort: number; status: '0' | '1' }) => {
    try {
      await createProductCategory({ ...values, categoryName: values.categoryName.trim() });
      await refreshProductCategories();
      message.success('分类已新增');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '分类新增失败');
      throw error;
    }
  };

  const saveCategory = async (categoryItem: ProductCategoryOption) => {
    try {
      await updateProductCategory(categoryItem.categoryId, {
        categoryName: categoryItem.categoryName.trim(),
        categorySort: categoryItem.categorySort,
        status: categoryItem.status,
      });
      await refreshProductCategories();
      message.success('分类设置已保存，商品关联保持不变');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '分类保存失败');
    }
  };

  const removeCategory = async (categoryItem: ProductCategoryOption) => {
    try {
      await deleteProductCategory(categoryItem.categoryId);
      await refreshProductCategories();
      if (productCategoryFilter === categoryItem.categoryCode) {
        setProductCategoryFilter('all');
      }
      message.success('分类已删除');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '分类删除失败');
    }
  };

  const resetOrderFilters = (reload = true) => {
    setOrderStatusFilter('all');
    setOrderKeyword('');
    if (reload && session) {
      void loadOrders(session, 1, { keyword: '', status: 'all' });
    }
  };

  const openCreateProduct = () => {
    setEditingProductId(null);
    productForm.resetFields();
    productForm.setFieldsValue({
      categoryId: productCategories[0]?.categoryId,
      brandName: '',
      imageUrl: '',
      mainImageUrls: [],
      detailImageUrls: [],
      price: 99,
      stock: 20,
      supportsOnline: true,
      supportsOffline: false,
    });
    setProductDrawerOpen(true);
  };

  const openEditProduct = async (product: ManagedProduct) => {
    try {
      if (!session) return;
      const detail = await fetchMerchantProduct(session, product.id);
      setEditingProductId(detail.id);
      productForm.setFieldsValue({
        title: detail.title,
        subtitle: detail.subtitle,
        packageContent: detail.packageContent, usageNotice: detail.usageNotice, validityDescription: detail.validityDescription, reservationRequired: detail.reservationRequired, reservationNotice: detail.reservationNotice, refundExpiryRule: detail.refundExpiryRule,
        brandName: detail.brandName,
        categoryId: detail.categoryId,
        imageUrl: detail.imageUrl,
        mainImageUrls: detail.mainImageUrls,
        detailImageUrls: detail.detailImageUrls,
        price: detail.price,
        stock: detail.stock,
        supportsOnline: detail.supportsOnline ?? true,
        supportsOffline: detail.supportsOffline ?? false,
      });
      setProductDrawerOpen(true);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '商品详情加载失败');
    }
  };

  const closeProductDrawer = () => {
    setProductDrawerOpen(false);
    setEditingProductId(null);
    productForm.resetFields();
  };

  const handleSaveProduct = async (values: ProductFormValues) => {
    if (!session) return;
    if (!values.supportsOnline && !values.supportsOffline) {
      message.error('请至少选择一种销售方式（线上配送或到店核销）');
      return;
    }
    setProductSaving(true);
    try {
      const body = {
        categoryId: values.categoryId,
        brandName: values.brandName.trim(),
        productName: values.title.trim(),
        subtitle: values.subtitle?.trim(),
        packageContent: values.packageContent?.trim(),
        usageNotice: values.usageNotice?.trim(),
        validityDescription: values.validityDescription?.trim(),
        reservationRequired: Boolean(values.reservationRequired),
        reservationNotice: values.reservationNotice?.trim(),
        refundExpiryRule: values.refundExpiryRule?.trim(),
        coverUrl: values.imageUrl.trim(),
        price: values.price,
        stock: values.stock,
        supportsOnline: values.supportsOnline,
        supportsOffline: values.supportsOffline,
        mainImageUrls: values.mainImageUrls ?? [],
        detailImageUrls: values.detailImageUrls ?? [],
      };
      if (editingProductId) await updateMerchantProduct(session, editingProductId, body);
      else if (session.loginType === 'merchant') await createMerchantProduct(body);
      else throw new Error('管理员只能编辑已有商品');
      await loadProducts(session);
      closeProductDrawer();
      message.success(editingProductId ? '商品已更新' : '商品已保存为草稿');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '商品保存失败');
    } finally {
      setProductSaving(false);
    }
  };

  const toggleProductStatus = async (product: ManagedProduct) => {
    if (!session) return;
    const nextStatus = product.status === 'onSale' ? 'OFF_SALE' : 'ON_SALE';
    try {
      await updateMerchantProductSaleStatus(session, product.id, nextStatus);
      await loadProducts(session);
      message.success(nextStatus === 'ON_SALE' ? '商品已上架' : '商品已下架');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '商品状态更新失败');
    }
  };

  const openProductCertification = async (product: ManagedProduct) => {
    if (!session || session.loginType !== 'merchant') return;
    setCertificationProduct(product);
    setProductCertification(null);
    setCertificationOpen(true);
    setCertificationLoading(true);
    try {
      setProductCertification(await fetchProductCertification(product.id));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '正品认证信息加载失败');
    } finally {
      setCertificationLoading(false);
    }
  };

  const closeProductCertification = () => {
    if (certificationSubmitting) return;
    setCertificationOpen(false);
    setCertificationProduct(null);
    setProductCertification(null);
  };

  const handleProductCertificationSubmit = async (body: FormData) => {
    if (!certificationProduct) return;
    setCertificationSubmitting(true);
    try {
      const submitted = await submitProductCertification(certificationProduct.id, body);
      setProductCertification(submitted);
      if (session) await loadProducts(session);
      message.success('正品认证申请已提交，当前正在处理中');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '正品认证申请提交失败');
    } finally {
      setCertificationSubmitting(false);
    }
  };

  const handleOpenCertificationMaterial = async (material: ProductCertificationMaterialDto) => {
    if (!certificationProduct) return;
    try {
      await openProductCertificationMaterial(certificationProduct.id, material);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '认证材料读取失败');
    }
  };

  const openPublishTrial = async (product?: ManagedProduct) => {
    trialForm.resetFields();
    try {
      if (product) {
        if (!trialProductOptions.some((item) => item.id === product.id)) {
          setTrialProductOptions((items) => [product, ...items]);
        }
        const availableTypes = await fetchAvailableTrialTypes(product.id);
        setSelectedTrialAvailableTypes(availableTypes);
        if (availableTypes.length === 0) {
          message.warning('该商品的线上、线下试用都已有正在招募且未满的活动，暂时不能发布新一轮');
          return;
        }
        trialForm.setFieldsValue({
          productId: product.id,
          trialTypes: [availableTypes[0]],
          campaignTitle: `${product.title}试用招募`,
          campaignSummary: '线上试用确认收货后可发布甄客验；线下试用审核通过后即可发布甄客验。',
          targetCount: 5,
        });
      } else {
        setSelectedTrialAvailableTypes(['ONLINE', 'OFFLINE']);
        await loadTrialProductOptions();
      }
      setTrialModalOpen(true);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '试用方式加载失败');
    }
  };

  const closeTrialModal = () => {
    if (trialProductSearchTimer.current) {
      clearTimeout(trialProductSearchTimer.current);
      trialProductSearchTimer.current = null;
    }
    setTrialModalOpen(false);
    trialForm.resetFields();
  };

  const isBlockingTrial = (trial: ManagedTrialRecruitment) => {
    const deadline = Date.parse(trial.deadline.replace(' ', 'T'));
    return trial.status === 'recruiting'
      && trial.claimedCount < trial.targetCount
      && (Number.isNaN(deadline) || deadline >= new Date().setHours(0, 0, 0, 0));
  };

  const handlePublishTrial = async (values: TrialFormValues) => {
    const product = trialProductOptions.find((p) => p.id === values.productId);
    if (!product) {
      message.error('请选择有效的商品');
      return;
    }

    if (!session || session.loginType !== 'merchant') return;
    setTrialSaving(true);
    try {
      const availableTypes = await fetchAvailableTrialTypes(values.productId);
      if (values.trialTypes.some((trialType) => !availableTypes.includes(trialType))) {
        message.warning('所选试用方式已有正在招募且未满的活动，请刷新后重新选择');
        return;
      }
      await createMerchantTrial({
        productId: values.productId,
        trialTypes: values.trialTypes,
        campaignTitle: values.campaignTitle.trim(),
        campaignSummary: values.campaignSummary.trim(),
        targetCount: values.targetCount,
        applicationDeadline: `${values.deadline.format('YYYY-MM-DD')} 00:00:00`,
      });
      await loadTrials(session);
      closeTrialModal();
      message.success(values.trialTypes.length === 2 ? '线上、线下试用招募已分别发布' : '试用招募已发布');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '试用招募发布失败');
    } finally {
      setTrialSaving(false);
    }
  };

  const handleEndTrial = (trial: ManagedTrialRecruitment) => {
    modal.confirm({
      title: '确认结束招募？',
      content: `「${trial.productTitle}」的试用招募将提前结束。`,
      okText: '结束招募',
      cancelText: '再想想',
      onOk: async () => {
        if (!session) return;
        await updateMerchantTrialStatus(session, trial.id, 'CLOSED');
        await loadTrials(session);
        message.success('招募已结束');
      },
    });
  };

  const openReviewApplication = (application: ManagedTrialApplication) => {
    setReviewApplication(application);
  };

  const closeReviewApplication = () => {
    setReviewApplication(null);
  };

  const approveReviewApplication = async () => {
    if (!reviewApplication) return;
    setReviewSubmitting(true);
    try {
      if (!session) return;
      await auditMerchantTrialApplication(session, reviewApplication.applicationId, 'APPROVED');
      message.success('试用申请已通过');
      setReviewApplication(null);
      await Promise.all([loadTrialApplications(), loadTrials()]);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '试用申请通过失败');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const rejectReviewApplication = async (remark: string) => {
    if (!reviewApplication) return;
    setReviewSubmitting(true);
    try {
      if (!session) return;
      await auditMerchantTrialApplication(session, reviewApplication.applicationId, 'REJECTED', remark);
      message.success('试用申请已驳回');
      setReviewApplication(null);
      await Promise.all([loadTrialApplications(), loadTrials()]);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '试用申请驳回失败');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const openTrialApplicationAction = (application: ManagedTrialApplication, action: 'ship') => {
    setSelectedTrialApplication(application);
    setTrialApplicationAction(action);
    trialApplicationActionForm.resetFields();
  };

  const closeTrialApplicationAction = () => {
    setSelectedTrialApplication(null);
    setTrialApplicationAction(null);
    trialApplicationActionForm.resetFields();
  };

  const submitTrialApplicationAction = async (values: TrialApplicationActionFormValues) => {
    if (!selectedTrialApplication || !trialApplicationAction) return;
    try {
      if (!session) return;
      await shipMerchantTrialApplication(
        session,
        selectedTrialApplication.applicationId,
        values.trackingNo?.trim() ?? '',
      );
      message.success('试用商品已发货');
      closeTrialApplicationAction();
      await loadTrialApplications();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '试用申请处理失败');
    }
  };

  const handleRedeem = async (redeemCode: string) => {
    setRedeeming(true);
    try {
      if (!session) return;
      const application = await previewMerchantTrialApplicationRedeem(session, redeemCode);
      setRedeemScanOpen(false);
      setTrialRedeemPreview({ code: redeemCode, application });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '核销码识别失败');
      throw error;
    } finally {
      setRedeeming(false);
    }
  };

  const confirmTrialRedeem = async () => {
    if (!session || !trialRedeemPreview) return;
    setRedeeming(true);
    try {
      await redeemMerchantTrialApplication(session, trialRedeemPreview.code);
      message.success('核销成功，用户现在可以发布甄客验');
      setTrialRedeemPreview(null);
      await loadTrialApplications();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '核销失败');
    } finally {
      setRedeeming(false);
    }
  };

  const handleOrderRedeem = async (redeemCode: string) => {
    if (!session) return;
    setOrderRedeeming(true);
    try {
      const order = await previewShopOrderRedeem(session, redeemCode);
      setOrderRedeemScanOpen(false);
      setOrderRedeemPreview({ code: redeemCode, order });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '核销码识别失败');
      throw error;
    } finally {
      setOrderRedeeming(false);
    }
  };

  const openOrderDetail = async (order: ManagedOrder) => {
    if (!session) return;
    try {
      setDetailOrder(session.loginType === 'admin'
        ? await fetchAdminOrder(order.id)
        : await fetchMerchantOrder(order.id));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '订单详情加载失败');
    }
  };

  const openOrderShipment = (order: ManagedOrder) => {
    if (order.status !== 'paid') {
      message.warning('只有待发货订单可以发货');
      return;
    }
    setShippingOrder(order);
    orderShipForm.resetFields();
  };

  const closeOrderShipment = () => {
    if (orderShipping) return;
    setShippingOrder(null);
    orderShipForm.resetFields();
  };

  const submitOrderShipment = async (values: OrderShipFormValues) => {
    if (!shippingOrder || orderShipping) return;
    setOrderShipping(true);
    try {
      if (!session) return;
      const shipped = await shipMerchantOrder(
        session,
        shippingOrder.id,
        values.trackingNo.trim(),
      );
      setOrders((items) => items.map((item) => item.id === shipped.id ? shipped : item));
      setDetailOrder((current) => current?.id === shipped.id ? shipped : current);
      setShippingOrder(null);
      orderShipForm.resetFields();
      message.success('订单已发货');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '订单发货失败');
    } finally {
      setOrderShipping(false);
    }
  };

  const openOrderLogistics = async (order: ManagedOrder) => {
    if (!session || !order.trackingNo || orderLogisticsLoading) return;
    setOrderLogisticsLoading(true);
    try {
      const trace = await fetchMerchantOrderLogistics(session, order.id);
      setOrderLogisticsDialog({ orderNo: order.orderNo, trace });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '物流查询失败，请稍后重试');
    } finally {
      setOrderLogisticsLoading(false);
    }
  };

  const openRefundAudit = (order: ManagedOrder) => {
    if (order.refundStatus !== 'PENDING') {
      message.warning('当前订单没有待审核的退款申请');
      return;
    }
    setRefundAuditOrder(order);
    refundAuditForm.setFieldsValue({ decision: 'APPROVED', auditRemark: '' });
  };

  const closeRefundAudit = () => {
    if (refundAuditing) return;
    setRefundAuditOrder(null);
    refundAuditForm.resetFields();
  };

  const submitRefundAudit = async (values: RefundAuditFormValues) => {
    if (!refundAuditOrder || refundAuditing) return;
    setRefundAuditing(true);
    try {
      if (!session) return;
      const updated = await auditMerchantOrderRefund(
        session,
        refundAuditOrder.id,
        values.decision,
        values.auditRemark?.trim(),
      );
      setOrders((items) => items.map((item) => item.id === updated.id ? updated : item));
      setDetailOrder((current) => current?.id === updated.id ? updated : current);
      setRefundAuditOrder(null);
      refundAuditForm.resetFields();
      message.success(values.decision === 'APPROVED'
        ? '退款申请已通过，订单已进入退款中'
        : '退款申请已驳回');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '退款审核失败');
    } finally {
      setRefundAuditing(false);
    }
  };

  const handleDeleteReport = (report: ManagedReport) => {
    if (!isAdmin || report.status !== 'published') return;
    modal.confirm({
      title: '确认删除这条甄客验？',
      content: '删除后用户端和商家端将不再展示。',
      okText: '逻辑删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        await deleteAdminReport(report.id);
        await loadReports(session, reportPage);
        message.success('甄客验已逻辑删除');
      },
    });
  };

  const handleToggleMerchantStatus = async (merchant: MerchantAccount) => {
    try {
      await updateMerchantStatus(merchant.id, merchant.status === 'active' ? '1' : '0');
      await loadMerchants();
      message.success(merchant.status === 'active' ? '商家已停用，现有登录会话已失效' : '商家已启用');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '商家状态更新失败');
    }
  };

  const handleOpenAuditMerchant = (merchant: MerchantAccount) => {
    setEditingMerchantId(merchant.id);
    merchantForm.resetFields();
    merchantForm.setFieldsValue({ decision: 'APPROVED' });
    setMerchantModalOpen(true);
  };

  const handleOpenMerchantDetail = async (merchant: MerchantAccount) => {
    try {
      setDetailMerchant(await fetchMerchantDetail(merchant.id));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '商家详情加载失败');
    }
  };

  const handleSaveMerchant = async (values: MerchantFormValues) => {
    if (!editingMerchantId) return;
    try {
      await auditMerchant(editingMerchantId, values);
      setMerchantModalOpen(false);
      setEditingMerchantId(null);
      await loadMerchants();
      message.success(values.decision === 'APPROVED' ? '审核通过，商家后台账号已创建' : '申请已驳回');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '商家审核失败');
    }
  };

  const handleShopUserStatusChange = async (user: ShopUserAccount, enabled: boolean) => {
    try {
      await updateShopUserStatus(user.userId, enabled ? '0' : '1');
      message.success(enabled ? '账号已启用' : '账号已停用，现有登录会话已失效');
      await loadShopUsers();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '账号状态更新失败');
    }
  };

  const handleShopUserLevelChange = async (user: ShopUserAccount, levelId: number) => {
    try {
      await updateShopUserLevel(user.userId, levelId);
      message.success('会员等级已更新');
      await loadShopUsers();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '会员等级更新失败');
    }
  };

  const resetShopUserFilters = () => {
    setUserKeyword('');
    setUserStatus(undefined);
    setUserLevelId(undefined);
    setUserPage(1);
    setShopUsersLoading(true);
    fetchShopUsers({ pageNum: 1, pageSize: 10 })
      .then((result) => {
        setShopUsers(result.rows);
        setShopUserTotal(result.total);
      })
      .catch((error) => message.error(error instanceof Error ? error.message : '用户列表加载失败'))
      .finally(() => setShopUsersLoading(false));
  };

  const shopUserColumns: ColumnsType<ShopUserAccount> = [
    {
      title: '账号',
      key: 'account',
      render: (_, user) => (
        <div>
          <div className={styles.strongText}>{user.nickName}</div>
          <div className={styles.subText}>{user.userName}</div>
        </div>
      ),
    },
    {
      title: '会员等级',
      dataIndex: 'levelId',
      width: 150,
      render: (levelId: number, user) => (
        <Select
          value={levelId}
          options={memberLevels.map((level) => ({ value: level.levelId, label: level.levelName }))}
          disabled={!hasPermission('shop:user:edit')}
          onChange={(nextLevelId) => handleShopUserLevelChange(user, nextLevelId)}
          style={{ width: 120 }}
        />
      ),
    },
    {
      title: '业务资格',
      key: 'eligibility',
      responsive: ['md'],
      render: (_, user) => (
        <Space size={4} wrap>
          <Tag color={user.reviewEligible === '0' ? 'green' : 'default'}>发布报告</Tag>
          <Tag color={user.trialEligible === '0' ? 'blue' : 'default'}>申请试用</Tag>
        </Space>
      ),
    },
    {
      title: '最近登录',
      key: 'login',
      responsive: ['md'],
      render: (_, user) => (
        <div>
          <div>{formatDateTime(user.loginDate, '尚未登录')}</div>
          {user.loginIp && <div className={styles.subText}>{user.loginIp}</div>}
        </div>
      ),
    },
    {
      title: '注册时间',
      dataIndex: 'createTime',
      responsive: ['md'],
      render: (value?: string) => formatDateTime(value),
    },
    {
      title: '注册来源',
      dataIndex: 'registerSource',
      width: 110,
      render: (registerSource?: ShopUserAccount['registerSource']) => (
        <Tag color={registerSource === 'RANSAI' ? 'purple' : 'green'}>
          {registerSource === 'RANSAI' ? '燃赛引流' : '自主注册'}
        </Tag>
      ),
    },
    {
      title: '账号状态',
      dataIndex: 'status',
      width: 110,
      render: (status: ShopUserAccount['status'], user) => (
        <Switch
          checked={status === '0'}
          checkedChildren="启用"
          unCheckedChildren="停用"
          disabled={!hasPermission('shop:user:status')}
          onChange={(checked) => handleShopUserStatusChange(user, checked)}
        />
      ),
    },
  ];

  const productColumns: ColumnsType<ManagedProduct> = [
    {
      title: '商品',
      dataIndex: 'title',
      render: (_, product) => (
        <div className={styles.productCell}>
          <div className={styles.productThumb} style={{ backgroundImage: `url(${product.imageUrl})` }} />
          <div>
            <div className={styles.strongText}>{product.title}</div>
            <div className={styles.subText}>品牌：{product.brandName}</div>
            <div className={styles.subText}>{product.artisanName}</div>
            {product.certificationStatus && (
              <Tag
                color={product.certificationStatus === 'PASSED' ? 'success'
                  : product.certificationStatus === 'PROCESSING' ? 'processing'
                    : product.certificationStatus === 'REJECTED' ? 'error' : 'default'}
                className={styles.productCertificationTag}
              >
                正品认证 · {{ PROCESSING: '处理中', PASSED: '已通过', REJECTED: '未通过', EXPIRED: '已失效' }[product.certificationStatus]}
              </Tag>
            )}
          </div>
        </div>
      ),
    },
    {
      title: '商家',
      dataIndex: 'merchantId',
      responsive: ['md'],
      render: (merchantId, product) => product.artisanName || getMerchantName(merchantId),
    },
    {
      title: '分类',
      dataIndex: 'category',
      responsive: ['md'],
      render: (_: ProductCategory, product) => (
        <Tag color={categoryMeta[product.category]?.color ?? 'blue'}>
          {product.categoryName ?? categoryMeta[product.category]?.label ?? product.category}
        </Tag>
      ),
    },
    {
      title: '售价',
      dataIndex: 'price',
      responsive: ['md'],
      render: (price: number) => formatMoney(price),
    },
    { title: '库存', dataIndex: 'stock', responsive: ['md'] },
    {
      title: '销售方式',
      key: 'fulfillment',
      responsive: ['md'],
      render: (_, product) => {
        const modes = [
          product.supportsOnline ? '线上' : null,
          product.supportsOffline ? '线下' : null,
        ].filter(Boolean);
        return modes.length ? modes.join(' + ') : '-';
      },
    },
    { title: '销量', dataIndex: 'sales', responsive: ['md'] },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: ProductStatus) => <Tag color={productStatusMeta[status].color}>{productStatusMeta[status].label}</Tag>,
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, product) => (
        <Space wrap size={6}>
          <Button size="small" icon={<EditOutlined />} onClick={() => void openEditProduct(product)}>
            编辑商品
          </Button>
          <Button size="small" onClick={() => void toggleProductStatus(product)}>
            {product.status === 'onSale' ? '下架' : '上架'}
          </Button>
          {!isAdmin && product.status === 'onSale' && (
            <Button size="small" type="primary" onClick={() => void openPublishTrial(product)}>
              发布试用
            </Button>
          )}
          {!isAdmin && (
            <Button
              size="small"
              icon={<SafetyCertificateOutlined />}
              onClick={() => void openProductCertification(product)}
            >
              {product.certificationStatus === 'PROCESSING' || product.certificationStatus === 'PASSED'
                ? '查看认证'
                : product.certificationStatus === 'REJECTED' || product.certificationStatus === 'EXPIRED'
                  ? '重新申请'
                  : '申请平台认证'}
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const orderColumns: ColumnsType<ManagedOrder> = [
    { title: '订单号', dataIndex: 'orderNo', render: (orderNo) => <span className={styles.monoText}>{orderNo}</span> },
    { title: '买家', dataIndex: 'buyerName', responsive: ['md'] },
    { title: '商家', key: 'merchant', responsive: ['md'], render: (_, order) => order.merchantName || getMerchantName(order.merchantId) },
    { title: '商品', dataIndex: 'productTitles', responsive: ['md'], render: (titles: string[]) => titles.join('、') },
    { title: '金额', dataIndex: 'amount', render: (amount: number) => formatMoney(amount) },
    {
      title: '履约方式',
      key: 'fulfillment',
      responsive: ['md'],
      render: (_, order) => (
        <Tag color={order.fulfillmentType === 'OFFLINE' ? 'purple' : 'blue'}>
          {order.fulfillmentType === 'OFFLINE' ? '到店核销' : '快递配送'}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: ManagedOrder['status']) => <Tag color={orderStatusMeta[status].color}>{orderStatusMeta[status].label}</Tag>,
    },
    {
      title: '退款状态',
      key: 'refundStatus',
      responsive: ['md'],
      render: (_, order) => {
        if (order.refundStatus === 'PENDING') return <Tag color="gold">待商家审核</Tag>;
        if (order.refundStatus === 'REFUNDING') return <Tag color="blue">退款中</Tag>;
        if (order.refundStatus === 'REFUNDED') return <Tag color="green">已退款</Tag>;
        if (order.refundStatus === 'REJECTED') return <Tag color="red">已驳回</Tag>;
        return '-';
      },
    },
    { title: '下单时间', dataIndex: 'createdAt', responsive: ['md'] },
    {
      title: '操作',
      key: 'actions',
      render: (_, order) => (
        <Space wrap size={6}>
          {order.fulfillmentType !== 'OFFLINE' && (
            <Button size="small" icon={<TruckOutlined />} disabled={order.status !== 'paid'} onClick={() => openOrderShipment(order)}>
              发货
            </Button>
          )}
          <Button size="small" icon={<FileSearchOutlined />} onClick={() => void openOrderDetail(order)}>
            订单详情
          </Button>
          {order.refundStatus === 'PENDING' && (
            <Button size="small" danger onClick={() => openRefundAudit(order)}>
              审核退款
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const reportColumns: ColumnsType<ManagedReport> = [
    { title: '商品', dataIndex: 'productTitle' },
    { title: '验证者', dataIndex: 'userName', responsive: ['md'] },
    { title: '商家', dataIndex: 'merchantId', responsive: ['md'], render: (merchantId, report) => report.merchantName || getMerchantName(merchantId) },
    { title: '优化建议', dataIndex: 'shortcoming', responsive: ['md'], render: (text) => <span className={styles.shortcoming}>{text}</span> },
    {
      title: '类型',
      key: 'reportType',
      render: (_, report) => {
        const meta = getManagedReportTypeMeta(report);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: '发布时间',
      dataIndex: 'createdAt',
      width: 170,
      render: (createdAt: string) => <span className={styles.reportPublishedAt}>{createdAt || '-'}</span>,
    },
    /* 智能评分功能暂时隐藏，恢复时取消注释。
    {
      title: '智能评分',
      key: 'aiScore',
      render: (_, report) => {
        const meta = getManagedAiScoreMeta(report);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    */
    { title: '有用数', dataIndex: 'usefulCount', responsive: ['md'] },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: ManagedReport['status']) => (
        <Tag color={status === 'published' ? 'green' : 'default'}>{status === 'published' ? '展示中' : '已删除'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, report) => isAdmin && report.status === 'published'
        ? <Button size="small" danger onClick={() => handleDeleteReport(report)}>删除</Button>
        : <span className={styles.subText}>仅查看</span>,
    },
  ];

  const trialColumns: ColumnsType<ManagedTrialRecruitment> = [
    { title: '商品', dataIndex: 'productTitle' },
    {
      title: '试用方式',
      dataIndex: 'trialType',
      responsive: ['md'],
      render: (trialType: ManagedTrialRecruitment['trialType']) => (
        <Tag color={trialType === 'ONLINE' ? 'blue' : 'purple'}>{trialType === 'ONLINE' ? '线上试用' : '线下试用'}</Tag>
      ),
    },
    { title: '商家', dataIndex: 'merchantId', responsive: ['md'], render: (merchantId, trial) => trial.merchantName || getMerchantName(merchantId) },
    {
      title: '招募进度',
      key: 'progress',
      responsive: ['md'],
      render: (_, trial) => (
        <span>
          {trial.claimedCount} / {trial.targetCount} 人
        </span>
      ),
    },
    { title: '申请人数', dataIndex: 'applicantCount', responsive: ['md'] },
    { title: '截止日期', dataIndex: 'deadline', responsive: ['md'] },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: ManagedTrialRecruitment['status'], trial) => (
        <Tag color={status === 'recruiting' && trial.claimedCount >= trial.targetCount ? 'purple' : isBlockingTrial(trial) ? 'green' : status === 'draft' ? 'gold' : 'default'}>
          {status === 'recruiting' && trial.claimedCount >= trial.targetCount
            ? '名额已满'
            : status === 'recruiting' && !isBlockingTrial(trial)
              ? '已截止'
            : ({ draft: '草稿', recruiting: '招募中', closed: '已提前终止', finished: '已完成', ended: '已结束' } as const)[status]}
        </Tag>
      ),
    },
    { title: '发布时间', dataIndex: 'createdAt', responsive: ['md'] },
    {
      title: '操作',
      key: 'actions',
      render: (_, trial) => (
        isBlockingTrial(trial) ? (
            <Button size="small" danger onClick={() => handleEndTrial(trial)}>提前终止</Button>
          ) : trial.status === 'recruiting' && trial.claimedCount >= trial.targetCount ? (
            <span className={styles.subText}>{isAdmin ? '名额已满' : '已满，可发布新一轮'}</span>
          ) : trial.status === 'recruiting' ? (
            <span className={styles.subText}>{isAdmin ? '已截止' : '已截止，可发布新一轮'}</span>
          ) : <span className={styles.subText}>历史活动</span>
      ),
    },
  ];

  const trialApplicationStatusMeta: Record<ManagedTrialApplication['status'], { label: string; color: string }> = {
    APPLIED: { label: '待审核', color: 'gold' },
    APPROVED: { label: '待发货', color: 'blue' },
    REJECTED: { label: '已驳回', color: 'red' },
    SHIPPED: { label: '待收货', color: 'cyan' },
    RECEIVED: { label: '可发布报告', color: 'green' },
    PENDING_REDEMPTION: { label: '待核销', color: 'blue' },
    REDEEMED: { label: '已核销', color: 'green' },
    COMPLETED: { label: '已发布报告', color: 'purple' },
    EXPIRED: { label: '已过期', color: 'default' },
  };

  const trialApplicationColumns: ColumnsType<ManagedTrialApplication> = [
    { title: '商品', dataIndex: 'productName' },
    {
      title: '试用方式',
      dataIndex: 'trialType',
      responsive: ['md'],
      render: (trialType: ManagedTrialApplication['trialType']) => (
        <Tag color={trialType === 'ONLINE' ? 'blue' : 'purple'}>{trialType === 'ONLINE' ? '线上' : '线下'}</Tag>
      ),
    },
    { title: '申请用户', key: 'user', render: (_, item) => item.nickName || item.userName },
    { title: '申请理由', dataIndex: 'applyReason', ellipsis: true, responsive: ['md'] },
    {
      title: '收货信息',
      key: 'shipping',
      responsive: ['md'],
      render: (_, item) => (
        item.trialType === 'ONLINE' ? (
          <div>
            <div>{item.recipientName} · {item.recipientPhone}</div>
            <div className={styles.subText}>{item.shippingAddress}</div>
          </div>
        ) : <span className={styles.subText}>线下试用无需寄送</span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: ManagedTrialApplication['status']) => (
        <Tag color={trialApplicationStatusMeta[status].color}>{trialApplicationStatusMeta[status].label}</Tag>
      ),
    },
    {
      title: '物流',
      key: 'logistics',
      responsive: ['md'],
      render: (_, item) => item.trialType === 'OFFLINE' ? '无需物流' : item.trackingNo
        ? [item.carrier, item.trackingNo].filter(Boolean).join(' · ') : '-',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, item) => (
        <Space wrap size={6}>
          {item.status === 'APPLIED' && (
            <Button size="small" type="primary" onClick={() => openReviewApplication(item)}>审核</Button>
          )}
          {item.status === 'APPROVED' && item.trialType === 'ONLINE' && (
            <Button size="small" type="primary" icon={<TruckOutlined />} onClick={() => openTrialApplicationAction(item, 'ship')}>
              发货
            </Button>
          )}
          {item.status === 'PENDING_REDEMPTION' && item.trialType === 'OFFLINE' && (
            <span className={styles.subText}>等待用户到店出示核销码</span>
          )}
          {item.status === 'REDEEMED' && item.trialType === 'OFFLINE' && <span className={styles.subText}>等待用户发布报告</span>}
          {!['APPLIED', 'APPROVED', 'PENDING_REDEMPTION', 'REDEEMED'].includes(item.status) && (
            <span className={styles.subText}>等待用户流程</span>
          )}
        </Space>
      ),
    },
  ];

  if (sessionLoading) {
    return (
      <main className={styles.sessionLoading}>
        <Spin size="large" />
      </main>
    );
  }

  if (!session) {
    return (
      <main className={styles.loginShell}>
          <section className={styles.loginBrand}>
            <div className={styles.brandMark}>甄</div>
            <div>
              <p className={styles.eyebrow}>甄客行管理台</p>
              <h1>内容、供给与履约在这里对账</h1>
            </div>
            <p className={styles.brandCopy}>平台统一使用认证、权限和登录日志，用户端账号与后台账号相互隔离。</p>
          </section>

          <section className={styles.loginPanel}>
            <div className={styles.loginTitle}>
              <SafetyCertificateOutlined />
              <div>
                <h2>管理员登录</h2>
                <p>使用后台账号进入管理中心</p>
              </div>
            </div>
            <Form
              form={loginForm}
              layout="vertical"
              onFinish={handleLogin}
              className={styles.loginForm}
            >
              <Form.Item name="username" label="账号" rules={[{ required: true, message: '请输入账号' }]}>
                <Input size="large" placeholder="请输入管理员或商家账号" autoComplete="username" />
              </Form.Item>
              <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
                <Input.Password size="large" placeholder="请输入登录密码" autoComplete="current-password" />
              </Form.Item>
              {captcha.enabled && (
                <Form.Item name="code" label="验证码" rules={[{ required: true, message: '请输入验证码结果' }]}>
                  <div className={styles.captchaRow}>
                    <Input size="large" placeholder="请输入验证码结果" autoComplete="off" />
                    <button type="button" className={styles.captchaButton} onClick={loadCaptcha} title="刷新验证码">
                      <img src={captcha.image} alt="验证码" />
                    </button>
                  </div>
                </Form.Item>
              )}
              <Button type="primary" size="large" block htmlType="submit" icon={<CheckCircleOutlined />} loading={loginSubmitting}>
                进入后台
              </Button>
            </Form>
          </section>
      </main>
    );
  }

  const navItems = availableNavKeys.map((key) => ({
    key,
    icon: navMeta[key].icon,
    label: navMeta[key].label,
  }));

  const pageProps: AdminPagePropsMap = {
    dashboard: {
      summary: dashboardSummary,
      isAdmin,
    },
    users: {
      users: shopUsers,
      columns: shopUserColumns,
      loading: shopUsersLoading,
      total: shopUserTotal,
      page: userPage,
      keyword: userKeyword,
      status: userStatus,
      levelId: userLevelId,
      levels: memberLevels,
      onKeywordChange: setUserKeyword,
      onStatusChange: setUserStatus,
      onLevelChange: setUserLevelId,
      onLoad: (page) => void loadShopUsers(page),
      onReset: resetShopUserFilters,
    },
    coupons: {
      session,
    },
    products: {
      isAdmin,
      canEditCategory: hasPermission('shop:category:edit'),
      canAddProduct: hasPermission('shop:product:add'),
      products: filteredProducts,
      columns: productColumns,
      loading: productsLoading,
      total: productTotal,
      page: productPage,
      keyword: productKeyword,
      categoryFilter: productCategoryFilter,
      statusFilter: productStatusFilter,
      categories: productCategories,
      onKeywordChange: setProductKeyword,
      onCategoryChange: (value) => {
        setProductCategoryFilter(value);
        void loadProducts(session, 1, {
          keyword: productKeyword,
          category: value,
          status: productStatusFilter,
        });
      },
      onStatusChange: (value) => {
        setProductStatusFilter(value);
        void loadProducts(session, 1, {
          keyword: productKeyword,
          category: productCategoryFilter,
          status: value,
        });
      },
      onSearch: (page) => void loadProducts(session, page),
      onReset: () => resetProductFilters(),
      onOpenCategorySettings: () => void openCategorySettings(),
      onCreateProduct: openCreateProduct,
    },
    orders: {
      isAdmin,
      orders: filteredOrders,
      columns: orderColumns,
      loading: ordersLoading,
      total: orderTotal,
      page: orderPage,
      keyword: orderKeyword,
      statusFilter: orderStatusFilter,
      onKeywordChange: setOrderKeyword,
      onStatusChange: (value) => {
        setOrderStatusFilter(value);
        void loadOrders(session, 1, { keyword: orderKeyword, status: value });
      },
      onOpenRedeem: () => setOrderRedeemScanOpen(true),
      onLoad: (page) => void loadOrders(session, page),
      onReset: () => resetOrderFilters(),
    },
    trials: {
      isAdmin,
      trials: visibleTrials,
      trialColumns,
      trialsLoading,
      trialPage,
      trialTotal,
      applications: trialApplications,
      applicationColumns: trialApplicationColumns,
      applicationsLoading: trialApplicationsLoading,
      applicationPage: trialApplicationPage,
      applicationTotal: trialApplicationTotal,
      onPublish: () => void openPublishTrial(),
      onOpenRedeem: () => setRedeemScanOpen(true),
      onLoadTrials: (page) => void loadTrials(session, page),
      onLoadApplications: (page) => void loadTrialApplications(session, page),
    },
    reports: {
      reports: visibleReports,
      columns: reportColumns,
      loading: reportsLoading,
      page: reportPage,
      total: reportTotal,
      onLoad: (page) => void loadReports(session, page),
    },
    merchants: {
      merchants,
      loading: merchantsLoading,
      page: merchantPage,
      total: merchantTotal,
      onLoad: (page) => void loadMerchants(page),
      onOpenDetail: (merchant) => void handleOpenMerchantDetail(merchant),
      onAudit: handleOpenAuditMerchant,
      onToggleStatus: (merchant) => void handleToggleMerchantStatus(merchant),
    },
  };

  const confirmOrderRedeem = async () => {
    if (!session || !orderRedeemPreview) return;
    setOrderRedeeming(true);
    try {
      await redeemShopOrder(session, orderRedeemPreview.code);
      message.success('线下订单已核销');
      setOrderRedeemPreview(null);
      await loadOrders(session);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '核销失败');
    } finally {
      setOrderRedeeming(false);
    }
  };

  const handleNavClick = (key: NavKey) => {
    if (key !== activeNav) navigate(adminNavPaths[key]);
    setMobileMenuOpen(false);
  };

  return (
    <AdminPageContext.Provider value={{ pages: pageProps, hasPermission }}>
      <>
      <Layout className={styles.appShell}>
        <Sider width={232} className={styles.sider} breakpoint="md" collapsedWidth={0} trigger={null}>
          <div className={styles.logoBlock}>
            <span className={styles.logoMark}>甄</span>
            <div>
              <strong>甄客行</strong>
              <span>{isAdmin ? '管理员后台' : '商家后台'}</span>
            </div>
          </div>
          <Menu
            mode="inline"
            selectedKeys={[activeNav]}
            items={navItems}
            onClick={({ key }) => handleNavClick(key as NavKey)}
            className={styles.sideMenu}
          />
        </Sider>

        <Drawer
          {...responsiveDrawerProps}
          title="导航菜单"
          placement="left"
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          size={260}
          className={styles.mobileDrawer}
          styles={{ body: { padding: 0 } }}
        >
          <div className={styles.drawerLogo}>
            <span className={styles.logoMark}>甄</span>
            <div>
              <strong>甄客行</strong>
              <span>{isAdmin ? '管理员后台' : '商家后台'}</span>
            </div>
          </div>
          <Menu
            mode="inline"
            selectedKeys={[activeNav]}
            items={navItems}
            onClick={({ key }) => handleNavClick(key as NavKey)}
            className={styles.drawerMenu}
          />
        </Drawer>

        <Layout>
          <Header className={styles.header}>
            <div className={styles.headerLeft}>
              <Button
                icon={<MenuOutlined />}
                type="text"
                className={styles.mobileMenuBtn}
                onClick={() => setMobileMenuOpen(true)}
              />
              <div className={styles.headerTitle}>
                <p className={styles.eyebrow}>{isAdmin ? '全平台数据视角' : `${session.name} 数据视角`}</p>
                <h2>{navMeta[activeNav].label}</h2>
              </div>
            </div>
            <div className={styles.headerRight}>
              <Tag color={isAdmin ? 'green' : 'blue'} className={styles.userTag}>
                {isAdmin ? '管理员权限' : '商家权限'}
              </Tag>
              <span className={styles.userName}>{session.name}</span>
              <Button aria-label="退出登录" icon={<LogoutOutlined />} onClick={handleLogout} className={styles.logoutBtn}>
                <span className={styles.logoutText}>退出</span>
              </Button>
            </div>
          </Header>

          <Content className={styles.content}>
            {availableNavKeys.includes(activeNav) ? (
              <Outlet />
            ) : (
              <Result status="403" title="无权访问" subTitle="当前账号没有访问该管理模块的权限，正在返回工作台。" />
            )}
          </Content>
        </Layout>
      </Layout>

      <ProductDialogs
        categoryModalOpen={categoryModalOpen}
        categoriesLoading={categoriesLoading}
        categoryDrafts={categoryDrafts}
        onCategoryModalClose={() => setCategoryModalOpen(false)}
        onCategoryDraftsChange={setCategoryDrafts}
        onCreateCategory={createCategory}
        onSaveCategory={(item) => void saveCategory(item)}
        onDeleteCategory={(item) => void removeCategory(item)}
        editingProductId={editingProductId}
        productDrawerOpen={productDrawerOpen}
        productForm={productForm}
        productCategories={productCategories}
        productSaving={productSaving}
        session={session}
        onProductDrawerClose={closeProductDrawer}
        onSaveProduct={(values) => void handleSaveProduct(values)}
      />

      <ProductCertificationDialog
        open={certificationOpen}
        product={certificationProduct}
        certification={productCertification}
        loading={certificationLoading}
        submitting={certificationSubmitting}
        onClose={closeProductCertification}
        onSubmit={(body) => void handleProductCertificationSubmit(body)}
        onOpenMaterial={(material) => void handleOpenCertificationMaterial(material)}
      />

      <OrderDialogs
        isAdmin={isAdmin}
        detailOrder={detailOrder}
        orderLogisticsDialog={orderLogisticsDialog}
        orderLogisticsLoading={orderLogisticsLoading}
        refundAuditOrder={refundAuditOrder}
        refundAuditDecision={refundAuditDecision}
        refundAuditForm={refundAuditForm}
        refundAuditing={refundAuditing}
        shippingOrder={shippingOrder}
        orderShipForm={orderShipForm}
        orderShipping={orderShipping}
        getMerchantName={getMerchantName}
        onDetailClose={() => setDetailOrder(null)}
        onOpenLogistics={(order) => void openOrderLogistics(order)}
        onLogisticsClose={() => setOrderLogisticsDialog(null)}
        onOpenRefundAudit={openRefundAudit}
        onRefundAuditClose={closeRefundAudit}
        onRefundAuditSubmit={(values) => void submitRefundAudit(values)}
        onShipmentClose={closeOrderShipment}
        onShipmentSubmit={(values) => void submitOrderShipment(values)}
      />
      <MerchantAuditDialog
        auditOpen={merchantModalOpen}
        auditDecision={merchantAuditDecision}
        auditForm={merchantForm}
        onAuditClose={() => setMerchantModalOpen(false)}
        onAuditSubmit={(values) => void handleSaveMerchant(values)}
      />
      <TrialDialogs
        trialModalOpen={trialModalOpen}
        trialForm={trialForm}
        trialProductOptions={trialProductOptions}
        selectedTrialAvailableTypes={selectedTrialAvailableTypes}
        selectedTrialProductId={selectedTrialProductId}
        trialSaving={trialSaving}
        applicationAction={trialApplicationAction}
        selectedApplication={selectedTrialApplication}
        applicationActionForm={trialApplicationActionForm}
        onTrialClose={closeTrialModal}
        onTrialSubmit={(values) => void handlePublishTrial(values)}
        onProductSearch={(keyword) => {
          if (trialProductSearchTimer.current) clearTimeout(trialProductSearchTimer.current);
          trialProductSearchTimer.current = setTimeout(() => {
            void loadTrialProductOptions(keyword);
          }, 300);
        }}
        onProductChange={async (productId) => {
          try {
            const availableTypes = await fetchAvailableTrialTypes(productId);
            setSelectedTrialAvailableTypes(availableTypes);
            trialForm.setFieldValue('trialTypes', availableTypes.length > 0 ? [availableTypes[0]] : []);
          } catch (error) {
            setSelectedTrialAvailableTypes([]);
            trialForm.setFieldValue('trialTypes', []);
            message.error(error instanceof Error ? error.message : '试用方式加载失败');
          }
        }}
        onApplicationActionClose={closeTrialApplicationAction}
        onApplicationActionSubmit={(values) => void submitTrialApplicationAction(values)}
        reviewApplication={reviewApplication}
        reviewSubmitting={reviewSubmitting}
        onReviewClose={closeReviewApplication}
        onReviewApprove={() => void approveReviewApplication()}
        onReviewReject={(remark) => void rejectReviewApplication(remark)}
      />

      <RedeemScanModal
        open={redeemScanOpen}
        redeeming={redeeming}
        onClose={() => setRedeemScanOpen(false)}
        onRecognized={(code) => handleRedeem(code)}
      />

      <RedeemConfirmModal
        open={Boolean(trialRedeemPreview)}
        title="确认核销线下试用"
        loading={redeeming}
        onCancel={() => setTrialRedeemPreview(null)}
        onConfirm={() => void confirmTrialRedeem()}
        items={trialRedeemPreview ? [
          { label: '试用活动', value: trialRedeemPreview.application.campaignTitle },
          { label: '试用商品', value: trialRedeemPreview.application.productName },
          { label: '领取用户', value: `${trialRedeemPreview.application.nickName || trialRedeemPreview.application.userName}（${trialRedeemPreview.application.userName}）` },
          { label: '试用方式', value: '到店试用' },
        ] : []}
      />

      <RedeemScanModal
        open={orderRedeemScanOpen}
        redeeming={orderRedeeming}
        title="线下订单核销"
        description="对准用户出示的订单核销码，识别成功后先核对订单和用户信息，再确认核销。"
        onClose={() => setOrderRedeemScanOpen(false)}
        onRecognized={(code) => handleOrderRedeem(code)}
      />

      <RedeemConfirmModal
        open={Boolean(orderRedeemPreview)}
        title="确认核销线下订单"
        loading={orderRedeeming}
        onCancel={() => setOrderRedeemPreview(null)}
        onConfirm={() => void confirmOrderRedeem()}
        items={orderRedeemPreview ? [
          { label: '订单编号', value: orderRedeemPreview.order.orderNo },
          { label: '购买用户', value: orderRedeemPreview.order.buyerName },
          { label: '商品', value: orderRedeemPreview.order.productTitles.join('、') },
          { label: '数量', value: `${orderRedeemPreview.order.itemCount} 件` },
          { label: '实付金额', value: `¥${orderRedeemPreview.order.amount.toFixed(2)}` },
        ] : []}
      />

      <MerchantDetailDialog
        detailMerchant={detailMerchant}
        onDetailClose={() => setDetailMerchant(null)}
      />
      </>
    </AdminPageContext.Provider>
  );
}

export default function AdminHomePage() {
  return (
    <ConfigProvider theme={adminTheme} locale={zhCN}>
      <AntApp>
        <AdminWorkspace />
      </AntApp>
    </ConfigProvider>
  );
}
