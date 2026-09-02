import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  InboxOutlined,
  PhoneOutlined,
  PictureOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Upload,
  message,
} from 'antd';
import type { TablePaginationConfig } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAdminPermission } from '@/app/AdminPageContext';
import { requestApi, uploadBannerImage } from '@/services/adminApi';
import { mediaPreviewUrl, mediaStoragePath, validateJpegPngImage } from '@/utils/media';
import styles from '@/pages/index.less';

type EnjoyCategory = 'MALL' | 'RESTAURANT' | 'SCENIC' | 'HOTEL';
type Poi = {
  provider: string;
  providerPlaceId: string;
  placeName: string;
  placeType?: string;
  address: string;
  province?: string;
  city?: string;
  district?: string;
  provinceCode?: string;
  cityCode?: string;
  districtCode?: string;
  latitude: number;
  longitude: number;
};
type Enjoy = {
  enjoyId: number;
  category: EnjoyCategory;
  title: string;
  subtitle?: string;
  coverUrl: string;
  mediaUrls?: string[];
  serviceSummary: string;
  content: string;
  highlights?: string;
  openingHours?: string;
  contactPhone?: string;
  placeId?: number;
  placeProvider?: string;
  placeProviderId?: string;
  placeName?: string;
  placeType?: string;
  placeAddress?: string;
  placeProvince?: string;
  placeCity?: string;
  placeDistrict?: string;
  placeProvinceCode?: string;
  placeCityCode?: string;
  placeDistrictCode?: string;
  placeLatitude?: number;
  placeLongitude?: number;
  displaySort: number;
  status: '0' | '1';
  delFlag: '0' | '2';
  publishedAt?: string;
  likeCount: number;
  commentCount: number;
};
type EnjoyForm = {
  category: EnjoyCategory;
  title: string;
  subtitle?: string;
  serviceSummary: string;
  highlights?: string;
  openingHours?: string;
  contactPhone?: string;
  content: string;
  mediaUrls: string[];
  placeKey: string;
  displaySort: number;
};

const categoryLabel: Record<EnjoyCategory, string> = {
  MALL: '甄必购',
  RESTAURANT: '甄必吃',
  SCENIC: '甄必玩',
  HOTEL: '甄必住',
};
const placeKey = (place: Pick<Poi, 'provider' | 'providerPlaceId'>) => `${place.provider}:${place.providerPlaceId}`;

function detailToPoi(item: Enjoy): Poi | undefined {
  if (!item.placeProvider || !item.placeProviderId || !item.placeName || !item.placeAddress
      || item.placeLatitude == null || item.placeLongitude == null) return undefined;
  return {
    provider: item.placeProvider,
    providerPlaceId: item.placeProviderId,
    placeName: item.placeName,
    placeType: item.placeType,
    address: item.placeAddress,
    province: item.placeProvince,
    city: item.placeCity,
    district: item.placeDistrict,
    provinceCode: item.placeProvinceCode,
    cityCode: item.placeCityCode,
    districtCode: item.placeDistrictCode,
    latitude: item.placeLatitude,
    longitude: item.placeLongitude,
  };
}

export default function ZhenkeEnjoysPage() {
  const canQuery = useAdminPermission('shop:enjoy:query');
  const canAdd = useAdminPermission('shop:enjoy:add');
  const canEdit = useAdminPermission('shop:enjoy:edit');
  const canRemove = useAdminPermission('shop:enjoy:remove');
  const canChangeStatus = useAdminPermission('shop:enjoy:status');
  const [form] = Form.useForm<EnjoyForm>();
  const mediaUrls = Form.useWatch('mediaUrls', form) ?? [];
  const [data, setData] = useState<Enjoy[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<EnjoyCategory>();
  const [status, setStatus] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editorLoading, setEditorLoading] = useState(false);
  const [editing, setEditing] = useState<Enjoy>();
  const [detail, setDetail] = useState<Enjoy>();
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Poi>();
  const [pois, setPois] = useState<Poi[]>([]);
  const [placeSearching, setPlaceSearching] = useState(false);
  const [placeSearchText, setPlaceSearchText] = useState('');
  const [placeSearchError, setPlaceSearchError] = useState('');
  const placeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const placeVersion = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
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
      message.error({ key: 'zhenke-enjoys-load', content: text });
    } finally {
      setLoading(false);
    }
  }, [category, keyword, page, pageSize, status]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => () => { if (placeTimer.current) clearTimeout(placeTimer.current); }, []);

  const requestDetail = async (id: number) => {
    const result = await requestApi<{ code: number; msg: string; data?: Enjoy }>(`/shop/admin/zhenke/enjoys/${id}`, {}, true);
    if (!result.data) throw new Error('详情数据不存在');
    return result.data;
  };

  const openEditor = async (item?: Enjoy) => {
    setEditorOpen(true);
    setEditorLoading(Boolean(item));
    setEditing(item);
    setSelectedPlace(undefined);
    setPois([]);
    setPlaceSearchText('');
    setPlaceSearchError('');
    form.resetFields();
    if (!item) {
      form.setFieldsValue({ category: 'MALL', displaySort: 0, mediaUrls: [] });
      return;
    }
    try {
      const full = await requestDetail(item.enjoyId);
      const place = detailToPoi(full);
      setEditing(full);
      setSelectedPlace(place);
      if (place) setPois([place]);
      form.setFieldsValue({
        category: full.category,
        title: full.title,
        subtitle: full.subtitle,
        serviceSummary: full.serviceSummary,
        highlights: full.highlights,
        openingHours: full.openingHours,
        contactPhone: full.contactPhone,
        content: full.content,
        mediaUrls: (full.mediaUrls?.length ? full.mediaUrls : [full.coverUrl]).map(mediaStoragePath),
        placeKey: place ? placeKey(place) : undefined,
        displaySort: full.displaySort,
      });
    } catch (reason) {
      setEditorOpen(false);
      message.error(reason instanceof Error ? reason.message : '内容加载失败');
    } finally {
      setEditorLoading(false);
    }
  };

  const openDetail = async (id: number) => {
    try { setDetail(await requestDetail(id)); }
    catch (reason) { message.error(reason instanceof Error ? reason.message : '详情加载失败'); }
  };

  const schedulePlaceSearch = (value: string) => {
    const normalized = value.trim();
    const version = ++placeVersion.current;
    setPlaceSearchText(normalized);
    setPlaceSearchError('');
    setPois(selectedPlace ? [selectedPlace] : []);
    if (placeTimer.current) clearTimeout(placeTimer.current);
    if (normalized.length < 2) return;
    placeTimer.current = setTimeout(async () => {
      setPlaceSearching(true);
      try {
        const response = await fetch(`/api/shop/zhenke/map/search?keyword=${encodeURIComponent(normalized)}`);
        const payload = await response.json();
        if (!response.ok || payload.code !== 200) throw new Error(payload.msg || '地点搜索失败');
        if (version === placeVersion.current) setPois(Array.isArray(payload.data) ? payload.data : []);
      } catch (reason) {
        if (version === placeVersion.current) {
          setPois(selectedPlace ? [selectedPlace] : []);
          setPlaceSearchError(reason instanceof Error ? reason.message : '地点搜索暂时不可用');
        }
      } finally {
        if (version === placeVersion.current) setPlaceSearching(false);
      }
    }, 500);
  };

  const save = async (values: EnjoyForm) => {
    if (!selectedPlace || placeKey(selectedPlace) !== values.placeKey) {
      message.warning('请从地图搜索结果中选择一个真实地点');
      return;
    }
    if (!values.mediaUrls?.length) {
      message.warning('请至少上传一张地点图片');
      return;
    }
    setSaving(true);
    try {
      const body = {
        category: values.category,
        title: values.title.trim(),
        subtitle: values.subtitle?.trim(),
        serviceSummary: values.serviceSummary.trim(),
        highlights: values.highlights?.trim(),
        openingHours: values.openingHours?.trim(),
        contactPhone: values.contactPhone?.trim(),
        content: values.content.trim(),
        mediaUrls: values.mediaUrls.map(mediaStoragePath),
        place: {
          provider: selectedPlace.provider,
          providerPlaceId: selectedPlace.providerPlaceId,
          name: selectedPlace.placeName,
          type: selectedPlace.placeType,
          address: selectedPlace.address,
          province: selectedPlace.province,
          city: selectedPlace.city,
          district: selectedPlace.district,
          provinceCode: selectedPlace.provinceCode,
          cityCode: selectedPlace.cityCode,
          districtCode: selectedPlace.districtCode,
          latitude: selectedPlace.latitude,
          longitude: selectedPlace.longitude,
        },
        displaySort: values.displaySort ?? 0,
      };
      await requestApi(
        editing ? `/shop/admin/zhenke/enjoys/${editing.enjoyId}` : '/shop/admin/zhenke/enjoys',
        { method: editing ? 'PUT' : 'POST', body: JSON.stringify(body) },
        true,
      );
      message.success(editing ? '甄必享地点专题已更新' : '甄必享地点专题已创建');
      setEditorOpen(false);
      await load();
    } catch (reason) {
      message.error(reason instanceof Error ? reason.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const setMedia = (next: string[]) => form.setFieldValue('mediaUrls', next);
  const moveMedia = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= mediaUrls.length) return;
    const next = [...mediaUrls];
    [next[index], next[target]] = [next[target], next[index]];
    setMedia(next);
  };

  const toggleStatus = async (item: Enjoy, enabled: boolean) => {
    try {
      await requestApi(`/shop/admin/zhenke/enjoys/${item.enjoyId}/status?status=${enabled ? '0' : '1'}`, { method: 'PUT' }, true);
      message.success(enabled ? '专题已发布' : '专题已下线');
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
          <p className={styles.eyebrow}>官方地点专题 · 仅超级管理员发布</p>
          <h3>甄必享管理</h3>
          <p>通过地图搜索选择真实地点，维护图片、服务信息和官方攻略；不是甄客帖，也不接受用户投稿。</p>
        </div>
        {canAdd && <Button type="primary" icon={<PlusOutlined />} onClick={() => void openEditor()}>新增地点专题</Button>}
      </div>
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search allowClear placeholder="标题、地点" onSearch={(value) => { setPage(1); setKeyword(value); }} />
        <Select allowClear placeholder="全部分类" value={category} style={{ width: 150 }} options={Object.entries(categoryLabel).map(([value, label]) => ({ value, label }))} onChange={(value) => { setPage(1); setCategory(value); }} />
        <Select allowClear placeholder="全部状态" value={status} style={{ width: 130 }} options={[{ value: '0', label: '已发布' }, { value: '1', label: '已下线' }, { value: 'DELETED', label: '已删除' }]} onChange={(value) => { setPage(1); setStatus(value); }} />
        <Button onClick={() => void load()}>刷新</Button>
      </Space>
      <Table<Enjoy>
        rowKey="enjoyId"
        loading={loading}
        dataSource={data}
        onChange={changePage}
        scroll={{ x: 1120 }}
        pagination={{ current: page, pageSize, total, showSizeChanger: true, showTotal: (value) => `共 ${value} 条` }}
        locale={{ emptyText: '暂无甄必享地点专题' }}
        columns={[
          { title: '封面', width: 130, render: (_, item) => <Image width={100} height={66} style={{ objectFit: 'cover', borderRadius: 8 }} src={mediaPreviewUrl(item.coverUrl)} /> },
          { title: '专题', dataIndex: 'title', width: 230, ellipsis: true },
          { title: '分类', width: 100, render: (_, item) => <Tag color="volcano">{categoryLabel[item.category]}</Tag> },
          { title: '地图地点', dataIndex: 'placeName', width: 170, ellipsis: true, render: (value) => value || <Tag color="warning">待重新选点</Tag> },
          { title: '开放时间', dataIndex: 'openingHours', width: 130, ellipsis: true, render: (value) => value || '-' },
          { title: '喜欢数', dataIndex: 'likeCount', width: 70 },
          { title: '评论', dataIndex: 'commentCount', width: 70 },
          { title: '排序', dataIndex: 'displaySort', width: 70 },
          { title: '发布', width: 90, render: (_, item) => item.delFlag === '0' ? <Switch disabled={!canChangeStatus} checked={item.status === '0'} onChange={(checked) => void toggleStatus(item, checked)} /> : <Tag>已删除</Tag> },
          { title: '发布时间', dataIndex: 'publishedAt', width: 170, render: (value) => value || '-' },
          { title: '操作', fixed: 'right', width: 190, render: (_, item) => <Space>{canQuery && <Button type="link" onClick={() => void openDetail(item.enjoyId)}>详情</Button>}{canEdit && item.delFlag === '0' && <Button type="link" onClick={() => void openEditor(item)}>编辑</Button>}{canRemove && item.delFlag === '0' && <Popconfirm title="确认删除这个地点专题？" description="删除后用户端立即不可见。" onConfirm={async () => { try { await requestApi(`/shop/admin/zhenke/enjoys/${item.enjoyId}`, { method: 'DELETE' }, true); message.success('专题已删除'); await load(); } catch (reason) { message.error(reason instanceof Error ? reason.message : '删除失败'); } }}><Button type="link" danger>删除</Button></Popconfirm>}</Space> },
        ]}
      />

      <Modal width={900} open={editorOpen} title={editing ? '编辑甄必享地点专题' : '新增甄必享地点专题'} okText="保存专题" cancelText="取消" confirmLoading={saving} loading={editorLoading} onCancel={() => setEditorOpen(false)} onOk={() => form.submit()} destroyOnHidden>
        <Form form={form} layout="vertical" requiredMark={false} onFinish={(values) => void save(values)}>
          <Form.Item name="mediaUrls" hidden><Input /></Form.Item>
          <Space align="start" wrap>
            <Form.Item name="category" label="所属分类" rules={[{ required: true }]}><Select style={{ width: 180 }} options={Object.entries(categoryLabel).map(([value, label]) => ({ value, label }))} /></Form.Item>
            <Form.Item name="displaySort" label="排序"><InputNumber min={0} max={9999} precision={0} /></Form.Item>
          </Space>
          <Form.Item name="title" label="专题标题" rules={[{ required: true, whitespace: true, message: '请输入专题标题' }]}><Input maxLength={120} showCount placeholder="例如：赛事专享雅致大床房" /></Form.Item>
          <Form.Item name="subtitle" label="地点副标题 / 推荐语"><Input maxLength={240} showCount placeholder="一句话交代地点与核心推荐理由" /></Form.Item>

          <Form.Item name="placeKey" label={<><EnvironmentOutlined /> 地图地点</>} extra="输入至少 2 个字搜索全国地点，必须从搜索结果中选择。" rules={[{ required: true, message: '请搜索并选择地图地点' }]}>
            <Select
              showSearch
              filterOption={false}
              loading={placeSearching}
              onSearch={schedulePlaceSearch}
              onChange={(value) => setSelectedPlace(pois.find((item) => placeKey(item) === value))}
              placeholder="搜索酒店、饭店、景区、商场或其他地点"
              notFoundContent={placeSearching ? '正在搜索地图地点…' : placeSearchError || (placeSearchText.length < 2 ? '请至少输入 2 个字' : '没有找到匹配地点')}
              options={pois.map((item) => ({ value: placeKey(item), label: `${item.placeName} · ${item.address}` }))}
            />
          </Form.Item>
          {selectedPlace && <Alert type="success" showIcon message={selectedPlace.placeName} description={`${selectedPlace.city || ''}${selectedPlace.district || ''} · ${selectedPlace.address}`} style={{ margin: '-8px 0 18px' }} />}

          <Form.Item label={<><PictureOutlined /> 地点图片</>} required extra="最多 9 张；第一张作为列表封面，可调整顺序。支持点击选择或直接拖拽上传。">
            {mediaUrls.length > 0 && (
              <Image.PreviewGroup>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 12, marginBottom: 12 }}>
                  {mediaUrls.map((url, index) => (
                    <div key={`${url}-${index}`} style={{ padding: 8, border: '1px solid #eee', borderRadius: 10 }}>
                      <Image src={mediaPreviewUrl(url)} width="100%" height={96} style={{ objectFit: 'cover', borderRadius: 7 }} />
                      <div style={{ marginTop: 7 }}><Tag color={index === 0 ? 'volcano' : 'default'}>{index === 0 ? '封面' : `第 ${index + 1} 张`}</Tag></div>
                      <Space size={2} style={{ marginTop: 5 }}>
                        <Button type="text" size="small" aria-label="前移" disabled={index === 0} icon={<ArrowUpOutlined />} onClick={() => moveMedia(index, -1)} />
                        <Button type="text" size="small" aria-label="后移" disabled={index === mediaUrls.length - 1} icon={<ArrowDownOutlined />} onClick={() => moveMedia(index, 1)} />
                        <Button type="text" size="small" danger aria-label="删除图片" icon={<DeleteOutlined />} onClick={() => setMedia(mediaUrls.filter((_, current) => current !== index))} />
                      </Space>
                    </div>
                  ))}
                </div>
              </Image.PreviewGroup>
            )}
            <Upload.Dragger
              className={styles.mediaDropzone}
              accept="image/jpeg,image/png"
              multiple
              showUploadList={false}
              disabled={mediaUrls.length >= 9}
              beforeUpload={(file) => {
                try {
                  validateJpegPngImage(file as File, '地点图片');
                  return true;
                } catch (reason) {
                  message.error(reason instanceof Error ? reason.message : '地点图片格式不符合要求');
                  return Upload.LIST_IGNORE;
                }
              }}
              customRequest={async (options) => {
                try {
                  const path = await uploadBannerImage(options.file as File);
                  const current = (form.getFieldValue('mediaUrls') ?? []) as string[];
                  if (current.length >= 9) throw new Error('地点图片最多上传 9 张');
                  setMedia([...current, path]);
                  options.onSuccess?.({ path });
                } catch (reason) {
                  options.onError?.(reason as Error);
                  message.error(reason instanceof Error ? reason.message : '图片上传失败');
                }
              }}
            >
              <p className="ant-upload-drag-icon"><InboxOutlined /></p>
              <p className="ant-upload-text">点击选择，或将地点图片拖到这里</p>
              <p className="ant-upload-hint">JPG / PNG · 已上传 {mediaUrls.length}/9</p>
            </Upload.Dragger>
          </Form.Item>

          <Form.Item name="serviceSummary" label="首屏服务摘要" rules={[{ required: true, whitespace: true, message: '请输入首屏服务摘要' }]} extra="用户看完图片后第一眼会看到的实用信息。"><Input.TextArea rows={3} maxLength={1000} showCount placeholder="例如：含双早、免费停车及赛事接驳咨询服务，适合家庭与周末短住。" /></Form.Item>
          <Space align="start" wrap style={{ width: '100%' }}>
            <Form.Item name="openingHours" label={<><ClockCircleOutlined /> 营业 / 开放时间</>}><Input maxLength={160} style={{ width: 300 }} placeholder="例如：全天开放 / 09:00-21:30" /></Form.Item>
            <Form.Item name="contactPhone" label={<><PhoneOutlined /> 公开联系电话</>} rules={[{ pattern: /^[0-9+()（）\-\s]{5,40}$/, message: '联系电话格式无效' }]}><Input maxLength={40} style={{ width: 260 }} placeholder="例如：0312-0001001" /></Form.Item>
          </Space>
          <Form.Item name="highlights" label="亮点标签" extra="用逗号、顿号或换行分隔，建议 3 至 6 个。"><Input.TextArea rows={2} maxLength={500} showCount placeholder="双早、免费停车、亲子友好、近景区" /></Form.Item>
          <Form.Item name="content" label="官方详细攻略" rules={[{ required: true, whitespace: true, message: '请输入官方详细攻略' }]} extra="建议写清推荐理由、环境与服务、到访方式、适合人群和注意事项。"><Input.TextArea rows={12} maxLength={20000} showCount /></Form.Item>
        </Form>
      </Modal>

      <Modal width={820} open={Boolean(detail)} title={detail?.title} footer={null} onCancel={() => setDetail(undefined)}>
        {detail && <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Image.PreviewGroup><Space wrap>{(detail.mediaUrls?.length ? detail.mediaUrls : [detail.coverUrl]).map((url, index) => <Image key={`${url}-${index}`} src={mediaPreviewUrl(url)} width={index === 0 ? 360 : 150} height={index === 0 ? 230 : 100} style={{ objectFit: 'cover', borderRadius: 12 }} />)}</Space></Image.PreviewGroup>
          <Space wrap><Tag color="volcano">{categoryLabel[detail.category]}</Tag><Tag>{detail.status === '0' ? '已发布' : '已下线'}</Tag><span>喜欢 {detail.likeCount ?? 0}</span><span>评论 {detail.commentCount ?? 0}</span></Space>
          {detail.subtitle && <p>{detail.subtitle}</p>}
          <Alert type="success" showIcon message={detail.placeName || '尚未选择地图地点'} description={detail.placeAddress} />
          <p><strong>服务摘要：</strong>{detail.serviceSummary}</p>
          <Space wrap>{detail.openingHours && <span><ClockCircleOutlined /> {detail.openingHours}</span>}{detail.contactPhone && <span><PhoneOutlined /> {detail.contactPhone}</span>}</Space>
          {detail.highlights && <p><strong>亮点：</strong>{detail.highlights}</p>}
          <p style={{ whiteSpace: 'pre-wrap' }}>{detail.content}</p>
        </Space>}
      </Modal>
    </section>
  );
}
