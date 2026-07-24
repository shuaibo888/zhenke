export type PreviewDestination =
  | 'home'
  | 'purchase-report'
  | 'trial-report'
  | 'online-trial'
  | 'offline-trial'
  | 'cart'
  | 'orders'
  | 'reports'
  | 'profile'
  | 'auth';

const destinations: Array<{ key: PreviewDestination; label: string }> = [
  { key: 'home', label: '首页' },
  { key: 'purchase-report', label: '购买甄客验' },
  { key: 'trial-report', label: '试用甄客验' },
  { key: 'online-trial', label: '线上试用' },
  { key: 'offline-trial', label: '线下试用' },
  { key: 'cart', label: '购物车' },
  { key: 'orders', label: '全部订单' },
  { key: 'reports', label: '我的甄客验' },
  { key: 'profile', label: '个人中心' },
  { key: 'auth', label: '登录注册' },
];

type PreviewInspectorProps = {
  open: boolean;
  onToggle: () => void;
  onNavigate: (destination: PreviewDestination) => void;
  classNames: {
    root: string;
    toggle: string;
    panel: string;
    badge: string;
    grid: string;
  };
};

export default function PreviewInspector({ open, onToggle, onNavigate, classNames }: PreviewInspectorProps) {
  return (
    <aside className={classNames.root} aria-label="本地预览巡检">
      <button type="button" className={classNames.toggle} onClick={onToggle}>
        {open ? '收起巡检' : '全流程巡检'}
      </button>
      {open && (
        <section className={classNames.panel}>
          <strong className={classNames.badge}>本地预览数据</strong>
          <p>仅用于界面巡检，所有支付、退款和发布操作均不会写入真实后端。</p>
          <div className={classNames.grid}>
            {destinations.map((item) => (
              <button key={item.key} type="button" onClick={() => onNavigate(item.key)}>
                {item.label}
              </button>
            ))}
          </div>
        </section>
      )}
    </aside>
  );
}
