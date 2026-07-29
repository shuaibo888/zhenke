import {
  ArrowLeftOutlined,
  CheckCircleFilled,
  LockOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons';
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
      if (captcha.enabled && (!captcha.uuid || !captcha.image)) {
        message.warning('验证码尚未准备好，请重新获取');
        await loadCaptcha();
        return;
      }
      if (authMode === 'register') {
        await register(values.username, values.password, values.code);
        form.setFieldsValue({ username: values.username.trim(), password: '', code: '' });
        return;
      }
      await login(values.username, values.password, values.code);
      navigate('/profile');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败');
      form.resetFields(['code']);
      await loadCaptcha();
    }
  };

  const switchMode = (mode: 'login' | 'register') => {
    if (mode === authMode) return;
    setAuthMode(mode);
    form.resetFields(['password', 'code']);
  };

  return (
    <>
      <main className={`${styles.authShell} ${styles.authLayout}`}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          className={styles.authBackButton}
          onClick={() => navigate('/')}
        >
          返回商城
        </Button>
        <section className={styles.authIntro}>
          <div className={styles.authBrandRow}>
            <div className={styles.brandMark}>㤫</div>
            <div>
              <strong>㤫者商城</strong>
              <span>真实体验 · 理性消费</span>
            </div>
          </div>
          <div className={styles.authIntroCopy}>
            <span className={styles.eyebrow}>TRUSTED SHOPPING COMMUNITY</span>
            <h1>先验证，<br />再相信。</h1>
            <p>汇集真实甄客体验，让每一次选择都有可靠依据。</p>
          </div>
          <div className={styles.authRules}>
            <span><CheckCircleFilled /> 真实用户体验</span>
            <span><CheckCircleFilled /> 平台审核商家</span>
            <span><CheckCircleFilled /> 交易流程保障</span>
          </div>
        </section>
        <section className={styles.authCard}>
          <div className={styles.authModeTabs} role="tablist" aria-label="登录或注册">
            <button
              type="button"
              role="tab"
              aria-selected={authMode === 'login'}
              className={authMode === 'login' ? styles.authModeActive : ''}
              onClick={() => switchMode('login')}
            >
              账号登录
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={authMode === 'register'}
              className={authMode === 'register' ? styles.authModeActive : ''}
              onClick={() => switchMode('register')}
            >
              用户注册
            </button>
          </div>
          <div className={styles.authHeader}>
            <h2>{authMode === 'login' ? '欢迎回来' : '创建用户账号'}</h2>
            <p>{authMode === 'login' ? '登录后继续查看订单、优惠券与甄客验。' : '完成注册后将自动返回登录页。'}</p>
          </div>
          <Form form={form} layout="vertical" requiredMark={false} className={styles.authForm} onFinish={submit}>
            <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
              <Input
                size="large"
                prefix={<UserOutlined />}
                autoComplete="username"
                placeholder="请输入用户名"
              />
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
              <Input.Password
                size="large"
                prefix={<LockOutlined />}
                autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                placeholder="请输入密码"
              />
            </Form.Item>
            {captcha.enabled && captcha.image && (
              <Form.Item name="code" label="验证码" rules={[{ required: true, message: '请输入验证码结果' }]}>
                <div className={styles.captchaRow}>
                  <Input size="large" autoComplete="off" placeholder="请输入验证码" />
                  <button type="button" className={styles.captchaButton} onClick={() => void loadCaptcha()}>
                    <img src={captcha.image} alt="验证码" />
                  </button>
                </div>
              </Form.Item>
            )}
            {captcha.enabled && (!captcha.image || captchaError) && (
              <div className={styles.captchaRow}>
                <span className={styles.hint}>{captchaLoading ? '验证码加载中…' : captchaError || '验证码暂时无法加载'}</span>
                <Button onClick={() => void loadCaptcha()} loading={captchaLoading}>重新获取</Button>
              </div>
            )}
            <Button
              block
              type="primary"
              size="large"
              htmlType="submit"
              loading={authSubmitting}
              className={styles.authSubmit}
            >
              {authMode === 'login' ? '登录商城' : '立即注册'}
            </Button>
          </Form>
          <div className={styles.authAlternative}>
            <button
              className={styles.authSwitch}
              type="button"
              onClick={() => switchMode(authMode === 'login' ? 'register' : 'login')}
            >
              {authMode === 'login' ? '还没有账号？免费注册' : '已有账号？返回登录'}
            </button>
            <div className={styles.authDivider}><span>平台商家服务</span></div>
            <Button
              block
              size="large"
              icon={<SafetyCertificateOutlined />}
              className={styles.merchantButton}
              onClick={() => setMerchantOpen(true)}
            >
              申请商家入驻
            </Button>
          </div>
        </section>
      </main>
      <MerchantApplicationModal open={merchantOpen} onClose={() => setMerchantOpen(false)} />
    </>
  );
}
