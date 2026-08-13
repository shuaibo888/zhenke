import {
  ArrowLeftOutlined,
  CheckCircleFilled,
  InfoCircleFilled,
  LockOutlined,
  MobileOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Button, Form, Input, message } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'umi';
import { useShop } from '@/app/ShopContext';
import { MerchantApplicationModal } from '@/components/MerchantApplicationModal';
import { getAliyunOneClickSpToken } from '@/services/aliyunOneClick';
import {
  fetchPhoneAuthCapabilities,
  loginOrRegisterByOneClick,
  loginOrRegisterByPhone,
  sendLoginPhoneCode,
  type PhoneAuthCapabilities,
} from '@/services/shopAuth';
import styles from '@/styles/commerce.less';

type AuthValues = { username: string; password: string; code?: string };
type PhoneValues = { phone: string; code: string };
const ONE_CLICK_NETWORK_GUIDANCE = '请关闭Wi-Fi使用手机流量认证或使用短信验证码';

export default function AuthPage() {
  const navigate = useNavigate();
  const {
    user,
    setUser,
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
  const [phoneForm] = Form.useForm<PhoneValues>();
  const [merchantOpen, setMerchantOpen] = useState(false);
  const [phoneMode, setPhoneMode] = useState(false);
  const [phoneLoginMethod, setPhoneLoginMethod] = useState<'oneClick' | 'sms'>('oneClick');
  const [phoneSubmitting, setPhoneSubmitting] = useState(false);
  const [oneClickLoading, setOneClickLoading] = useState(false);
  const [oneClickGuidance, setOneClickGuidance] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [capabilities, setCapabilities] = useState<PhoneAuthCapabilities | null>(null);

  useEffect(() => {
    if (user) navigate('/profile', { replace: true });
  }, [navigate, user]);

  useEffect(() => {
    void fetchPhoneAuthCapabilities().then(setCapabilities).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const timer = window.setInterval(() => setCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    form.resetFields(['code']);
  }, [captcha.uuid, form]);

  const submit = async (values: AuthValues) => {
    try {
      if (captcha.enabled && (!captcha.uuid || !captcha.image)) {
        message.warning('验证码尚未准备好，请重新获取');
        await loadCaptcha();
        return;
      }
      if (authMode === 'register') {
        await register(values.username, values.password, values.code);
        form.resetFields(['password', 'code']);
        form.setFieldValue('username', values.username.trim());
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

  const sendPhoneCode = async () => {
    try {
      const phone = await phoneForm.validateFields(['phone']).then((values) => values.phone);
      await sendLoginPhoneCode(phone);
      setCountdown(60);
      message.success('验证码已发送');
    } catch (error) {
      if (error instanceof Error) message.error(error.message);
    }
  };

  const submitPhone = async (values: PhoneValues) => {
    setPhoneSubmitting(true);
    try {
      const nextUser = await loginOrRegisterByPhone(values.phone, values.code);
      setUser(nextUser);
      message.success('手机号验证成功');
      navigate('/profile');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '手机号登录失败');
    } finally {
      setPhoneSubmitting(false);
    }
  };

  const submitOneClick = async () => {
    setOneClickGuidance('');
    setOneClickLoading(true);
    try {
      const spToken = await getAliyunOneClickSpToken();
      const nextUser = await loginOrRegisterByOneClick(spToken);
      setUser(nextUser);
      message.success('本机号码认证成功');
      navigate('/profile');
    } catch (error) {
      const reason = error instanceof Error ? error.message : '一键认证失败，请使用短信验证码';
      if (reason.includes('关闭Wi-Fi') || reason.includes('手机流量')) {
        setOneClickGuidance(ONE_CLICK_NETWORK_GUIDANCE);
      } else {
        message.error(reason);
      }
    } finally {
      setOneClickLoading(false);
    }
  };

  const openPhoneLogin = () => {
    setPhoneMode(true);
    if (capabilities?.oneClickEnabled) {
      setPhoneLoginMethod('oneClick');
      window.setTimeout(() => void submitOneClick(), 0);
      return;
    }
    setPhoneLoginMethod('sms');
  };

  const retryOneClick = () => {
    setOneClickGuidance('');
    setPhoneLoginMethod('oneClick');
    void submitOneClick();
  };

  const switchToSmsLogin = () => {
    setOneClickGuidance('');
    setPhoneLoginMethod('sms');
  };

  const switchAccountMode = (mode: 'login' | 'register') => {
    setPhoneMode(false);
    setOneClickGuidance('');
    setPhoneLoginMethod('oneClick');
    if (mode === authMode) return;
    setAuthMode(mode);
    form.resetFields(['password', 'code']);
  };

  return (
    <>
      <main className={`${styles.authShell} ${styles.authLayout}`}>
        <Button type="text" icon={<ArrowLeftOutlined />} className={styles.authBackButton} aria-label="返回商城" onClick={() => navigate('/')}>
          返回商城
        </Button>
        <section className={styles.authIntro}>
          <div className={styles.authBrandRow}>
            <div className={styles.brandMark}>㤫</div>
            <div><strong>㤫者商城</strong><span>真实体验 · 理性消费</span></div>
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
        <section className={`${styles.authCard} ${phoneMode ? styles.phoneAuthCard : ''}`}>
          <div className={styles.authHeader}>
            <h2>{phoneMode ? phoneLoginMethod === 'oneClick' ? '本机号码登录' : '验证码登录' : authMode === 'login' ? '欢迎回来' : '创建用户账号'}</h2>
            <p>{phoneMode ? phoneLoginMethod === 'oneClick' ? '请使用手机流量完成本机认证。' : '输入手机号并获取短信验证码。' : authMode === 'login' ? '登录后继续查看订单、优惠券与甄客验。' : '账号注册后首次登录必须完成手机号绑定。'}</p>
          </div>

          {phoneMode ? (
            <>
              {phoneLoginMethod === 'oneClick' ? (
                <div className={styles.authOneClickPanel}>
                  <span className={styles.authOneClickIcon}><MobileOutlined /></span>
                  <strong>当前手机号码</strong>
                  <p>请使用手机流量完成安全认证</p>
                  {oneClickGuidance && (
                    <div className={styles.authOneClickGuidance} role="status">
                      <InfoCircleFilled />
                      <div>
                        <b>使用提示</b>
                        <span>{oneClickGuidance}</span>
                      </div>
                    </div>
                  )}
                  <Button block type="primary" size="large" loading={oneClickLoading} onClick={retryOneClick} className={styles.authOneClick}>
                    {oneClickLoading ? '正在认证' : '继续认证'}
                  </Button>
                  {capabilities?.smsEnabled !== false && (
                    <button type="button" className={styles.authMethodLink} onClick={switchToSmsLogin}>使用验证码登录</button>
                  )}
                </div>
              ) : (
                <Form form={phoneForm} layout="vertical" requiredMark={false} className={`${styles.authForm} ${styles.authSmsForm}`} onFinish={submitPhone}>
                  <Form.Item name="phone" label="手机号" rules={[{ required: true, message: '请输入手机号' }, { pattern: /^1\d{10}$/, message: '请输入11位中国大陆手机号' }]}>
                    <Input size="large" prefix={<MobileOutlined />} inputMode="numeric" maxLength={11} autoComplete="tel" placeholder="请输入11位手机号" />
                  </Form.Item>
                  <Form.Item label="验证码" required>
                    <div className={styles.authSmsCodeRow}>
                      <Form.Item name="code" noStyle rules={[{ required: true, message: '请输入短信验证码' }]}>
                        <Input size="large" prefix={<LockOutlined />} inputMode="numeric" maxLength={8} autoComplete="one-time-code" placeholder="短信验证码" />
                      </Form.Item>
                      <Button size="large" disabled={countdown > 0 || capabilities?.smsEnabled === false} onClick={() => void sendPhoneCode()}>
                        {countdown > 0 ? `${countdown}s` : '获取验证码'}
                      </Button>
                    </div>
                  </Form.Item>
                  <Button block type="primary" size="large" htmlType="submit" loading={phoneSubmitting} className={styles.authSubmit}>
                    验证并登录
                  </Button>
                  {capabilities?.oneClickEnabled && (
                    <button type="button" className={styles.authMethodLink} onClick={retryOneClick}>使用本机号码认证</button>
                  )}
                </Form>
              )}
              <div className={styles.authPhoneHint}><CheckCircleFilled /><span>首次登录会自动注册，可稍后完善账号资料</span></div>
              <div className={styles.authSecondaryActions}>
                <Button block size="large" icon={<UserOutlined />} className={styles.authPhoneEntry} onClick={() => switchAccountMode('login')}>
                  账号密码登录
                </Button>
                <p className={styles.authRegisterPrompt}>还没有账号？<button type="button" onClick={() => switchAccountMode('register')}>去注册</button></p>
              </div>
            </>
          ) : (
            <>
              <Form form={form} layout="vertical" requiredMark={false} className={styles.authForm} onFinish={submit}>
                <Form.Item
                  name="username"
                  label="登录账号名"
                  rules={[
                    { required: true, message: '请输入登录账号名' },
                    ...(authMode === 'register' ? [{ pattern: /^(?!1\d{10}$)[A-Za-z0-9_]{4,20}$/, message: '账号名需为4到20位字母、数字或下划线，且不能是手机号' }] : []),
                  ]}
                >
                  <Input
                    size="large"
                    prefix={<UserOutlined />}
                    autoComplete="username"
                    maxLength={20}
                    placeholder={authMode === 'register' ? '请设置4-20位登录账号名' : '请输入登录账号名'}
                  />
                </Form.Item>
                <Form.Item name="password" label="登录密码" rules={[
                  { required: true, message: '请输入登录密码' },
                  ...(authMode === 'register' ? [{ min: 6, max: 20, message: '密码长度需为6到20位' }] : []),
                  { validator: (_, value) => !value || (/[A-Za-z]/.test(value) && /\d/.test(value)) ? Promise.resolve() : Promise.reject(new Error('密码必须同时包含字母和数字')) },
                ]}>
                  <Input.Password
                    size="large"
                    prefix={<LockOutlined />}
                    maxLength={authMode === 'register' ? 20 : undefined}
                    autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                    placeholder={authMode === 'register' ? '6-20位，需含字母和数字' : '请输入登录密码'}
                  />
                </Form.Item>
                {captcha.enabled && captcha.image && (
                  <Form.Item name="code" label="验证码" rules={[{ required: true, message: '请输入验证码结果' }]}>
                    <div className={styles.captchaRow}>
                      <Input size="large" inputMode="text" maxLength={8} autoComplete="off" placeholder="请输入图形验证码" />
                      <button type="button" className={styles.captchaButton} aria-label="看不清，点击更换验证码" onClick={() => void loadCaptcha()}><img src={captcha.image} alt="图形验证码" /></button>
                    </div>
                  </Form.Item>
                )}
                {captcha.enabled && (!captcha.image || captchaError) && (
                  <div className={styles.authCaptchaState} role="status">
                    <span>{captchaLoading ? '验证码加载中…' : captchaError || '验证码暂时无法加载'}</span>
                    <Button onClick={() => void loadCaptcha()} loading={captchaLoading}>重新获取</Button>
                  </div>
                )}
                <Button block type="primary" size="large" htmlType="submit" loading={authSubmitting} className={styles.authSubmit}>
                  {authMode === 'login' ? '登录商城' : '立即注册'}
                </Button>
                {authMode === 'register' && <p className={styles.hint}>注册后需绑定手机号，账号名确认后不可修改。</p>}
              </Form>
              {authMode === 'login' ? (
                <div className={styles.authSecondaryActions}>
                  <div className={styles.authDivider}><span>其他登录方式</span></div>
                  <Button block size="large" icon={<MobileOutlined />} className={styles.authPhoneEntry} onClick={openPhoneLogin}>
                    手机号登录
                  </Button>
                  <p className={styles.authRegisterPrompt}>还没有账号？<button type="button" onClick={() => switchAccountMode('register')}>去注册</button></p>
                </div>
              ) : (
                <p className={styles.authRegisterPrompt}>已有账号？<button type="button" onClick={() => switchAccountMode('login')}>去登录</button></p>
              )}
            </>
          )}

          <div className={styles.authAlternative}>
            <div className={styles.authDivider}><span>平台商家服务</span></div>
            <Button block size="large" icon={<SafetyCertificateOutlined />} className={styles.merchantButton} onClick={() => setMerchantOpen(true)}>
              申请商家入驻
            </Button>
          </div>
        </section>
      </main>
      <MerchantApplicationModal open={merchantOpen} onClose={() => setMerchantOpen(false)} />
    </>
  );
}
