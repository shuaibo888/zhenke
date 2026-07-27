import { ArrowLeftOutlined, LockOutlined, SafetyCertificateOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Form, Input, message } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'umi';
import { useShop } from '@/app/ShopContext';
import { MerchantApplicationModal } from '@/components/MerchantApplicationModal';
import styles from '@/styles/commerce.less';

type AuthValues = { username: string; password: string; code?: string };

export default function AuthPage() {
  const navigate = useNavigate();
  const {
    user,
    authMode,
    setAuthMode,
    authSubmitting,
    captcha,
    captchaLoading,
    captchaError,
    loadCaptcha,
    login,
    register,
  } = useShop();
  const [form] = Form.useForm<AuthValues>();
  const [merchantOpen, setMerchantOpen] = useState(false);

  useEffect(() => {
    if (user) navigate('/profile', { replace: true });
  }, [navigate, user]);

  const submit = async (values: AuthValues) => {
    try {
      if (authMode === 'register') {
        await register(values.username, values.password);
        form.setFieldsValue({ username: values.username.trim(), password: '', code: '' });
        return;
      }
      if (captcha.enabled && (!captcha.uuid || !captcha.image)) {
        message.warning('验证码尚未准备好，请重新获取');
        await loadCaptcha();
        return;
      }
      await login(values.username, values.password, values.code);
      navigate('/profile');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败');
      if (authMode === 'login') {
        form.resetFields(['code']);
        await loadCaptcha();
      }
    }
  };

  return (
    <>
      <main className={styles.authShell}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          className={styles.authBackButton}
          onClick={() => navigate('/')}
        >
          返回浏览
        </Button>
        <section className={styles.authIntro}>
          <div className={styles.brandMark}>㤫</div>
          <span className={styles.eyebrow}>真实体验社区</span>
          <h1>先验证，再相信。</h1>
          <p>在真实甄客验中了解商品的优点与不足，参与试用，并分享自己的真实体验。</p>
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
          <Form form={form} layout="vertical" onFinish={submit}>
            <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
              <Input size="large" prefix={<UserOutlined />} placeholder="请输入账号" />
            </Form.Item>
            <Form.Item
              name="password"
              label="密码"
              rules={[
                { required: true, message: '请输入密码' },
                {
                  validator: (_, value) => !value || (/[A-Za-z]/.test(value) && /\d/.test(value))
                    ? Promise.resolve()
                    : Promise.reject(new Error('密码必须同时包含字母和数字')),
                },
              ]}
            >
              <Input.Password size="large" prefix={<LockOutlined />} placeholder="请输入密码" />
            </Form.Item>
            {authMode === 'login' && captcha.enabled && captcha.image && (
              <Form.Item name="code" label="验证码" rules={[{ required: true, message: '请输入验证码结果' }]}>
                <div className={styles.captchaRow}>
                  <Input size="large" autoComplete="off" placeholder="请输入验证码" />
                  <button type="button" className={styles.captchaButton} onClick={() => void loadCaptcha()}>
                    <img src={captcha.image} alt="验证码" />
                  </button>
                </div>
              </Form.Item>
            )}
            {authMode === 'login' && (!captcha.image || captchaError) && (
              <div className={styles.captchaRow}>
                <span className={styles.hint}>{captchaLoading ? '验证码加载中…' : captchaError || '验证码暂时无法加载'}</span>
                <Button onClick={() => void loadCaptcha()} loading={captchaLoading}>重新获取</Button>
              </div>
            )}
            <Button block type="primary" size="large" htmlType="submit" loading={authSubmitting}>
              {authMode === 'login' ? '登录' : '注册'}
            </Button>
          </Form>
          <button className={styles.authSwitch} type="button" onClick={() => {
              setAuthMode(authMode === 'login' ? 'register' : 'login');
              form.resetFields(['password', 'code']);
            }}
          >
            {authMode === 'login' ? '还没有账号？去注册' : '已有账号？回到登录'}
          </button>
          <Button
            block
            size="large"
            icon={<SafetyCertificateOutlined />}
            className={styles.merchantButton}
            onClick={() => setMerchantOpen(true)}
          >
            商家入驻
          </Button>
        </section>
      </main>
      <MerchantApplicationModal open={merchantOpen} onClose={() => setMerchantOpen(false)} />
    </>
  );
}
