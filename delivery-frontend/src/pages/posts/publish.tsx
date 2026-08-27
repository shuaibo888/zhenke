import {
  ArrowLeftOutlined,
  CloseOutlined,
  EnvironmentOutlined,
  ShopOutlined,
  UploadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Button, Form, Input, Radio, Select, Upload, message } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'umi';
import { useShop } from '@/app/ShopContext';
import {
  merchantOptions,
  publish,
  upload,
  type MerchantOption,
  type Place,
  type PostResource,
} from '@/services/zhenke';
import styles from '@/styles/zhenke.less';

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
  const { user } = useShop();
  const [form] = Form.useForm<PublishValues>();
  const [media, setMedia] = useState<PostResource[]>([]);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [pois, setPois] = useState<Poi[]>([]);
  const [placeSearching, setPlaceSearching] = useState(false);
  const [merchants, setMerchants] = useState<MerchantOption[]>([]);
  const [merchantSearching, setMerchantSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const placeSearchVersion = useRef(0);

  useEffect(() => {
    if (!user) navigate(`/auth?redirect=${encodeURIComponent('/posts/publish')}`, { replace: true });
  }, [navigate, user]);

  if (!user) return null;

  const searchPlaces = async (keyword: string) => {
    const normalized = keyword.trim();
    if (!normalized) {
      setPois([]);
      return;
    }
    const version = ++placeSearchVersion.current;
    setPlaceSearching(true);
    try {
      const response = await fetch(`/api/shop/zhenke/map/search?keyword=${encodeURIComponent(normalized)}`);
      const payload = await response.json();
      if (!response.ok || payload.code !== 200) throw new Error(payload.msg || '地点搜索失败');
      if (version === placeSearchVersion.current) setPois(Array.isArray(payload.data) ? payload.data : []);
    } catch (reason) {
      if (version === placeSearchVersion.current) {
        setPois([]);
        message.error(reason instanceof Error ? reason.message : '地点搜索暂时不可用');
      }
    } finally {
      if (version === placeSearchVersion.current) setPlaceSearching(false);
    }
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
    if (media.length >= 9) throw new Error('图片和视频合计最多上传 9 个');
    if (isImage && file.size > 5 * 1024 * 1024) throw new Error('单张图片不能超过 5MB');
    if (isVideo) {
      if (file.size > 10 * 1024 * 1024) throw new Error('视频不能超过 10MB');
      if (media.some((item) => item.resourceType === 'VIDEO')) throw new Error('最多上传 1 个视频');
      if ((await videoDuration(file)) > 30.5) throw new Error('视频时长不能超过 30 秒');
    }
    setMediaUploading(true);
    try {
      const resourceUrl = await upload(file);
      setMedia((current) => [...current, { resourceType: isVideo ? 'VIDEO' : 'IMAGE', resourceUrl }]);
    } finally {
      setMediaUploading(false);
    }
  };

  const submit = async (values: PublishValues) => {
    if (media.length === 0) {
      message.warning('请至少上传一张图片或一个视频');
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
        place: selectedPlace,
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
          <p>真实保存后立即公开，暂不支持编辑和恢复。</p>
        </div>
      </div>

      <Form<PublishValues>
        form={form}
        layout="vertical"
        requiredMark="optional"
        className={`${styles.surface} ${styles.publishCard}`}
        initialValues={{ perspective: 'LOCAL' }}
        onFinish={(values) => void submit(values)}
      >
        <span className={styles.eyebrow}>CREATE A STORY</span>
        <h1>记录一个地点，分享一种体验视角。</h1>
        <p className={styles.selectionHint}>
          甄客帖不要求平台订单；地点是你主动选择的信息，不会被包装成到访认证。
        </p>

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

        <Form.Item
          label={<><EnvironmentOutlined /> 关联地点</>}
          name="place"
          extra="可以搜索任意城市，不限当前位置；必须从腾讯地图返回结果中选择。"
          rules={[{ required: true, message: '请选择关联地点' }]}
        >
          <Select
            size="large"
            showSearch
            filterOption={false}
            loading={placeSearching}
            onSearch={(value) => void searchPlaces(value)}
            notFoundContent={placeSearching ? '正在搜索地点…' : '输入地点名、商圈或详细地址搜索'}
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
          extra="地点和商家分别保存。只有你主动选择才会关联，没有商家是正常状态。"
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
            options={merchants.map((item) => ({ value: item.merchantId, label: item.shopName }))}
          />
        </Form.Item>

        <Form.Item label="图片或视频" required>
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
                {mediaUploading ? '正在上传真实文件…' : '选择图片或 MP4 视频'}
              </Button>
            </Upload>
            <p className={styles.selectionHint}>
              合计 1–9 个；视频最多 1 个。图片 JPG/PNG ≤ 5MB；MP4 ≤ 10MB 且 ≤ 30 秒。允许只发视频。
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
                      onClick={() => setMedia((current) => current.filter((_, currentIndex) => currentIndex !== index))}
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
          发布后内容立即公开。作者可以逻辑删除，但第一版不能编辑或恢复；不应上传无权公开的个人资料、联系方式或他人肖像。
        </div>
        <Button
          block
          size="large"
          type="primary"
          htmlType="submit"
          loading={submitting}
          disabled={mediaUploading || media.length === 0}
        >确认发布甄客帖</Button>
      </Form>
    </main>
  );
}
