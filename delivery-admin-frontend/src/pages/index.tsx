import {
  AppstoreOutlined,
  AuditOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  EditOutlined,
  FileSearchOutlined,
  LogoutOutlined,
  MenuOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  ShopOutlined,
  ShoppingOutlined,
  RiseOutlined,
  TeamOutlined,
  TruckOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { Column, Line, Pie } from '@ant-design/charts';
import {
  Button,
  Checkbox,
  ConfigProvider,
  Drawer,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Layout,
  Menu,
  Modal,
  Select,
  Space,
  Spin,
  Statistic,
  Switch,
  Table,
  Tag,
  Upload,
  App as AntApp,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { AdminSession, ManagedOrder, ManagedProduct, ManagedReport, ManagedTrialApplication, ManagedTrialRecruitment, MerchantAccount, NavKey, ProductCategory, ProductCategoryOption, ProductStatus, ShopMemberLevel, ShopUserAccount } from '@/types';
import {
  auditMerchantOrderRefund,
  auditMerchantTrialApplication,
  createMerchantProduct,
  createMerchantTrial,
  fetchAdminCaptcha,
  fetchAdminOrder,
  fetchAdminOrders,
  auditMerchant,
  fetchAllProductCategories,
  fetchManagedProducts,
  fetchManagedTrials,
  fetchMerchantDetail,
  fetchMerchantOrder,
  fetchMerchantOrders,
  fetchMerchantReports,
  fetchMerchantTrialApplications,
  fetchMerchants,
  fetchProductCategories,
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
  shipMerchantOrder,
  uploadAdminFile,
  type CaptchaState,
} from '@/services/adminApi';
import { filterRowsForSession, getAvailableNavKeys, hasGlobalAccess } from '@/utils/access';
import {
  buildOrderStatusChart,
  buildOrderTrendChart,
  buildProductStatusPie,
  getDashboardStats,
} from '@/utils/adminDashboard';
import { filterOrders, type OrderStatusFilter } from '@/utils/orderManagement';
import { filterProducts, type ProductCategoryFilter, type ProductStatusFilter } from '@/utils/productFilters';
import styles from './index.less';

const { Header, Sider, Content } = Layout;

type DashboardMetric = {
  key: 'productTotal' | 'onSaleCount' | 'orderTotal' | 'todayOrders' | 'salesAmount' | 'userTotal' | 'reportTotal';
  title: string;
  hint: string;
  icon: ReactNode;
  tone: 'green' | 'gold' | 'blue' | 'red';
  money?: boolean;
};

const dashboardMetrics: readonly DashboardMetric[] = [
  { key: 'productTotal', title: '商品总数', hint: '当前权限范围内商品', icon: <AppstoreOutlined />, tone: 'green' },
  { key: 'onSaleCount', title: '在售数', hint: '可在用户端展示', icon: <ShopOutlined />, tone: 'gold' },
  { key: 'orderTotal', title: '订单总数', hint: '全部订单状态合计', icon: <AuditOutlined />, tone: 'blue' },
  { key: 'todayOrders', title: '今日订单数', hint: '按下单日期统计', icon: <TruckOutlined />, tone: 'red' },
  { key: 'salesAmount', title: '总销售额', hint: '排除待付款、已取消、已退款', icon: <RiseOutlined />, tone: 'green', money: true },
  { key: 'userTotal', title: '用户数', hint: '平台用户或当前买家', icon: <TeamOutlined />, tone: 'blue' },
  { key: 'reportTotal', title: '报告总数', hint: '全部验证报告数量', icon: <SafetyCertificateOutlined />, tone: 'gold' },
];

type LoginFormValues = {
  username: string;
  password: string;
  code?: string;
};

type ProductFormValues = {
  title: string;
  subtitle?: string;
  categoryId: number;
  imageUrl: string;
  detail: string;
  price: number;
  stock: number;
};

type MerchantFormValues = {
  decision: 'APPROVED' | 'REJECTED';
  auditRemark?: string;
};

type TrialFormValues = {
  productId: number;
  trialTypes: Array<'ONLINE' | 'OFFLINE'>;
  campaignTitle: string;
  campaignSummary: string;
  targetCount: number;
  deadline: string;
};

type TrialApplicationActionFormValues = {
  auditRemark?: string;
  carrier?: string;
  trackingNo?: string;
};

type OrderShipFormValues = {
  carrier: string;
  trackingNo: string;
};

type RefundAuditFormValues = {
  decision: 'APPROVED' | 'REJECTED';
  auditRemark?: string;
};

const adminTheme = {
  token: {
    colorPrimary: '#1f6f5b',
    borderRadius: 8,
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
  },
};

const responsiveModalProps = { rootClassName: styles.responsiveModal } as const;
const responsiveDrawerProps = { rootClassName: styles.responsiveDrawer } as const;

const navMeta: Record<NavKey, { label: string; icon: React.ReactNode }> = {
  dashboard: { label: '数据看板', icon: <BarChartOutlined /> },
  users: { label: '用户管理', icon: <TeamOutlined /> },
  products: { label: '商品管理', icon: <ShoppingOutlined /> },
  trials: { label: '试用招募', icon: <SafetyCertificateOutlined /> },
  orders: { label: '订单管理', icon: <TruckOutlined /> },
  reports: { label: '验证报告', icon: <FileSearchOutlined /> },
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

function getManagedReportTypeMeta(report: ManagedReport) {
  if (report.reportSource === 'PURCHASE') return { label: '购买评价', color: 'green' };
  return report.trialType === 'OFFLINE'
    ? { label: '线下试用报告', color: 'purple' }
    : { label: '线上试用报告', color: 'blue' };
}

function AdminWorkspace() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [captcha, setCaptcha] = useState<CaptchaState>({ enabled: false, image: '', uuid: '' });
  const [activeNav, setActiveNav] = useState<NavKey>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [products, setProducts] = useState<ManagedProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSaving, setProductSaving] = useState(false);
  const [productCategories, setProductCategories] = useState<ProductCategoryOption[]>([]);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryDrafts, setCategoryDrafts] = useState<ProductCategoryOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [orders, setOrders] = useState<ManagedOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [shippingOrder, setShippingOrder] = useState<ManagedOrder | null>(null);
  const [orderShipping, setOrderShipping] = useState(false);
  const [refundAuditOrder, setRefundAuditOrder] = useState<ManagedOrder | null>(null);
  const [refundAuditing, setRefundAuditing] = useState(false);
  const [reports, setReports] = useState<ManagedReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [trialRecruitments, setTrialRecruitments] = useState<ManagedTrialRecruitment[]>([]);
  const [trialsLoading, setTrialsLoading] = useState(false);
  const [trialSaving, setTrialSaving] = useState(false);
  const [trialApplications, setTrialApplications] = useState<ManagedTrialApplication[]>([]);
  const [trialApplicationsLoading, setTrialApplicationsLoading] = useState(false);
  const [trialApplicationAction, setTrialApplicationAction] = useState<'reject' | 'ship' | null>(null);
  const [selectedTrialApplication, setSelectedTrialApplication] = useState<ManagedTrialApplication | null>(null);
  const [merchants, setMerchants] = useState<MerchantAccount[]>([]);
  const [merchantsLoading, setMerchantsLoading] = useState(false);
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
  const [detailOrder, setDetailOrder] = useState<ManagedOrder | null>(null);
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
  const productImageUrl = Form.useWatch('imageUrl', productForm);
  const merchantAuditDecision = Form.useWatch('decision', merchantForm);
  const refundAuditDecision = Form.useWatch('decision', refundAuditForm);
  const getMerchantName = (merchantId: number) => merchants.find((merchant) => merchant.id === merchantId)?.name ?? '未知商家';

  const visibleProducts = useMemo(() => filterRowsForSession(products, session), [products, session]);
  const visibleOrders = useMemo(() => filterRowsForSession(orders, session), [orders, session]);
  const visibleReports = useMemo(() => filterRowsForSession(reports, session), [reports, session]);
  const visibleTrials = useMemo(() => filterRowsForSession(trialRecruitments, session), [trialRecruitments, session]);
  const trialProductIds = useMemo(() => visibleTrials.filter((t) => t.status === 'recruiting').map((t) => t.productId), [visibleTrials]);
  const filteredProducts = useMemo(
    () =>
      filterProducts(visibleProducts, {
        category: productCategoryFilter,
        status: productStatusFilter,
        keyword: productKeyword,
        getMerchantName,
        trialProductIds,
      }),
    [merchants, productCategoryFilter, productKeyword, productStatusFilter, visibleProducts, trialProductIds],
  );
  const filteredOrders = useMemo(
    () =>
      filterOrders(visibleOrders, {
        status: orderStatusFilter,
        keyword: orderKeyword,
      }),
    [orderKeyword, orderStatusFilter, visibleOrders],
  );
  const isAdmin = hasGlobalAccess(session);
  const hasPermission = (permission: string) =>
    Boolean(session?.permissions?.includes('*:*:*') || session?.permissions?.includes(permission));
  const availableNavKeys = getAvailableNavKeys(session).filter(
    (key) => (key !== 'users' || hasPermission('shop:user:list'))
      && (key !== 'merchants' || hasPermission('shop:merchant:list')),
  );

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const userTotal = isAdmin ? shopUserTotal : new Set(visibleOrders.map((order) => order.buyerName)).size;

    return getDashboardStats({
      products: visibleProducts,
      orders: visibleOrders,
      reports: visibleReports,
      userTotal,
      today,
    });
  }, [isAdmin, shopUserTotal, visibleOrders, visibleProducts, visibleReports]);

  const orderStatusChartData = useMemo(() => buildOrderStatusChart(visibleOrders), [visibleOrders]);
  const orderTrendChartData = useMemo(() => buildOrderTrendChart(visibleOrders), [visibleOrders]);
  const productStatusPieData = useMemo(() => buildProductStatusPie(visibleProducts), [visibleProducts]);
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

  const loadMerchants = async () => {
    setMerchantsLoading(true);
    try {
      const result = await fetchMerchants();
      setMerchants(result.rows);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '商家列表加载失败');
    } finally {
      setMerchantsLoading(false);
    }
  };

  const loadProducts = async (currentSession = session) => {
    if (!currentSession) return;
    setProductsLoading(true);
    try {
      const [productResult, categories] = await Promise.all([
        fetchManagedProducts(currentSession),
        fetchProductCategories(),
      ]);
      setProducts(productResult.rows);
      setProductCategories(categories);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '商品列表加载失败');
    } finally {
      setProductsLoading(false);
    }
  };

  const loadTrials = async (currentSession = session) => {
    if (!currentSession) return;
    setTrialsLoading(true);
    try {
      const result = await fetchManagedTrials(currentSession);
      setTrialRecruitments(result.rows);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '试用招募加载失败');
    } finally {
      setTrialsLoading(false);
    }
  };

  const loadOrders = async (currentSession = session) => {
    if (!currentSession) return;
    setOrdersLoading(true);
    try {
      const result = currentSession.loginType === 'admin'
        ? await fetchAdminOrders()
        : await fetchMerchantOrders();
      setOrders(result.rows);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '订单列表加载失败');
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadReports = async (currentSession = session) => {
    if (currentSession?.loginType !== 'merchant') {
      setReports([]);
      return;
    }
    setReportsLoading(true);
    try {
      setReports(await fetchMerchantReports());
    } catch (error) {
      message.error(error instanceof Error ? error.message : '验证报告加载失败');
    } finally {
      setReportsLoading(false);
    }
  };

  const loadTrialApplications = async (currentSession = session) => {
    if (currentSession?.loginType !== 'merchant') return;
    setTrialApplicationsLoading(true);
    try {
      const result = await fetchMerchantTrialApplications();
      setTrialApplications(result.rows);
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

  useEffect(() => {
    if (!session) return;
    const permissions = session.permissions ?? [];
    if (permissions.includes('*:*:*') || permissions.includes('shop:product:list')) {
      void loadProducts(session);
    }
    if (permissions.includes('*:*:*') || permissions.includes('shop:trial:list')) {
      void loadTrials(session);
      if (session.loginType === 'merchant') void loadTrialApplications(session);
    }
    if (session.loginType === 'merchant') {
      void loadReports(session);
    }
    void loadOrders(session);
  }, [session?.id]);

  useEffect(() => {
    if (session?.loginType !== 'admin') return;
    const permissions = session.permissions ?? [];
    if (!permissions.includes('*:*:*') && !permissions.includes('shop:user:list')) return;
    fetchShopMemberLevels()
      .then(setMemberLevels)
      .catch((error) => message.error(error instanceof Error ? error.message : '会员等级加载失败'));
    fetchShopUsers({ pageNum: 1, pageSize: 10 })
      .then((result) => {
        setShopUsers(result.rows);
        setShopUserTotal(result.total);
        setUserPage(1);
      })
      .catch((error) => message.error(error instanceof Error ? error.message : '用户列表加载失败'));
    if (permissions.includes('*:*:*') || permissions.includes('shop:merchant:list')) {
      void loadMerchants();
    }
  }, [session?.id]);

  const handleLogin = async (values: LoginFormValues) => {
    setLoginSubmitting(true);
    try {
      const loggedIn = await loginAdmin({ ...values, uuid: captcha.uuid });
      setSession(loggedIn);
      setActiveNav('dashboard');
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
    setActiveNav('dashboard');
    setProductDrawerOpen(false);
    setEditingProductId(null);
    setDetailOrder(null);
    setShippingOrder(null);
    resetProductFilters();
    resetOrderFilters();
    setShopUsers([]);
    setProducts([]);
    setProductCategories([]);
    setTrialRecruitments([]);
    setTrialApplications([]);
    setOrders([]);
    setShopUserTotal(0);
    loginForm.resetFields();
    await loadCaptcha();
  };

  const resetProductFilters = () => {
    setProductCategoryFilter('all');
    setProductStatusFilter('all');
    setProductKeyword('');
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

  const saveCategory = async (categoryItem: ProductCategoryOption) => {
    try {
      await updateProductCategory(categoryItem.categoryId, {
        categoryName: categoryItem.categoryName.trim(),
        categorySort: categoryItem.categorySort,
        status: categoryItem.status,
      });
      const [allCategories, enabledCategories] = await Promise.all([
        fetchAllProductCategories(),
        fetchProductCategories(),
      ]);
      setCategoryDrafts(allCategories);
      setProductCategories(enabledCategories);
      message.success('分类设置已保存，商品关联保持不变');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '分类保存失败');
    }
  };

  const resetOrderFilters = () => {
    setOrderStatusFilter('all');
    setOrderKeyword('');
  };

  const openCreateProduct = () => {
    setEditingProductId(null);
    productForm.resetFields();
    productForm.setFieldsValue({
      categoryId: productCategories[0]?.categoryId,
      imageUrl: '',
      detail: '',
      price: 99,
      stock: 20,
    });
    setProductDrawerOpen(true);
  };

  const openEditProduct = (product: ManagedProduct) => {
    setEditingProductId(product.id);
    productForm.setFieldsValue({
      title: product.title,
      subtitle: product.subtitle,
      categoryId: product.categoryId,
      imageUrl: product.imageUrl,
      detail: product.detail,
      price: product.price,
      stock: product.stock,
    });
    setProductDrawerOpen(true);
  };

  const closeProductDrawer = () => {
    setProductDrawerOpen(false);
    setEditingProductId(null);
    productForm.resetFields();
  };

  const handleSaveProduct = async (values: ProductFormValues) => {
    if (session?.loginType !== 'merchant') return;
    setProductSaving(true);
    try {
      const body = {
        categoryId: values.categoryId,
        productName: values.title.trim(),
        subtitle: values.subtitle?.trim(),
        detail: values.detail.trim(),
        coverUrl: values.imageUrl.trim(),
        price: values.price,
        stock: values.stock,
        imageUrls: [values.imageUrl.trim()],
      };
      if (editingProductId) await updateMerchantProduct(editingProductId, body);
      else await createMerchantProduct(body);
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
    if (session?.loginType !== 'merchant') return;
    const nextStatus = product.status === 'onSale' ? 'OFF_SALE' : 'ON_SALE';
    try {
      await updateMerchantProductSaleStatus(product.id, nextStatus);
      await loadProducts(session);
      message.success(nextStatus === 'ON_SALE' ? '商品已上架' : '商品已下架');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '商品状态更新失败');
    }
  };

  const openPublishTrial = (product?: ManagedProduct) => {
    trialForm.resetFields();
    if (product) {
      const availableTypes = getAvailableTrialTypes(product.id);
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
    }
    setTrialModalOpen(true);
  };

  const closeTrialModal = () => {
    setTrialModalOpen(false);
    trialForm.resetFields();
  };

  const isBlockingTrial = (trial: ManagedTrialRecruitment) => {
    const deadline = Date.parse(trial.deadline.replace(' ', 'T'));
    return trial.status === 'recruiting'
      && trial.claimedCount < trial.targetCount
      && (Number.isNaN(deadline) || deadline > Date.now());
  };

  const getAvailableTrialTypes = (productId?: number): Array<'ONLINE' | 'OFFLINE'> => {
    if (!productId) return ['ONLINE', 'OFFLINE'];
    const blocked = new Set(
      trialRecruitments
        .filter((trial) => trial.productId === productId && isBlockingTrial(trial))
        .map((trial) => trial.trialType),
    );
    return (['ONLINE', 'OFFLINE'] as const).filter((trialType) => !blocked.has(trialType));
  };

  const selectedTrialAvailableTypes = getAvailableTrialTypes(selectedTrialProductId);

  const handlePublishTrial = async (values: TrialFormValues) => {
    const product = visibleProducts.find((p) => p.id === values.productId);
    if (!product) {
      message.error('请选择有效的商品');
      return;
    }

    if (!session || session.loginType !== 'merchant') return;
    const availableTypes = getAvailableTrialTypes(values.productId);
    if (values.trialTypes.some((trialType) => !availableTypes.includes(trialType))) {
      message.warning('所选试用方式已有正在招募且未满的活动，请刷新后重新选择');
      return;
    }
    setTrialSaving(true);
    try {
      await createMerchantTrial({
        productId: values.productId,
        trialTypes: values.trialTypes,
        campaignTitle: values.campaignTitle.trim(),
        campaignSummary: values.campaignSummary.trim(),
        targetCount: values.targetCount,
        applicationDeadline: `${values.deadline} 23:59:59`,
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
        if (!session || session.loginType !== 'merchant') return;
        await updateMerchantTrialStatus(trial.id, 'CLOSED');
        await loadTrials(session);
        message.success('招募已结束');
      },
    });
  };

  const approveTrialApplication = (application: ManagedTrialApplication) => {
    modal.confirm({
      title: '确认通过试用申请？',
      content: application.trialType === 'ONLINE'
        ? `通过后可为 ${application.recipientName} 安排寄送。`
        : `通过后 ${application.nickName || application.userName} 即可发布本次线下试用的甄客验。`,
      okText: '通过申请',
      cancelText: '取消',
      onOk: async () => {
        await auditMerchantTrialApplication(application.applicationId, 'APPROVED');
        await Promise.all([loadTrialApplications(), loadTrials()]);
        message.success('试用申请已通过');
      },
    });
  };

  const openTrialApplicationAction = (application: ManagedTrialApplication, action: 'reject' | 'ship') => {
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
      if (trialApplicationAction === 'reject') {
        await auditMerchantTrialApplication(
          selectedTrialApplication.applicationId,
          'REJECTED',
          values.auditRemark?.trim(),
        );
        message.success('试用申请已驳回');
      } else {
        await shipMerchantTrialApplication(
          selectedTrialApplication.applicationId,
          values.carrier?.trim() ?? '',
          values.trackingNo?.trim() ?? '',
        );
        message.success('试用商品已发货');
      }
      closeTrialApplicationAction();
      await loadTrialApplications();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '试用申请处理失败');
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
      const shipped = await shipMerchantOrder(
        shippingOrder.id,
        values.carrier.trim(),
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
      const updated = await auditMerchantOrderRefund(
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
          <div>{user.loginDate || '尚未登录'}</div>
          {user.loginIp && <div className={styles.subText}>{user.loginIp}</div>}
        </div>
      ),
    },
    { title: '注册时间', dataIndex: 'createTime', responsive: ['md'], render: (value?: string) => value || '-' },
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
            <div className={styles.subText}>{product.artisanName}</div>
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
          {isAdmin ? <span className={styles.subText}>仅查看</span> : (
            <>
              <Button size="small" icon={<EditOutlined />} onClick={() => openEditProduct(product)}>
                编辑商品
              </Button>
              <Button size="small" onClick={() => void toggleProductStatus(product)}>
                {product.status === 'onSale' ? '下架' : '上架'}
              </Button>
              {product.status === 'onSale' && (
                <Button size="small" type="primary" onClick={() => openPublishTrial(product)}>
                  发布试用
                </Button>
              )}
            </>
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
      title: '公益捐赠',
      key: 'publicWelfare',
      responsive: ['md'],
      render: (_, order) => (
        <span>
          {formatMoney(Math.round(order.amount * 0.05 * 100) / 100)}
          <span className={styles.feeRate}>5%</span>
        </span>
      ),
    },
    {
      title: '甄客佣金',
      key: 'verifierCommission',
      responsive: ['md'],
      render: (_, order) => (
        <span>
          {formatMoney(Math.round(order.amount * 0.05 * 100) / 100)}
          <span className={styles.feeRate}>5%</span>
          {order.fromVerifierName && <span className={styles.verifierName}>→ {order.fromVerifierName}</span>}
        </span>
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
          {!isAdmin && (
            <Button size="small" icon={<TruckOutlined />} disabled={order.status !== 'paid'} onClick={() => openOrderShipment(order)}>
              发货
            </Button>
          )}
          <Button size="small" icon={<FileSearchOutlined />} onClick={() => void openOrderDetail(order)}>
            订单详情
          </Button>
          {!isAdmin && order.refundStatus === 'PENDING' && (
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
    { title: '不足', dataIndex: 'shortcoming', responsive: ['md'], render: (text) => <span className={styles.shortcoming}>{text}</span> },
    {
      title: '类型',
      key: 'reportType',
      render: (_, report) => {
        const meta = getManagedReportTypeMeta(report);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    { title: '有用数', dataIndex: 'usefulCount', responsive: ['md'] },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: ManagedReport['status']) => (
        <Tag color={status === 'published' ? 'green' : 'default'}>{status === 'published' ? '展示中' : '已下架'}</Tag>
      ),
    },
    { title: '操作', key: 'actions', responsive: ['md'], render: () => <span className={styles.subText}>仅查看</span> },
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
        isAdmin ? <span className={styles.subText}>仅查看</span>
          : isBlockingTrial(trial) ? (
            <Button size="small" danger onClick={() => handleEndTrial(trial)}>提前终止</Button>
          ) : trial.status === 'recruiting' && trial.claimedCount >= trial.targetCount ? (
            <span className={styles.subText}>已满，可发布新一轮</span>
          ) : trial.status === 'recruiting' ? (
            <span className={styles.subText}>已截止，可发布新一轮</span>
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
      render: (status: ManagedTrialApplication['status'], item) => (
        <Tag color={trialApplicationStatusMeta[status].color}>
          {status === 'APPROVED' && item.trialType === 'OFFLINE' ? '可发布报告' : trialApplicationStatusMeta[status].label}
        </Tag>
      ),
    },
    {
      title: '物流',
      key: 'logistics',
      responsive: ['md'],
      render: (_, item) => item.trialType === 'OFFLINE' ? '无需物流' : item.trackingNo ? `${item.carrier} ${item.trackingNo}` : '-',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, item) => (
        <Space wrap size={6}>
          {item.status === 'APPLIED' && (
            <>
              <Button size="small" type="primary" onClick={() => approveTrialApplication(item)}>通过</Button>
              <Button size="small" danger onClick={() => openTrialApplicationAction(item, 'reject')}>驳回</Button>
            </>
          )}
          {item.status === 'APPROVED' && item.trialType === 'ONLINE' && (
            <Button size="small" type="primary" icon={<TruckOutlined />} onClick={() => openTrialApplicationAction(item, 'ship')}>
              发货
            </Button>
          )}
          {(item.status === 'APPROVED' && item.trialType === 'OFFLINE') && <span className={styles.subText}>等待用户发布报告</span>}
          {!['APPLIED', 'APPROVED'].includes(item.status) && <span className={styles.subText}>等待用户流程</span>}
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
            <div className={styles.brandMark}>㤫</div>
            <div>
              <p className={styles.eyebrow}>㤫者商城后台</p>
              <h1>供给与信任在这里对账</h1>
            </div>
            <p className={styles.brandCopy}>平台账号统一使用认证、权限和登录日志，商城用户与后台账号相互隔离。</p>
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
                <Input size="large" />
              </Form.Item>
              <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
                <Input.Password size="large" />
              </Form.Item>
              {captcha.enabled && (
                <Form.Item name="code" label="验证码" rules={[{ required: true, message: '请输入验证码结果' }]}>
                  <div className={styles.captchaRow}>
                    <Input size="large" autoComplete="off" />
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

  const handleNavClick = (key: NavKey) => {
    setActiveNav(key);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <Layout className={styles.appShell}>
        <Sider width={232} className={styles.sider} breakpoint="md" collapsedWidth={0} trigger={null}>
          <div className={styles.logoBlock}>
            <span className={styles.logoMark}>㤫</span>
            <div>
              <strong>㤫者商城</strong>
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
            <span className={styles.logoMark}>㤫</span>
            <div>
              <strong>㤫者商城</strong>
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
            {activeNav === 'dashboard' && (
              <div className={styles.dashboardGrid}>
                {dashboardMetrics.map((metric) => {
                  const value = stats[metric.key];

                  return (
                    <div key={metric.key} className={`${styles.metricCard} ${styles[`metric${metric.tone}`]}`}>
                      <div className={styles.metricIcon}>{metric.icon}</div>
                      <div className={styles.metricBody}>
                        <span>{metric.title}</span>
                        <strong>{metric.money ? formatMoney(value) : value}</strong>
                        <small>{metric.key === 'userTotal' && !isAdmin ? '当前订单买家去重' : metric.hint}</small>
                      </div>
                    </div>
                  );
                })}
                <section className={styles.chartPanel}>
                  <div>
                    <p className={styles.eyebrow}>柱状图</p>
                    <h3>订单状态分布</h3>
                  </div>
                  <Column
                    data={orderStatusChartData}
                    xField="status"
                    yField="count"
                    height={260}
                    colorField="status"
                    axis={{ y: { title: false }, x: { title: false } }}
                    legend={false}
                  />
                </section>
                <section className={styles.chartPanel}>
                  <div>
                    <p className={styles.eyebrow}>折线图</p>
                    <h3>近 7 日订单趋势</h3>
                  </div>
                  <Line
                    data={orderTrendChartData}
                    xField="date"
                    yField="count"
                    height={260}
                    point={{ shapeField: 'circle', sizeField: 4 }}
                    axis={{ y: { title: false }, x: { title: false } }}
                  />
                </section>
                <section className={`${styles.chartPanel} ${styles.chartPanelCompact}`}>
                  <div>
                    <p className={styles.eyebrow}>饼图</p>
                    <h3>商品状态占比</h3>
                  </div>
                  <Pie
                    data={productStatusPieData}
                    angleField="count"
                    colorField="status"
                    height={260}
                    legend={{ color: { position: 'bottom' } }}
                    label={{ text: 'status', position: 'outside' }}
                  />
                </section>
              </div>
            )}

            {activeNav === 'users' && isAdmin && (
              <section className={styles.tableSurface}>
                <div className={styles.tableHeader}>
                  <div>
                    <p className={styles.eyebrow}>真实注册账号与会员等级</p>
                    <h3>商城用户</h3>
                  </div>
                  <Button icon={<ReloadOutlined />} onClick={() => loadShopUsers(userPage)} loading={shopUsersLoading}>
                    刷新
                  </Button>
                </div>
                <div className={styles.productToolbar}>
                  <Input
                    className={styles.productSearch}
                    prefix={<SearchOutlined />}
                    allowClear
                    placeholder="搜索用户名或昵称"
                    value={userKeyword}
                    onChange={(event) => setUserKeyword(event.target.value)}
                    onPressEnter={() => loadShopUsers(1)}
                  />
                  <Select
                    className={styles.productFilter}
                    allowClear
                    placeholder="全部等级"
                    value={userLevelId}
                    onChange={setUserLevelId}
                    options={memberLevels.map((level) => ({ value: level.levelId, label: level.levelName }))}
                  />
                  <Select
                    className={styles.productFilter}
                    allowClear
                    placeholder="全部状态"
                    value={userStatus}
                    onChange={setUserStatus}
                    options={[
                      { label: '正常', value: '0' },
                      { label: '停用', value: '1' },
                    ]}
                  />
                  <Button type="primary" icon={<SearchOutlined />} onClick={() => loadShopUsers(1)}>
                    查询
                  </Button>
                  <Button icon={<ReloadOutlined />} onClick={resetShopUserFilters}>
                    重置
                  </Button>
                  <span className={styles.filterSummary}>共 {shopUserTotal} 个用户</span>
                </div>
                <Table
                  rowKey="userId"
                  columns={shopUserColumns}
                  dataSource={shopUsers}
                  loading={shopUsersLoading}
                  scroll={{ x: 'max-content' }}
                  pagination={{
                    current: userPage,
                    pageSize: 10,
                    total: shopUserTotal,
                    showSizeChanger: false,
                    showTotal: (total) => `共 ${total} 条`,
                    onChange: (page) => loadShopUsers(page),
                  }}
                />
              </section>
            )}

            {activeNav === 'products' && (
              <section className={styles.tableSurface}>
                <div className={styles.tableHeader}>
                  <div>
                    <p className={styles.eyebrow}>商品上架、库存、成本</p>
                    <h3>商品管理</h3>
                  </div>
                  {isAdmin && hasPermission('shop:category:edit') && (
                    <Button icon={<EditOutlined />} onClick={() => void openCategorySettings()}>
                      分类设置
                    </Button>
                  )}
                  {!isAdmin && hasPermission('shop:product:add') && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreateProduct}>
                      新增商品
                    </Button>
                  )}
                </div>
                <div className={styles.productToolbar}>
                  <Input
                    className={styles.productSearch}
                    prefix={<SearchOutlined />}
                    allowClear
                    placeholder="搜索商品名、匠人/品牌或商家"
                    value={productKeyword}
                    onChange={(event) => setProductKeyword(event.target.value)}
                  />
                  <Select<ProductCategoryFilter>
                    className={styles.productFilter}
                    value={productCategoryFilter}
                    onChange={setProductCategoryFilter}
                    options={[
                      { label: '全部分类', value: 'all' },
                      ...productCategories.map((item) => ({ label: item.categoryName, value: item.categoryCode })),
                    ]}
                  />
                  <Select<ProductStatusFilter>
                    className={styles.productFilter}
                    value={productStatusFilter}
                    onChange={setProductStatusFilter}
                    options={[
                      { label: '全部状态', value: 'all' },
                      { label: '草稿', value: 'draft' },
                      { label: '在售', value: 'onSale' },
                      { label: '已下架', value: 'offSale' },
                      { label: '试用中', value: 'trial' },
                    ]}
                  />
                  <Button icon={<ReloadOutlined />} onClick={resetProductFilters}>
                    重置
                  </Button>
                  <span className={styles.filterSummary}>
                    共 {filteredProducts.length} / {visibleProducts.length} 个商品
                  </span>
                </div>
                <Table loading={productsLoading} rowKey="id" columns={productColumns} dataSource={filteredProducts} pagination={{ pageSize: 6 }} />
              </section>
            )}

            {activeNav === 'orders' && (
              <section className={styles.tableSurface}>
                <div className={styles.tableHeader}>
                  <div>
                    <p className={styles.eyebrow}>{isAdmin ? '平台全部真实订单，仅提供查询视角' : '真实订单、发货与收货地址'}</p>
                    <h3>订单管理</h3>
                  </div>
                  <Button icon={<ReloadOutlined />} onClick={() => void loadOrders()}>刷新订单</Button>
                </div>
                <div className={styles.productToolbar}>
                  <Input
                    className={styles.productSearch}
                    prefix={<SearchOutlined />}
                    allowClear
                    placeholder="搜索订单号或买家"
                    value={orderKeyword}
                    onChange={(event) => setOrderKeyword(event.target.value)}
                  />
                  <Select<OrderStatusFilter>
                    className={styles.orderFilter}
                    value={orderStatusFilter}
                    onChange={setOrderStatusFilter}
                    options={[
                      { label: '全部订单状态', value: 'all' },
                      { label: '待付款', value: 'unpaid' },
                      { label: '待发货', value: 'paid' },
                      { label: '待收货', value: 'shipped' },
                      { label: '已完成', value: 'completed' },
                      { label: '已取消', value: 'canceled' },
                      { label: '退款中', value: 'refunding' },
                      { label: '已退款', value: 'refunded' },
                    ]}
                  />
                  <Button icon={<ReloadOutlined />} onClick={resetOrderFilters}>
                    重置
                  </Button>
                  <span className={styles.filterSummary}>
                    共 {filteredOrders.length} / {visibleOrders.length} 个订单
                  </span>
                </div>
                <Table loading={ordersLoading} rowKey="id" columns={orderColumns} dataSource={filteredOrders} pagination={{ pageSize: 6 }} />
              </section>
            )}

            {activeNav === 'trials' && (
              <section className={styles.tableSurface}>
                <div className={styles.tableHeader}>
                  <div>
                    <p className={styles.eyebrow}>{isAdmin ? '所有商家的试用招募' : '发布试用招募，获取真实验证报告'}</p>
                    <h3>试用招募</h3>
                  </div>
                  {!isAdmin && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => openPublishTrial()}>
                      发布试用
                    </Button>
                  )}
                </div>
                <Table loading={trialsLoading} rowKey="id" columns={trialColumns} dataSource={visibleTrials} pagination={{ pageSize: 6 }} />
                {!isAdmin && (
                  <div style={{ marginTop: 28 }}>
                    <div className={styles.tableHeader}>
                      <div>
                        <p className={styles.eyebrow}>线上审核后寄送，线下审核后直接获得报告资格</p>
                        <h3>试用申请</h3>
                      </div>
                      <Button icon={<ReloadOutlined />} onClick={() => void loadTrialApplications()}>刷新申请</Button>
                    </div>
                    <Table
                      loading={trialApplicationsLoading}
                      rowKey="applicationId"
                      columns={trialApplicationColumns}
                      dataSource={trialApplications}
                      scroll={{ x: 'max-content' }}
                      pagination={{ pageSize: 6 }}
                    />
                  </div>
                )}
              </section>
            )}

            {activeNav === 'reports' && (
              <section className={styles.tableSurface}>
                <div className={styles.tableHeader}>
                  <div>
                    <p className={styles.eyebrow}>真实体验和必须展示的不足</p>
                    <h3>验证报告</h3>
                  </div>
                  {!isAdmin && (
                    <Button icon={<ReloadOutlined />} onClick={() => void loadReports()}>刷新报告</Button>
                  )}
                </div>
                <Table loading={reportsLoading} rowKey="id" columns={reportColumns} dataSource={visibleReports} pagination={{ pageSize: 6 }} />
              </section>
            )}

            {activeNav === 'merchants' && isAdmin && (
              <section className={styles.tableSurface}>
                <div className={styles.tableHeader}>
                  <div>
                    <p className={styles.eyebrow}>管理员专属</p>
                    <h3>商家管理</h3>
                  </div>
                  <Button icon={<ReloadOutlined />} onClick={() => void loadMerchants()} loading={merchantsLoading}>
                    刷新
                  </Button>
                </div>
                <Table
                  rowKey="id"
                  dataSource={merchants}
                  loading={merchantsLoading}
                  pagination={false}
                  scroll={{ x: 'max-content' }}
                  columns={[
                    { title: '申请商家', dataIndex: 'name', width: 120 },
                    { title: '申请编号', dataIndex: 'applicationNo', width: 190, responsive: ['md'] },
                    { title: '后台账号', dataIndex: 'username', width: 120, responsive: ['md'] },
                    { title: '负责人', dataIndex: 'ownerName', width: 80, responsive: ['md'] },
                    { title: '手机号', dataIndex: 'phone', width: 120, responsive: ['md'] },
                    { title: '公司地址', dataIndex: 'companyAddress', ellipsis: true, responsive: ['md'] },
                    { title: '入驻时间', dataIndex: 'registeredAt', width: 100, responsive: ['md'] },
                    { title: '商品数', dataIndex: 'productCount', width: 70, responsive: ['md'] },
                    { title: '订单数', dataIndex: 'orderCount', width: 70, responsive: ['md'] },
                    {
                      title: '状态',
                      key: 'status',
                      width: 120,
                      render: (_, merchant: MerchantAccount) => (
                        <Space size={4}>
                          <Tag color={merchant.auditStatus === 'approved' ? 'green' : merchant.auditStatus === 'rejected' ? 'red' : 'processing'}>
                            {merchant.auditStatus === 'approved' ? '已通过' : merchant.auditStatus === 'rejected' ? '已驳回' : '待审核'}
                          </Tag>
                          {merchant.auditStatus === 'approved' && (
                            <Tag color={merchant.status === 'active' ? 'blue' : 'default'}>{merchant.status === 'active' ? '启用' : '停用'}</Tag>
                          )}
                        </Space>
                      ),
                    },
                    {
                      title: '操作',
                      key: 'actions',
                      width: 68,
                      render: (_, merchant) => (
                        <Dropdown
                          menu={{
                            items: [
                              { key: 'view', label: '查看材料与审核记录', onClick: () => void handleOpenMerchantDetail(merchant) },
                              ...(merchant.auditStatus === 'pending'
                                ? [{ key: 'audit', label: '审核', onClick: () => handleOpenAuditMerchant(merchant) }]
                                : []),
                              ...(merchant.auditStatus === 'approved'
                                ? [{ key: 'toggle', label: merchant.status === 'active' ? '停用' : '启用', onClick: () => void handleToggleMerchantStatus(merchant) }]
                                : []),
                            ],
                          }}
                        >
                          <Button size="small">操作</Button>
                        </Dropdown>
                      ),
                    },
                  ]}
                />
              </section>
            )}
          </Content>
        </Layout>
      </Layout>

      <Modal
        {...responsiveModalProps}
        title="固定四分类设置"
        open={categoryModalOpen}
        onCancel={() => setCategoryModalOpen(false)}
        footer={null}
        width={760}
        destroyOnHidden
      >
        <p className={styles.subText}>分类编码永久稳定；修改显示名称、排序或启停不会改变已有商品关联。</p>
        <Table
          loading={categoriesLoading}
          rowKey="categoryId"
          pagination={false}
          dataSource={categoryDrafts}
          columns={[
            { title: '稳定编码', dataIndex: 'categoryCode', responsive: ['md'] },
            {
              title: '显示名称',
              key: 'name',
              render: (_, item: ProductCategoryOption) => (
                <Input
                  value={item.categoryName}
                  maxLength={50}
                  onChange={(event) => setCategoryDrafts((rows) => rows.map((row) => (
                    row.categoryId === item.categoryId ? { ...row, categoryName: event.target.value } : row
                  )))}
                />
              ),
            },
            {
              title: '排序',
              key: 'sort',
              width: 100,
              responsive: ['md'],
              render: (_, item: ProductCategoryOption) => (
                <InputNumber
                  min={1}
                  max={9999}
                  value={item.categorySort}
                  onChange={(value) => setCategoryDrafts((rows) => rows.map((row) => (
                    row.categoryId === item.categoryId ? { ...row, categorySort: value ?? 1 } : row
                  )))}
                />
              ),
            },
            {
              title: '启用',
              key: 'status',
              width: 90,
              render: (_, item: ProductCategoryOption) => (
                <Switch
                  checked={item.status === '0'}
                  onChange={(checked) => setCategoryDrafts((rows) => rows.map((row) => (
                    row.categoryId === item.categoryId ? { ...row, status: checked ? '0' : '1' } : row
                  )))}
                />
              ),
            },
            {
              title: '操作',
              key: 'action',
              width: 90,
              render: (_, item: ProductCategoryOption) => (
                <Button type="primary" size="small" onClick={() => void saveCategory(item)}>保存</Button>
              ),
            },
          ]}
        />
      </Modal>

      <Drawer
        {...responsiveDrawerProps}
        title={editingProductId ? '编辑商品' : '新增商品'}
        size="large"
        open={productDrawerOpen}
        onClose={closeProductDrawer}
        destroyOnHidden
      >
        <Form form={productForm} layout="vertical" onFinish={handleSaveProduct}>
          <Form.Item name="title" label="商品名" rules={[{ required: true, message: '请输入商品名' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="subtitle" label="商品副标题" rules={[{ max: 200, message: '副标题不能超过 200 个字' }]}>
            <Input placeholder="一句话说明商品特点（选填）" />
          </Form.Item>
          <Form.Item label="商品封面" required>
            <div className={styles.uploadBlock}>
              <div className={styles.uploadPreview} style={{ backgroundImage: productImageUrl ? `url(${productImageUrl})` : undefined }}>
                {!productImageUrl && <span>暂无图片</span>}
              </div>
              <div className={styles.uploadActions}>
                <Upload
                  accept="image/*"
                  showUploadList={false}
                  customRequest={async (options) => {
                    try {
                      const url = await uploadAdminFile(options.file as File);
                      productForm.setFieldValue('imageUrl', url);
                      options.onSuccess?.({ url });
                      message.success('商品封面上传成功');
                    } catch (error) {
                      options.onError?.(error as Error);
                      message.error(error instanceof Error ? error.message : '商品封面上传失败');
                    }
                  }}
                >
                  <Button icon={<UploadOutlined />}>上传商品封面</Button>
                </Upload>
                <p>上传成功后会自动填写资源地址，也可以手动输入已有图片地址。</p>
              </div>
            </div>
            <Form.Item name="imageUrl" noStyle rules={[{ required: true, message: '请输入商品封面地址' }, { max: 500 }]}>
              <Input placeholder="例如 /profile/upload/2026/07/product.jpg" />
            </Form.Item>
          </Form.Item>
          <Form.Item name="categoryId" label="分类" rules={[{ required: true, message: '请选择分类' }]}>
            <Select
              options={productCategories.map((item) => ({ label: item.categoryName, value: item.categoryId }))}
            />
          </Form.Item>
          <Space size={12} className={styles.formRow}>
            <Form.Item name="price" label="售价" rules={[{ required: true, message: '请输入售价' }]}>
              <InputNumber min={0.01} precision={2} prefix="¥" />
            </Form.Item>
            <Form.Item name="stock" label="库存" rules={[{ required: true, message: '请输入库存' }]}>
              <InputNumber min={0} precision={0} />
            </Form.Item>
          </Space>
          <Form.Item
            name="detail"
            label="商品详细介绍"
            rules={[
              { required: true, message: '请输入商品详细介绍' },
              { min: 10, message: '商品详细介绍至少 10 个字' },
            ]}
          >
            <Input.TextArea rows={5} showCount maxLength={500} placeholder="介绍产地、工艺、规格、适合人群和使用建议" />
          </Form.Item>
          <Button loading={productSaving} type="primary" htmlType="submit" block icon={<CheckCircleOutlined />}>
            {editingProductId ? '保存修改' : '保存商品'}
          </Button>
        </Form>
      </Drawer>

      <Drawer {...responsiveDrawerProps} title="订单详情" size="large" open={Boolean(detailOrder)} onClose={() => setDetailOrder(null)} destroyOnHidden>
        {detailOrder && (
          <div className={styles.orderDetail}>
            <div className={styles.detailHeader}>
              <div>
                <p className={styles.eyebrow}>订单号</p>
                <h3>{detailOrder.orderNo}</h3>
              </div>
              <Tag color={orderStatusMeta[detailOrder.status].color}>{orderStatusMeta[detailOrder.status].label}</Tag>
            </div>

            <div className={styles.detailGrid}>
              <div>
                <span>买家</span>
                <strong>{detailOrder.buyerName}</strong>
              </div>
              <div>
                <span>商家</span>
                <strong>{detailOrder.merchantName || getMerchantName(detailOrder.merchantId)}</strong>
              </div>
              <div>
                <span>订单金额</span>
                <strong>{formatMoney(detailOrder.amount)}</strong>
              </div>
              <div>
                <span>售后</span>
                <strong>{detailOrder.refundStatus === 'PENDING'
                  ? '退款待审核'
                  : detailOrder.refundStatus === 'REFUNDING'
                    ? '退款中'
                    : detailOrder.refundStatus === 'REFUNDED'
                      ? '已退款'
                    : detailOrder.refundStatus === 'REJECTED'
                      ? '退款已驳回'
                      : '无退款申请'}</strong>
              </div>
              {detailOrder.fromVerifierName && (
                <div>
                  <span>来源甄客</span>
                  <strong>{detailOrder.fromVerifierName}</strong>
                </div>
              )}
            </div>

            <section>
              <h4>商品明细</h4>
              <Table
                rowKey={(item) => item.productTitle}
                dataSource={detailOrder.items}
                pagination={false}
                columns={[
                  { title: '商品', dataIndex: 'productTitle' },
                  { title: '数量', dataIndex: 'quantity' },
                  { title: '单价', dataIndex: 'unitPrice', render: (unitPrice: number) => formatMoney(unitPrice) },
                  {
                    title: '小计',
                    key: 'subtotal',
                    render: (_, item) => formatMoney(item.quantity * item.unitPrice),
                  },
                ]}
              />
            </section>

            <section>
              <h4>服务费分成</h4>
              <div className={styles.feeBreakdown}>
                <div className={styles.feeRow}>
                  <span className={styles.feeLabel}>成交额</span>
                  <span className={styles.feeValue}>{formatMoney(detailOrder.amount)}</span>
                </div>
                <div className={styles.feeRow}>
                  <span className={styles.feeLabel}>平台服务费（成交额 × 10%）</span>
                  <span className={styles.feeValue}>{formatMoney(Math.round(detailOrder.amount * 0.1 * 100) / 100)}</span>
                </div>
                <div className={styles.feeRow}>
                  <span className={styles.feeLabel}>公益捐赠（成交额 × 5%）</span>
                  <span className={styles.feeValue}>{formatMoney(Math.round(detailOrder.amount * 0.05 * 100) / 100)}</span>
                </div>
                <div className={styles.feeRow}>
                  <span className={styles.feeLabel}>甄客佣金（成交额 × 5%）</span>
                  <span className={styles.feeValue}>
                    {detailOrder.fromVerifierName
                      ? `${formatMoney(Math.round(detailOrder.amount * 0.05 * 100) / 100)} → ${detailOrder.fromVerifierName}`
                      : formatMoney(Math.round(detailOrder.amount * 0.05 * 100) / 100)}
                  </span>
                </div>
                <div className={styles.feeRow}>
                  <span className={styles.feeLabel}>商家实收</span>
                  <span className={styles.feeValue}>{formatMoney(Math.round(detailOrder.amount * 0.9 * 100) / 100)}</span>
                </div>
              </div>
              {!detailOrder.fromVerifierName && (
                <p className={styles.feeNote}>该订单非甄客验引流，甄客佣金暂不发放</p>
              )}
            </section>

            <section>
              <h4>收货地址</h4>
              <p className={styles.addressText}>{detailOrder.address}</p>
            </section>

            {detailOrder.trackingNo && (
              <section>
                <h4>物流信息</h4>
                <p className={styles.addressText}>{detailOrder.carrier} · {detailOrder.trackingNo}</p>
                <div className={styles.logisticsTimeline}>
                  {(detailOrder.logisticsEvents ?? []).length === 0 && (
                    <p className={styles.logisticsEmpty}>承运信息已登记，暂未收到物流轨迹。</p>
                  )}
                  {(detailOrder.logisticsEvents ?? []).map((event) => (
                    <div className={styles.logisticsEvent} key={event.eventId}>
                      <i />
                      <div>
                        <strong>{event.description}</strong>
                        {event.location && <span>{event.location}</span>}
                        <span>{event.eventTime}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {detailOrder.refundStatus && (
              <div className={styles.refundNotice}>
                <div>
                  <strong>退款原因：{detailOrder.refundReason}</strong>
                  {detailOrder.refundRequestedAt && <p>申请时间：{detailOrder.refundRequestedAt}</p>}
                  {detailOrder.refundAuditRemark && <p>审核说明：{detailOrder.refundAuditRemark}</p>}
                  {detailOrder.refundCompletedAt && <p>退款完成时间：{detailOrder.refundCompletedAt}</p>}
                </div>
                {!isAdmin && detailOrder.refundStatus === 'PENDING' && (
                  <Button type="primary" danger onClick={() => openRefundAudit(detailOrder)}>
                    审核退款
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </Drawer>
      <Modal
        {...responsiveModalProps}
        title={`审核退款${refundAuditOrder ? ` · ${refundAuditOrder.orderNo}` : ''}`}
        open={Boolean(refundAuditOrder)}
        onCancel={closeRefundAudit}
        footer={null}
        destroyOnHidden
      >
        {refundAuditOrder && (
          <>
            <p>退款原因：{refundAuditOrder.refundReason}</p>
            <Form form={refundAuditForm} layout="vertical" onFinish={submitRefundAudit}>
              <Form.Item name="decision" label="审核结果" rules={[{ required: true, message: '请选择审核结果' }]}>
                <Select options={[
                  { label: '同意退款', value: 'APPROVED' },
                  { label: '驳回退款', value: 'REJECTED' },
                ]} />
              </Form.Item>
              <Form.Item
                name="auditRemark"
                label="审核说明"
                rules={refundAuditDecision === 'REJECTED'
                  ? [{ required: true, message: '驳回退款时必须填写审核说明' }]
                  : []}
              >
                <Input.TextArea rows={4} maxLength={200} showCount placeholder="可填写退款处理说明" />
              </Form.Item>
              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button disabled={refundAuditing} onClick={closeRefundAudit}>取消</Button>
                <Button type="primary" danger htmlType="submit" loading={refundAuditing}>确认处理</Button>
              </Space>
            </Form>
          </>
        )}
      </Modal>
      <Modal
        {...responsiveModalProps}
        title={`订单发货${shippingOrder ? ` · ${shippingOrder.orderNo}` : ''}`}
        open={Boolean(shippingOrder)}
        onCancel={closeOrderShipment}
        footer={null}
        destroyOnHidden
      >
        <Form form={orderShipForm} layout="vertical" onFinish={submitOrderShipment}>
          <Form.Item name="carrier" label="物流公司" rules={[{ required: true, message: '请输入物流公司' }, { max: 50 }]}>
            <Input placeholder="例如：顺丰速运" />
          </Form.Item>
          <Form.Item name="trackingNo" label="物流单号" rules={[{ required: true, message: '请输入物流单号' }, { max: 100 }]}>
            <Input placeholder="请输入物流单号" />
          </Form.Item>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button disabled={orderShipping} onClick={closeOrderShipment}>取消</Button>
            <Button type="primary" htmlType="submit" loading={orderShipping}>确认发货</Button>
          </Space>
        </Form>
      </Modal>
      <Modal
        {...responsiveModalProps}
        title="商家入驻审核"
        open={merchantModalOpen}
        onCancel={() => setMerchantModalOpen(false)}
        footer={null}
        width={520}
        destroyOnClose
      >
        <Form form={merchantForm} layout="vertical" onFinish={handleSaveMerchant}>
          <Form.Item name="decision" label="审核结论" rules={[{ required: true, message: '请选择审核结论' }]}>
            <Select size="large" options={[{ value: 'APPROVED', label: '审核通过' }, { value: 'REJECTED', label: '审核驳回' }]} />
          </Form.Item>
          <Form.Item
            name="auditRemark"
            label="审核意见"
            rules={merchantAuditDecision === 'REJECTED' ? [{ required: true, message: '驳回时必须填写原因' }] : undefined}
          >
            <Input.TextArea rows={4} maxLength={500} showCount placeholder="填写审核说明或驳回原因" />
          </Form.Item>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 8 }}>
            <Button onClick={() => setMerchantModalOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit">确认审核</Button>
          </div>
        </Form>
      </Modal>

      <Modal
        {...responsiveModalProps}
        title="发布试用招募"
        open={trialModalOpen}
        onCancel={closeTrialModal}
        footer={null}
        width={520}
        destroyOnClose
      >
        <Form form={trialForm} layout="vertical" onFinish={handlePublishTrial}>
          <Form.Item name="productId" label="选择商品" rules={[{ required: true, message: '请选择商品' }]}>
            <Select
              placeholder="请选择要发布试用的商品"
              size="large"
              onChange={(productId) => {
                const availableTypes = getAvailableTrialTypes(productId);
                trialForm.setFieldValue('trialTypes', availableTypes.length > 0 ? [availableTypes[0]] : []);
              }}
            >
              {visibleProducts.filter((product) => product.status === 'onSale').map((product) => (
                <Select.Option key={product.id} value={product.id} disabled={getAvailableTrialTypes(product.id).length === 0}>
                  {product.title}{getAvailableTrialTypes(product.id).length === 0 ? '（线上、线下均在招募）' : ''}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="trialTypes"
            label="试用方式"
            initialValue={['ONLINE']}
            rules={[{ required: true, message: '请至少选择一种试用方式' }]}
          >
            <Checkbox.Group
              options={[
                {
                  label: '线上试用（审核通过 → 发货 → 收货 → 发布甄客验）',
                  value: 'ONLINE',
                  disabled: !selectedTrialAvailableTypes.includes('ONLINE'),
                },
                {
                  label: '线下试用（审核通过 → 发布甄客验）',
                  value: 'OFFLINE',
                  disabled: !selectedTrialAvailableTypes.includes('OFFLINE'),
                },
              ]}
            />
          </Form.Item>
          {selectedTrialProductId && selectedTrialAvailableTypes.length < 2 && (
            <p className={styles.subText}>
              已有正在招募且未满的类型已被禁用；提前终止或名额招满后即可发布下一轮。
            </p>
          )}
          <Form.Item name="campaignTitle" label="招募标题" rules={[{ required: true, message: '请输入招募标题' }, { max: 120 }]}>
            <Input size="large" placeholder="请输入招募标题" />
          </Form.Item>
          <Form.Item name="campaignSummary" label="招募说明" rules={[{ required: true, message: '请输入招募说明' }, { max: 500 }]}>
            <Input.TextArea rows={4} showCount maxLength={500} placeholder="说明申请方式和报告发布规则" />
          </Form.Item>
          <Form.Item name="targetCount" label="招募人数" rules={[{ required: true, message: '请输入招募人数' }]}>
            <InputNumber min={1} max={100} size="large" style={{ width: '100%' }} placeholder="请输入招募人数" />
          </Form.Item>
          <Form.Item name="deadline" label="截止日期" rules={[{ required: true, message: '请选择截止日期' }]}>
            <Input size="large" type="date" placeholder="请选择截止日期" />
          </Form.Item>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 8 }}>
            <Button onClick={closeTrialModal}>取消</Button>
            <Button loading={trialSaving} type="primary" htmlType="submit">发布</Button>
          </div>
        </Form>
      </Modal>

      <Modal
        {...responsiveModalProps}
        title={trialApplicationAction === 'ship' ? '填写线上试用物流' : '驳回试用申请'}
        open={Boolean(trialApplicationAction && selectedTrialApplication)}
        onCancel={closeTrialApplicationAction}
        footer={null}
        destroyOnHidden
      >
        <Form form={trialApplicationActionForm} layout="vertical" onFinish={submitTrialApplicationAction}>
          {trialApplicationAction === 'reject' ? (
            <Form.Item name="auditRemark" label="驳回原因" rules={[{ required: true, message: '请输入驳回原因' }, { max: 500 }]}>
              <Input.TextArea rows={4} showCount maxLength={500} />
            </Form.Item>
          ) : (
            <>
              <Form.Item name="carrier" label="物流公司" rules={[{ required: true, message: '请输入物流公司' }, { max: 50 }]}>
                <Input placeholder="例如：顺丰速运" />
              </Form.Item>
              <Form.Item name="trackingNo" label="物流单号" rules={[{ required: true, message: '请输入物流单号' }, { max: 100 }]}>
                <Input placeholder="请输入物流单号" />
              </Form.Item>
            </>
          )}
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={closeTrialApplicationAction}>取消</Button>
            <Button type="primary" htmlType="submit">确认</Button>
          </Space>
        </Form>
      </Modal>

      <Modal
        {...responsiveModalProps}
        title={`${detailMerchant?.name} - 入驻材料`}
        open={!!detailMerchant}
        onCancel={() => setDetailMerchant(null)}
        footer={null}
        width={600}
        destroyOnClose
      >
        {detailMerchant && (
          <div className={styles.merchantDetail}>
            <div className={styles.detailSection}>
              <h4>基本信息</h4>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>商家名称</span>
                <span>{detailMerchant.name}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>负责人</span>
                <span>{detailMerchant.ownerName}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>手机号</span>
                <span>{detailMerchant.phone}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>公司地址</span>
                <span>{detailMerchant.companyAddress ?? '-'}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>入驻时间</span>
                <span>{detailMerchant.registeredAt ?? '-'}</span>
              </div>
            </div>

            <div className={styles.detailSection}>
              <h4>自证材料</h4>
              {detailMerchant.businessLicense && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>营业执照</span>
                  <img src={detailMerchant.businessLicense} alt="营业执照" className={styles.licenseImage} />
                </div>
              )}
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>产品介绍</span>
                <p className={styles.detailText}>{detailMerchant.productIntro ?? '-'}</p>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>产地溯源</span>
                <p className={styles.detailText}>{detailMerchant.originTraceability ?? '-'}</p>
              </div>
            </div>

            <div className={styles.detailSection}>
              <h4>入驻门槛承诺</h4>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>承诺发起验证招募</span>
                <Tag color={detailMerchant.acceptsVerificationRecruitment ? 'green' : 'default'}>
                  {detailMerchant.acceptsVerificationRecruitment ? '已承诺' : '未承诺'}
                </Tag>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>接受公益分成</span>
                <Tag color={detailMerchant.acceptsPublicWelfare ? 'green' : 'default'}>
                  {detailMerchant.acceptsPublicWelfare ? '已接受' : '未接受'}
                </Tag>
              </div>
            </div>

            <div className={styles.detailSection}>
              <h4>审核记录</h4>
              {detailMerchant.auditLogs?.length ? detailMerchant.auditLogs.map((log) => (
                <div className={styles.detailRow} key={log.logId}>
                  <span className={styles.detailLabel}>{({ SUBMIT: '提交申请', RESUBMIT: '重新提交', APPROVE: '审核通过', REJECT: '审核驳回', ENABLE: '启用商家', DISABLE: '停用商家' } as const)[log.action]}</span>
                  <span>{log.operatorName} · {log.createTime ?? '-'} · {log.auditRemark || '无备注'}</span>
                </div>
              )) : <p className={styles.detailText}>暂无审核记录</p>}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

export default function AdminHomePage() {
  return (
    <ConfigProvider theme={adminTheme}>
      <AntApp>
        <AdminWorkspace />
      </AntApp>
    </ConfigProvider>
  );
}
