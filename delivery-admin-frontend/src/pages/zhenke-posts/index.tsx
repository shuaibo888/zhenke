import { Alert, Button, DatePicker, Descriptions, Image, Input, Modal, Select, Space, Table, Tag, message } from 'antd';
import type { TablePaginationConfig } from 'antd';
import type { Dayjs } from 'dayjs';
import { useCallback, useEffect, useState } from 'react';
import { requestApi } from '@/services/adminApi';
import { useAdminPermission } from '@/app/AdminPageContext';
import styles from '@/pages/index.less';

type PostResource = {
  resourceId: number;
  resourceType: 'IMAGE' | 'VIDEO';
  resourceUrl: string;
};

type Post = {
  postId: number;
  title: string;
  nickName?: string;
  userName: string;
  placeName: string;
  merchantName?: string;
  perspective: 'LOCAL' | 'TOURIST' | 'HOMETOWNER';
  status: 'PUBLISHED' | 'DELETED';
  publishedAt: string;
  content: string;
  suggestion?: string;
  resources: PostResource[];
  commentCount?: number;
  usefulCount?: number;
};

type MerchantOption = { merchantId: number; shopName: string };

const perspectiveLabel = {
  LOCAL: '本地土著',
  TOURIST: '外地游客',
  HOMETOWNER: '在外家乡人',
} as const;

export default function ZhenkePostsPage() {
  const canQuery = useAdminPermission('shop:zhenkePost:query');
  const canRemove = useAdminPermission('shop:zhenkePost:remove');
  const [data, setData] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string>();
  const [merchantId, setMerchantId] = useState<number>();
  const [merchantOptions, setMerchantOptions] = useState<MerchantOption[]>([]);
  const [merchantSearching, setMerchantSearching] = useState(false);
  const [publishedRange, setPublishedRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [detail, setDetail] = useState<Post>();

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const query = new URLSearchParams({ pageNum: String(page), pageSize: String(pageSize) });
      if (keyword.trim()) query.set('keyword', keyword.trim());
      if (status) query.set('status', status);
      if (merchantId) query.set('merchantId', String(merchantId));
      if (publishedRange) {
        query.set('publishedFrom', publishedRange[0].startOf('day').format('YYYY-MM-DD HH:mm:ss'));
        query.set('publishedTo', publishedRange[1].endOf('day').format('YYYY-MM-DD HH:mm:ss'));
      }
      const result = await requestApi<{ code: number; msg: string; rows?: Post[]; total?: number }>(
        `/shop/admin/zhenke/posts?${query.toString()}`,
        {},
        true,
      );
      setData(result.rows ?? []);
      setTotal(result.total ?? 0);
    } catch (error) {
      const reason = error instanceof Error ? error.message : '甄客帖列表加载失败';
      setLoadError(reason);
      message.error(reason);
    } finally {
      setLoading(false);
    }
  }, [keyword, merchantId, page, pageSize, publishedRange, status]);

  const searchMerchants = async (value: string) => {
    setMerchantSearching(true);
    try {
      const query = new URLSearchParams({ keyword: value.trim() });
      const result = await requestApi<{ code: number; msg: string; data?: MerchantOption[] }>(
        `/shop/zhenke/merchant-options?${query.toString()}`,
        {},
        true,
      );
      setMerchantOptions(result.data ?? []);
    } catch (error) {
      const reason = error instanceof Error ? error.message : '关联商家搜索失败';
      message.error(reason);
    } finally {
      setMerchantSearching(false);
    }
  };

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = async (postId: number) => {
    try {
      const result = await requestApi<{ code: number; msg: string; data?: Post }>(`/shop/admin/zhenke/posts/${postId}`, {}, true);
      setDetail(result.data);
    } catch (error) {
      message.error((error as Error).message);
    }
  };

  const remove = (post: Post) => {
    Modal.confirm({
      title: `逻辑删除“${post.title}”？`,
      content: '删除后用户列表、详情和历史分享链接均不可见，操作会保留审计记录。',
      okText: '确认删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      async onOk() {
        try {
          await requestApi(`/shop/admin/zhenke/posts/${post.postId}`, { method: 'DELETE' }, true);
          message.success('帖子已逻辑删除');
          await load();
        } catch (error) {
          message.error(error instanceof Error ? error.message : '帖子删除失败');
          throw error;
        }
      },
    });
  };

  const changePage = (pagination: TablePaginationConfig) => {
    setPage(pagination.current ?? 1);
    setPageSize(pagination.pageSize ?? 20);
  };

  return (
    <section className={styles.tableSurface}>
      <div className={styles.tableHeader}>
        <div>
          <p className={styles.eyebrow}>内容治理 · 仅超级管理员可见</p>
          <h3>甄客帖管理</h3>
          <p>查看用户主动发布的地点内容；甄客帖不等同于订单或试用形成的甄客验。</p>
        </div>
        <Space wrap>
          <Input.Search
            allowClear
            placeholder="标题、作者、地点"
            defaultValue={keyword}
            onSearch={(value) => { setPage(1); setKeyword(value); }}
          />
          <Select
            allowClear
            placeholder="全部状态"
            style={{ width: 130 }}
            value={status}
            options={[
              { value: 'PUBLISHED', label: '已发布' },
              { value: 'DELETED', label: '已删除' },
            ]}
            onChange={(value) => { setPage(1); setStatus(value); }}
          />
          <Select
            allowClear
            showSearch
            filterOption={false}
            loading={merchantSearching}
            placeholder="全部关联商家"
            style={{ width: 180 }}
            value={merchantId}
            options={merchantOptions.map((item) => ({ value: item.merchantId, label: item.shopName }))}
            onFocus={() => merchantOptions.length === 0 && void searchMerchants('')}
            onSearch={(value) => void searchMerchants(value)}
            onChange={(value) => { setPage(1); setMerchantId(value); }}
          />
          <DatePicker.RangePicker
            value={publishedRange}
            onChange={(value) => {
              setPage(1);
              setPublishedRange(value?.[0] && value?.[1] ? [value[0], value[1]] : null);
            }}
          />
          <Button onClick={() => void load()}>刷新</Button>
        </Space>
      </div>

      {loadError && (
        <Alert
          type="error"
          showIcon
          message="甄客帖列表暂时无法加载"
          description={loadError}
          action={<Button size="small" danger onClick={() => void load()}>重新加载</Button>}
          style={{ marginBottom: 16 }}
        />
      )}

      <Table<Post>
        rowKey="postId"
        loading={loading}
        dataSource={data}
        onChange={changePage}
        scroll={{ x: 1080 }}
        locale={{ emptyText: loadError ? '加载失败，请重试' : '暂无甄客帖' }}
        pagination={{ current: page, pageSize, total, showSizeChanger: true, showTotal: (value) => `共 ${value} 条` }}
        columns={[
          { title: '标题', dataIndex: 'title', width: 240, ellipsis: true },
          { title: '作者', width: 120, render: (_, row) => row.nickName || row.userName },
          { title: '视角', width: 100, render: (_, row) => perspectiveLabel[row.perspective] },
          { title: '地点', dataIndex: 'placeName', width: 160, ellipsis: true },
          { title: '关联商家', dataIndex: 'merchantName', width: 140, ellipsis: true, render: (value) => value || '未关联' },
          {
            title: '状态', dataIndex: 'status', width: 100,
            render: (value) => <Tag color={value === 'PUBLISHED' ? 'green' : 'default'}>{value === 'PUBLISHED' ? '已发布' : '已删除'}</Tag>,
          },
          { title: '发布时间', dataIndex: 'publishedAt', width: 170 },
          {
            title: '操作', fixed: 'right', width: 150,
            render: (_, row) => (
              <Space>
                {canQuery && <Button type="link" onClick={() => void openDetail(row.postId)}>详情</Button>}
                {canRemove && row.status !== 'DELETED' && <Button type="link" danger onClick={() => remove(row)}>删除</Button>}
              </Space>
            ),
          },
        ]}
      />

      <Modal width={820} open={Boolean(detail)} title={detail?.title} footer={null} onCancel={() => setDetail(undefined)}>
        {detail && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="作者">{detail.nickName || detail.userName}</Descriptions.Item>
              <Descriptions.Item label="视角">{perspectiveLabel[detail.perspective]}</Descriptions.Item>
              <Descriptions.Item label="地点">{detail.placeName}</Descriptions.Item>
              <Descriptions.Item label="关联商家">{detail.merchantName || '未关联'}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status === 'PUBLISHED' ? '已发布' : '已删除'}</Descriptions.Item>
              <Descriptions.Item label="发布时间">{detail.publishedAt}</Descriptions.Item>
              <Descriptions.Item label="评论数">{detail.commentCount ?? 0}</Descriptions.Item>
              <Descriptions.Item label="有用数">{detail.usefulCount ?? 0}</Descriptions.Item>
            </Descriptions>
            <div><strong>正文</strong><p style={{ whiteSpace: 'pre-wrap' }}>{detail.content}</p></div>
            {detail.suggestion && <div><strong>给后来者的建议</strong><p>{detail.suggestion}</p></div>}
            <Space wrap align="start">
              {detail.resources?.map((resource) => resource.resourceType === 'IMAGE' ? (
                <Image key={resource.resourceId} width={180} src={resource.resourceUrl} />
              ) : (
                <video key={resource.resourceId} controls width={360} src={resource.resourceUrl} />
              ))}
            </Space>
          </Space>
        )}
      </Modal>
    </section>
  );
}
