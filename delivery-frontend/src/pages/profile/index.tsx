import {
  CarOutlined,
  CheckCircleOutlined,
  CreditCardOutlined,
  CustomerServiceOutlined,
  DownOutlined,
  EditOutlined,
  EnvironmentOutlined,
  ExclamationCircleFilled,
  FileTextOutlined,
  GiftOutlined,
  HistoryOutlined,
  InboxOutlined,
  LogoutOutlined,
  MessageOutlined,
  ProfileOutlined,
  QrcodeOutlined,
  RightOutlined,
  ShoppingCartOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TrophyOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { Button, Form, Input, Modal, Upload, message } from 'antd';
import { useCallback, useState } from 'react';
import { useNavigate } from 'umi';
import { useShop } from '@/app/ShopContext';
import { LoginRedirect } from '@/components/LoginRedirect';
import { AddressManager } from '@/components/AddressManager';
import { AccountSecurityPanel } from '@/components/AccountSecurityPanel';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useRefreshOnRoute } from '@/hooks/useRefreshOnRoute';
import { useUnreadNotificationCount } from '@/hooks/useUnreadNotificationCount';
import {
  fetchMyOverview,
  updateShopProfile,
  uploadShopAvatar,
  type ShopUserOverview,
} from '@/services/shopAuth';
import legacyStyles from '@/styles/commerce.less';
import { mediaPreviewUrl } from '@/utils/mediaUrl';
import styles from './profile.module.less';

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif']);

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout, setUser } = useShop();
  const [profileOpen, setProfileOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [overview, setOverview] = useState<ShopUserOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState('');
  const [nameForm] = Form.useForm<{ name: string }>();
  const { unreadCount } = useUnreadNotificationCount(user?.id);
  useBodyScrollLock(profileOpen || addressOpen);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      setOverview(await fetchMyOverview());
      setOverviewError('');
    } catch (error) {
      setOverview(null);
      setOverviewError(error instanceof Error ? error.message : '消费与权益数据暂时不可用');
      throw error;
    } finally {
      setOverviewLoading(false);
    }
  }, []);
  useRefreshOnRoute('/profile', loadOverview, '个人中心数据刷新失败');

  if (!user) {
    return <LoginRedirect />;
  }

  const toggleSection = (key: string) => {
    setExpandedSection((prev) => (prev === key ? null : key));
  };

  const confirmLogout = () => {
    Modal.confirm({
      title: '确认退出登录？',
      content: '退出后需要重新登录，才能继续查看订单、试用和甄客验。',
      okText: '退出登录',
      cancelText: '继续使用',
      okButtonProps: { danger: true },
      onOk: async () => {
        await logout();
        navigate('/');
        message.success('已退出登录');
      },
    });
  };

  const saveName = async (values: { name: string }) => {
    try {
      const updated = await updateShopProfile({ nickname: values.name.trim() });
      setUser(updated);
      message.success('昵称已更新');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '昵称更新失败');
    }
  };

  const uploadAvatar = async (file?: File) => {
    if (!file) return;

    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      message.error('头像仅支持 JPG、PNG、GIF 格式');
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      message.error('头像图片不能超过 5MB');
      return;
    }

    setAvatarLoading(true);
    try {
      const updated = await uploadShopAvatar(file);
      setUser(updated);
      message.success('头像已更新');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '头像上传失败');
    } finally {
      setAvatarLoading(false);
    }
  };

  const openProfileEditor = (section?: string) => {
    nameForm.setFieldsValue({ name: user.name });
    setExpandedSection(section ?? null);
    setProfileOpen(true);
  };

  const overviewValue = (value: number | undefined) => (
    overviewLoading || overviewError ? '--' : String(value ?? 0)
  );

  const profileEntry = (options: {
    icon: React.ReactNode;
    title: string;
    description: string;
    badge?: string;
    ariaLabel?: string;
    onClick: () => void;
  }) => (
    <button
      type="button"
      className={styles.serviceEntry}
      onClick={options.onClick}
      aria-label={options.ariaLabel ?? `${options.title}，${options.description}`}
    >
      <span className={styles.serviceEntryIcon} aria-hidden="true">{options.icon}</span>
      <span className={styles.serviceEntryCopy}>
        <strong>{options.title}</strong>
        <small>{options.description}</small>
      </span>
      {options.badge && <span className={styles.serviceEntryBadge}>{options.badge}</span>}
    </button>
  );

  const orderShortcut = (options: {
    icon: React.ReactNode;
    title: string;
    filter: string;
  }) => (
    <button
      type="button"
      className={styles.orderShortcut}
      onClick={() => navigate(`/profile/orders?filter=${options.filter}`)}
      aria-label={`查看${options.title}订单`}
    >
      <span aria-hidden="true">{options.icon}</span>
      <strong>{options.title}</strong>
    </button>
  );

  return (
    <>
      <main className={styles.profilePage}>
        <section className={styles.profileSummary} aria-labelledby="profile-heading">
          <div className={styles.identityRow}>
            <button
              type="button"
              className={styles.profileAvatar}
              onClick={() => openProfileEditor('avatar')}
              aria-label="更换头像"
            >
              {user.avatarType === 'image' && user.avatarImage
                ? <img src={mediaPreviewUrl(user.avatarImage)} alt="" />
                : (user.name || user.username).slice(0, 1)}
            </button>
            <div className={styles.identityCopy}>
              <span>甄客行 · 我的</span>
              <h1 id="profile-heading">{user.name}</h1>
              <p>{user.usernameInitialized ? `@${user.username}` : '手机号用户'} · {user.roleName || '甄客'}</p>
            </div>
            <button type="button" className={styles.profileEditButton} onClick={() => openProfileEditor()}>
              <EditOutlined aria-hidden="true" />
              <span className={styles.profileEditLabel}>编辑资料</span>
            </button>
          </div>

          <div className={styles.assetStrip} role="group" aria-label="常用权益">
            <button type="button" onClick={() => navigate('/profile/points')}>
              <strong>{overviewValue(overview?.pointsBalance)}</strong>
              <span><TrophyOutlined aria-hidden="true" />积分</span>
            </button>
            <button type="button" onClick={() => navigate('/profile/coupons')}>
              <strong>{overviewValue(overview?.couponAvailableCount)}</strong>
              <span><GiftOutlined aria-hidden="true" />可用优惠券</span>
            </button>
            <button type="button" onClick={() => navigate('/profile/reports')}>
              <strong>{overviewValue(overview?.reportCount)}</strong>
              <span><SafetyCertificateOutlined aria-hidden="true" />甄客验</span>
            </button>
          </div>
        </section>

        {overviewError && (
          <div className={styles.setupNotice} role="alert">
            <ExclamationCircleFilled />
            <strong>消费与权益数据暂时不可用，当前页面不会把未知数据显示为 0</strong>
            <Button size="small" onClick={() => void loadOverview().catch(() => undefined)}>重新加载</Button>
          </div>
        )}

        {(!user.usernameInitialized || !user.passwordInitialized) && (
          <div className={styles.setupNotice} role="status">
            <ExclamationCircleFilled />
            <strong>完成账号名与密码设置，换设备登录更方便</strong>
            <Button type="primary" size="small" onClick={() => {
              setExpandedSection(!user.usernameInitialized ? 'username' : 'password');
              setProfileOpen(true);
            }}>去设置</Button>
          </div>
        )}

        <section className={styles.orderPanel} aria-labelledby="profile-orders-heading">
          <header className={styles.panelHeader}>
            <div className={styles.panelTitle}>
              <ShoppingCartOutlined aria-hidden="true" />
              <h2 id="profile-orders-heading">我的订单</h2>
            </div>
            <button type="button" onClick={() => navigate('/profile/orders')}>
              <span>{overviewLoading || overviewError ? '全部订单' : `全部订单 ${overview?.orderCount ?? 0}`}</span>
              <RightOutlined aria-hidden="true" />
            </button>
          </header>
          <div className={styles.orderShortcutGrid} role="group" aria-label="按订单状态快捷查看">
            {orderShortcut({ icon: <CreditCardOutlined />, title: '待付款', filter: 'PENDING_PAYMENT' })}
            {orderShortcut({ icon: <QrcodeOutlined />, title: '待使用', filter: 'pending_use' })}
            {orderShortcut({ icon: <CarOutlined />, title: '待收货', filter: 'SHIPPED' })}
            {orderShortcut({ icon: <CustomerServiceOutlined />, title: '售后', filter: 'aftersale' })}
            {orderShortcut({ icon: <CheckCircleOutlined />, title: '已完成', filter: 'completed' })}
          </div>
        </section>

        <section className={styles.servicesPanel} aria-labelledby="profile-services-heading">
          <header className={styles.panelHeader}>
            <div className={styles.panelTitle}>
              <h2 id="profile-services-heading">常用服务</h2>
            </div>
          </header>
          <nav className={styles.serviceGrid} aria-label="个人服务">
            {profileEntry({ icon: <FileTextOutlined />, title: '我的甄客帖', description: '地点生活分享', onClick: () => navigate('/profile/posts') })}
            {profileEntry({ icon: <SafetyCertificateOutlined />, title: '我的甄客验', description: '真实履约体验', onClick: () => navigate('/profile/reports') })}
            {profileEntry({
              icon: <MessageOutlined />,
              title: '消息中心',
              description: '点赞与评论消息',
              badge: unreadCount != null && unreadCount > 0 ? (unreadCount > 99 ? '99+' : String(unreadCount)) : undefined,
              ariaLabel: unreadCount != null && unreadCount > 0
                ? `消息中心，点赞与评论消息，${unreadCount} 条未读`
                : '消息中心，点赞与评论消息',
              onClick: () => navigate('/profile/messages'),
            })}
            {profileEntry({ icon: <ProfileOutlined />, title: '我的试用', description: '申请与履约进度', onClick: () => navigate('/profile/trials') })}
            {profileEntry({
              icon: <HistoryOutlined />,
              title: '积分记录',
              description: '查看积分明细',
              onClick: () => navigate('/profile/point-records', {
                state: { pointRecordsSource: '/profile' },
              }),
            })}
            {profileEntry({ icon: <EnvironmentOutlined />, title: '收货地址', description: '配送订单使用', onClick: () => setAddressOpen(true) })}
            {profileEntry({ icon: <SettingOutlined />, title: '资料与安全', description: '头像、账号与密码', onClick: () => openProfileEditor() })}
            {profileEntry({ icon: <LogoutOutlined />, title: '退出登录', description: '安全退出当前账号', onClick: confirmLogout })}
          </nav>
        </section>
      </main>

      <Modal
        title="编辑资料"
        open={profileOpen}
        onCancel={() => {
          setProfileOpen(false);
          setExpandedSection(null);
        }}
        footer={null}
        width={600}
        rootClassName={`${legacyStyles.profileEditModal} ${legacyStyles.responsiveModal}`}
      >
        <div className={legacyStyles.profileEditSections}>
          <section className={legacyStyles.profileEditSection}>
            <button
              type="button"
              className={`${legacyStyles.profileEditHeading} ${legacyStyles.profileEditHeadingBtn}`}
              onClick={() => toggleSection('nickname')}
            >
              <span><EditOutlined /></span>
              <div><strong>修改昵称</strong><small>只更新个人展示名称</small></div>
              <DownOutlined className={`${legacyStyles.profileEditArrow} ${expandedSection === 'nickname' ? legacyStyles.profileEditArrowOpen : ''}`} />
            </button>
            <div className={`${legacyStyles.profileEditBody} ${expandedSection === 'nickname' ? legacyStyles.profileEditBodyOpen : ''}`}>
              <Form form={nameForm} layout="vertical" onFinish={saveName}>
                <Form.Item name="name" label="昵称" rules={[{ required: true, message: '请输入昵称' }]}>
                  <Input size="large" placeholder="请输入你希望展示的昵称" autoComplete="nickname" />
                </Form.Item>
                <Button type="primary" htmlType="submit">保存昵称</Button>
              </Form>
            </div>
          </section>

          <section className={legacyStyles.profileEditSection}>
            <button
              type="button"
              className={`${legacyStyles.profileEditHeading} ${legacyStyles.profileEditHeadingBtn}`}
              onClick={() => toggleSection('avatar')}
            >
              <span><UploadOutlined /></span>
              <div><strong>更换头像</strong><small>上传后立即更新头像，不影响昵称和密码</small></div>
              <DownOutlined className={`${legacyStyles.profileEditArrow} ${expandedSection === 'avatar' ? legacyStyles.profileEditArrowOpen : ''}`} />
            </button>
            <div className={`${legacyStyles.profileEditBody} ${expandedSection === 'avatar' ? legacyStyles.profileEditBodyOpen : ''}`}>
              <div className={legacyStyles.profileEditAvatarRow}>
                <div className={`${legacyStyles.profileAvatar} ${legacyStyles.profileEditAvatar}`}>
                  {user.avatarType === 'image' && user.avatarImage
                    ? <img src={mediaPreviewUrl(user.avatarImage)} alt={user.name} />
                    : <span>{(user.name || user.username).slice(0, 1)}</span>}
                </div>
                <div className={legacyStyles.avatarPicker}>
                  <Upload.Dragger
                    className={legacyStyles.avatarDropzone}
                    accept="image/jpeg,image/png,image/gif"
                    maxCount={1}
                    showUploadList={false}
                    disabled={avatarLoading}
                    beforeUpload={(file) => {
                      void uploadAvatar(file as File);
                      return false;
                    }}
                  >
                    <InboxOutlined />
                    <strong>{avatarLoading ? '正在上传…' : '点击选择或将头像拖到这里'}</strong>
                    <small>上传后立即更新</small>
                  </Upload.Dragger>
                  <p>支持 JPG、PNG、GIF，文件不超过 5MB。</p>
                </div>
              </div>
            </div>
          </section>

          <AccountSecurityPanel
            user={user}
            onUserChange={setUser}
            expandedSection={expandedSection}
            onToggleSection={toggleSection}
          />
        </div>
      </Modal>

      <AddressManager open={addressOpen} onClose={() => setAddressOpen(false)} />
    </>
  );
}
