import { LockOutlined, MobileOutlined } from '@ant-design/icons';
import { Alert, Button, Form, Input, Modal, Space, message } from 'antd';
import { useEffect, useState } from 'react';
import { getAliyunOneClickSpToken } from '@/services/aliyunOneClick';
import {
  bindShopPhone,
  bindShopPhoneByOneClick,
  fetchPhoneAuthCapabilities,
  sendAuthenticatedPhoneCode,
  type PhoneAuthCapabilities,
} from '@/services/shopAuth';
import type { AuthUser } from '@/utils/authRules';

interface PhoneBindingModalProps {
  open: boolean;
  onBound: (user: AuthUser) => void;
  onLogout: () => Promise<void>;
}

interface BindValues {
  phone: string;
  code: string;
}

export function PhoneBindingModal({ open, onBound, onLogout }: PhoneBindingModalProps) {
  const [form] = Form.useForm<BindValues>();
  const [capabilities, setCapabilities] = useState<PhoneAuthCapabilities | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [oneClickLoading, setOneClickLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!open) return;
    void fetchPhoneAuthCapabilities()
      .then(setCapabilities)
      .catch((error) => message.error(error instanceof Error ? error.message : '手机号认证配置加载失败'));
  }, [open]);

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const timer = window.setInterval(() => setCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [countdown]);

  const sendCode = async () => {
    try {
      const phone = await form.validateFields(['phone']).then((values) => values.phone);
      await sendAuthenticatedPhoneCode('BIND_PHONE', phone);
      setCountdown(60);
      message.success('验证码已发送');
    } catch (error) {
      if (error instanceof Error) message.error(error.message);
    }
  };

  const bindBySms = async (values: BindValues) => {
    setSubmitting(true);
    try {
      onBound(await bindShopPhone(values.phone, values.code));
      form.resetFields();
      message.success('手机号绑定成功');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '手机号绑定失败');
    } finally {
      setSubmitting(false);
    }
  };

  const bindByOneClick = async () => {
    setOneClickLoading(true);
    try {
      const spToken = await getAliyunOneClickSpToken();
      onBound(await bindShopPhoneByOneClick(spToken));
      message.success('手机号绑定成功');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '一键认证失败，请使用短信验证码');
    } finally {
      setOneClickLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title="绑定手机号后继续"
      footer={null}
      closable={false}
      mask={{ closable: false }}
      keyboard={false}
      focusable={{ trap: !oneClickLoading, focusTriggerAfterClose: false }}
      centered
      width={440}
    >
      <Alert
        type="warning"
        showIcon
        message="甄客行账号必须绑定已验证手机号"
        description="手机号用于确认跨系统用户身份、手机号登录和账号安全验证。绑定成功前暂不能使用商城业务功能。"
        style={{ marginBottom: 20 }}
      />
      {capabilities?.oneClickEnabled && (
        <Button
          block
          type="primary"
          size="large"
          icon={<MobileOutlined />}
          loading={oneClickLoading}
          onClick={() => void bindByOneClick()}
          style={{ marginBottom: 16 }}
        >
          本机号码一键认证并绑定
        </Button>
      )}
      <Form form={form} layout="vertical" requiredMark={false} onFinish={bindBySms}>
        <Form.Item
          name="phone"
          label="手机号"
          rules={[
            { required: true, message: '请输入手机号' },
            { pattern: /^1\d{10}$/, message: '请输入11位中国大陆手机号' },
          ]}
        >
          <Input size="large" prefix={<MobileOutlined />} maxLength={11} inputMode="numeric" autoComplete="tel" placeholder="请输入手机号" />
        </Form.Item>
        <Form.Item label="短信验证码" required>
          <Space.Compact block>
            <Form.Item
              name="code"
              noStyle
              rules={[{ required: true, message: '请输入短信验证码' }]}
            >
              <Input size="large" prefix={<LockOutlined />} inputMode="numeric" maxLength={8} autoComplete="one-time-code" placeholder="请输入短信验证码" />
            </Form.Item>
            <Button size="large" disabled={countdown > 0} onClick={() => void sendCode()}>
              {countdown > 0 ? `${countdown} 秒` : '发送验证码'}
            </Button>
          </Space.Compact>
        </Form.Item>
        <Button block type="primary" size="large" htmlType="submit" loading={submitting}>
          验证并绑定
        </Button>
      </Form>
      <Button block type="link" danger onClick={() => void onLogout()} style={{ marginTop: 8 }}>
        暂不绑定，退出登录
      </Button>
    </Modal>
  );
}
