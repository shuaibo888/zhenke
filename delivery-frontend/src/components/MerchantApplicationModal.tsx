import { SafetyCertificateOutlined } from '@ant-design/icons';
import { Button, Form, Input, Modal, Switch, message } from 'antd';
import { useEffect, useState } from 'react';
import { useShop } from '@/app/ShopContext';
import {
  fetchMyMerchantApplication,
  submitMerchantApplication,
  type MerchantApplicationBody,
} from '@/services/shopAuth';
import type { Merchant } from '@/types';
import styles from '@/styles/commerce.less';

export function MerchantApplicationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { captcha, loadCaptcha } = useShop();
  const [form] = Form.useForm<MerchantApplicationBody>();
  const [application, setApplication] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetchMyMerchantApplication()
      .then(setApplication)
      .catch(() => setApplication(null));
  }, [open]);

  const submit = async (values: MerchantApplicationBody) => {
    setLoading(true);
    try {
      const saved = await submitMerchantApplication({ ...values, uuid: captcha.uuid });
      setApplication(saved);
      message.success('商家入驻申请已提交');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '申请提交失败');
      await loadCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="商家入驻"
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      className={styles.merchantModal}
      rootClassName={styles.responsiveModal}
    >
      <div className={styles.merchantIntro}>
        <p>提交公司资质、联系人、产品介绍和产地溯源材料，平台审核通过后会创建商家后台账号。</p>
        <p className={styles.merchantWarning}>
          <SafetyCertificateOutlined />
          平台将保存申请与审核记录，请保证材料真实、完整且资源地址可访问。
        </p>
      </div>
      {application ? (
        <div className={styles.merchantStatus}>
          <h3>申请编号：{application.applicationNo}</h3>
          <p>当前审核状态：{application.auditStatus}</p>
          {application.auditRemark && <p>审核说明：{application.auditRemark}</p>}
          <Button block onClick={onClose}>关闭</Button>
        </div>
      ) : (
        <Form form={form} layout="vertical" onFinish={submit}>
          <div className={styles.merchantFormGrid}>
            <Form.Item name="accountUsername" label="商家登录账号" rules={[{ required: true }]}>
              <Input size="large" />
            </Form.Item>
            <Form.Item name="password" label="商家登录密码" rules={[{ required: true }]}>
              <Input.Password size="large" />
            </Form.Item>
            <Form.Item name="companyName" label="公司名称" rules={[{ required: true }]}>
              <Input size="large" />
            </Form.Item>
            <Form.Item name="companyAddress" label="公司地址" rules={[{ required: true }]}>
              <Input size="large" />
            </Form.Item>
            <Form.Item name="contactName" label="联系人" rules={[{ required: true }]}>
              <Input size="large" />
            </Form.Item>
            <Form.Item
              name="contactPhone"
              label="联系电话"
              rules={[{ required: true }, { pattern: /^1\d{10}$/, message: '请输入 11 位手机号' }]}
            >
              <Input size="large" />
            </Form.Item>
          </div>
          {captcha.enabled && (
            <Form.Item name="code" label="验证码" rules={[{ required: true }]}>
              <div className={styles.captchaRow}>
                <Input size="large" />
                <button type="button" className={styles.captchaButton} onClick={() => void loadCaptcha()}>
                  <img src={captcha.image} alt="验证码" />
                </button>
              </div>
            </Form.Item>
          )}
          <Form.Item name="businessLicense" label="营业执照图片地址" rules={[{ required: true }]}>
            <Input size="large" placeholder="请填写已上传的营业执照地址" />
          </Form.Item>
          <Form.Item name="productIntro" label="主营产品" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="originTraceability" label="产地与溯源说明" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="acceptsVerificationRecruitment" label="接受甄客试用招募" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="acceptsPublicWelfare" label="接受公益合作" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item
            name="agreeProtocol"
            label="同意平台入驻协议"
            valuePropName="checked"
            rules={[{ validator: (_, value) => value ? Promise.resolve() : Promise.reject(new Error('请同意平台入驻协议')) }]}
          >
            <Switch />
          </Form.Item>
          <Button block type="primary" size="large" htmlType="submit" loading={loading}>提交入驻申请</Button>
        </Form>
      )}
    </Modal>
  );
}
