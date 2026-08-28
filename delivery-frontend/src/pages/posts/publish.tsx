import {
  ArrowLeftOutlined,
  CloseOutlined,
  EnvironmentOutlined,
  ShopOutlined,
  UploadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Button, Checkbox, Form, Input, Radio, Select, Upload, message } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'umi';
import { useShop } from '@/app/ShopContext';
import { LoginRedirect } from '@/components/LoginRedirect';
import { ZkState } from '@/components/ZkPage';
import {
  merchantOptions,
  publish,
  upload,
  type MerchantOption,
  type Place,
  type PostResource,
} from '@/services/zhenke';
import styles from '@/styles/zhenke.less';
import { loadCurrentLocation } from '@/utils/currentLocation';

type Poi = Omit<Place, 'placeId' | 'coordinateSystem'>;

type PublishValues = {
  perspective: 'LOCAL' | 'TOURIST' | 'HOMETOWNER';
  title: string;
  content: string;
  suggestion?: string;
  place: string;
  merchantId?: number;
};

const perspectiveOptions = [
  { label: '本地土著', value: 'LOCAL' },
  { label: '外地游客', value: 'TOURIST' },
  { label: '在外家乡人', value: 'HOMETOWNER' },
];

const PLACE_SEARCH_DEBOUNCE_MS = 600;
const MIN_PLACE_KEYWORD_LENGTH = 2;

async function videoDuration(file: File) {
  return new Promise<number>((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('无法读取视频信息，请选择有效 MP4 文件'));
    };
    video.src = url;
  });
}

export default function PublishPostPage() {
  const navigate = useNavigate();
  const { user, authLoading } = useShop();
  const [form] = Form.useForm<PublishValues>();
  const [media, setMedia] = useState<PostResource[]>([]);
  const hasCoverImage = media.some((item) => item.resourceType === 'IMAGE');
  const [mediaUploading, setMediaUploading] = useState(false);
  const [pois, setPois] = useState<Poi[]>([]);
  const [placeSearching, setPlaceSearching] = useState(false);
  const [placeSearchKeyword, setPlaceSearchKeyword] = useState('');
  const [placeSearchError, setPlaceSearchError] = useState('');
  const [merchants, setMerchants] = useState<MerchantOption[]>([]);
  const [merchantSearching, setMerchantSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentLocation] = useState(loadCurrentLocation);
  const [preferCurrentArea, setPreferCurrentArea] = useState(Boolean(loadCurrentLocation()));
  const placeSearchVersion = useRef(0);
  const placeSearchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const placeSearchAbort = useRef<AbortController | undefined>(undefined);
  const mediaRef = useRef<PostResource[]>([]);
  const pendingMediaRef = useRef<Array<{ id: number; resourceType: PostResource['resourceType'] }>>([]);
  const uploadSequenceRef = useRef(0);

  useEffect(() => () => {
    if (placeSearchTimer.current) clearTimeout(placeSearchTimer.current);
    placeSearchAbort.current?.abort();
  }, []);

  if (authLoading) return <main className={styles.page}><ZkState kind="loading" title="正在确认登录状态" /></main>;
  if (!user) return <LoginRedirect />;

  const searchPlaces = async (normalized: string, version: number) => {
    const controller = new AbortController();
    placeSearchAbort.current = controller;
    setPlaceSearching(true);
    setPlaceSearchError('');
    try {
      const query = new URLSearchParams({ keyword: normalized });
      if (preferCurrentArea && currentLocation?.city) query.set('region', currentLocation.city);
      const response = await fetch(`/api/shop/zhenke/map/search?${query.toString()}`, {
        signal: controller.signal,
      });
      const payload = await response.json();
      if (!response.ok || payload.code !== 200) throw new Error(payload.msg || '地点搜索失败');
      if (version === placeSearchVersion.current) setPois(Array.isArray(payload.data) ? payload.data : []);
    } catch (reason) {
      if (controller.signal.aborted) return;
      if (version === placeSearchVersion.current) {
        setPois([]);
        setPlaceSearchError('地点搜索暂时不可用，请稍后重试');
      }
    } finally {
      if (placeSearchAbort.current === controller) placeSearchAbort.current = undefined;
      if (version === placeSearchVersion.current) setPlaceSearching(false);
    }
  };

  const schedulePlaceSearch = (keyword: string) => {
    const normalized = keyword.trim();
    const version = ++placeSearchVersion.current;
    setPlaceSearchKeyword(normalized);
    setPlaceSearchError('');
    setPlaceSearching(false);
    setPois([]);
    if (placeSearchTimer.current) clearTimeout(placeSearchTimer.current);
    placeSearchAbort.current?.abort();
    placeSearchAbort.current = undefined;
    if (normalized.length < MIN_PLACE_KEYWORD_LENGTH) return;
    placeSearchTimer.current = setTimeout(() => {
      placeSearchTimer.current = undefined;
      void searchPlaces(normalized, version);
    }, PLACE_SEARCH_DEBOUNCE_MS);
  };

  const searchMerchants = async (keyword: string) => {
    setMerchantSearching(true);
    try {
      setMerchants(await merchantOptions(keyword.trim()));
    } catch (reason) {
      message.error(reason instanceof Error ? reason.message : '入驻商家加载失败');
    } finally {
      setMerchantSearching(false);
    }
  };

  const addMedia = async (file: File) => {
    const isVideo = file.type === 'video/mp4';
    const isImage = ['image/jpeg', 'image/png'].includes(file.type);
    if (!isVideo && !isImage) throw new Error('图片仅支持 JPG/PNG，视频仅支持 MP4');
    if (isImage && file.size > 5 * 1024 * 1024) throw new Error('单张图片不能超过 5MB');
    if (isVideo) {
      if (file.size > 10 * 1024 * 1024) throw new Error('视频不能超过 10MB');
      if ((await videoDuration(file)) > 30.5) throw new Error('视频时长不能超过 30 秒');
    }
    const resourceType: PostResource['resourceType'] = isVideo ? 'VIDEO' : 'IMAGE';
    if (mediaRef.current.length + pendingMediaRef.current.length >= 9) {
      throw new Error('图片和视频合计最多上传 9 个');
    }
    if (isVideo && (
      mediaRef.current.some((item) => item.resourceType === 'VIDEO')
      || pendingMediaRef.current.some((item) => item.resourceType === 'VIDEO')
    )) {
      throw new Error('最多上传 1 个视频');
    }
    const reservationId = ++uploadSequenceRef.current;
    pendingMediaRef.current.push({ id: reservationId, resourceType });
    setMediaUploading(true);
    try {
      const resourceUrl = await upload(file);
      const nextMedia = [...mediaRef.current, { resourceType, resourceUrl }];
      mediaRef.current = nextMedia;
      setMedia(nextMedia);
    } finally {
      pendingMediaRef.current = pendingMediaRef.current.filter((item) => item.id !== reservationId);
      setMediaUploading(pendingMediaRef.current.length > 0);
    }
  };

  const submit = async (values: PublishValues) => {
    if (!hasCoverImage) {
      message.warning('请至少上传一张图片作为封面');
      return;
    }
    const selectedPlace = pois.find((item) => `${item.provider}:${item.providerPlaceId}` === values.place);
    if (!selectedPlace) {
      message.warning('请从地图搜索结果中选择真实地点');
      return;
    }
    if (submitting || mediaUploading) return;
    setSubmitting(true);
    try {
      const created = await publish({
        title: values.title.trim(),
        content: values.content.trim(),
        suggestion: values.suggestion?.trim() || undefined,
        perspective: values.perspective,
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
        merchantId: values.merchantId,
        resources: media,
      });
      message.success('甄客帖已发布');
      navigate(`/posts/${created.postId}`, { replace: true });
    } catch (reason) {
      message.error(reason instanceof Error ? reason.message : '发布失败，请检查内容后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={`${styles.page} ${styles.publishPage}`}>
      <div className={styles.detailTopbar}>
        <button type="button" className={styles.backButton} onClick={() => navigate(-1)} aria-label="取消发布">
          <ArrowLeftOutlined />
        </button>
        <div className={styles.pageHeaderCopy}>
          <strong>发布甄客帖</strong>
          <p>分享后将在甄客帖中公开展示。</p>
        </div>
      </div>

      <Form<PublishValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        className={`${styles.surface} ${styles.publishCard}`}
        initialValues={{ perspective: 'LOCAL' }}
        onFinish={(values) => void submit(values)}
      >
        <span className={styles.eyebrow}>CREATE A STORY</span>
        <h1>记录一个地点，分享一种体验视角。</h1>

        <Form.Item
          label={<><UserOutlined /> 体验视角</>}
          name="perspective"
          rules={[{ required: true, message: '请选择体验视角' }]}
        >
          <Radio.Group
            className={styles.perspectiveOptions}
            optionType="button"
            buttonStyle="solid"
            options={perspectiveOptions}
          />
        </Form.Item>

        <Form.Item
          label="标题"
          name="title"
          rules={[
            { required: true, whitespace: true, message: '请输入标题' },
            { max: 120, message: '标题不能超过 120 个字' },
          ]}
        >
          <Input size="large" showCount maxLength={120} placeholder="一句话说清最值得知道的体验" />
        </Form.Item>

        <Form.Item
          label="正文"
          name="content"
          rules={[
            { required: true, whitespace: true, message: '请输入正文' },
            { max: 5000, message: '正文不能超过 5000 个字' },
          ]}
        >
          <Input.TextArea rows={9} showCount maxLength={5000} placeholder="写下环境、服务、路线、适合人群或你观察到的细节……" />
        </Form.Item>

        <Form.Item label="给后来人的建议（选填）" name="suggestion" rules={[{ max: 1000 }]}>
          <Input.TextArea rows={3} showCount maxLength={1000} placeholder="例如最佳到访时间、交通方式或需要避开的坑" />
        </Form.Item>

        {currentLocation && (
          <div className={styles.selectionHint}>
            <Checkbox
              checked={preferCurrentArea}
              onChange={(event) => setPreferCurrentArea(event.target.checked)}
            >
              优先显示“{currentLocation.label}”范围内的地点；关闭后搜索全国
            </Checkbox>
          </div>
        )}

        <Form.Item
          label={<><EnvironmentOutlined /> 关联地点</>}
          name="place"
          extra="可以搜索并选择任意城市的地点。"
          rules={[{ required: true, message: '请选择关联地点' }]}
        >
          <Select
            size="large"
            showSearch
            filterOption={false}
            loading={placeSearching}
            onSearch={schedulePlaceSearch}
            notFoundContent={placeSearching
              ? '正在搜索地点…'
              : placeSearchError || (placeSearchKeyword.length < MIN_PLACE_KEYWORD_LENGTH
                ? '请至少输入 2 个字搜索地点'
                : '没有找到匹配地点，请尝试更完整的名称')}
            placeholder="搜索酒店、饭店、景区、商店或公共地点"
            options={pois.map((item) => ({
              value: `${item.provider}:${item.providerPlaceId}`,
              label: `${item.placeName} · ${item.address}`,
            }))}
          />
        </Form.Item>

        <Form.Item
          label={<><ShopOutlined /> 关联已入驻商家（选填）</>}
          name="merchantId"
          extra="如果内容与平台商家有关，可以选择关联。"
        >
          <Select
            size="large"
            allowClear
            showSearch
            filterOption={false}
            loading={merchantSearching}
            onFocus={() => merchants.length === 0 && void searchMerchants('')}
            onSearch={(value) => void searchMerchants(value)}
            placeholder="不关联商家"
            options={merchants
              .filter((item): item is MerchantOption => item != null)
              .map((item) => ({ value: item.merchantId, label: item.shopName }))}
          />
        </Form.Item>

        <Form.Item label="封面图片与视频" required>
          <div className={styles.mediaUploader}>
            <Upload
              accept="image/jpeg,image/png,video/mp4"
              multiple
              showUploadList={false}
              disabled={mediaUploading || media.length >= 9}
              customRequest={async ({ file, onSuccess, onError }) => {
                try {
                  await addMedia(file as File);
                  onSuccess?.({});
                } catch (reason) {
                  const error = reason instanceof Error ? reason : new Error('媒体上传失败');
                  message.error(error.message);
                  onError?.(error);
                }
              }}
            >
              <Button icon={<UploadOutlined />} loading={mediaUploading}>
                {mediaUploading ? '正在上传…' : '选择图片或 MP4 视频'}
              </Button>
            </Upload>
            <p className={styles.selectionHint}>
              至少上传 1 张图片作为封面；可再上传 1 个视频，图片和视频合计最多 9 个。
              图片 JPG/PNG ≤ 5MB；MP4 ≤ 10MB 且 ≤ 30 秒。
            </p>
            {media.length > 0 && (
              <div className={styles.mediaGrid}>
                {media.map((item, index) => (
                  <div key={`${item.resourceUrl}-${index}`} className={styles.mediaItem}>
                    {item.resourceType === 'VIDEO'
                      ? <video src={item.resourceUrl} muted playsInline />
                      : <img src={item.resourceUrl} alt={`待发布媒体 ${index + 1}`} />}
                    <button
                      type="button"
                      className={styles.mediaRemove}
                      aria-label={`删除第 ${index + 1} 个媒体`}
                      onClick={() => {
                        const nextMedia = mediaRef.current.filter((_, currentIndex) => currentIndex !== index);
                        mediaRef.current = nextMedia;
                        setMedia(nextMedia);
                      }}
                    >
                      <CloseOutlined />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Form.Item>

        <div className={styles.contextNotice}>
          发布后内容将公开展示，请勿上传无权公开的个人资料、联系方式或他人肖像。
        </div>
        <Button
          block
          size="large"
          type="primary"
          htmlType="submit"
          loading={submitting}
          disabled={mediaUploading || !hasCoverImage}
        >确认发布甄客帖</Button>
      </Form>
    </main>
  );
}
