import { LockOutlined, MobileOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, Button, Checkbox, Divider, Form, Input, Radio, Space, message } from 'antd';
import { useEffect, useState } from 'react';
import {
  changeShopPassword,
  changeShopPhone,
  initializeShopUsername,
  sendAuthenticatedPhoneCode,
} from '@/services/shopAuth';
import type { AuthUser } from '@/utils/authRules';

interface AccountSecurityPanelProps {
  user: AuthUser;
  onUserChange: (user: AuthUser) => void;
}

interface UsernameValues {
  username: string;
  permanentConfirmed: boolean;
}

interface PhoneValues {
  newPhone: string;
  newPhoneCode: string;
}

interface PasswordValues {
  oldPassword?: string;
  smsCode?: string;
  newPassword: string;
}

export function AccountSecurityPanel({ user, onUserChange }: AccountSecurityPanelProps) {
  const [usernameForm] = Form.useForm<UsernameValues>();
  const [phoneForm] = Form.useForm<PhoneValues>();
  const [passwordForm] = Form.useForm<PasswordValues>();
  const [phoneCountdown, setPhoneCountdown] = useState(0);
  const [passwordCountdown, setPasswordCountdown] = useState(0);
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMethod, setPasswordMethod] = useState<'password' | 'sms'>(user.passwordInitialized ? 'password' : 'sms');

  useEffect(() => {
    if (phoneCountdown <= 0) return undefined;
    const timer = window.setInterval(() => setPhoneCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [phoneCountdown]);

  useEffect(() => {
    if (passwordCountdown <= 0) return undefined;
    const timer = window.setInterval(() => setPasswordCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [passwordCountdown]);

  const saveUsername = async (values: UsernameValues) => {
    setUsernameSaving(true);
    try {
      const updated = await initializeShopUsername(values.username);
      onUserChange(updated);
      usernameForm.resetFields();
      message.success('账号名已确认，以后不能修改');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '账号名设置失败');
    } finally {
      setUsernameSaving(false);
    }
  };

  const sendNewPhoneCode = async () => {
    try {
      const newPhone = await phoneForm.validateFields(['newPhone']).then((values) => values.newPhone);
      await sendAuthenticatedPhoneCode('CHANGE_PHONE', newPhone);
      setPhoneCountdown(60);
      message.success('验证码已发送到新手机号');
    } catch (error) {
      if (error instanceof Error) message.error(error.message);
    }
  };

  const savePhone = async (values: PhoneValues) => {
    setPhoneSaving(true);
    try {
      const updated = await changeShopPhone(values);
      onUserChange(updated);
      phoneForm.resetFields();
      message.success('手机号已换绑，账号名保持不变');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '手机号换绑失败');
    } finally {
      setPhoneSaving(false);
    }
  };

  const sendPasswordCode = async () => {
    try {
      await sendAuthenticatedPhoneCode('RESET_PASSWORD');
      setPasswordCountdown(60);
      message.success('验证码已发送到当前绑定手机号');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '验证码发送失败');
    }
  };

  const savePassword = async (values: PasswordValues) => {
    setPasswordSaving(true);
    try {
      await changeShopPassword(
        values.newPassword,
        passwordMethod === 'password' ? values.oldPassword : undefined,
        passwordMethod === 'sms' ? values.smsCode : undefined,
      );
      onUserChange({ ...user, passwordInitialized: true });
      passwordForm.resetFields();
      message.success('密码已更新');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '密码更新失败');
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div>
      <section>
        <h3><UserOutlined /> 登录账号名</h3>
        {user.usernameInitialized ? (
          <Alert type="success" showIcon message={`账号名：${user.username}`} description="账号名已确认，不可修改。" />
        ) : (
          <>
            <Alert type="warning" showIcon message="请设置正式账号名" description="确认后不可修改，请核对后提交。" style={{ marginBottom: 16 }} />
            <Form form={usernameForm} layout="vertical" requiredMark={false} onFinish={saveUsername}>
              <Form.Item name="username" label="正式账号名" rules={[{ required: true, message: '请输入账号名' }, { pattern: /^(?!1\d{10}$)[A-Za-z0-9_]{4,20}$/, message: '请输入4到20位字母、数字或下划线，且不能是手机号' }]}>
                <Input size="large" prefix={<UserOutlined />} maxLength={20} autoComplete="username" />
              </Form.Item>
              <Form.Item name="permanentConfirmed" valuePropName="checked" rules={[{ validator: (_, value) => value ? Promise.resolve() : Promise.reject(new Error('请确认账号名不可修改')) }]}>
                <Checkbox>我已核对账号名，并确认提交后永久不可修改</Checkbox>
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={usernameSaving}>确认账号名</Button>
            </Form>
          </>
        )}
      </section>

      <Divider />

      <section>
        <h3><MobileOutlined /> 绑定手机号</h3>
        <p>当前：{user.phoneMasked || '未绑定'}，换绑仅验证新手机号。</p>
        <Form form={phoneForm} layout="vertical" requiredMark={false} onFinish={savePhone}>
          <Form.Item name="newPhone" label="新手机号" rules={[{ required: true, message: '请输入新手机号' }, { pattern: /^1\d{10}$/, message: '请输入11位中国大陆手机号' }]}>
            <Input size="large" prefix={<MobileOutlined />} inputMode="numeric" maxLength={11} />
          </Form.Item>
          <Form.Item label="新手机号验证码" required>
            <Space.Compact block>
              <Form.Item name="newPhoneCode" noStyle rules={[{ required: true, message: '请输入验证码' }]}>
                <Input size="large" inputMode="numeric" maxLength={8} />
              </Form.Item>
              <Button size="large" disabled={phoneCountdown > 0} onClick={() => void sendNewPhoneCode()}>{phoneCountdown > 0 ? `${phoneCountdown} 秒` : '发送验证码'}</Button>
            </Space.Compact>
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={phoneSaving}>确认换绑</Button>
        </Form>
      </section>

      <Divider />

      <section>
        <h3><LockOutlined /> 登录密码</h3>
        {!user.passwordInitialized && <Alert type="info" showIcon message="请通过手机号验证设置登录密码" style={{ marginBottom: 16 }} />}
        <Radio.Group value={passwordMethod} onChange={(event) => { setPasswordMethod(event.target.value); passwordForm.resetFields(['oldPassword', 'smsCode']); }} style={{ marginBottom: 16 }}>
          <Radio.Button value="password" disabled={!user.passwordInitialized}>验证当前密码</Radio.Button>
          <Radio.Button value="sms">验证绑定手机号</Radio.Button>
        </Radio.Group>
        <Form form={passwordForm} layout="vertical" requiredMark={false} onFinish={savePassword}>
          {passwordMethod === 'password' ? (
            <Form.Item name="oldPassword" label="当前密码" rules={[{ required: true, message: '请输入当前密码' }]}><Input.Password size="large" /></Form.Item>
          ) : (
            <Form.Item label={`短信验证码（${user.phoneMasked || '当前手机号'}）`} required>
              <Space.Compact block>
                <Form.Item name="smsCode" noStyle rules={[{ required: true, message: '请输入验证码' }]}><Input size="large" inputMode="numeric" maxLength={8} /></Form.Item>
                <Button size="large" disabled={passwordCountdown > 0} onClick={() => void sendPasswordCode()}>{passwordCountdown > 0 ? `${passwordCountdown} 秒` : '发送验证码'}</Button>
              </Space.Compact>
            </Form.Item>
          )}
          <Form.Item name="newPassword" label="新密码" rules={[{ required: true, message: '请输入新密码' }, { validator: (_, value) => !value || (/[A-Za-z]/.test(value) && /\d/.test(value)) ? Promise.resolve() : Promise.reject(new Error('密码必须同时包含字母和数字')) }]}>
            <Input.Password size="large" autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={passwordSaving}>{user.passwordInitialized ? '保存新密码' : '设置登录密码'}</Button>
        </Form>
      </section>
    </div>
  );
}
