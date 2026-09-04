import {
  ArrowLeftOutlined,
  CloseOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Button, Form, Input, Radio, Select, Upload, message } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'umi';
import { useShop } from '@/app/ShopContext';
import { LoginRedirect } from '@/components/LoginRedirect';
import { ZkState } from '@/components/ZkPage';
import { useSafeBack } from '@/hooks/useSafeBack';
import {
  merchantOptions,
  place as fetchPlace,
  publish,
  upload,
  type MerchantOption,
  type Place,
  type PostResource,
} from '@/services/zhenke';
import styles from '@/styles/zhenke.less';
import { mediaPreviewUrl } from '@/utils/mediaUrl';
import { takePostPublishFiles } from '@/utils/postPublishDraft';

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
const MERCHANT_SEARCH_DEBOUNCE_MS = 400;
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
  const goBack = useSafeBack('/posts');
  const location = useLocation();
  const { user, authLoading } = useShop();
  const [form] = Form.useForm<PublishValues>();
  const selectedPlaceKey = Form.useWatch('place', form);
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
  const placeSearchVersion = useRef(0);
  const placeSearchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const placeSearchAbort = useRef<AbortController | undefined>(undefined);
  const merchantSearchVersion = useRef(0);
  const merchantSearchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mediaRef = useRef<PostResource[]>([]);
  const pendingMediaRef = useRef<Array<{ id: number; resourceType: PostResource['resourceType'] }>>([]);
  const uploadResultsRef = useRef(new Map<number, PostResource | null>());
  const uploadSequenceRef = useRef(0);
  const nextUploadCommitRef = useRef(1);
  const selectedPlace = useMemo(
    () => pois.find((item) => `${item.provider}:${item.providerPlaceId}` === selectedPlaceKey),
    [pois, selectedPlaceKey],
  );

  useEffect(() => {
    const placeId = Number(new URLSearchParams(location.search).get('placeId'));
    if (!Number.isSafeInteger(placeId) || placeId <= 0) return;
    let active = true;
    void fetchPlace(placeId)
      .then((selected) => {
        if (!active) return;
        const poi: Poi = {
          provider: selected.provider,
          providerPlaceId: selected.providerPlaceId,
          placeName: selected.placeName,
          placeType: selected.placeType,
          address: selected.address,
          province: selected.province,
          city: selected.city,
          district: selected.district,
          provinceCode: selected.provinceCode,
          cityCode: selected.cityCode,
          districtCode: selected.districtCode,
          latitude: selected.latitude,
          longitude: selected.longitude,
        };
        setPois([poi]);
        setPlaceSearchKeyword(selected.placeName);
        form.setFieldValue('place', `${selected.provider}:${selected.providerPlaceId}`);
      })
      .catch((reason) => {
        if (active) message.warning(reason instanceof Error ? reason.message : '专题地点暂时无法带入，请重新搜索');
      });
    return () => { active = false; };
  }, [form, location.search]);

  useEffect(() => () => {
    if (placeSearchTimer.current) clearTimeout(placeSearchTimer.current);
    placeSearchAbort.current?.abort();
    if (merchantSearchTimer.current) clearTimeout(merchantSearchTimer.current);
    merchantSearchVersion.current += 1;
  }, []);

  const searchPlaces = async (normalized: string, version: number) => {
    const controller = new AbortController();
    placeSearchAbort.current = controller;
    setPlaceSearching(true);
    setPlaceSearchError('');
    try {
      const query = new URLSearchParams({ keyword: normalized });
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

  const searchMerchants = async (keyword: string, version: number) => {
    setMerchantSearching(true);
    try {
      const result = await merchantOptions(keyword);
      if (version === merchantSearchVersion.current) setMerchants(result);
    } catch (reason) {
      if (version === merchantSearchVersion.current) {
        message.error(reason instanceof Error ? reason.message : '入驻商家加载失败');
      }
    } finally {
      if (version === merchantSearchVersion.current) setMerchantSearching(false);
    }
  };

  const scheduleMerchantSearch = (keyword: string, immediate = false) => {
    const normalized = keyword.trim();
    const version = ++merchantSearchVersion.current;
    if (merchantSearchTimer.current) clearTimeout(merchantSearchTimer.current);
    setMerchantSearching(false);
    const execute = () => {
      merchantSearchTimer.current = undefined;
      void searchMerchants(normalized, version);
    };
    if (immediate) execute();
    else merchantSearchTimer.current = setTimeout(execute, MERCHANT_SEARCH_DEBOUNCE_MS);
  };

  const commitUploadResult = (reservationId: number, result: PostResource | null) => {
    uploadResultsRef.current.set(reservationId, result);
    let nextMedia = mediaRef.current;
    let changed = false;
    while (uploadResultsRef.current.has(nextUploadCommitRef.current)) {
      const nextResult = uploadResultsRef.current.get(nextUploadCommitRef.current);
      uploadResultsRef.current.delete(nextUploadCommitRef.current);
      nextUploadCommitRef.current += 1;
      if (nextResult) {
        nextMedia = [...nextMedia, nextResult];
        changed = true;
      }
    }
    if (changed) {
      mediaRef.current = nextMedia;
      setMedia(nextMedia);
    }
  };

  const addMedia = async (file: File) => {
    const isVideo = file.type === 'video/mp4';
    const isImage = ['image/jpeg', 'image/png'].includes(file.type);
    if (!isVideo && !isImage) throw new Error('图片仅支持 JPG/PNG，视频仅支持 MP4');
    if (isImage && file.size > 5 * 1024 * 1024) throw new Error('单张图片不能超过 5MB');
    if (isVideo) {
      if (file.size > 10 * 1024 * 1024) throw new Error('视频不能超过 10MB');
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
      if (isVideo && (await videoDuration(file)) > 30.5) {
        throw new Error('视频时长不能超过 30 秒');
      }
      const resourceUrl = await upload(file);
      commitUploadResult(reservationId, { resourceType, resourceUrl });
    } catch (reason) {
      commitUploadResult(reservationId, null);
      throw reason;
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

  useEffect(() => {
    const selectedFiles = takePostPublishFiles();
    if (selectedFiles.length === 0) return;
    void (async () => {
      for (const file of selectedFiles) {
        try {
          await addMedia(file);
        } catch (reason) {
          message.error(reason instanceof Error ? reason.message : '媒体上传失败');
        }
      }
    })();
  }, []);

  const removeMedia = (index: number) => {
    const nextMedia = mediaRef.current.filter((_, currentIndex) => currentIndex !== index);
    mediaRef.current = nextMedia;
    setMedia(nextMedia);
  };

  const mediaItems = media.map((item, index) => (
    <div key={`${item.resourceUrl}-${index}`} className={styles.mediaItem}>
      {item.resourceType === 'VIDEO'
        ? <video src={mediaPreviewUrl(item.resourceUrl)} muted playsInline />
        : <img src={mediaPreviewUrl(item.resourceUrl)} alt={`待发布媒体 ${index + 1}`} />}
      <button
        type="button"
        className={styles.mediaRemove}
        aria-label={`删除第 ${index + 1} 个媒体`}
        onClick={() => removeMedia(index)}
      >
        <CloseOutlined />
      </button>
    </div>
  ));

  if (authLoading) return <main className={styles.page}><ZkState kind="loading" title="正在确认登录状态" /></main>;
  if (!user) return <LoginRedirect />;

  return (
    <main className={`${styles.page} ${styles.publishPage}`}>
      <Form<PublishValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        validateTrigger="onBlur"
        className={styles.publishComposer}
        onFinish={(values) => void submit(values)}
      >
        <header className={styles.publishComposerTopbar}>
          <button
            type="button"
            className={styles.publishBack}
            onClick={goBack}
          >
            <ArrowLeftOutlined /> 返回
          </button>
          <strong>编辑帖子</strong>
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            disabled={mediaUploading || !hasCoverImage}
          >发布</Button>
        </header>

        <section className={styles.publishEditStep} aria-label="编辑帖子内容">
            <div className={styles.publishMediaStrip}>
              {mediaItems}
              {media.length < 9 && (
                <Upload
                  accept="image/jpeg,image/png,video/mp4"
                  multiple
                  showUploadList={false}
                  disabled={mediaUploading}
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
                  <button type="button" className={styles.mediaAddButton} aria-label="继续添加图片或视频">
                    <PlusOutlined />
                  </button>
                </Upload>
              )}
            </div>

            <Form.Item
              name="title"
              rules={[
                { required: true, whitespace: true, message: '请输入标题' },
                { max: 20, message: '标题不能超过 20 个字' },
              ]}
              validateTrigger="onSubmit"
            >
              <Input variant="borderless" size="large" showCount maxLength={20} placeholder="添加标题" />
            </Form.Item>

            <Form.Item
              name="content"
              rules={[
                { required: true, whitespace: true, message: '请输入正文' },
                { max: 5000, message: '正文不能超过 5000 个字' },
              ]}
              validateTrigger="onSubmit"
            >
              <Input.TextArea variant="borderless" rows={6} maxLength={5000} placeholder="添加正文，写下你的真实体验…" />
            </Form.Item>

            <div className={styles.publishFieldList}>
              <Form.Item
                label="标记地点"
                name="place"
                rules={[{ required: true, message: '请选择关联地点' }]}
              >
                <Select
                  size="large"
                  variant="borderless"
                  showSearch
                  filterOption={false}
                  loading={placeSearching}
                  onSearch={schedulePlaceSearch}
                  notFoundContent={placeSearching
                    ? '正在搜索地点…'
                    : placeSearchError || (placeSearchKeyword.length < MIN_PLACE_KEYWORD_LENGTH
                      ? '请输入地点名称'
                      : '没有找到匹配地点')}
                  placeholder="搜索地点"
                  options={pois.map((item) => ({
                    value: `${item.provider}:${item.providerPlaceId}`,
                    label: `${item.placeName} · ${item.address}`,
                  }))}
                />
              </Form.Item>

              <Form.Item
                label="您是"
                name="perspective"
                rules={[{ required: true, message: '请选择你与这座城市的关系' }]}
              >
                <Radio.Group className={styles.perspectiveOptions} options={perspectiveOptions} />
              </Form.Item>

              <Form.Item label="关联已入驻商家（选填）" name="merchantId">
                <Select
                  size="large"
                  variant="borderless"
                  allowClear
                  showSearch
                  filterOption={false}
                  loading={merchantSearching}
                  onFocus={() => merchants.length === 0 && scheduleMerchantSearch('', true)}
                  onSearch={(value) => scheduleMerchantSearch(value)}
                  notFoundContent={merchantSearching ? '正在加载已入驻商家…' : '暂无匹配商家'}
                  placeholder="不关联商家"
                  options={merchants
                    .filter((item): item is MerchantOption => item != null)
                    .map((item) => ({ value: item.merchantId, label: item.shopName }))}
                />
              </Form.Item>

              <Form.Item label="建议" name="suggestion" rules={[{ max: 1000, message: '建议不能超过 1000 个字' }]} validateTrigger="onSubmit">
                <Input.TextArea variant="borderless" rows={2} maxLength={1000} placeholder="可填写交通、时间或其他实用建议" />
              </Form.Item>
            </div>
        </section>
      </Form>
    </main>
  );
}
