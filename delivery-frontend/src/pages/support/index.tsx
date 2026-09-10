import { PlatformIdentity } from '@/components/PlatformIdentity';
import { message } from 'antd';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'umi';
import { fetchPublicMerchant, type PublicMerchantDto } from '@/services/shopContent';
import { ZkTaskHeader } from '@/components/ZkPage';
import { CUSTOMER_SUPPORT_EMAIL, CUSTOMER_SUPPORT_MAILTO, CUSTOMER_SUPPORT_TEMPLATE } from '@/config/customerSupport';
import { useSafeBack } from '@/hooks/useSafeBack';
import { copyText } from '@/utils/shop';
import pageStyles from '@/styles/zhenke.less';
import styles from '@/styles/customerSupport.module.less';

export default function CustomerSupportPage() {
  const goBack = useSafeBack('/mall');
  const [searchParams] = useSearchParams();
  const merchantId = Number(searchParams.get('merchantId'));
  const hasMerchant = Number.isSafeInteger(merchantId) && merchantId > 0;
  const [merchant, setMerchant] = useState<PublicMerchantDto>();
  useEffect(() => {
    let active = true;
    setMerchant(undefined);
    if (hasMerchant) {
      void fetchPublicMerchant(merchantId).then((value) => {
        if (active) setMerchant(value);
      }).catch(() => undefined);
    }
    return () => { active = false; };
  }, [merchantId, hasMerchant]);
  const copyContactText = async (value: string, label: string) => {
    try {
      await copyText(value);
      message.success(`${label}已复制`);
    } catch {
      message.info('暂时无法自动复制，请重试，或直接发送邮件说明问题');
    }
  };

  return (
    <main className={`${pageStyles.page} ${styles.page}`}>
      <ZkTaskHeader title="客服与售后" onBack={goBack} />
      <article className={styles.document}>
        <section>
          <h2>联系商家</h2>
          <p>商品、配送与退货退款问题，请先与商家沟通。</p>
          {merchant?.contactPhone && (
            <a className={styles.phone} href={`tel:${merchant.contactPhone}`}>
              <span>{merchant.shopName}</span><strong>{merchant.contactPhone}</strong>
            </a>
          )}
          {!merchant?.contactPhone && <p className={styles.hint}>联系电话可在商品所属商家的详情页查看。</p>}
          <div className={styles.actions}>
            <Link to={hasMerchant ? `/merchants/${merchantId}` : '/mall'}>{hasMerchant ? '查看商家' : '查找商品'}</Link>
            <Link to="/profile/orders">查看我的订单</Link>
          </div>
        </section>

        <section>
          <h2>平台协助与投诉</h2>
          <p>联系不上商家、问题未解决或需要平台协助，可发送邮件至：</p>
          <div className={styles.contact}>
            <a className={styles.email} href={CUSTOMER_SUPPORT_MAILTO}>{CUSTOMER_SUPPORT_EMAIL}</a>
            <button type="button" onClick={() => void copyContactText(CUSTOMER_SUPPORT_TEMPLATE, '邮件模板')}>复制邮件模板</button>
          </div>
          <p className={styles.hint}>复制模板后在常用邮箱中填写发送。平台将核实问题、联系商家协助处理，并通过邮件反馈进展或结果。</p>
        </section>
        <details className={styles.serviceRules}>
          <summary>配送、核销与退货说明</summary>
          <h2>配送与核销</h2>
          <p>支持快递配送和到店核销，具体可选方式以商品及订单页面为准。配送订单可在订单详情查看物流；到店订单支付后出示核销码使用。</p>
          <h2>退货退款</h2>
          <p>需要退货退款时，请在订单详情查看售后入口。已发货商品请先联系商家确认退回地址、寄回方式及退款处理安排；尚未收到商品时，无需为申请售后提前确认收货。</p>
          <p>平台暂未提供直接换货功能。如需更换商品，请先与商家沟通退货退款，再重新购买。具体处理应符合适用法律和商品购买时的约定。</p>
        </details>
      </article>
      <PlatformIdentity />
    </main>
  );
}
