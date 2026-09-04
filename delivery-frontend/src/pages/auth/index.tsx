import {
  ArrowLeftOutlined,
  LockOutlined,
  MobileOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Button, Checkbox, Form, Input, Modal, message } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'umi';
import { useShop } from '@/app/ShopContext';
import { MerchantApplicationModal } from '@/components/MerchantApplicationModal';
import { useSafeBack } from '@/hooks/useSafeBack';
import { getAliyunOneClickSpToken } from '@/services/aliyunOneClick';
import {
  fetchPhoneAuthCapabilities,
  loginOrRegisterByOneClick,
  loginOrRegisterByPhone,
  sendLoginPhoneCode,
  type PhoneAuthCapabilities,
} from '@/services/shopAuth';
import styles from '@/styles/commerce.less';
import { safeInternalRedirect } from '@/utils/safeRedirect';

type AuthValues = { username: string; password: string; code?: string };
type PhoneValues = { phone: string; code: string };
type AgreementType = 'user' | 'privacy';

const agreementContent: Record<AgreementType, { title: string; sections: Array<{ heading: string; content: string }> }> = {
  user: {
    title: '甄客行用户协议',
    sections: [
      {
        heading: '一、服务说明',
        content: '甄客行为用户提供本地生活信息浏览、甄客帖发布与互动、地点发现，以及商城、酒店、景区、饭店相关商品和服务的交易入口。具体服务内容以页面实际展示为准。',
      },
      {
        heading: '二、账号使用',
        content: '您应使用真实、合法的信息注册和使用账号，妥善保管登录凭证，不得转让账号或利用平台实施违法违规、欺诈、侵权、扰乱平台秩序等行为。通过您的账号完成的操作，在法律允许范围内视为您本人操作。',
      },
      {
        heading: '三、内容发布与互动',
        content: '您发布的甄客帖、评论、回复、图片和视频应真实、合法，不得侵犯他人隐私、知识产权或其他合法权益。地点关联是用户主动选择，不等同于平台对实际到访、消费或内容真实性的背书。平台可依法依规处理违法违规内容。',
      },
      {
        heading: '四、交易与履约',
        content: '商品价格、库存、使用条件、有效期、预约要求、配送或核销方式、退款规则等，以订单提交时的页面信息和商家规则为准。请在付款前认真核对订单；支付、退款、物流和线下核销由相应服务能力共同完成。',
      },
      {
        heading: '五、责任与协议更新',
        content: '因不可抗力、网络故障或第三方服务异常造成的短暂不可用，平台将在合理范围内协助处理。协议发生重要变化时，平台会以合理方式提示；如您不同意更新后的内容，可停止使用相关服务。',
      },
    ],
  },
  privacy: {
    title: '甄客行隐私政策',
    sections: [
      {
        heading: '一、我们收集的信息',
        content: '为完成注册登录、账号安全和服务履约，我们可能处理账号名、手机号及必要的验证信息；当您发布内容、下单或申请商家服务时，我们会处理您主动提交的文字、媒体、联系人、地址、订单和履约信息。',
      },
      {
        heading: '二、位置信息',
        content: '在您授权后，我们会使用设备位置展示当前城市、辅助选择地点和发起地图导航。定位失败或您拒绝授权时，可手动选择城市。我们不因本服务持续记录与业务无关的位置轨迹。',
      },
      {
        heading: '三、信息使用目的',
        content: '相关信息用于身份验证、内容展示与互动、订单支付和履约、售后处理、消息通知、安全风控及改善服务。我们不会将信息用于与上述目的无关的用途，法律法规另有规定或取得您单独同意的除外。',
      },
      {
        heading: '四、共享与保护',
        content: '仅在完成支付、短信验证、地图定位、配送或核销等必要场景下，向对应服务方提供完成该项服务所需的最少信息。我们采取合理的访问控制和安全措施保护个人信息，不公开出售您的个人信息。',
      },
      {
        heading: '五、您的权利',
        content: '您可以在个人中心查看和维护账号资料、地址及相关记录，并可通过平台提供的渠道反馈个人信息问题。法律法规要求保留的交易、安全或审计记录，将在规定期限内保存。',
      },
    ],
  },
};

export default function AuthPage() {
  const navigate = useNavigate();
  const authLocation = useLocation();
  const goBack = useSafeBack('/');
  const [searchParams] = useSearchParams();
  const returnPath = safeInternalRedirect(searchParams.get('redirect'), '/profile');
  const returnToSource = (
    authLocation.state as { returnToSource?: unknown } | null
  )?.returnToSource === true;
  const redirectStartedRef = useRef(false);
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
  const [phoneMode, setPhoneMode] = useState(true);
  const [phoneLoginMethod, setPhoneLoginMethod] = useState<'oneClick' | 'sms'>('oneClick');
  const [phoneSubmitting, setPhoneSubmitting] = useState(false);
  const [oneClickLoading, setOneClickLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [capabilities, setCapabilities] = useState<PhoneAuthCapabilities | null>(null);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [agreementOpen, setAgreementOpen] = useState<AgreementType | null>(null);

  const ensureAgreementAccepted = () => {
    if (agreementAccepted) return true;
    message.warning('请先阅读并勾选同意《用户协议》和《隐私政策》');
    return false;
  };

  const completeAuthNavigation = useCallback(() => {
    if (redirectStartedRef.current) return;
    redirectStartedRef.current = true;
    const historyIndex = (window.history.state as { idx?: unknown } | null)?.idx;
    if (returnToSource && typeof historyIndex === 'number' && historyIndex > 0) {
      navigate(-1);
      return;
    }
    navigate(returnPath, { replace: true });
  }, [navigate, returnPath, returnToSource]);

  useEffect(() => {
    if (user) completeAuthNavigation();
  }, [completeAuthNavigation, user]);

  useEffect(() => {
    void fetchPhoneAuthCapabilities()
      .then((nextCapabilities) => {
        setCapabilities(nextCapabilities);
        if (!nextCapabilities.oneClickEnabled) setPhoneLoginMethod('sms');
      })
      .catch(() => setPhoneLoginMethod('sms'));
  }, []);

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const timer = window.setInterval(() => setCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    // The account form is not mounted while phone login is active. Calling a
    // useForm instance before its Form mounts makes Ant Design report a
    // disconnected form and can leave stale captcha input behind.
    if (!phoneMode) form.resetFields(['code']);
  }, [captcha.uuid, form, phoneMode]);

  const submit = async (values: AuthValues) => {
    if (!ensureAgreementAccepted()) return;
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
      completeAuthNavigation();
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
    if (!ensureAgreementAccepted()) return;
    setPhoneSubmitting(true);
    try {
      const nextUser = await loginOrRegisterByPhone(values.phone, values.code);
      setUser(nextUser);
      message.success('手机号验证成功');
      completeAuthNavigation();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '手机号登录失败');
    } finally {
      setPhoneSubmitting(false);
    }
  };

  const submitOneClick = async () => {
    if (!ensureAgreementAccepted()) return;
    setOneClickLoading(true);
    try {
      const spToken = await getAliyunOneClickSpToken();
      const nextUser = await loginOrRegisterByOneClick(spToken);
      setUser(nextUser);
      message.success('本机号码认证成功');
      completeAuthNavigation();
    } catch (error) {
      const reason = error instanceof Error ? error.message : '一键认证失败，请使用短信验证码';
      message.warning(reason);
      setPhoneLoginMethod('sms');
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
    setPhoneLoginMethod('oneClick');
    void submitOneClick();
  };

  const switchToSmsLogin = () => {
    setPhoneLoginMethod('sms');
  };

  const switchAccountMode = (mode: 'login' | 'register') => {
    setPhoneMode(false);
    setPhoneLoginMethod('oneClick');
    if (mode === authMode) return;
    setAuthMode(mode);
    if (!phoneMode) form.resetFields(['password', 'code']);
  };

  return (
    <>
      <main className={`${styles.authShell} ${styles.authLayout} ${styles.authSimpleLayout}`}>
        <Button type="text" icon={<ArrowLeftOutlined />} className={styles.authBackButton} aria-label="返回甄客行" onClick={goBack}>
          返回甄客行
        </Button>
        <section className={styles.authIntro}>
          <div className={styles.authBrandRow}>
            <div><strong>甄客行</strong><span>城市生活 · 真实分享</span></div>
          </div>
          <div className={styles.authIntroCopy}>
            <span className={styles.eyebrow}>欢迎来到甄客行</span>
            <h1>发现好去处，<br />分享真体验。</h1>
            <p>登录后继续发布甄客帖，管理订单、核销和权益。</p>
          </div>
        </section>
        <section className={`${styles.authCard} ${phoneMode ? styles.phoneAuthCard : ''}`}>
          <div className={styles.authHeader}>
            <h2>{phoneMode ? phoneLoginMethod === 'oneClick' ? '手机号登录' : '验证码登录' : authMode === 'login' ? '账号登录' : '创建用户账号'}</h2>
            <p>{phoneMode ? phoneLoginMethod === 'oneClick' ? '登录后继续发现和分享城市生活。' : '输入手机号并获取短信验证码，新用户将自动注册。' : authMode === 'login' ? '使用已有账号和密码登录。' : '账号注册后首次登录需要绑定手机号。'}</p>
          </div>

          {phoneMode ? (
            <>
              {phoneLoginMethod === 'oneClick' ? (
                <div className={styles.authOneClickPanel}>
                  <div className={styles.authProductPreview} aria-label="甄客行内容与服务概览">
                    <span>城市生活 · 真实分享</span>
                    <strong>发现好去处，分享真体验</strong>
                    <p>在甄客行，看见一座城的真实生活。</p>
                  </div>
                  <Button block type="primary" size="large" loading={oneClickLoading} onClick={retryOneClick} className={styles.authOneClick}>
                    {oneClickLoading ? '正在认证' : '本机号码一键登录'}
                  </Button>
                  {capabilities?.smsEnabled !== false && (
                    <button type="button" className={styles.authMethodLink} onClick={switchToSmsLogin}>使用验证码登录</button>
                  )}
                </div>
              ) : (
                <Form form={phoneForm} layout="vertical" requiredMark={false} className={`${styles.authForm} ${styles.authSmsForm}`} onFinish={submitPhone} onFinishFailed={ensureAgreementAccepted}>
                  <Form.Item name="phone" label="手机号" rules={[{ required: true, message: '请输入手机号' }, { pattern: /^1\d{10}$/, message: '请输入11位中国大陆手机号' }]}>
                    <Input size="large" prefix={<MobileOutlined />} inputMode="numeric" maxLength={11} autoComplete="tel" placeholder="请输入11位手机号" />
                  </Form.Item>
                  <Form.Item label="验证码" required>
                    <div className={styles.authSmsCodeRow}>
                      <Form.Item
                        name="code"
                        noStyle
                        getValueFromEvent={(event) => String(event?.target?.value ?? '').replace(/\D/g, '').slice(0, 6)}
                        rules={[
                          { required: true, message: '请输入短信验证码' },
                          { len: 6, message: '请输入 6 位短信验证码' },
                        ]}
                      >
                        <Input size="large" prefix={<LockOutlined />} inputMode="numeric" maxLength={6} autoComplete="one-time-code" placeholder="6 位短信验证码" />
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
              <div className={styles.authSecondaryActions}>
                <Button block size="large" className={styles.authPhoneEntry} onClick={() => switchAccountMode('login')}>
                  账号密码登录
                </Button>
                <p className={styles.authRegisterPrompt}>还没有账号？<button type="button" onClick={() => switchAccountMode('register')}>去注册</button></p>
              </div>
            </>
          ) : (
            <>
              <Form form={form} layout="vertical" requiredMark={false} className={styles.authForm} onFinish={submit} onFinishFailed={ensureAgreementAccepted}>
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
                  {authMode === 'login' ? '登录甄客行' : '立即注册'}
                </Button>
                {authMode === 'register' && <p className={styles.hint}>注册后需绑定手机号，账号名确认后不可修改。</p>}
              </Form>
              {authMode === 'login' ? (
                <div className={styles.authSecondaryActions}>
                  <div className={styles.authDivider}><span>其他登录方式</span></div>
                  <Button block size="large" className={styles.authPhoneEntry} onClick={openPhoneLogin}>
                    手机号登录
                  </Button>
                  <p className={styles.authRegisterPrompt}>还没有账号？<button type="button" onClick={() => switchAccountMode('register')}>去注册</button></p>
                </div>
              ) : (
                <p className={styles.authRegisterPrompt}>已有账号？<button type="button" onClick={() => switchAccountMode('login')}>去登录</button></p>
              )}
            </>
          )}

          <div className={styles.authAgreement}>
            <Checkbox
              checked={agreementAccepted}
              onChange={(event) => setAgreementAccepted(event.target.checked)}
            >
              <span>我已阅读并同意</span>
            </Checkbox>
            <button type="button" onClick={() => setAgreementOpen('user')}>《用户协议》</button>
            <span>和</span>
            <button type="button" onClick={() => setAgreementOpen('privacy')}>《隐私政策》</button>
          </div>

          <div className={styles.authAlternative}>
            <div className={styles.authDivider}><span>平台商家服务</span></div>
            <Button block size="large" className={styles.merchantButton} onClick={() => setMerchantOpen(true)}>
              申请商家入驻
            </Button>
          </div>
        </section>
      </main>
      <MerchantApplicationModal open={merchantOpen} onClose={() => setMerchantOpen(false)} />
      <Modal
        open={agreementOpen !== null}
        title={agreementOpen ? agreementContent[agreementOpen].title : ''}
        footer={null}
        width={640}
        rootClassName={styles.authAgreementModal}
        onCancel={() => setAgreementOpen(null)}
      >
        {agreementOpen && (
          <article className={styles.authAgreementDocument}>
            <p className={styles.authAgreementUpdated}>更新日期：2026年9月1日</p>
            <p>欢迎使用甄客行。请您在使用服务前认真阅读并理解以下内容。</p>
            {agreementContent[agreementOpen].sections.map((section) => (
              <section key={section.heading}>
                <h3>{section.heading}</h3>
                <p>{section.content}</p>
              </section>
            ))}
            <p>如您对本协议或政策有疑问，可通过平台公布的客服渠道联系我们。</p>
          </article>
        )}
      </Modal>
    </>
  );
}
