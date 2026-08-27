import {
  CheckOutlined,
  CreditCardOutlined,
  SafetyCertificateOutlined,
  ShopOutlined,
  TruckOutlined,
} from "@ant-design/icons";
import styles from "@/styles/zhenke.less";

export function CheckoutJourney({
  fulfillmentType,
  paymentOnly = false,
}: {
  fulfillmentType: "ONLINE" | "OFFLINE" | "MIXED";
  paymentOnly?: boolean;
}) {
  const offline = fulfillmentType === "OFFLINE";
  const mixed = fulfillmentType === "MIXED";
  const steps = [
    {
      icon: <CheckOutlined />,
      title: paymentOnly ? "订单已创建" : "确认订单",
      copy: "确认价格、库存与优惠",
    },
    {
      icon: <CreditCardOutlined />,
      title: "安全支付",
      copy: "支付成功后更新订单状态",
    },
    mixed
      ? {
          icon: <ShopOutlined />,
          title: "分别履约",
          copy: "配送商品送货上门，核销商品到店或现场使用",
        }
      : offline
      ? {
          icon: <ShopOutlined />,
          title: "到店使用",
          copy: "出示核销码，由订单所属商家确认",
        }
      : {
          icon: <TruckOutlined />,
          title: "配送收货",
          copy: "按订单地址配送并确认收货",
        },
  ];
  return (
    <ol className={styles.checkoutJourney} aria-label="订单履约步骤">
      {steps.map((step, index) => (
        <li key={step.title}>
          <span>{step.icon}</span>
          <div>
            <strong>
              {index + 1}. {step.title}
            </strong>
            <small>{step.copy}</small>
          </div>
        </li>
      ))}
      <li className={styles.checkoutJourneyTrust}>
        <SafetyCertificateOutlined />
        <div>
          <strong>甄客行交易保障</strong>
          <small>不在前端伪造订单、支付或核销结果</small>
        </div>
      </li>
    </ol>
  );
}
