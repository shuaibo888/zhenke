import { CompassOutlined, HomeOutlined, ReadOutlined } from '@ant-design/icons';
import { Button, Space } from 'antd';
import { useNavigate } from 'umi';
import styles from '@/styles/zhenke.less';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <main className={`${styles.page} ${styles.narrowPage}`}>
      <div className={styles.statePanel}>
        <div className={styles.stateContent}>
          <span className={styles.stateIcon}><CompassOutlined /></span>
          <span className={styles.eyebrow}>404 · LOST IN THE CITY</span>
          <h3>这条城市小路暂时走不通</h3>
          <p>链接可能已失效、内容已经删除，或者页面地址有误。</p>
          <Space wrap>
            <Button type="primary" icon={<HomeOutlined />} onClick={() => navigate('/')}>返回首页</Button>
            <Button icon={<ReadOutlined />} onClick={() => navigate('/posts')}>逛甄客帖</Button>
          </Space>
        </div>
      </div>
    </main>
  );
}
