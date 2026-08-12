import { Button, Result, Spin, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'umi';
import { useShop } from '@/app/ShopContext';
import { loginOrRegisterBySsoTicket } from '@/services/shopAuth';

const shellStyle = {
  minHeight: '60vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 16,
} as const;

export default function SsoCallbackPage() {
  const navigate = useNavigate();
  const { setUser } = useShop();
  const [error, setError] = useState('');

  useEffect(() => {
    const ticket = new URLSearchParams(window.location.search).get('ticket')?.trim() ?? '';
    window.history.replaceState(null, '', window.location.pathname);
    if (!ticket) {
      setError('缺少登录票据，请重新从赛事系统进入');
      return;
    }

    let active = true;
    void loginOrRegisterBySsoTicket(ticket)
      .then((user) => {
        if (!active) return;
        setUser(user);
        navigate('/', { replace: true });
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : '单点登录失败，请重新从赛事系统进入');
      });
    return () => {
      active = false;
    };
  }, [navigate, setUser]);

  if (error) {
    return (
      <main style={shellStyle}>
        <Result
          status="error"
          title="登录失败"
          subTitle={error}
          extra={<Button type="primary" onClick={() => navigate('/auth', { replace: true })}>返回商城登录</Button>}
        />
      </main>
    );
  }

  return (
    <main style={shellStyle}>
      <Spin size="large" />
      <Typography.Text>正在登录商城，请稍候……</Typography.Text>
    </main>
  );
}
