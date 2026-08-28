import { DeleteOutlined, InboxOutlined } from '@ant-design/icons';
import { Button, Form, Input, Modal, Radio, Rate, Upload, message } from 'antd';
import { useState } from 'react';
import {
  publishPurchaseVerificationReport,
  publishVerificationReport,
  uploadShopContentFile,
  type ShopOrderDto,
  type TrialApplicationDto,
  type VerificationReportDto,
} from '@/services/shopContent';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { mediaPreviewUrl } from '@/utils/mediaUrl';
import styles from '@/styles/commerce.less';

type PurchaseItem = ShopOrderDto['items'][number];
type ReportResource = {
  resourceType: 'IMAGE' | 'VIDEO';
  resourceUrl: string;
  durationSeconds?: number;
};

const MAX_RESOURCE_COUNT = 9;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 30;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png']);

type Values = {
  title: string;
  experience: string;
  shortcoming: string;
  recommend: boolean;
  productQuality: number;
  logisticsService: number;
  serviceAttitude: number;
};

export function PublishReportModal({
  open,
  trial,
  purchaseItem,
  onClose,
  onPublished,
}: {
  open: boolean;
  trial?: TrialApplicationDto | null;
  purchaseItem?: PurchaseItem | null;
  onClose: () => void;
  onPublished: (report: VerificationReportDto) => void;
}) {
  const [form] = Form.useForm<Values>();
  const [resources, setResources] = useState<ReportResource[]>([]);
  const [resourceError, setResourceError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const purchase = Boolean(purchaseItem);
  const offlinePurchase = purchaseItem?.fulfillmentType === 'OFFLINE';
  useBodyScrollLock(open);

  const close = () => {
    form.resetFields();
    setResources([]);
    setResourceError('');
    onClose();
  };

  const readVideoDuration = (file: File) => new Promise<number>((resolve, reject) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);
    let timeoutId = 0;
    const clear = () => {
      window.clearTimeout(timeoutId);
      video.onloadedmetadata = null;
      video.onerror = null;
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(objectUrl);
    };
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const { duration } = video;
      clear();
      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error('无法读取视频时长，请重新选择 MP4 视频'));
        return;
      }
      resolve(duration);
    };
    video.onerror = () => {
      clear();
      reject(new Error('视频无法播放，请重新导出为 MP4 后上传'));
    };
    timeoutId = window.setTimeout(() => {
      clear();
      reject(new Error('读取视频信息超时，请重新选择视频'));
    }, 10000);
    video.src = objectUrl;
  });

  const upload = async (file: File, resourceType: 'IMAGE' | 'VIDEO') => {
    if (resources.length >= MAX_RESOURCE_COUNT) {
      message.warning('最多上传 9 个资源');
      return false;
    }
    if (resourceType === 'IMAGE') {
      if (!IMAGE_TYPES.has(file.type)) {
        message.warning('图片仅支持 JPG、PNG 格式');
        return false;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        message.warning('单张图片不能超过 5MB');
        return false;
      }
    } else {
      if (resources.some((item) => item.resourceType === 'VIDEO')) {
        message.warning('最多上传一个视频');
        return false;
      }
      if (file.type !== 'video/mp4' && !file.name.toLowerCase().endsWith('.mp4')) {
        message.warning('视频仅支持 MP4 格式');
        return false;
      }
      if (file.size > MAX_VIDEO_SIZE) {
        message.warning('视频不能超过 10MB');
        return false;
      }
    }

    setUploading(true);
    try {
      const duration = resourceType === 'VIDEO' ? await readVideoDuration(file) : undefined;
      if (duration && duration > MAX_VIDEO_SECONDS) {
        throw new Error('视频时长不能超过 30 秒');
      }
      const url = await uploadShopContentFile(file);
      setResources((items) => [
        ...items,
        { resourceType, resourceUrl: url, durationSeconds: duration ? Math.ceil(duration) : undefined },
      ]);
      if (resourceType === 'IMAGE') setResourceError('');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '文件上传失败');
    } finally {
      setUploading(false);
    }
    return false;
  };

  const submit = async (values: Values) => {
    if (!resources.some((item) => item.resourceType === 'IMAGE')) {
      const error = '请至少上传一张图片';
      setResourceError(error);
      message.warning(error);
      return;
    }
    setSubmitting(true);
    try {
      let report: VerificationReportDto;
      if (purchaseItem) {
        report = await publishPurchaseVerificationReport({
          orderItemId: purchaseItem.orderItemId,
          title: values.title.trim(),
          experience: values.experience.trim(),
          shortcoming: values.shortcoming.trim(),
          recommend: values.recommend,
          productQuality: values.productQuality,
          logisticsService: values.logisticsService,
          serviceAttitude: values.serviceAttitude,
          resources,
        });
      } else if (trial) {
        report = await publishVerificationReport({
          trialApplicationId: trial.applicationId,
          title: values.title.trim(),
          experience: values.experience.trim(),
          shortcoming: values.shortcoming.trim(),
          recommend: values.recommend,
          resources,
        });
      } else {
        throw new Error('未找到可发布的业务记录');
      }
      form.resetFields();
      setResources([]);
      setResourceError('');
      onPublished(report);
      message.success('甄客验已发布');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '甄客验发布失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={purchase ? '发布购买甄客验' : '发布试用甄客验'}
      open={open}
      onCancel={close}
      footer={null}
      width={680}
      className={styles.scrollableFormModal}
      rootClassName={`${styles.publishReportModal} ${styles.responsiveModal}`}
    >
      <Form
        form={form}
        className={styles.reviewModal}
        layout="vertical"
        initialValues={{
          recommend: true,
          productQuality: 5,
          logisticsService: 5,
          serviceAttitude: 5,
        }}
        onFinish={submit}
      >
        <div className={styles.reviewOrderInfo}>
          <strong>{purchaseItem?.productName || trial?.productName || '本次真实体验'}</strong>
          <span>{purchase ? '购买评价' : trial?.trialType === 'OFFLINE' ? '线下试用' : '线上试用'}</span>
        </div>
        <Form.Item
          name="title"
          label="标题"
          rules={[
            { required: true, message: '请输入甄客验标题' },
            { max: 20, message: '标题不能超过 20 字' },
          ]}
        >
          <Input size="large" maxLength={20} showCount placeholder="用一句话概括这次真实体验" />
        </Form.Item>
        <section className={`${styles.reviewUpload} ${resourceError ? styles.reviewUploadError : ''}`}>
          <div className={styles.reviewFieldHeading}>
            <strong><span>*</span> 真实体验图片</strong>
            <em>{resources.length} / {MAX_RESOURCE_COUNT}</em>
          </div>
          <p className={styles.reviewFieldDescription}>
            请至少上传 1 张能够真实反映体验过程或使用效果的图片。视频为选填内容，最多上传 1 个；全部素材合计不超过 9 个。
          </p>
          <div className={styles.reviewImages}>
            {resources.map((resource, index) => (
              <div
                className={`${styles.reviewImageItem} ${resource.resourceType === 'VIDEO' ? styles.reviewVideoItem : ''}`}
                key={`${resource.resourceUrl}-${index}`}
              >
                {resource.resourceType === 'IMAGE'
                  ? <img src={mediaPreviewUrl(resource.resourceUrl)} alt={`体验资源${index + 1}`} />
                  : <video src={mediaPreviewUrl(resource.resourceUrl)} controls playsInline preload="metadata" />}
                <span className={styles.reviewMediaBadge}>
                  {resource.resourceType === 'VIDEO'
                    ? `视频${resource.durationSeconds ? ` · ${resource.durationSeconds}秒` : ''}`
                    : '图片'}
                </span>
                <button
                  className={styles.removeImageBtn}
                  type="button"
                  aria-label={`删除第 ${index + 1} 个资源`}
                  onClick={() => setResources((items) => items.filter((_, itemIndex) => itemIndex !== index))}
                >
                  <DeleteOutlined />
                </button>
              </div>
            ))}
            {resources.length < MAX_RESOURCE_COUNT && (
              <div className={styles.reviewUploadButtons}>
                <Upload.Dragger
                  className={styles.reviewDropzone}
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  showUploadList={false}
                  disabled={uploading}
                  beforeUpload={(file) => upload(file as File, 'IMAGE')}
                >
                  <InboxOutlined />
                  <strong>{uploading ? '正在上传…' : '点击或拖拽上传图片'}</strong>
                  <small>JPG / PNG，单张不超过 5MB</small>
                </Upload.Dragger>
                {!resources.some((item) => item.resourceType === 'VIDEO') && (
                  <Upload.Dragger
                    className={styles.reviewDropzone}
                    accept=".mp4,video/mp4"
                    showUploadList={false}
                    disabled={uploading}
                    beforeUpload={(file) => upload(file as File, 'VIDEO')}
                  >
                    <InboxOutlined />
                    <strong>{uploading ? '正在上传…' : '点击或拖拽上传视频'}</strong>
                    <small>MP4，不超过 10MB / 30 秒</small>
                  </Upload.Dragger>
                )}
              </div>
            )}
          </div>
          {resourceError
            ? <p className={styles.reviewFieldError}>{resourceError}</p>
            : (
              <div className={styles.reviewUploadRules}>
                <p><strong>图片要求：</strong>JPG/PNG，单张不超过 5MB</p>
                <p><strong>视频要求：</strong>MP4，不超过 10MB，时长不超过 30 秒</p>
              </div>
            )}
        </section>
        {purchase && (
          <div className={styles.reviewStarsRow}>
            <Form.Item className={styles.reviewStarItem} name="productQuality" label="商品质量"><Rate /></Form.Item>
            <Form.Item className={styles.reviewStarItem} name="logisticsService" label={offlinePurchase ? '核销体验' : '物流服务'}><Rate /></Form.Item>
            <Form.Item className={styles.reviewStarItem} name="serviceAttitude" label="服务态度"><Rate /></Form.Item>
          </div>
        )}
        <div className={styles.reviewTextarea}>
          <Form.Item
            name="experience"
            label="真实体验"
            rules={[
              { required: true, message: '请填写真实体验' },
              { min: 20, message: '真实体验不少于 20 字' },
              { max: 500, message: '真实体验不能超过 500 字' },
            ]}
          >
            <Input.TextArea
              rows={5}
              maxLength={500}
              showCount
              placeholder="请描述实际使用过程、感受和优点，不少于 20 字"
            />
          </Form.Item>
          <Form.Item
            name="shortcoming"
            label="优化建议"
            rules={[
              { required: true, message: '请填写优化建议' },
              { max: 500, message: '优化建议不能超过 500 字' },
            ]}
          >
            <Input.TextArea
              rows={4}
              maxLength={500}
              showCount
              placeholder="请客观填写产品在功能、包装、说明或服务等方面可以改进的地方"
            />
          </Form.Item>
        </div>
        <div className={styles.reviewRecommendField}>
          <div>
            <strong>是否推荐到商城内容流</strong>
            <p>推荐后会进入当前营业分类的试用与甄客验内容流；不推荐时仍会展示在商品详情中。</p>
          </div>
          <Form.Item name="recommend" noStyle rules={[{ required: true, message: '请选择是否在首页推荐' }]}>
            <Radio.Group>
              <Radio value>推荐到商城内容流</Radio>
              <Radio value={false}>仅商品详情展示</Radio>
            </Radio.Group>
          </Form.Item>
        </div>
        <div className={styles.reviewActions}>
          <Button size="large" onClick={close}>取消</Button>
          <Button type="primary" size="large" htmlType="submit" loading={submitting} disabled={uploading}>
            发布甄客验
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
