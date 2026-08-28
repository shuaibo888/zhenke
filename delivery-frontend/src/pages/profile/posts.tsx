import { EditOutlined, FileTextOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Tag, message } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'umi';
import { useShop } from '@/app/ShopContext';
import { LoginRedirect } from '@/components/LoginRedirect';
import { ZhenkePostCard } from '@/components/ZhenkePostCard';
import { ZkPageHeader, ZkState } from '@/components/ZkPage';
import { mine, removePost, type ZhenkePost } from '@/services/zhenke';
import styles from '@/styles/zhenke.less';

export default function MyPostsPage() {
  const navigate = useNavigate();
  const { user, authLoading } = useShop();
  const [rows, setRows] = useState<ZhenkePost[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (pageNum = 1, append = false) => {
    if (!user) return;
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError('');
    try {
      const result = await mine(pageNum);
      setRows((current) => {
        if (!append) return result.rows;
        const ids = new Set(current.map((item) => item.postId));
        return [...current, ...result.rows.filter((item) => !ids.has(item.postId))];
      });
      setPage(pageNum);
      setTotal(result.total);
    } catch (reason) {
      const errorMessage = reason instanceof Error ? reason.message : '我的甄客帖加载失败';
      if (append) message.error(errorMessage);
      else setError(errorMessage);
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    void load(1);
  }, [authLoading, load, navigate, user]);

  if (authLoading) return <main className={styles.page}><ZkState kind="loading" title="正在确认登录状态" /></main>;
  if (!user) return <LoginRedirect />;

  return (
    <main className={styles.page}>
      <ZkPageHeader
        eyebrow={<><FileTextOutlined /> CONTENT CREATION</>}
        title="我的甄客帖"
        description="管理围绕地点自由发布的内容。甄客验属于消费后可信体验，请从统一“我的”另行进入。"
        action={<Button type="primary" size="large" icon={<EditOutlined />} onClick={() => navigate('/posts/publish')}>发布新帖</Button>}
      />

      {loading ? (
        <ZkState kind="loading" title="正在加载我的甄客帖" />
      ) : error ? (
        <ZkState kind="error" title="暂时无法加载" description={error} onAction={() => void load(1)} />
      ) : rows.length === 0 ? (
        <ZkState
          title="你还没有发布甄客帖"
          description="选择真实地点，上传封面图片和可选视频，分享自己的城市生活视角。"
          actionText="发布第一篇"
          onAction={() => navigate('/posts/publish')}
        />
      ) : (
        <>
          <div className={styles.postGrid}>
            {rows.map((post) => (
              <div key={post.postId}>
                <ZhenkePostCard post={post} disabled={post.status !== 'PUBLISHED'} />
                {post.status === 'PUBLISHED' ? (
                  <Popconfirm
                    title="删除后正文、媒体和历史分享链接均不可见，确认删除？"
                    onConfirm={async () => {
                      try {
                        await removePost(post.postId);
                        message.success('甄客帖已删除');
                        await load(1);
                      } catch (reason) {
                        message.error(reason instanceof Error ? reason.message : '删除失败');
                      }
                    }}
                  >
                    <Button danger block>删除帖子</Button>
                  </Popconfirm>
                ) : (
                  <Tag>已删除，不可恢复</Tag>
                )}
              </div>
            ))}
          </div>
          {rows.length < total && (
            <div className={styles.loadMore}>
              <Button size="large" loading={loadingMore} onClick={() => void load(page + 1, true)}>
                加载更多
              </Button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
