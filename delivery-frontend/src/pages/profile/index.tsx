import {
  DownOutlined,
  EditOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  GiftOutlined,
  LockOutlined,
  LogoutOutlined,
  ProfileOutlined,
  RightOutlined,
  ShoppingCartOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { Button, Form, Input, Modal, message } from 'antd';
import { useRef, useState } from 'react';
import { Navigate, useNavigate } from 'umi';
import { useShop } from '@/app/ShopContext';
import { AddressManager } from '@/components/AddressManager';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useRefreshOnRoute } from '@/hooks/useRefreshOnRoute';
import { changeShopPassword, updateShopProfile, uploadShopAvatar } from '@/services/shopAuth';
import styles from '@/styles/commerce.less';

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif']);

export default function ProfilePage() {
  const navigate = useNavigate();
  const {
    user,
    orders,
    trials,
    reports,
    coupons,
    privateLoading,
    logout,
    setUser,
    refreshOrders,
    refreshTrials,
    refreshReports,
    refreshCoupons,
  } = useShop();
  const [profileOpen, setProfileOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [nameForm] = Form.useForm<{ name: string }>();
  const [passwordForm] = Form.useForm<{ oldPassword: string; newPassword: string }>();
  const avatarInput = useRef<HTMLInputElement | null>(null);
  useBodyScrollLock(profileOpen || addressOpen);
  useRefreshOnRoute('/profile', refreshOrders, '订单概览刷新失败');
  useRefreshOnRoute('/profile', refreshTrials, '试用概览刷新失败');
  useRefreshOnRoute('/profile', refreshReports, '甄客验概览刷新失败');
  useRefreshOnRoute('/profile', refreshCoupons, '优惠券概览刷新失败');

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const pendingReportCount = trials.filter((trial) => (
    trial.status === 'RECEIVED' || (trial.trialType === 'OFFLINE' && trial.status === 'APPROVED')
  )).length + orders.reduce(
    (count, order) => count + (order.status === 'RECEIVED'
      ? order.items.filter((item) => !item.verificationReportId).length
      : 0),
    0,
  );
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

  const savePassword = async (values: { oldPassword: string; newPassword: string }) => {
    try {
      await changeShopPassword(values.oldPassword, values.newPassword);
      passwordForm.resetFields();
      message.success('密码已更新');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '密码更新失败');
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

  return (
    <>
      <main className={styles.profileGrid}>
        <section className={styles.profileHeaderCard}>
          <span className={styles.profileHeaderGlow} aria-hidden="true" />
          <div className={styles.profileIdentity}>
            <div className={styles.profileAvatar}>
              {user.avatarType === 'image' && user.avatarImage
                ? <img src={user.avatarImage} alt={user.name} />
                : <span>{(user.name || user.username).slice(0, 1)}</span>}
            </div>
            <div className={styles.profileIdentityText}>
              <span className={styles.profileKicker}>个人中心</span>
              <h2>{user.name}</h2>
              <p>@{user.username} · {user.roleName || '甄客'}</p>
            </div>
            <button
              type="button"
              className={styles.mobileLogoutButton}
              aria-label="退出登录"
              onClick={confirmLogout}
            >
              <LogoutOutlined />
              <span>退出</span>
            </button>
          </div>
          <div className={styles.profileHeaderActions}>
            <Button type="primary" icon={<EditOutlined />} onClick={() => {
              nameForm.setFieldsValue({ name: user.name });
              setProfileOpen(true);
            }}>
              编辑资料
            </Button>
            <Button icon={<EnvironmentOutlined />} onClick={() => setAddressOpen(true)}>收货地址</Button>
          </div>
        </section>

        <section className={styles.profileMenuPanel}>
          <div className={styles.profileMenuHeading}>
            <div>
              <span>服务中心</span>
              <h3>我的服务</h3>
            </div>
            <p>选择模块后查看完整记录和进度</p>
          </div>
          <div className={styles.profileMenuGrid}>
            <button type="button" className={styles.profileMenuItem} onClick={() => navigate('/profile/orders')}>
              <span className={styles.profileMenuIcon}><ShoppingCartOutlined /></span>
              <span className={styles.profileMenuCopy}>
                <strong>我的订单</strong>
                <small>付款、物流、收货与售后记录</small>
              </span>
              <span className={styles.profileMenuMeta}>{privateLoading ? '加载中' : `${orders.length} 笔`}</span>
              <RightOutlined className={styles.profileMenuArrow} />
            </button>
            <button type="button" className={styles.profileMenuItem} onClick={() => navigate('/profile/coupons')}>
              <span className={styles.profileMenuIcon}><GiftOutlined /></span>
              <span className={styles.profileMenuCopy}>
                <strong>我的优惠券</strong>
                <small>查看可用、待生效、已使用与失效优惠券</small>
              </span>
              <span className={styles.profileMenuMeta}>
                {privateLoading ? '加载中' : `${coupons.filter((coupon) => coupon.availabilityStatus === 'AVAILABLE').length} 张可用`}
              </span>
              <RightOutlined className={styles.profileMenuArrow} />
            </button>
            <button type="button" className={styles.profileMenuItem} onClick={() => navigate('/profile/trials')}>
              <span className={styles.profileMenuIcon}><ProfileOutlined /></span>
              <span className={styles.profileMenuCopy}>
                <strong>我的试用</strong>
                <small>申请、审核、物流与发布进度</small>
              </span>
              <span className={styles.profileMenuMeta}>{privateLoading ? '加载中' : `${trials.length} 项`}</span>
              <RightOutlined className={styles.profileMenuArrow} />
            </button>
            <button type="button" className={styles.profileMenuItem} onClick={() => navigate('/profile/reports')}>
              <span className={styles.profileMenuIcon}><FileTextOutlined /></span>
              <span className={styles.profileMenuCopy}>
                <strong>我的甄客验</strong>
                <small>{privateLoading ? '正在加载发布进度' : `待发布 ${pendingReportCount} · 查看已发布内容`}</small>
              </span>
              <span className={styles.profileMenuMeta}>{privateLoading ? '加载中' : `${reports.length} 篇`}</span>
              <RightOutlined className={styles.profileMenuArrow} />
            </button>
          </div>
        </section>

      </main>

      <Modal
        title="编辑资料"
        open={profileOpen}
        onCancel={() => {
          setProfileOpen(false);
          passwordForm.resetFields();
          setExpandedSection(null);
        }}
        footer={null}
        width={600}
        rootClassName={`${styles.profileEditModal} ${styles.responsiveModal}`}
      >
        <div className={styles.profileEditSections}>
          <section className={styles.profileEditSection}>
            <button
              type="button"
              className={`${styles.profileEditHeading} ${styles.profileEditHeadingBtn}`}
              onClick={() => toggleSection('nickname')}
            >
              <span><EditOutlined /></span>
              <div><strong>修改昵称</strong><small>只更新个人展示名称</small></div>
              <DownOutlined className={`${styles.profileEditArrow} ${expandedSection === 'nickname' ? styles.profileEditArrowOpen : ''}`} />
            </button>
            <div className={`${styles.profileEditBody} ${expandedSection === 'nickname' ? styles.profileEditBodyOpen : ''}`}>
              <Form form={nameForm} layout="vertical" onFinish={saveName}>
                <Form.Item name="name" label="昵称" rules={[{ required: true, message: '请输入昵称' }]}>
                  <Input size="large" />
                </Form.Item>
                <Button type="primary" htmlType="submit">保存昵称</Button>
              </Form>
            </div>
          </section>

          <section className={styles.profileEditSection}>
            <button
              type="button"
              className={`${styles.profileEditHeading} ${styles.profileEditHeadingBtn}`}
              onClick={() => toggleSection('avatar')}
            >
              <span><UploadOutlined /></span>
              <div><strong>更换头像</strong><small>上传后立即更新头像，不影响昵称和密码</small></div>
              <DownOutlined className={`${styles.profileEditArrow} ${expandedSection === 'avatar' ? styles.profileEditArrowOpen : ''}`} />
            </button>
            <div className={`${styles.profileEditBody} ${expandedSection === 'avatar' ? styles.profileEditBodyOpen : ''}`}>
              <div className={styles.profileEditAvatarRow}>
                <div className={`${styles.profileAvatar} ${styles.profileEditAvatar}`}>
                  {user.avatarType === 'image' && user.avatarImage
                    ? <img src={user.avatarImage} alt={user.name} />
                    : <span>{(user.name || user.username).slice(0, 1)}</span>}
                </div>
                <div className={styles.avatarPicker}>
                  <input
                    ref={avatarInput}
                    type="file"
                    accept="image/jpeg,image/png,image/gif"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      void uploadAvatar(file);
                    }}
                  />
                  <Button
                    icon={<UploadOutlined />}
                    loading={avatarLoading}
                    onClick={() => avatarInput.current?.click()}
                  >
                    选择图片
                  </Button>
                  <p>支持 JPG、PNG、GIF，文件不超过 5MB。</p>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.profileEditSection}>
            <button
              type="button"
              className={`${styles.profileEditHeading} ${styles.profileEditHeadingBtn}`}
              onClick={() => toggleSection('password')}
            >
              <span><LockOutlined /></span>
              <div><strong>修改密码</strong><small>验证旧密码后单独更新登录密码</small></div>
              <DownOutlined className={`${styles.profileEditArrow} ${expandedSection === 'password' ? styles.profileEditArrowOpen : ''}`} />
            </button>
            <div className={`${styles.profileEditBody} ${expandedSection === 'password' ? styles.profileEditBodyOpen : ''}`}>
              <Form form={passwordForm} layout="vertical" onFinish={savePassword}>
                <Form.Item name="oldPassword" label="旧密码" rules={[{ required: true, message: '请输入旧密码' }]}>
                  <Input.Password size="large" placeholder="请输入旧密码" />
                </Form.Item>
                <Form.Item
                  name="newPassword"
                  label="新密码"
                  rules={[
                    { required: true, message: '请输入新密码' },
                    {
                      validator: (_, value) => !value || (/[A-Za-z]/.test(value) && /\d/.test(value))
                        ? Promise.resolve()
                        : Promise.reject(new Error('新密码必须同时包含字母和数字')),
                    },
                  ]}
                >
                  <Input.Password size="large" placeholder="请输入新密码" />
                </Form.Item>
                <Button type="primary" htmlType="submit">保存密码</Button>
              </Form>
            </div>
          </section>
        </div>
      </Modal>

      <AddressManager open={addressOpen} onClose={() => setAddressOpen(false)} />
    </>
  );
}
