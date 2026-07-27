import { DeleteOutlined, UploadOutlined } from '@ant-design/icons';
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
import styles from '@/styles/commerce.less';

type PurchaseItem = ShopOrderDto['items'][number];
type Values = {
  title: string;
  experience: string;
  shortcoming: string;
  fitCrowd: string;
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
  const [resources, setResources] = useState<Array<{ resourceType: 'IMAGE' | 'VIDEO'; resourceUrl: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const purchase = Boolean(purchaseItem);

  const upload = async (file: File) => {
    if (resources.length >= 9) {
      message.warning('最多上传 9 个资源');
      return false;
    }
    setUploading(true);
    try {
      const url = await uploadShopContentFile(file);
      const resourceType = file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';
      if (purchase && resourceType === 'VIDEO') {
        message.warning('购买甄客验当前只支持图片');
        return false;
      }
      setResources((items) => [...items, { resourceType, resourceUrl: url }]);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '文件上传失败');
    } finally {
      setUploading(false);
    }
    return false;
  };

  const submit = async (values: Values) => {
    setSubmitting(true);
    try {
      let report: VerificationReportDto;
      if (purchaseItem) {
        report = await publishPurchaseVerificationReport({
          orderItemId: purchaseItem.orderItemId,
          title: values.title.trim(),
          experience: values.experience.trim(),
          shortcoming: values.shortcoming.trim(),
          fitCrowd: values.fitCrowd.trim(),
          recommend: values.recommend,
          productQuality: values.productQuality,
          logisticsService: values.logisticsService,
          serviceAttitude: values.serviceAttitude,
          resources: resources
            .filter((item) => item.resourceType === 'IMAGE')
            .map((item) => ({ resourceType: 'IMAGE' as const, resourceUrl: item.resourceUrl })),
        });
      } else if (trial) {
        report = await publishVerificationReport({
          trialApplicationId: trial.applicationId,
          title: values.title.trim(),
          experience: values.experience.trim(),
          shortcoming: values.shortcoming.trim(),
          fitCrowd: values.fitCrowd.trim(),
          recommend: values.recommend,
          resources,
        });
      } else {
        throw new Error('未找到可发布的业务记录');
      }
      form.resetFields();
      setResources([]);
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
      onCancel={onClose}
      footer={null}
      width={680}
      rootClassName={styles.responsiveModal}
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
        <Form.Item name="title" label="标题" rules={[{ required: true }, { max: 20 }]}>
          <Input size="large" maxLength={20} showCount />
        </Form.Item>
        {purchase && (
          <div className={styles.reviewStarsRow}>
            <Form.Item className={styles.reviewStarItem} name="productQuality" label="商品质量"><Rate /></Form.Item>
            <Form.Item className={styles.reviewStarItem} name="logisticsService" label="物流服务"><Rate /></Form.Item>
            <Form.Item className={styles.reviewStarItem} name="serviceAttitude" label="服务态度"><Rate /></Form.Item>
          </div>
        )}
        <div className={styles.reviewTextarea}>
          <Form.Item
            name="experience"
            label="真实体验"
            rules={[{ required: true }, { min: 20, message: '真实体验不少于 20 字' }, { max: 500 }]}
          >
            <Input.TextArea rows={5} maxLength={500} showCount />
          </Form.Item>
          <Form.Item name="shortcoming" label="产品不足" rules={[{ required: true }, { max: 500 }]}>
            <Input.TextArea rows={3} maxLength={500} showCount />
          </Form.Item>
        </div>
        <Form.Item name="fitCrowd" label="适合人群" rules={[{ required: true }, { max: 200 }]}>
          <Input maxLength={200} />
        </Form.Item>
        <div className={styles.reviewRecommendField}>
          <span>是否推荐</span>
          <Form.Item name="recommend" noStyle>
            <Radio.Group options={[{ label: '推荐', value: true }, { label: '不推荐', value: false }]} />
          </Form.Item>
        </div>
        <div className={styles.reviewUpload}>
          <div className={styles.reviewImages}>
            {resources.map((resource, index) => (
              <div className={styles.reviewImageItem} key={`${resource.resourceUrl}-${index}`}>
                {resource.resourceType === 'IMAGE'
                  ? <img src={resource.resourceUrl} alt={`资源${index + 1}`} />
                  : <video src={resource.resourceUrl} controls />}
                <button type="button" onClick={() => setResources((items) => items.filter((_, itemIndex) => itemIndex !== index))}>
                  <DeleteOutlined />
                </button>
              </div>
            ))}
            {resources.length < 9 && (
              <Upload
                accept={purchase ? 'image/*' : 'image/*,video/*'}
                showUploadList={false}
                beforeUpload={(file) => upload(file as File)}
              >
                <Button icon={<UploadOutlined />} loading={uploading}>上传图片{purchase ? '' : '或视频'}</Button>
              </Upload>
            )}
          </div>
          <p className={styles.uploadHint}>最多上传 9 个资源，请使用真实拍摄内容。</p>
        </div>
        <div className={styles.reviewActions}>
          <Button size="large" onClick={onClose}>取消</Button>
          <Button type="primary" size="large" htmlType="submit" loading={submitting} disabled={uploading}>
            发布甄客验
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
