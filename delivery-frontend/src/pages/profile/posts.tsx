import { EditOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Tag, message } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useShop } from '@/app/ShopContext';
import { LoginRedirect } from '@/components/LoginRedirect';
import { usePostPublishLauncher } from '@/components/PostPublishLauncher';
import { ZhenkePostCard } from '@/components/ZhenkePostCard';
import { ZkProfilePage, ZkProfilePanel, ZkTaskHeader, ZkState } from '@/components/ZkPage';
import { mine, removePost, type ZhenkePost } from '@/services/zhenke';
import styles from '@/styles/zhenke.less';

export default function MyPostsPage() {
  const { user, authLoading } = useShop();
  const { startPostPublish } = usePostPublishLauncher();
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
  }, [authLoading, load, user]);

  if (authLoading) return <ZkProfilePage><ZkState kind="loading" title="正在确认登录状态" /></ZkProfilePage>;
  if (!user) return <LoginRedirect />;

  return (
    <ZkProfilePage>
      <ZkTaskHeader
        eyebrow="内容创作"
        title="我的甄客帖"
        description="查看和管理你发布的甄客帖。"
        backTo="/profile"
        aside={<Button type="primary" icon={<EditOutlined />} onClick={() => startPostPublish()}>发布甄客帖</Button>}
      />

      <ZkProfilePanel title="已发布内容" meta={`共 ${total} 篇`}>
        {loading ? (
          <ZkState kind="loading" title="正在加载我的甄客帖" />
        ) : error ? (
          <ZkState kind="error" title="暂时无法加载" description={error} onAction={() => void load(1)} />
        ) : rows.length === 0 ? (
          <ZkState
            title="还没有发布甄客帖"
            description="选择真实地点，分享自己的城市生活视角。"
            actionText="发布第一篇"
            onAction={() => startPostPublish()}
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
      </ZkProfilePanel>
    </ZkProfilePage>
  );
}
