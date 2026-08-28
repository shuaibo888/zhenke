import { PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { Alert, Button, Form, Image, Input, InputNumber, Modal, Popconfirm, Select, Space, Switch, Table, Tag, Upload, message } from 'antd';
import type { TablePaginationConfig } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useAdminPermission } from '@/app/AdminPageContext';
import { requestApi, uploadBannerImage } from '@/services/adminApi';
import styles from '@/pages/index.less';

type EnjoyCategory = 'MALL' | 'RESTAURANT' | 'SCENIC' | 'HOTEL';
type Enjoy = {
  enjoyId: number;
  category: EnjoyCategory;
  title: string;
  subtitle?: string;
  coverUrl: string;
  content: string;
  highlights?: string;
  placeName?: string;
  placeAddress?: string;
  displaySort: number;
  status: '0' | '1';
  delFlag: '0' | '2';
  publishedAt?: string;
  likeCount: number;
  commentCount: number;
};
type EnjoyForm = Omit<Enjoy, 'enjoyId' | 'delFlag' | 'publishedAt' | 'likeCount' | 'commentCount'>;

const categoryLabel: Record<EnjoyCategory, string> = {
  MALL: '甄必购',
  RESTAURANT: '甄必吃',
  SCENIC: '甄必玩',
  HOTEL: '甄必住',
};

export default function ZhenkeEnjoysPage() {
  const canQuery = useAdminPermission('shop:enjoy:query');
  const canAdd = useAdminPermission('shop:enjoy:add');
  const canEdit = useAdminPermission('shop:enjoy:edit');
  const canRemove = useAdminPermission('shop:enjoy:remove');
  const canChangeStatus = useAdminPermission('shop:enjoy:status');
  const [form] = Form.useForm<EnjoyForm>();
  const [data, setData] = useState<Enjoy[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<EnjoyCategory>();
  const [status, setStatus] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Enjoy>();
  const [detail, setDetail] = useState<Enjoy>();
  const [editorOpen, setEditorOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const query = new URLSearchParams({ pageNum: String(page), pageSize: String(pageSize) });
      if (keyword.trim()) query.set('keyword', keyword.trim());
      if (category) query.set('category', category);
      if (status) query.set('status', status);
      const result = await requestApi<{ code: number; msg: string; rows?: Enjoy[]; total?: number }>(`/shop/admin/zhenke/enjoys?${query}`, {}, true);
      setData(result.rows ?? []);
      setTotal(result.total ?? 0);
    } catch (reason) {
      const text = reason instanceof Error ? reason.message : '甄必享内容加载失败';
      setLoadError(text);
      message.error(text);
    } finally {
      setLoading(false);
    }
  }, [category, keyword, page, pageSize, status]);

  useEffect(() => { void load(); }, [load]);

  const openEditor = (item?: Enjoy) => {
    setEditing(item);
    form.resetFields();
    form.setFieldsValue(item ? { ...item } : { category: 'MALL', status: '1', displaySort: 0 });
    setEditorOpen(true);
  };

  const openDetail = async (id: number) => {
    try {
      const result = await requestApi<{ code: number; msg: string; data?: Enjoy }>(`/shop/admin/zhenke/enjoys/${id}`, {}, true);
      setDetail(result.data);
    } catch (reason) {
      message.error(reason instanceof Error ? reason.message : '详情加载失败');
    }
  };

  const save = async (values: EnjoyForm) => {
    setSaving(true);
    try {
      await requestApi(
        editing ? `/shop/admin/zhenke/enjoys/${editing.enjoyId}` : '/shop/admin/zhenke/enjoys',
        { method: editing ? 'PUT' : 'POST', body: JSON.stringify(values) },
        true,
      );
      message.success(editing ? '甄必享内容已更新' : '甄必享内容已创建');
      setEditorOpen(false);
      await load();
    } catch (reason) {
      message.error(reason instanceof Error ? reason.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (item: Enjoy, enabled: boolean) => {
    try {
      await requestApi(`/shop/admin/zhenke/enjoys/${item.enjoyId}/status?status=${enabled ? '0' : '1'}`, { method: 'PUT' }, true);
      message.success(enabled ? '内容已发布' : '内容已下线');
      await load();
    } catch (reason) {
      message.error(reason instanceof Error ? reason.message : '状态更新失败');
    }
  };

  const changePage = (pagination: TablePaginationConfig) => {
    setPage(pagination.current ?? 1);
    setPageSize(pagination.pageSize ?? 20);
  };

  return (
    <section className={styles.tableSurface}>
      <div className={styles.tableHeader}>
        <div>
          <p className={styles.eyebrow}>官方城市精选 · 仅超级管理员发布</p>
          <h3>甄必享管理</h3>
          <p>维护甄必购、甄必吃、甄必玩和甄必住内容；普通用户只能浏览、点赞和评论。</p>
        </div>
        {canAdd && <Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor()}>新增内容</Button>}
      </div>
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search allowClear placeholder="标题、地点" onSearch={(value) => { setPage(1); setKeyword(value); }} />
        <Select allowClear placeholder="全部分类" value={category} style={{ width: 150 }} options={Object.entries(categoryLabel).map(([value, label]) => ({ value, label }))} onChange={(value) => { setPage(1); setCategory(value); }} />
        <Select allowClear placeholder="全部状态" value={status} style={{ width: 130 }} options={[{ value: '0', label: '已发布' }, { value: '1', label: '已下线' }, { value: 'DELETED', label: '已删除' }]} onChange={(value) => { setPage(1); setStatus(value); }} />
        <Button onClick={() => void load()}>刷新</Button>
      </Space>
      {loadError && <Alert type="error" showIcon message="甄必享列表暂时无法加载" description={loadError} action={<Button size="small" danger onClick={() => void load()}>重新加载</Button>} style={{ marginBottom: 16 }} />}
      <Table<Enjoy>
        rowKey="enjoyId"
        loading={loading}
        dataSource={data}
        onChange={changePage}
        scroll={{ x: 1100 }}
        pagination={{ current: page, pageSize, total, showSizeChanger: true, showTotal: (value) => `共 ${value} 条` }}
        locale={{ emptyText: loadError ? '加载失败，请重试' : '暂无甄必享内容' }}
        columns={[
          { title: '封面', width: 130, render: (_, item) => <Image width={100} height={66} style={{ objectFit: 'cover', borderRadius: 8 }} src={item.coverUrl} /> },
          { title: '标题', dataIndex: 'title', width: 220, ellipsis: true },
          { title: '分类', width: 100, render: (_, item) => <Tag color="volcano">{categoryLabel[item.category]}</Tag> },
          { title: '地点', dataIndex: 'placeName', width: 150, ellipsis: true, render: (value) => value || '-' },
          { title: '点赞', dataIndex: 'likeCount', width: 80 },
          { title: '评论', dataIndex: 'commentCount', width: 80 },
          { title: '排序', dataIndex: 'displaySort', width: 80 },
          { title: '发布', width: 90, render: (_, item) => item.delFlag === '0' ? <Switch disabled={!canChangeStatus} checked={item.status === '0'} onChange={(checked) => void toggleStatus(item, checked)} /> : <Tag>已删除</Tag> },
          { title: '发布时间', dataIndex: 'publishedAt', width: 170, render: (value) => value || '-' },
          { title: '操作', fixed: 'right', width: 180, render: (_, item) => <Space>{canQuery && <Button type="link" onClick={() => void openDetail(item.enjoyId)}>详情</Button>}{canEdit && item.delFlag === '0' && <Button type="link" onClick={() => openEditor(item)}>编辑</Button>}{canRemove && item.delFlag === '0' && <Popconfirm title="确认删除这条甄必享内容？" description="删除后用户端立即不可见。" onConfirm={async () => { try { await requestApi(`/shop/admin/zhenke/enjoys/${item.enjoyId}`, { method: 'DELETE' }, true); message.success('内容已删除'); await load(); } catch (reason) { message.error(reason instanceof Error ? reason.message : '删除失败'); } }}><Button type="link" danger>删除</Button></Popconfirm>}</Space> },
        ]}
      />
      <Modal width={760} open={editorOpen} title={editing ? '编辑甄必享内容' : '新增甄必享内容'} okText="保存" cancelText="取消" confirmLoading={saving} onCancel={() => setEditorOpen(false)} onOk={() => form.submit()} destroyOnHidden>
        <Form form={form} layout="vertical" requiredMark={false} onFinish={(values) => void save(values)}>
          <Space align="start" wrap>
            <Form.Item name="category" label="所属分类" rules={[{ required: true }]}><Select style={{ width: 180 }} options={Object.entries(categoryLabel).map(([value, label]) => ({ value, label }))} /></Form.Item>
            <Form.Item name="status" label="发布状态" rules={[{ required: true }]}><Select style={{ width: 150 }} options={[{ value: '1', label: '先保存为下线' }, { value: '0', label: '立即发布' }]} /></Form.Item>
            <Form.Item name="displaySort" label="排序"><InputNumber min={0} max={9999} precision={0} /></Form.Item>
          </Space>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}><Input maxLength={120} showCount /></Form.Item>
          <Form.Item name="subtitle" label="推荐语"><Input maxLength={240} showCount /></Form.Item>
          <Form.Item name="coverUrl" label="封面图片" rules={[{ required: true, message: '请上传封面图片' }]}><Input placeholder="上传后自动填入，或填写 HTTPS 图片地址" /></Form.Item>
          <Upload accept="image/jpeg,image/png" maxCount={1} showUploadList={false} customRequest={async (options) => { try { const url = await uploadBannerImage(options.file as File); form.setFieldValue('coverUrl', url); options.onSuccess?.(url); } catch (reason) { options.onError?.(reason as Error); message.error((reason as Error).message); } }}><Button icon={<UploadOutlined />}>上传 JPG / PNG</Button></Upload>
          <Form.Item name="highlights" label="亮点标签" extra="可用逗号、顿号或换行分隔，用户端会显示为标签。"><Input.TextArea rows={2} maxLength={500} showCount /></Form.Item>
          <Space align="start" wrap style={{ width: '100%' }}>
            <Form.Item name="placeName" label="地点名称"><Input maxLength={160} style={{ width: 260 }} /></Form.Item>
            <Form.Item name="placeAddress" label="地点地址"><Input maxLength={500} style={{ width: 360 }} /></Form.Item>
          </Space>
          <Form.Item name="content" label="正文" rules={[{ required: true, message: '请输入正文' }]}><Input.TextArea rows={10} maxLength={10000} showCount /></Form.Item>
        </Form>
      </Modal>
      <Modal width={760} open={Boolean(detail)} title={detail?.title} footer={null} onCancel={() => setDetail(undefined)}>
        {detail && <Space direction="vertical" size="middle" style={{ width: '100%' }}><Image src={detail.coverUrl} style={{ maxHeight: 360, objectFit: 'cover', borderRadius: 12 }} /><Space wrap><Tag color="volcano">{categoryLabel[detail.category]}</Tag><Tag>{detail.status === '0' ? '已发布' : '已下线'}</Tag><span>点赞 {detail.likeCount ?? 0}</span><span>评论 {detail.commentCount ?? 0}</span></Space>{detail.subtitle && <p>{detail.subtitle}</p>}{detail.highlights && <p><strong>亮点：</strong>{detail.highlights}</p>}<p style={{ whiteSpace: 'pre-wrap' }}>{detail.content}</p>{detail.placeName && <p><strong>地点：</strong>{detail.placeName} {detail.placeAddress}</p>}</Space>}
      </Modal>
    </section>
  );
}
