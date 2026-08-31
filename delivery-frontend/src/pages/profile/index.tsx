import {
  DownOutlined,
  EditOutlined,
  EnvironmentOutlined,
  ExclamationCircleFilled,
  FileTextOutlined,
  GiftOutlined,
  InboxOutlined,
  LogoutOutlined,
  ProfileOutlined,
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
import {
  fetchMyOverview,
  updateShopProfile,
  uploadShopAvatar,
  type ShopUserOverview,
} from '@/services/shopAuth';
import legacyStyles from '@/styles/commerce.less';
import styles from '@/styles/zhenke.less';
import { mediaPreviewUrl } from '@/utils/mediaUrl';

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

  const profileEntry = (options: {
    icon: React.ReactNode;
    title: string;
    description: string;
    meta?: string;
    onClick: () => void;
  }) => (
    <button type="button" className={styles.profileEntry} onClick={options.onClick}>
      <span className={styles.profileEntryIcon}>{options.icon}</span>
      <span className={styles.profileEntryCopy}>
        <strong>{options.title}</strong>
        <small>{options.description}</small>
      </span>
      <span>{options.meta || <RightOutlined />}</span>
    </button>
  );

  return (
    <>
      <main className={styles.page}>
        <section className={styles.profileHero}>
          <span className={styles.profileHeroAvatar}>
            {user.avatarType === 'image' && user.avatarImage
              ? <img src={user.avatarImage} alt={user.name} />
              : (user.name || user.username).slice(0, 1)}
          </span>
          <div className={styles.profileHeroCopy}>
            <small>甄客行 · 我的</small>
            <h1>{user.name}</h1>
            <p>{user.usernameInitialized ? `@${user.username}` : '手机号用户'} · {user.roleName || '甄客'}</p>
            <span>记录生活，发现值得去的地方</span>
          </div>
          <div className={styles.profileStats}>
            <button type="button" className={styles.profileStat} onClick={() => navigate('/profile/orders')}>
              <strong>{overviewLoading || overviewError ? '--' : overview?.orderCount ?? '--'}</strong><small>全部订单</small>
            </button>
            <button type="button" className={styles.profileStat} onClick={() => navigate('/profile/points')}>
              <strong>{overviewLoading || overviewError ? '--' : overview?.pointsBalance ?? '--'}</strong><small>可用积分</small>
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

        <div className={styles.profileGroups}>
          <section className={`${styles.surface} ${styles.profileGroup}`}>
            <header className={styles.profileGroupHeader}>
              <h2>内容创作</h2>
            </header>
            <div className={styles.profileEntryGrid}>
              {profileEntry({ icon: <FileTextOutlined />, title: '我的甄客帖', description: '围绕地点主动发布的生活内容', onClick: () => navigate('/profile/posts') })}
              {profileEntry({ icon: <SafetyCertificateOutlined />, title: '我的甄客验', description: '基于订单、试用或核销资格的可信体验', meta: overviewLoading || overviewError ? '—' : `${overview?.reportCount ?? 0} 篇`, onClick: () => navigate('/profile/reports') })}
            </div>
          </section>

          <section className={`${styles.surface} ${styles.profileGroup}`}>
            <header className={styles.profileGroupHeader}>
              <h2>消费履约</h2>
            </header>
            <div className={styles.profileEntryGrid}>
              {profileEntry({ icon: <ShoppingCartOutlined />, title: '我的订单与核销', description: '待付款、待使用、物流、退款与已完成', meta: overviewLoading || overviewError ? '—' : `${overview?.orderCount ?? 0} 笔`, onClick: () => navigate('/profile/orders') })}
              {profileEntry({ icon: <EnvironmentOutlined />, title: '收货地址', description: '仅用于需要快递配送的订单', onClick: () => setAddressOpen(true) })}
            </div>
          </section>

          <section className={`${styles.surface} ${styles.profileGroup}`}>
            <header className={styles.profileGroupHeader}>
              <h2>权益资产</h2>
            </header>
            <div className={styles.profileEntryGrid}>
              {profileEntry({ icon: <GiftOutlined />, title: '优惠券', description: '可用、待生效、已使用与失效', meta: overviewLoading || overviewError ? '—' : `${overview?.couponAvailableCount ?? 0} 张`, onClick: () => navigate('/profile/coupons') })}
              {profileEntry({ icon: <TrophyOutlined />, title: '积分与记录', description: '查看余额、兑换和积分明细', meta: overviewLoading || overviewError ? '—' : `${overview?.pointsBalance ?? 0} 分`, onClick: () => navigate('/profile/points') })}
            </div>
          </section>

          <section className={`${styles.surface} ${styles.profileGroup}`}>
            <header className={styles.profileGroupHeader}>
              <h2>参与服务</h2>
            </header>
            <div className={styles.profileEntryGrid}>
              {profileEntry({ icon: <ProfileOutlined />, title: '我的试用', description: '申请、审核、物流、核销与报告进度', meta: overviewLoading || overviewError ? '—' : `${overview?.trialCount ?? 0} 项`, onClick: () => navigate('/profile/trials') })}
            </div>
          </section>

          <section className={`${styles.surface} ${styles.profileGroup}`}>
            <header className={styles.profileGroupHeader}>
              <h2>设置与安全</h2>
            </header>
            <div className={styles.profileEntryGrid}>
              {profileEntry({ icon: <EditOutlined />, title: '编辑资料与账号安全', description: '头像、昵称、账号名、密码和手机号', onClick: () => { nameForm.setFieldsValue({ name: user.name }); setProfileOpen(true); } })}
              {profileEntry({ icon: <LogoutOutlined />, title: '退出登录', description: '安全结束当前设备上的登录状态', onClick: confirmLogout })}
            </div>
          </section>
        </div>
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
