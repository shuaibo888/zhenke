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
import { merchantAccounts as seedMerchantAccounts, seedOrders, seedProducts, seedReports, seedTrialRecruitments } from '@/mocks/admin';
import type { AdminSession, ManagedOrder, ManagedProduct, ManagedReport, ManagedTrialRecruitment, MerchantAccount, NavKey, ProductCategory, ProductStatus, ShopMemberLevel, ShopUserAccount } from '@/types';
import {
  fetchAdminCaptcha,
  fetchShopMemberLevels,
  fetchShopUsers,
  loginAdmin,
  logoutAdmin,
  restoreAdminSession,
  updateShopUserLevel,
  updateShopUserStatus,
  type CaptchaState,
} from '@/services/adminApi';
import { filterRowsForSession, getAvailableNavKeys, hasGlobalAccess } from '@/utils/access';
import {
  buildOrderStatusChart,
  buildOrderTrendChart,
  buildProductStatusPie,
  getDashboardStats,
  toggleMerchantStatus,
  toggleReportStatus,
} from '@/utils/adminDashboard';
import { filterOrders, refundOrderById, shipOrderById, type OrderStatusFilter } from '@/utils/orderManagement';
import { saveProductDraft } from '@/utils/productEditor';
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
  merchantId?: number;
  title: string;
  artisanName: string;
  category: ProductCategory;
  status: ProductStatus;
  imageUrl: string;
  detail: string;
  price: number;
  cost: number;
  stock: number;
};

type MerchantFormValues = {
  name: string;
  ownerName: string;
  phone: string;
  username: string;
  password: string;
};

type TrialFormValues = {
  productId: number;
  targetCount: number;
  deadline: string;
};

const adminTheme = {
  token: {
    colorPrimary: '#1f6f5b',
    borderRadius: 8,
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
  },
};

const navMeta: Record<NavKey, { label: string; icon: React.ReactNode }> = {
  dashboard: { label: '数据看板', icon: <BarChartOutlined /> },
  users: { label: '用户管理', icon: <TeamOutlined /> },
  products: { label: '商品管理', icon: <ShoppingOutlined /> },
  trials: { label: '试用招募', icon: <SafetyCertificateOutlined /> },
  orders: { label: '订单管理', icon: <TruckOutlined /> },
  reports: { label: '验证报告', icon: <FileSearchOutlined /> },
  merchants: { label: '商家管理', icon: <TeamOutlined /> },
};

const categoryMeta: Record<ProductCategory, { label: string; color: string }> = {
  verified: { label: '已得验', color: 'green' },
  local: { label: '在地特产', color: 'blue' },
  other: { label: '普通好物', color: 'default' },
};

const productStatusMeta: Record<ProductStatus, { label: string; color: string }> = {
  onSale: { label: '在售', color: 'green' },
  offSale: { label: '已下架', color: 'default' },
};

const orderStatusMeta: Record<ManagedOrder['status'], { label: string; color: string }> = {
  unpaid: { label: '待付款', color: 'default' },
  paid: { label: '待发货', color: 'gold' },
  shipped: { label: '待收货', color: 'blue' },
  completed: { label: '已完成', color: 'green' },
  canceled: { label: '已取消', color: 'red' },
  refunded: { label: '已退款', color: 'purple' },
};

function formatMoney(value: number) {
  return `¥${value.toFixed(2)}`;
}

function AdminWorkspace() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [captcha, setCaptcha] = useState<CaptchaState>({ enabled: false, image: '', uuid: '' });
  const [activeNav, setActiveNav] = useState<NavKey>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [products, setProducts] = useState<ManagedProduct[]>(seedProducts);
  const [orders, setOrders] = useState<ManagedOrder[]>(seedOrders);
  const [reports, setReports] = useState<ManagedReport[]>(seedReports);
  const [trialRecruitments, setTrialRecruitments] = useState<ManagedTrialRecruitment[]>(seedTrialRecruitments);
  const [merchants, setMerchants] = useState<MerchantAccount[]>(seedMerchantAccounts);
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
  const [loginForm] = Form.useForm<LoginFormValues>();
  const { message, modal } = AntApp.useApp();
  const productImageUrl = Form.useWatch('imageUrl', productForm);
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
    (key) => key !== 'users' || hasPermission('shop:user:list'),
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
    resetProductFilters();
    resetOrderFilters();
    setShopUsers([]);
    setShopUserTotal(0);
    loginForm.resetFields();
    await loadCaptcha();
  };

  const resetProductFilters = () => {
    setProductCategoryFilter('all');
    setProductStatusFilter('all');
    setProductKeyword('');
  };

  const resetOrderFilters = () => {
    setOrderStatusFilter('all');
    setOrderKeyword('');
  };

  const openCreateProduct = () => {
    setEditingProductId(null);
    productForm.resetFields();
    productForm.setFieldsValue({
      merchantId: isAdmin ? merchants[0]?.id : session?.merchantId,
      category: 'verified',
      status: 'onSale',
      imageUrl: '/goods/cafedou.jpg',
      detail: '',
      price: 99,
      cost: 49,
      stock: 20,
    });
    setProductDrawerOpen(true);
  };

  const openEditProduct = (product: ManagedProduct) => {
    setEditingProductId(product.id);
    productForm.setFieldsValue({
      merchantId: product.merchantId,
      title: product.title,
      artisanName: product.artisanName,
      category: product.category,
      status: product.status,
      imageUrl: product.imageUrl,
      detail: product.detail,
      price: product.price,
      cost: product.cost,
      stock: product.stock,
    });
    setProductDrawerOpen(true);
  };

  const closeProductDrawer = () => {
    setProductDrawerOpen(false);
    setEditingProductId(null);
    productForm.resetFields();
  };

  const handleProductImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      message.warning('请上传图片文件');
      return Upload.LIST_IGNORE;
    }

    const reader = new FileReader();
    reader.onload = () => {
      productForm.setFieldValue('imageUrl', String(reader.result));
      message.success('图片已添加到商品表单');
    };
    reader.readAsDataURL(file);

    return false;
  };

  const handleSaveProduct = (values: ProductFormValues) => {
    const merchantId = isAdmin ? values.merchantId : session?.merchantId;

    if (!merchantId) {
      message.error('请选择商家');
      return;
    }

    setProducts(
      saveProductDraft(
        products,
        {
          ...values,
          merchantId,
        },
        editingProductId,
      ),
    );
    closeProductDrawer();
    message.success(editingProductId ? '商品已更新' : '商品已保存');
  };

  const toggleProductStatus = (product: ManagedProduct) => {
    const nextStatus: ProductStatus = product.status === 'onSale' ? 'offSale' : 'onSale';
    setProducts((items) => items.map((item) => (item.id === product.id ? { ...item, status: nextStatus } : item)));
    message.success(nextStatus === 'onSale' ? '商品已上架' : '商品已下架');
  };

  const openPublishTrial = (product?: ManagedProduct) => {
    trialForm.resetFields();
    if (product) {
      trialForm.setFieldsValue({
        productId: product.id,
        targetCount: 5,
      });
    }
    setTrialModalOpen(true);
  };

  const closeTrialModal = () => {
    setTrialModalOpen(false);
    trialForm.resetFields();
  };

  const handlePublishTrial = (values: TrialFormValues) => {
    const product = visibleProducts.find((p) => p.id === values.productId);
    if (!product) {
      message.error('请选择有效的商品');
      return;
    }

    const today = new Date();
    const newTrial: ManagedTrialRecruitment = {
      id: Date.now(),
      merchantId: product.merchantId,
      productId: product.id,
      productTitle: product.title,
      targetCount: values.targetCount,
      claimedCount: 0,
      deadline: values.deadline,
      applicantCount: 0,
      status: 'recruiting',
      createdAt: today.toISOString().slice(0, 10) + ' ' + today.toTimeString().slice(0, 5),
    };

    setTrialRecruitments((items) => [newTrial, ...items]);
    closeTrialModal();
    message.success('试用招募已发布');
  };

  const handleEndTrial = (trial: ManagedTrialRecruitment) => {
    modal.confirm({
      title: '确认结束招募？',
      content: `「${trial.productTitle}」的试用招募将提前结束。`,
      okText: '结束招募',
      cancelText: '再想想',
      onOk: () => {
        setTrialRecruitments((items) =>
          items.map((item) => (item.id === trial.id ? { ...item, status: 'ended' } : item)),
        );
        message.success('招募已结束');
      },
    });
  };

  const shipOrder = (order: ManagedOrder) => {
    if (order.status !== 'paid') {
      message.warning('只有待发货订单可以发货');
      return;
    }

    setOrders((items) => shipOrderById(items, order.id));
    setDetailOrder((current) => (current?.id === order.id ? { ...current, status: 'shipped' } : current));
    message.success('订单已发货');
  };

  const refundOrder = (order: ManagedOrder) => {
    if (!order.refundRequested) {
      message.warning('用户未发起退换申请');
      return;
    }

    modal.confirm({
      title: '确认同意退款？',
      content: `${order.orderNo} 将置为已退款。`,
      okText: '同意退款',
      cancelText: '再看看',
      onOk: () => {
        setOrders((items) => refundOrderById(items, order.id));
        setDetailOrder((current) => (current?.id === order.id ? { ...current, status: 'refunded', refundRequested: false } : current));
        message.success('退款已处理');
      },
    });
  };

  const handleToggleReportStatus = (report: ManagedReport) => {
    setReports((items) => toggleReportStatus(items, report.id));
    message.success(report.status === 'published' ? '验证报告已下架' : '验证报告已上架');
  };

  const handleToggleMerchantStatus = (merchant: MerchantAccount) => {
    setMerchants((items) => toggleMerchantStatus(items, merchant.id));
    message.success(merchant.status === 'active' ? '商家已禁用' : '商家已启用');
  };

  const handleOpenCreateMerchant = () => {
    setEditingMerchantId(null);
    merchantForm.resetFields();
    setMerchantModalOpen(true);
  };

  const handleOpenEditMerchant = (merchant: MerchantAccount) => {
    setEditingMerchantId(merchant.id);
    merchantForm.setFieldsValue({
      name: merchant.name,
      ownerName: merchant.ownerName,
      phone: merchant.phone,
      username: merchant.username,
      password: merchant.password,
    });
    setMerchantModalOpen(true);
  };

  const handleSaveMerchant = (values: MerchantFormValues) => {
    if (editingMerchantId) {
      setMerchants((items) =>
        items.map((merchant) =>
          merchant.id === editingMerchantId ? { ...merchant, ...values } : merchant,
        ),
      );
      message.success('商家信息已更新');
    } else {
      const newMerchant: MerchantAccount = {
        id: Date.now(),
        ...values,
        productCount: 0,
        orderCount: 0,
        status: 'active',
      };
      setMerchants((items) => [...items, newMerchant]);
      message.success('商家已新增');
    }
    setMerchantModalOpen(false);
    setEditingMerchantId(null);
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
      render: (_, user) => (
        <div>
          <div>{user.loginDate || '尚未登录'}</div>
          {user.loginIp && <div className={styles.subText}>{user.loginIp}</div>}
        </div>
      ),
    },
    { title: '注册时间', dataIndex: 'createTime', render: (value?: string) => value || '-' },
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
      render: (merchantId) => getMerchantName(merchantId),
    },
    {
      title: '分类',
      dataIndex: 'category',
      render: (category: ProductCategory) => <Tag color={categoryMeta[category].color}>{categoryMeta[category].label}</Tag>,
    },
    {
      title: '售价/成本',
      dataIndex: 'price',
      render: (_, product) => (
        <Space orientation="vertical" size={0}>
          <span>{formatMoney(product.price)}</span>
          <span className={styles.subText}>成本 {formatMoney(product.cost)}</span>
        </Space>
      ),
    },
    { title: '库存', dataIndex: 'stock' },
    { title: '销量', dataIndex: 'sales' },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: ProductStatus) => <Tag color={productStatusMeta[status].color}>{productStatusMeta[status].label}</Tag>,
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, product) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEditProduct(product)}>
            编辑商品
          </Button>
          <Button size="small" onClick={() => toggleProductStatus(product)}>
            {product.status === 'onSale' ? '下架' : '上架'}
          </Button>
          {!isAdmin && (
            <Button size="small" type="primary" onClick={() => openPublishTrial(product)}>
              发布试用
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const orderColumns: ColumnsType<ManagedOrder> = [
    { title: '订单号', dataIndex: 'orderNo', render: (orderNo) => <span className={styles.monoText}>{orderNo}</span> },
    { title: '买家', dataIndex: 'buyerName' },
    { title: '商家', dataIndex: 'merchantId', render: (merchantId) => getMerchantName(merchantId) },
    { title: '商品', dataIndex: 'productTitles', render: (titles: string[]) => titles.join('、') },
    { title: '金额', dataIndex: 'amount', render: (amount: number) => formatMoney(amount) },
    {
      title: '公益捐赠',
      key: 'publicWelfare',
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
    { title: '下单时间', dataIndex: 'createdAt' },
    {
      title: '操作',
      key: 'actions',
      render: (_, order) => (
        <Space>
          <Button size="small" icon={<TruckOutlined />} disabled={order.status !== 'paid'} onClick={() => shipOrder(order)}>
            发货
          </Button>
          <Button size="small" icon={<FileSearchOutlined />} onClick={() => setDetailOrder(order)}>
            订单详情
          </Button>
          <Button size="small" disabled={!order.refundRequested} onClick={() => refundOrder(order)}>
            同意退款
          </Button>
        </Space>
      ),
    },
  ];

  const reportColumns: ColumnsType<ManagedReport> = [
    { title: '商品', dataIndex: 'productTitle' },
    { title: '验证者', dataIndex: 'userName' },
    { title: '商家', dataIndex: 'merchantId', render: (merchantId) => getMerchantName(merchantId) },
    { title: '不足', dataIndex: 'shortcoming', render: (text) => <span className={styles.shortcoming}>{text}</span> },
    { title: '有用数', dataIndex: 'usefulCount' },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: ManagedReport['status']) => (
        <Tag color={status === 'published' ? 'green' : 'default'}>{status === 'published' ? '展示中' : '已下架'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, report) => (
        <Button size="small" onClick={() => handleToggleReportStatus(report)}>
          {report.status === 'published' ? '下架' : '上架'}
        </Button>
      ),
    },
  ];

  const trialColumns: ColumnsType<ManagedTrialRecruitment> = [
    { title: '商品', dataIndex: 'productTitle' },
    { title: '商家', dataIndex: 'merchantId', render: (merchantId) => getMerchantName(merchantId) },
    {
      title: '招募进度',
      key: 'progress',
      render: (_, trial) => (
        <span>
          {trial.claimedCount} / {trial.targetCount} 人
        </span>
      ),
    },
    { title: '申请人数', dataIndex: 'applicantCount' },
    { title: '截止日期', dataIndex: 'deadline' },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: ManagedTrialRecruitment['status']) => (
        <Tag color={status === 'recruiting' ? 'green' : 'default'}>{status === 'recruiting' ? '招募中' : '已结束'}</Tag>
      ),
    },
    { title: '发布时间', dataIndex: 'createdAt' },
    {
      title: '操作',
      key: 'actions',
      render: (_, trial) => (
        <Button size="small" disabled={trial.status === 'ended'} onClick={() => handleEndTrial(trial)}>
          结束招募
        </Button>
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
              <Button icon={<LogoutOutlined />} onClick={handleLogout} className={styles.logoutBtn}>
                退出
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
                  scroll={{ x: 980 }}
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
                  <Button type="primary" icon={<PlusOutlined />} onClick={openCreateProduct}>
                    新增商品
                  </Button>
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
                      { label: '已得验', value: 'verified' },
                      { label: '在地特产', value: 'local' },
                      { label: '普通好物', value: 'other' },
                    ]}
                  />
                  <Select<ProductStatusFilter>
                    className={styles.productFilter}
                    value={productStatusFilter}
                    onChange={setProductStatusFilter}
                    options={[
                      { label: '全部状态', value: 'all' },
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
                <Table rowKey="id" columns={productColumns} dataSource={filteredProducts} pagination={{ pageSize: 6 }} />
              </section>
            )}

            {activeNav === 'orders' && (
              <section className={styles.tableSurface}>
                <div className={styles.tableHeader}>
                  <div>
                    <p className={styles.eyebrow}>待发货、退款、收货地址</p>
                    <h3>订单管理</h3>
                  </div>
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
                <Table rowKey="id" columns={orderColumns} dataSource={filteredOrders} pagination={{ pageSize: 6 }} />
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
                <Table rowKey="id" columns={trialColumns} dataSource={visibleTrials} pagination={{ pageSize: 6 }} />
              </section>
            )}

            {activeNav === 'reports' && (
              <section className={styles.tableSurface}>
                <div className={styles.tableHeader}>
                  <div>
                    <p className={styles.eyebrow}>真实体验和必须展示的不足</p>
                    <h3>验证报告</h3>
                  </div>
                </div>
                <Table rowKey="id" columns={reportColumns} dataSource={visibleReports} pagination={{ pageSize: 6 }} />
              </section>
            )}

            {activeNav === 'merchants' && isAdmin && (
              <section className={styles.tableSurface}>
                <div className={styles.tableHeader}>
                  <div>
                    <p className={styles.eyebrow}>管理员专属</p>
                    <h3>商家管理</h3>
                  </div>
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateMerchant}>
                    新增商家
                  </Button>
                </div>
                <Table
                  rowKey="id"
                  dataSource={merchants}
                  pagination={false}
                  scroll={{ x: 900 }}
                  columns={[
                    { title: '商家', dataIndex: 'name', width: 120 },
                    { title: '负责人', dataIndex: 'ownerName', width: 80 },
                    { title: '手机号', dataIndex: 'phone', width: 120 },
                    { title: '公司地址', dataIndex: 'companyAddress', ellipsis: true },
                    { title: '入驻时间', dataIndex: 'registeredAt', width: 100 },
                    { title: '商品数', dataIndex: 'productCount', width: 70 },
                    { title: '订单数', dataIndex: 'orderCount', width: 70 },
                    {
                      title: '状态',
                      dataIndex: 'status',
                      width: 80,
                      render: (status: MerchantAccount['status']) => (
                        <Tag color={status === 'active' ? 'green' : 'default'}>{status === 'active' ? '启用' : '禁用'}</Tag>
                      ),
                    },
                    {
                      title: '操作',
                      key: 'actions',
                      width: 80,
                      render: (_, merchant) => (
                        <Dropdown
                          menu={{
                            items: [
                              { key: 'view', label: '查看入驻材料', onClick: () => setDetailMerchant(merchant) },
                              { key: 'edit', label: '编辑', onClick: () => handleOpenEditMerchant(merchant) },
                              { key: 'toggle', label: merchant.status === 'active' ? '禁用' : '启用', onClick: () => handleToggleMerchantStatus(merchant) },
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

      <Drawer
        title={editingProductId ? '编辑商品' : '新增商品'}
        size="large"
        open={productDrawerOpen}
        onClose={closeProductDrawer}
        destroyOnHidden
      >
        <Form form={productForm} layout="vertical" onFinish={handleSaveProduct}>
          {isAdmin && (
            <Form.Item name="merchantId" label="所属商家" rules={[{ required: true, message: '请选择商家' }]}>
              <Select
                options={merchants.map((merchant) => ({
                  label: merchant.name,
                  value: merchant.id,
                }))}
              />
            </Form.Item>
          )}
          <Form.Item name="title" label="商品名" rules={[{ required: true, message: '请输入商品名' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="artisanName" label="匠人/品牌" rules={[{ required: true, message: '请输入匠人或品牌' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="商品图片" required>
            <div className={styles.uploadBlock}>
              <div className={styles.uploadPreview} style={{ backgroundImage: productImageUrl ? `url(${productImageUrl})` : undefined }}>
                {!productImageUrl && <span>暂无图片</span>}
              </div>
              <div className={styles.uploadActions}>
                <Upload accept="image/*" showUploadList={false} beforeUpload={handleProductImageUpload}>
                  <Button icon={<UploadOutlined />}>上传商品图</Button>
                </Upload>
                <p>支持本地图片预览；接入后端后替换为 /api/admin/upload 返回的 URL。</p>
              </div>
            </div>
            <Form.Item name="imageUrl" noStyle rules={[{ required: true, message: '请上传商品图片' }]}>
              <Input type="hidden" />
            </Form.Item>
          </Form.Item>
          <Form.Item name="category" label="分类" rules={[{ required: true, message: '请选择分类' }]}>
            <Select
              options={[
                { label: '已得验', value: 'verified' },
                { label: '在地特产', value: 'local' },
                { label: '普通好物', value: 'other' },
              ]}
            />
          </Form.Item>
          <Space size={12} className={styles.formRow}>
            <Form.Item name="price" label="售价" rules={[{ required: true, message: '请输入售价' }]}>
              <InputNumber min={0} precision={2} prefix="¥" />
            </Form.Item>
            <Form.Item name="cost" label="成本价" rules={[{ required: true, message: '请输入成本价' }]}>
              <InputNumber min={0} precision={2} prefix="¥" />
            </Form.Item>
            <Form.Item name="stock" label="库存" rules={[{ required: true, message: '请输入库存' }]}>
              <InputNumber min={0} precision={0} />
            </Form.Item>
          </Space>
          <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
            <Select
              options={[
                { label: '在售', value: 'onSale' },
                { label: '已下架', value: 'offSale' },
              ]}
            />
          </Form.Item>
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
          <Button type="primary" htmlType="submit" block icon={<CheckCircleOutlined />}>
            {editingProductId ? '保存修改' : '保存商品'}
          </Button>
        </Form>
      </Drawer>

      <Drawer title="订单详情" size="large" open={Boolean(detailOrder)} onClose={() => setDetailOrder(null)} destroyOnHidden>
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
                <strong>{getMerchantName(detailOrder.merchantId)}</strong>
              </div>
              <div>
                <span>订单金额</span>
                <strong>{formatMoney(detailOrder.amount)}</strong>
              </div>
              <div>
                <span>退换天数</span>
                <strong>{detailOrder.returnDays} 天</strong>
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

            {detailOrder.refundRequested && (
              <div className={styles.refundNotice}>
                <strong>用户已发起退换申请</strong>
                <Button type="primary" danger onClick={() => refundOrder(detailOrder)}>
                  同意退款
                </Button>
              </div>
            )}
          </div>
        )}
      </Drawer>
      <Modal
        title={editingMerchantId ? '编辑商家' : '新增商家'}
        open={merchantModalOpen}
        onCancel={() => setMerchantModalOpen(false)}
        footer={null}
        width={520}
        destroyOnClose
      >
        <Form form={merchantForm} layout="vertical" onFinish={handleSaveMerchant}>
          <Form.Item name="name" label="商家名称" rules={[{ required: true, message: '请输入商家名称' }]}>
            <Input size="large" placeholder="请输入商家名称" />
          </Form.Item>
          <Form.Item name="ownerName" label="负责人" rules={[{ required: true, message: '请输入负责人姓名' }]}>
            <Input size="large" placeholder="请输入负责人姓名" />
          </Form.Item>
          <Form.Item
            name="phone"
            label="手机号"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1\d{10}$/, message: '请输入 11 位手机号' },
            ]}
          >
            <Input size="large" placeholder="请输入 11 位手机号" />
          </Form.Item>
          <Form.Item name="username" label="登录账号" rules={[{ required: true, message: '请输入登录账号' }]}>
            <Input size="large" placeholder="请输入登录账号" />
          </Form.Item>
          <Form.Item name="password" label="登录密码" rules={[{ required: true, message: '请输入登录密码' }]}>
            <Input.Password size="large" placeholder="请输入登录密码" />
          </Form.Item>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 8 }}>
            <Button onClick={() => setMerchantModalOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit">保存</Button>
          </div>
        </Form>
      </Modal>

      <Modal
        title="发布试用招募"
        open={trialModalOpen}
        onCancel={closeTrialModal}
        footer={null}
        width={520}
        destroyOnClose
      >
        <Form form={trialForm} layout="vertical" onFinish={handlePublishTrial}>
          <Form.Item name="productId" label="选择商品" rules={[{ required: true, message: '请选择商品' }]}>
            <Select placeholder="请选择要发布试用的商品" size="large">
              {visibleProducts.map((product) => (
                <Select.Option key={product.id} value={product.id}>
                  {product.title}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="targetCount" label="招募人数" rules={[{ required: true, message: '请输入招募人数' }]}>
            <InputNumber min={1} max={100} size="large" style={{ width: '100%' }} placeholder="请输入招募人数" />
          </Form.Item>
          <Form.Item name="deadline" label="截止日期" rules={[{ required: true, message: '请选择截止日期' }]}>
            <Input size="large" type="date" placeholder="请选择截止日期" />
          </Form.Item>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 8 }}>
            <Button onClick={closeTrialModal}>取消</Button>
            <Button type="primary" htmlType="submit">发布</Button>
          </div>
        </Form>
      </Modal>

      <Modal
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
