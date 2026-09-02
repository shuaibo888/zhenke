import {
  CheckCircleOutlined,
  FileTextOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { Pagination, Tabs } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'umi';
import { useShop } from '@/app/ShopContext';
import { LoginRedirect } from '@/components/LoginRedirect';
import { ZkProfilePage, ZkProfilePanel, ZkState, ZkTaskHeader } from '@/components/ZkPage';
import {
  fetchMyUsefulContent,
  type UsefulContentItem,
  type UsefulContentType,
} from '@/services/shopAuth';
import { mediaPreviewUrl } from '@/utils/mediaUrl';
import styles from './useful.module.less';

const PAGE_SIZE = 12;

const tabItems = [
  { key: 'POST', label: <span><FileTextOutlined />甄客帖</span> },
  { key: 'REPORT', label: <span><SafetyCertificateOutlined />甄客验</span> },
];

function formatPublishedAt(value: string) {
  const date = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export default function ProfileUsefulPage() {
  const navigate = useNavigate();
  const { user, authLoading } = useShop();
  const [type, setType] = useState<UsefulContentType>('POST');
  const [rows, setRows] = useState<UsefulContentItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestVersionRef = useRef(0);

  const load = useCallback(async (pageNum = 1) => {
    if (!user) return;
    const requestVersion = ++requestVersionRef.current;
    setLoading(true);
    setError('');
    try {
      const result = await fetchMyUsefulContent(type, pageNum, PAGE_SIZE);
      if (requestVersion !== requestVersionRef.current) return;
      setRows(result.rows);
      setTotal(result.total);
      setPage(pageNum);
    } catch (reason) {
      if (requestVersion !== requestVersionRef.current) return;
      setRows([]);
      setTotal(0);
      setError(reason instanceof Error ? reason.message : '有用反馈内容加载失败');
    } finally {
      if (requestVersion === requestVersionRef.current) setLoading(false);
    }
  }, [type, user?.id]);

  useEffect(() => {
    if (!authLoading && user) void load(1);
  }, [authLoading, load, user]);

  useEffect(() => () => {
    requestVersionRef.current += 1;
  }, []);

  if (authLoading) {
    return <ZkProfilePage><ZkState kind="loading" title="正在确认登录状态" /></ZkProfilePage>;
  }
  if (!user) return <LoginRedirect />;

  const openContent = (item: UsefulContentItem) => {
    navigate(item.contentType === 'REPORT'
      ? `/reports/${item.contentId}`
      : `/posts/${item.contentId}`);
  };

  const typeName = type === 'POST' ? '甄客帖' : '甄客验';

  return (
    <ZkProfilePage className={styles.page}>
      <ZkTaskHeader
        eyebrow="内容创作"
        title="有用反馈"
        description="查看真正帮助过其他用户做决定的内容。"
        backTo="/profile"
      />

      <ZkProfilePanel
        className={styles.panel}
        title="我的内容"
        meta={loading ? '正在加载' : `共 ${total} 篇${typeName}收到过有用反馈`}
      >
        <Tabs
          activeKey={type}
          items={tabItems}
          className={styles.tabs}
          onChange={(key) => {
            setRows([]);
            setTotal(0);
            setPage(1);
            setType(key as UsefulContentType);
          }}
        />

        {loading ? (
          <ZkState kind="loading" title={`正在加载收到有用反馈的${typeName}`} />
        ) : error ? (
          <ZkState
            kind="error"
            title="暂时无法加载有用反馈"
            description={error}
            onAction={() => void load(page)}
          />
        ) : rows.length === 0 ? (
          <ZkState
            title={`还没有${typeName}收到有用反馈`}
            description="继续分享真实、具体的信息，帮助更多人做决定。"
          />
        ) : (
          <>
            <div className={styles.list}>
              {rows.map((item) => (
                <button
                  type="button"
                  key={`${item.contentType}-${item.contentId}`}
                  className={styles.card}
                  onClick={() => openContent(item)}
                  aria-label={`查看${item.title}，获得 ${item.usefulCount} 次有用反馈`}
                >
                  {item.coverUrl ? (
                    <img src={mediaPreviewUrl(item.coverUrl)} alt="" loading="lazy" decoding="async" />
                  ) : (
                    <span className={styles.coverFallback} aria-hidden="true">
                      {item.contentType === 'POST' ? <FileTextOutlined /> : <SafetyCertificateOutlined />}
                    </span>
                  )}
                  <span className={styles.cardCopy}>
                    <strong>{item.title}</strong>
                    <small>发布于 {formatPublishedAt(item.publishedAt)}</small>
                    <em><CheckCircleOutlined />有用 {item.usefulCount}</em>
                  </span>
                  <RightOutlined className={styles.arrow} aria-hidden="true" />
                </button>
              ))}
            </div>
            {total > PAGE_SIZE && (
              <Pagination
                className={styles.pagination}
                current={page}
                pageSize={PAGE_SIZE}
                total={total}
                showSizeChanger={false}
                hideOnSinglePage
                onChange={(nextPage) => void load(nextPage)}
              />
            )}
          </>
        )}
      </ZkProfilePanel>
    </ZkProfilePage>
  );
}
