import { PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { Button, DatePicker, Form, Image, Input, InputNumber, Modal, Popconfirm, Select, Space, Switch, Table, Upload, message } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useCallback, useEffect, useState } from 'react';
import { requestApi, uploadBannerImage } from '@/services/adminApi';
import { useAdminPermission } from '@/app/AdminPageContext';
import styles from '@/pages/index.less';

type Banner = {
  bannerId: number;
  title: string;
  subtitle?: string;
  imageUrl: string;
  jumpType: 'INTERNAL' | 'EXTERNAL';
  jumpTarget: string;
  bannerSort: number;
  status: '0' | '1';
  startTime?: string;
  endTime?: string;
};

type BannerForm = Omit<Banner, 'bannerId' | 'startTime' | 'endTime'> & {
  range?: [Dayjs, Dayjs];
};

export default function HomeBannersPage() {
  const canAdd = useAdminPermission('shop:banner:add');
  const canEdit = useAdminPermission('shop:banner:edit');
  const canRemove = useAdminPermission('shop:banner:remove');
  const canChangeStatus = useAdminPermission('shop:banner:status');
  const [data, setData] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Banner>();
  const [form] = Form.useForm<BannerForm>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await requestApi<{ code: number; msg: string; data?: Banner[] }>('/shop/admin/zhenke/banners', {}, true);
      setData(result.data ?? []);
    } catch (error) {
      message.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openEditor = (banner?: Banner) => {
    setEditing(banner);
    setEditorOpen(true);
    form.resetFields();
    form.setFieldsValue(banner ? {
      ...banner,
      range: banner.startTime && banner.endTime ? [dayjs(banner.startTime), dayjs(banner.endTime)] : undefined,
    } : { jumpType: 'INTERNAL', status: '0', bannerSort: 0 });
  };

  const save = async (values: BannerForm) => {
    setSaving(true);
    try {
      const { range, ...fields } = values;
      const body = {
        ...fields,
        startTime: range?.[0]?.format('YYYY-MM-DD HH:mm:ss'),
        endTime: range?.[1]?.format('YYYY-MM-DD HH:mm:ss'),
      };
      await requestApi(
        editing ? `/shop/admin/zhenke/banners/${editing.bannerId}` : '/shop/admin/zhenke/banners',
        { method: editing ? 'PUT' : 'POST', body: JSON.stringify(body) },
        true,
      );
      message.success('轮播已保存');
      setEditorOpen(false);
      await load();
    } catch (error) {
      message.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (banner: Banner, enabled: boolean) => {
    try {
      await requestApi(
        `/shop/admin/zhenke/banners/${banner.bannerId}/status?status=${enabled ? '0' : '1'}`,
        { method: 'PUT' },
        true,
      );
      await load();
    } catch (error) {
      message.error((error as Error).message);
    }
  };

  return (
    <section className={styles.tableSurface}>
      <div className={styles.tableHeader}>
        <div>
          <p className={styles.eyebrow}>首页运营位 · 外链由服务端白名单校验</p>
          <h3>首页轮播管理</h3>
          <p>轮播服务于本地生活内容发现；赛事等第三方项目只能配置为经过校验的外部链接。</p>
        </div>
        {canAdd && <Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor()}>新增轮播</Button>}
      </div>

      <Table<Banner>
        rowKey="bannerId"
        loading={loading}
        dataSource={data}
        scroll={{ x: 1040 }}
        pagination={false}
        columns={[
          { title: '图片', width: 150, render: (_, row) => <Image width={120} height={68} style={{ objectFit: 'cover', borderRadius: 8 }} src={row.imageUrl} /> },
          { title: '标题', dataIndex: 'title', width: 180, ellipsis: true },
          { title: '副标题', dataIndex: 'subtitle', width: 200, ellipsis: true, render: (value) => value || '-' },
          { title: '跳转类型', width: 100, render: (_, row) => row.jumpType === 'INTERNAL' ? '站内路由' : 'HTTPS 外链' },
          { title: '跳转目标', dataIndex: 'jumpTarget', width: 220, ellipsis: true },
          { title: '排序', dataIndex: 'bannerSort', width: 80 },
          { title: '有效期', width: 180, render: (_, row) => row.startTime && row.endTime ? `${row.startTime.slice(0, 10)} 至 ${row.endTime.slice(0, 10)}` : '长期有效' },
          { title: '启用', width: 80, render: (_, row) => <Switch disabled={!canChangeStatus} checked={row.status === '0'} onChange={(checked) => void toggleStatus(row, checked)} /> },
          {
            title: '操作', fixed: 'right', width: 140,
            render: (_, row) => (
              <Space>
                {canEdit && <Button type="link" onClick={() => openEditor(row)}>编辑</Button>}
                {canRemove && <Popconfirm
                  title="确认删除轮播？"
                  description="删除后首页将不再展示此运营位。"
                  onConfirm={async () => {
                    await requestApi(`/shop/admin/zhenke/banners/${row.bannerId}`, { method: 'DELETE' }, true);
                    message.success('轮播已删除');
                    await load();
                  }}
                >
                  <Button type="link" danger>删除</Button>
                </Popconfirm>}
              </Space>
            ),
          },
        ]}
      />

      <Modal
        width={680}
        open={editorOpen}
        title={editing ? '编辑首页轮播' : '新增首页轮播'}
        okText="保存"
        cancelText="取消"
        confirmLoading={saving}
        onCancel={() => setEditorOpen(false)}
        onOk={() => form.submit()}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" requiredMark={false} onFinish={(values) => void save(values)}>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}><Input maxLength={120} showCount /></Form.Item>
          <Form.Item name="subtitle" label="副标题"><Input maxLength={240} showCount /></Form.Item>
          <Form.Item name="imageUrl" label="轮播图片" rules={[{ required: true, message: '请上传轮播图片' }]}>
            <Input placeholder="上传后自动填入，或填写已有 HTTPS 图片地址" />
          </Form.Item>
          <Upload
            accept="image/jpeg,image/png"
            maxCount={1}
            showUploadList={false}
            customRequest={async (options) => {
              try {
                const url = await uploadBannerImage(options.file as File);
                form.setFieldValue('imageUrl', url);
                options.onSuccess?.(url);
              } catch (error) {
                options.onError?.(error as Error);
                message.error((error as Error).message);
              }
            }}
          >
            <Button icon={<UploadOutlined />}>上传 JPG / PNG</Button>
          </Upload>
          <Form.Item name="jumpType" label="跳转类型" rules={[{ required: true }]}>
            <Select options={[{ value: 'INTERNAL', label: '站内正式路由' }, { value: 'EXTERNAL', label: 'HTTPS 外链' }]} />
          </Form.Item>
          <Form.Item name="jumpTarget" label="跳转目标" rules={[{ required: true, message: '请输入跳转目标' }]}><Input /></Form.Item>
          <Space align="start" wrap>
            <Form.Item name="bannerSort" label="排序"><InputNumber min={0} precision={0} /></Form.Item>
            <Form.Item name="status" label="状态"><Select style={{ width: 120 }} options={[{ value: '0', label: '启用' }, { value: '1', label: '停用' }]} /></Form.Item>
          </Space>
          <Form.Item name="range" label="有效期"><DatePicker.RangePicker showTime style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>
    </section>
  );
}
