import { Button, Result, Spin, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useShop } from '@/app/ShopContext';
import { loginByTransferTicket } from '@/services/shopAuth';

export default function WechatLoginTransferPage() {
  const { authLoading } = useShop();
  const [ticket, setTicket] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('ticket') ?? '');
  const [error, setError] = useState('');
  const inWechat = /micromessenger/i.test(navigator.userAgent);

  useEffect(() => {
    const readNewLink = () => {
      const next = new URLSearchParams(window.location.hash.slice(1)).get('ticket');
      if (next) setTicket(next);
    };
    window.addEventListener('hashchange', readNewLink);
    return () => window.removeEventListener('hashchange', readNewLink);
  }, []);

  useEffect(() => {
    if (!inWechat) return;
    window.history.replaceState(window.history.state, '', window.location.pathname);
    // Finish restoring any old session before storing the transferred account's token.
    if (authLoading) return;
    setError('');
    let active = true;
    void loginByTransferTicket(ticket).then((path) => {
      // A fresh document discards all old account data and restores the normal session.
      if (active) window.location.replace(path);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : '登录失败，请重新获取链接');
    });
    return () => { active = false; };
  }, [authLoading, inWechat, ticket]);

  return (
    <main style={{ minHeight: '60vh', maxWidth: 640, margin: '0 auto', padding: '32px 16px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      {!inWechat ? (
        <Result status="info" title="请在微信中打开" subTitle="将完整链接发送到微信文件传输助手，再点击打开，即可登录原账号并继续付款。" />
      ) : error ? (
        <Result status="warning" title="暂时无法自动登录" subTitle={error}
          extra={<Button href="/auth" type="primary">使用账号登录</Button>} />
      ) : <><Spin size="large" /><Typography.Text>正在登录原账号，即将进入订单付款页……</Typography.Text></>}
    </main>
  );
}
