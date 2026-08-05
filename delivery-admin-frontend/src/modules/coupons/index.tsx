import {
  EditOutlined,
  GiftOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  App as AntApp,
  Button,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import {
  createCoupon,
  fetchCouponGrants,
  fetchCouponUserOptions,
  fetchCoupons,
  fetchMerchants,
  grantCoupon,
  updateCoupon,
  updateCouponStatus,
  type CouponWriteBody,
} from '@/services/adminApi';
import type {
  AdminSession,
  ManagedCoupon,
  ManagedCouponGrant,
  MerchantAccount,
  ShopUserAccount,
} from '@/types';
import styles from './index.less';

const PAGE_SIZE = 10;

type CouponFormValues = {
  couponName: string;
  description?: string;
  discountAmount: number;
  minimumSpend: number;
  startTime: string;
  endTime: string;
  status: 'ENABLED' | 'DISABLED';
  totalStock: number;
  merchantIds: number[];
};

type CouponGrantFormValues = {
  userIds: number[];
  quantityPerUser: number;
};

function formatMoney(value: number) {
  return `¥${value.toFixed(2)}`;
}

function formatDateTime(value?: string, emptyText = '-') {
  if (!value) return emptyText;
  const match = value.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})/);
  return match ? `${match[1]} ${match[2]}` : value;
}

function formatDate(value?: string, emptyText = '-') {
  return value ? value.slice(0, 10) : emptyText;
}

function toDateInput(value?: string) {
  return value?.slice(0, 10) ?? '';
}

function toApiDate(value: string, endOfDay = false) {
  return `${value.trim()} ${endOfDay ? '23:59:59' : '00:00:00'}`;
}

function getCouponStatusMeta(coupon: ManagedCoupon) {
  if (coupon.status === 'DISABLED') return { label: '已下架', color: 'default' };
  const now = Date.now();
  if (new Date(coupon.startTime.replace(' ', 'T')).getTime() > now) return { label: '未开始', color: 'processing' };
  if (new Date(coupon.endTime.replace(' ', 'T')).getTime() <= now) return { label: '已过期', color: 'red' };
  return { label: '生效中', color: 'green' };
}

export interface CouponModuleProps {
  session: AdminSession;
}

export default function CouponModule({ session }: CouponModuleProps) {
  const { message, modal } = AntApp.useApp();
  const isAdmin = session.loginType === 'admin';
  const [couponForm] = Form.useForm<CouponFormValues>();
  const [couponGrantForm] = Form.useForm<CouponGrantFormValues>();
  const [coupons, setCoupons] = useState<ManagedCoupon[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<'ENABLED' | 'DISABLED'>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<ManagedCoupon | null>(null);
  const [saving, setSaving] = useState(false);
  const [merchantOptions, setMerchantOptions] = useState<MerchantAccount[]>([]);
  const [grantTarget, setGrantTarget] = useState<ManagedCoupon | null>(null);
  const [grantSaving, setGrantSaving] = useState(false);
  const [userOptions, setUserOptions] = useState<ShopUserAccount[]>([]);
  const [historyTarget, setHistoryTarget] = useState<ManagedCoupon | null>(null);
  const [history, setHistory] = useState<ManagedCouponGrant[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadCoupons = async (
    nextPage = page,
    filters = { keyword, status },
  ) => {
    setLoading(true);
    try {
      const result = await fetchCoupons(session, {
        pageNum: nextPage,
        pageSize: PAGE_SIZE,
        keyword: filters.keyword.trim() || undefined,
        status: filters.status,
      });
      setCoupons(result.rows);
      setTotal(result.total);
      setPage(nextPage);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '优惠券列表加载失败');
    } finally {
      setLoading(false);
    }
  };

  const loadMerchantOptions = async (search = '') => {
    try {
      const result = await fetchMerchants({
        pageNum: 1,
        pageSize: 50,
        auditStatus: 'APPROVED',
        status: '0',
        keyword: search.trim() || undefined,
      });
      setMerchantOptions((current) => {
        const merged = new Map(current.map((merchant) => [merchant.id, merchant]));
        result.rows.forEach((merchant) => merged.set(merchant.id, merchant));
        return Array.from(merged.values());
      });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '适用商家加载失败');
    }
  };

  const loadUserOptions = async (search = '') => {
    try {
      const result = await fetchCouponUserOptions(session, search.trim() || undefined);
      setUserOptions((current) => {
        const merged = new Map(current.map((user) => [user.userId, user]));
        result.rows.forEach((user) => merged.set(user.userId, user));
        return Array.from(merged.values());
      });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '下发用户加载失败');
    }
  };

  const loadHistory = async (coupon: ManagedCoupon, nextPage = historyPage) => {
    setHistoryLoading(true);
    try {
      const result = await fetchCouponGrants(session, coupon.couponId, nextPage, PAGE_SIZE);
      setHistory(result.rows);
      setHistoryTotal(result.total);
      setHistoryPage(nextPage);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '下发记录加载失败');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    void loadCoupons(1);
  }, [session.id]);

  const openCreate = () => {
    setEditingCoupon(null);
    setMerchantOptions([]);
    couponForm.setFieldsValue({
      couponName: '',
      description: '',
      discountAmount: 1,
      minimumSpend: 0,
      startTime: '',
      endTime: '',
      status: 'DISABLED',
      totalStock: 100,
      merchantIds: [],
    });
    setDrawerOpen(true);
    if (isAdmin) void loadMerchantOptions();
  };

  const openEdit = (coupon: ManagedCoupon) => {
    if (coupon.issuedCount > 0) {
      message.info('优惠券已有下发记录，只能调整上下架状态');
      return;
    }
    setEditingCoupon(coupon);
    setMerchantOptions(coupon.merchants.map((merchant) => ({
      id: merchant.merchantId,
      merchantId: merchant.merchantId,
      name: merchant.merchantName,
      ownerName: '',
      phone: '',
      status: 'active',
    })));
    couponForm.setFieldsValue({
      couponName: coupon.couponName,
      description: coupon.description,
      discountAmount: coupon.discountAmount,
      minimumSpend: coupon.minimumSpend,
      startTime: toDateInput(coupon.startTime),
      endTime: toDateInput(coupon.endTime),
      status: coupon.status,
      totalStock: coupon.totalStock,
      merchantIds: coupon.merchants.map((merchant) => merchant.merchantId),
    });
    setDrawerOpen(true);
    if (isAdmin) void loadMerchantOptions();
  };

  const closeDrawer = () => {
    if (saving) return;
    setDrawerOpen(false);
    setEditingCoupon(null);
    couponForm.resetFields();
  };

  const submitCoupon = async (values: CouponFormValues) => {
    if (saving) return;
    if (values.endTime < values.startTime) {
      message.warning('结束日期不能早于开始日期');
      return;
    }
    const body: CouponWriteBody = {
      couponName: values.couponName.trim(),
      description: values.description?.trim(),
      discountAmount: values.discountAmount,
      minimumSpend: values.minimumSpend,
      startTime: toApiDate(values.startTime),
      endTime: toApiDate(values.endTime, true),
      status: values.status,
      totalStock: values.totalStock,
      merchantIds: isAdmin ? values.merchantIds : undefined,
    };
    setSaving(true);
    try {
      if (editingCoupon) await updateCoupon(session, editingCoupon.couponId, body);
      else await createCoupon(session, body);
      setDrawerOpen(false);
      setEditingCoupon(null);
      couponForm.resetFields();
      await loadCoupons(1);
      message.success(editingCoupon ? '优惠券已更新' : '优惠券已创建');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '优惠券保存失败');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = (coupon: ManagedCoupon) => {
    const nextStatus = coupon.status === 'ENABLED' ? 'DISABLED' : 'ENABLED';
    modal.confirm({
      title: nextStatus === 'DISABLED' ? '确认下架优惠券？' : '确认上架优惠券？',
      content: nextStatus === 'DISABLED'
        ? `下架后，已经发给用户的「${coupon.couponName}」也不能继续使用。`
        : `上架后，「${coupon.couponName}」将在有效期内恢复可用并允许继续下发。`,
      okText: nextStatus === 'DISABLED' ? '确认下架' : '确认上架',
      cancelText: '取消',
      okButtonProps: nextStatus === 'DISABLED' ? { danger: true } : undefined,
      onOk: async () => {
        await updateCouponStatus(session, coupon.couponId, nextStatus);
        await loadCoupons();
        message.success(nextStatus === 'DISABLED' ? '优惠券已下架' : '优惠券已上架');
      },
    });
  };

  const openGrant = (coupon: ManagedCoupon) => {
    if (coupon.status !== 'ENABLED') {
      message.warning('优惠券上架后才能下发');
      return;
    }
    if (coupon.issuedCount >= coupon.totalStock) {
      message.warning('优惠券库存已全部下发');
      return;
    }
    setGrantTarget(coupon);
    setUserOptions([]);
    couponGrantForm.setFieldsValue({ userIds: [], quantityPerUser: 1 });
    void loadUserOptions();
  };

  const closeGrant = () => {
    if (grantSaving) return;
    setGrantTarget(null);
    couponGrantForm.resetFields();
  };

  const submitGrant = async (values: CouponGrantFormValues) => {
    if (!grantTarget || grantSaving) return;
    const requested = values.userIds.length * values.quantityPerUser;
    const remaining = grantTarget.totalStock - grantTarget.issuedCount;
    if (requested > remaining) {
      message.warning(`本次需要 ${requested} 张，但当前只剩 ${remaining} 张`);
      return;
    }
    setGrantSaving(true);
    try {
      await grantCoupon(session, grantTarget.couponId, values);
      setGrantTarget(null);
      couponGrantForm.resetFields();
      await loadCoupons();
      message.success(`已向 ${values.userIds.length} 位用户下发 ${requested} 张优惠券`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '优惠券下发失败');
    } finally {
      setGrantSaving(false);
    }
  };

  const openHistory = (coupon: ManagedCoupon) => {
    setHistoryTarget(coupon);
    setHistory([]);
    setHistoryPage(1);
    void loadHistory(coupon, 1);
  };

  const columns: ColumnsType<ManagedCoupon> = [
    {
      title: '优惠券',
      key: 'coupon',
      render: (_, coupon) => (
        <div>
          <div className={styles.strongText}>{coupon.couponName}</div>
          <div className={styles.subText}>
            {coupon.minimumSpend > 0
              ? `满 ${formatMoney(coupon.minimumSpend)} 减 ${formatMoney(coupon.discountAmount)}`
              : `无门槛减 ${formatMoney(coupon.discountAmount)}`}
          </div>
        </div>
      ),
    },
    {
      title: '适用商家',
      dataIndex: 'merchants',
      responsive: ['md'],
      render: (merchants: ManagedCoupon['merchants']) => (
        <Space size={4} wrap>
          {merchants.slice(0, 3).map((merchant) => <Tag key={merchant.merchantId}>{merchant.merchantName}</Tag>)}
          {merchants.length > 3 && <Tag>+{merchants.length - 3}</Tag>}
        </Space>
      ),
    },
    {
      title: '有效期',
      key: 'validity',
      responsive: ['md'],
      render: (_, coupon) => (
        <div>
          <div>{formatDate(coupon.startTime)}</div>
          <div className={styles.subText}>至 {formatDate(coupon.endTime)}</div>
        </div>
      ),
    },
    {
      title: '库存',
      key: 'stock',
      render: (_, coupon) => (
        <div>
          <div>{coupon.totalStock - coupon.issuedCount} 张可下发</div>
          <div className={styles.subText}>已发 {coupon.issuedCount} / {coupon.totalStock}</div>
        </div>
      ),
    },
    {
      title: '状态',
      key: 'status',
      render: (_, coupon) => {
        const meta = getCouponStatusMeta(coupon);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, coupon) => (
        <Space size={6} wrap>
          <Button
            size="small"
            type="primary"
            icon={<GiftOutlined />}
            disabled={coupon.status !== 'ENABLED' || coupon.issuedCount >= coupon.totalStock}
            onClick={() => openGrant(coupon)}
          >
            定向下发
          </Button>
          <Button size="small" onClick={() => toggleStatus(coupon)}>
            {coupon.status === 'ENABLED' ? '下架' : '上架'}
          </Button>
          <Button size="small" icon={<EditOutlined />} disabled={coupon.issuedCount > 0} onClick={() => openEdit(coupon)}>
            编辑
          </Button>
          <Button size="small" onClick={() => openHistory(coupon)}>下发记录</Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <section className={styles.tableSurface}>
        <div className={styles.tableHeader}>
          <div>
            <p className={styles.eyebrow}>{isAdmin ? '平台优惠券可选择多个用户和多个商家' : '本店优惠券可选择多个商城用户'}</p>
            <h3>优惠券管理</h3>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>创建优惠券</Button>
        </div>
        <div className={styles.toolbar}>
          <Input
            className={styles.search}
            prefix={<SearchOutlined />}
            allowClear
            placeholder="搜索优惠券名称"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={() => void loadCoupons(1)}
          />
          <Select
            className={styles.filter}
            allowClear
            placeholder="全部上下架状态"
            value={status}
            onChange={setStatus}
            options={[
              { label: '已上架', value: 'ENABLED' },
              { label: '已下架', value: 'DISABLED' },
            ]}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={() => void loadCoupons(1)}>查询</Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              setKeyword('');
              setStatus(undefined);
              void loadCoupons(1, { keyword: '', status: undefined });
            }}
          >
            重置
          </Button>
          <span className={styles.summary}>共 {total} 个优惠券</span>
        </div>
        <Table
          rowKey="couponId"
          columns={columns}
          dataSource={coupons}
          loading={loading}
          scroll={{ x: 'max-content' }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            showSizeChanger: false,
            showTotal: (count) => `共 ${count} 条`,
            onChange: (nextPage) => void loadCoupons(nextPage),
          }}
        />
      </section>

      <Drawer
        rootClassName={styles.responsiveDrawer}
        title={editingCoupon ? '编辑优惠券' : '创建优惠券'}
        open={drawerOpen}
        onClose={closeDrawer}
        size="large"
        destroyOnHidden
      >
        <Form<CouponFormValues>
          form={couponForm}
          layout="vertical"
          onFinish={submitCoupon}
          initialValues={{ status: 'DISABLED', minimumSpend: 0, discountAmount: 1, totalStock: 100 }}
        >
          <Form.Item name="couponName" label="优惠券名称" rules={[{ required: true, message: '请输入优惠券名称' }, { max: 100 }]}>
            <Input maxLength={100} placeholder="例如：甄选商家满100减20券" />
          </Form.Item>
          <Form.Item name="description" label="优惠券说明" rules={[{ max: 500 }]}>
            <Input.TextArea rows={3} maxLength={500} showCount placeholder="说明适用场景或活动口径" />
          </Form.Item>
          <div className={styles.formGrid}>
            <Form.Item name="discountAmount" label="固定优惠金额" rules={[{ required: true, message: '请输入优惠金额' }]}>
              <InputNumber min={0.01} max={99999999.99} precision={2} prefix="¥" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="minimumSpend" label="最低消费金额" extra="填写 0 表示无门槛" rules={[{ required: true, message: '请输入最低消费金额' }]}>
              <InputNumber min={0} max={99999999.99} precision={2} prefix="¥" style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <div className={styles.formGrid}>
            <Form.Item
              name="startTime"
              label="开始日期"
              getValueProps={(value?: string) => ({ value: value ? dayjs(value, 'YYYY-MM-DD') : null })}
              normalize={(value) => value?.format('YYYY-MM-DD') ?? ''}
              rules={[{ required: true, message: '请选择开始日期' }]}
            >
              <DatePicker
                className={styles.datePicker}
                format="YYYY-MM-DD"
                placeholder="请选择开始日期"
                inputReadOnly
              />
            </Form.Item>
            <Form.Item
              name="endTime"
              label="结束日期"
              getValueProps={(value?: string) => ({ value: value ? dayjs(value, 'YYYY-MM-DD') : null })}
              normalize={(value) => value?.format('YYYY-MM-DD') ?? ''}
              rules={[{ required: true, message: '请选择结束日期' }]}
            >
              <DatePicker
                className={styles.datePicker}
                format="YYYY-MM-DD"
                placeholder="请选择结束日期"
                inputReadOnly
              />
            </Form.Item>
          </div>
          <div className={styles.formGrid}>
            <Form.Item name="totalStock" label="总库存" rules={[{ required: true, message: '请输入总库存' }]}>
              <InputNumber min={1} max={100000000} precision={0} addonAfter="张" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="status" label="初始状态" rules={[{ required: true }]}>
              <Select options={[
                { label: '下架（暂不可下发和使用）', value: 'DISABLED' },
                { label: '上架', value: 'ENABLED' },
              ]} />
            </Form.Item>
          </div>
          {isAdmin && (
            <Form.Item
              name="merchantIds"
              label="适用商家"
              extra="平台优惠券只能用于所选商家。"
              rules={[{ required: true, type: 'array', min: 1, message: '请至少选择一个适用商家' }]}
            >
              <Select
                mode="multiple"
                showSearch
                filterOption={false}
                onSearch={(value) => void loadMerchantOptions(value)}
                placeholder="搜索并选择一个或多个已启用商家"
                options={merchantOptions.map((merchant) => ({ value: merchant.id, label: merchant.name }))}
                maxTagCount="responsive"
              />
            </Form.Item>
          )}
          {!isAdmin && <p className={styles.subText}>适用范围固定为当前商家，无法选择或修改其他商家。</p>}
          <Space>
            <Button type="primary" htmlType="submit" loading={saving}>{editingCoupon ? '保存修改' : '创建优惠券'}</Button>
            <Button onClick={closeDrawer} disabled={saving}>取消</Button>
          </Space>
        </Form>
      </Drawer>

      <Modal
        rootClassName={styles.responsiveModal}
        title={grantTarget ? `定向下发：${grantTarget.couponName}` : '定向下发优惠券'}
        open={Boolean(grantTarget)}
        onCancel={closeGrant}
        footer={null}
        destroyOnHidden
      >
        {grantTarget && (
          <>
            <p className={styles.subText}>
              适用商家：{grantTarget.merchants.map((merchant) => merchant.merchantName).join('、')}
              ；剩余可下发 {grantTarget.totalStock - grantTarget.issuedCount} 张
            </p>
            <Form<CouponGrantFormValues>
              form={couponGrantForm}
              layout="vertical"
              onFinish={submitGrant}
              initialValues={{ userIds: [], quantityPerUser: 1 }}
            >
              <Form.Item name="userIds" label="指定商城用户" rules={[{ required: true, type: 'array', min: 1, message: '请至少选择一个用户' }]}>
                <Select
                  mode="multiple"
                  showSearch
                  filterOption={false}
                  onSearch={(value) => void loadUserOptions(value)}
                  placeholder="搜索用户名或昵称，可多选"
                  options={userOptions.map((user) => ({
                    value: user.userId,
                    label: `${user.nickName}（${user.userName}）`,
                  }))}
                  maxTagCount="responsive"
                />
              </Form.Item>
              <Form.Item name="quantityPerUser" label="每位用户下发张数" rules={[{ required: true, message: '请输入每位用户的下发张数' }]}>
                <InputNumber min={1} max={100} precision={0} addonAfter="张/人" style={{ width: '100%' }} />
              </Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={grantSaving}>确认下发</Button>
                <Button onClick={closeGrant} disabled={grantSaving}>取消</Button>
              </Space>
            </Form>
          </>
        )}
      </Modal>

      <Modal
        rootClassName={styles.responsiveModal}
        title={historyTarget ? `下发记录：${historyTarget.couponName}` : '优惠券下发记录'}
        open={Boolean(historyTarget)}
        onCancel={() => setHistoryTarget(null)}
        footer={null}
        width={760}
        destroyOnHidden
      >
        <Table
          rowKey="grantId"
          loading={historyLoading}
          dataSource={history}
          columns={[
            { title: '下发时间', dataIndex: 'createTime', render: (value: string) => formatDateTime(value) },
            { title: '方式', dataIndex: 'grantType', render: (value: ManagedCouponGrant['grantType']) => value === 'AUTOMATIC' ? '系统自动' : '手动下发' },
            { title: '操作人', dataIndex: 'operatorName' },
            { title: '用户数', dataIndex: 'userCount', render: (value: number) => `${value} 人` },
            { title: '每人张数', dataIndex: 'quantityPerUser', render: (value: number) => `${value} 张` },
            { title: '下发总数', dataIndex: 'totalQuantity', render: (value: number) => `${value} 张` },
          ]}
          pagination={{
            current: historyPage,
            pageSize: PAGE_SIZE,
            total: historyTotal,
            showSizeChanger: false,
            showTotal: (count) => `共 ${count} 次`,
            onChange: (nextPage) => historyTarget && void loadHistory(historyTarget, nextPage),
          }}
        />
      </Modal>
    </>
  );
}
