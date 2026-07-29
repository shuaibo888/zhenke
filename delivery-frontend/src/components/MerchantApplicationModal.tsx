import { SafetyCertificateOutlined, SearchOutlined, UploadOutlined } from '@ant-design/icons';
import { Alert, Button, Form, Input, Modal, Switch, Upload, message } from 'antd';
import type { UploadProps } from 'antd';
import { useEffect, useState } from 'react';
import { useShop } from '@/app/ShopContext';
import {
  fetchMerchantApplication,
  fetchMyMerchantApplication,
  getStoredMerchantApplicationLookup,
  submitMerchantApplication,
  uploadMerchantBusinessLicense,
  type MerchantApplicationBody,
  type MerchantApplicationLookup,
} from '@/services/shopAuth';
import type { Merchant } from '@/types';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import styles from '@/styles/commerce.less';

export function MerchantApplicationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { captcha, loadCaptcha } = useShop();
  const [form] = Form.useForm<MerchantApplicationBody>();
  const [queryForm] = Form.useForm<MerchantApplicationLookup>();
  const [application, setApplication] = useState<Merchant | null>(null);
  const [lookup, setLookup] = useState<MerchantApplicationLookup | null>(null);
  const [queryOpen, setQueryOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [querying, setQuerying] = useState(false);
  const businessLicense = Form.useWatch('businessLicense', form);
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    setLookup(getStoredMerchantApplicationLookup());
    fetchMyMerchantApplication()
      .then(setApplication)
      .catch(() => setApplication(null));
  }, [open]);

  useEffect(() => {
    if (!open || application?.auditStatus !== 'REJECTED') return;
    form.setFieldsValue({
      accountUsername: application.accountUsername,
      companyName: application.companyName,
      companyAddress: application.companyAddress,
      contactName: application.contactName,
      contactPhone: application.contactPhone,
      businessLicense: application.businessLicense,
      productIntro: application.productIntro,
      originTraceability: application.originTraceability,
      acceptsVerificationRecruitment: application.acceptsVerificationRecruitment === '0',
      acceptsPublicWelfare: application.acceptsPublicWelfare === '0',
      agreeProtocol: true,
    });
  }, [application, form, open]);

  const submit = async (values: MerchantApplicationBody) => {
    setLoading(true);
    try {
      const saved = await submitMerchantApplication({ ...values, uuid: captcha.uuid });
      setApplication(saved.merchant);
      setLookup(saved.lookup);
      message.success('商家入驻申请已提交');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '申请提交失败');
      await loadCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const uploadLicense: NonNullable<UploadProps['customRequest']> = async (options) => {
    const file = options.file as File;
    const code = form.getFieldValue('code');
    if (file.size > 5 * 1024 * 1024) {
      const error = new Error('营业执照图片不能超过 5MB');
      message.error(error.message);
      options.onError?.(error);
      return;
    }
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      const error = new Error('营业执照仅支持 JPG、PNG 格式');
      message.error(error.message);
      options.onError?.(error);
      return;
    }
    if (captcha.enabled && !code) {
      const error = new Error('请先填写验证码，再上传营业执照');
      message.warning(error.message);
      options.onError?.(error);
      return;
    }

    setUploading(true);
    try {
      const url = await uploadMerchantBusinessLicense(file, code, captcha.uuid);
      form.setFieldValue('businessLicense', url);
      options.onSuccess?.({ url });
      message.success('营业执照上传成功');
    } catch (error) {
      const uploadError = error instanceof Error ? error : new Error('营业执照上传失败');
      message.error(uploadError.message);
      options.onError?.(uploadError);
    } finally {
      setUploading(false);
      if (captcha.enabled) {
        form.setFieldValue('code', undefined);
        await loadCaptcha();
      }
    }
  };

  const queryApplication = async (values: MerchantApplicationLookup) => {
    setQuerying(true);
    try {
      const contactPhone = values.contactPhone.trim();
      const saved = await fetchMerchantApplication({ contactPhone });
      setApplication(saved);
      setLookup({ contactPhone });
      setQueryOpen(false);
      message.success('已恢复商家入驻申请');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '申请查询失败');
    } finally {
      setQuerying(false);
    }
  };

  const statusLabel = application?.auditStatus === 'APPROVED'
    ? '审核通过'
    : application?.auditStatus === 'REJECTED'
      ? '已驳回'
      : '审核中';
  const showStatus = application && application.auditStatus !== 'REJECTED';

  return (
    <Modal
      title={(
        <div className={styles.merchantModalTitle}>
          <span><SafetyCertificateOutlined /></span>
          <div>
            <strong>商家入驻申请</strong>
            <small>提交真实资料，平台审核通过后开通商家后台</small>
          </div>
        </div>
      )}
      open={open}
      onCancel={onClose}
      footer={null}
      width={780}
      centered
      className={styles.merchantModal}
      rootClassName={styles.responsiveModal}
    >
      <div className={styles.merchantIntro}>
        <div className={styles.merchantProcess} aria-label="商家入驻流程">
          <div><span>1</span><strong>填写资料</strong></div>
          <i />
          <div><span>2</span><strong>平台审核</strong></div>
          <i />
          <div><span>3</span><strong>开通后台</strong></div>
        </div>
        <p className={styles.merchantWarning}>
          <SafetyCertificateOutlined />
          申请与审核记录将由平台留存，请保证资料真实、完整且相关资源可以访问。
        </p>
      </div>
      {showStatus ? (
        <div className={styles.merchantStatus}>
          <h3>商家入驻申请</h3>
          <p>当前审核状态：{statusLabel}</p>
          {application.auditRemark && <p>审核说明：{application.auditRemark}</p>}
          {lookup && (
            <Alert
              type="success"
              showIcon
              message="当前手机号已关联此申请"
              description={(
                <div className={styles.merchantCredentials}>
                  <span>申请手机号</span>
                  <strong>{lookup.contactPhone}</strong>
                  <small>当前设备已自动记住；也可以在其他设备上使用该手机号查询申请进度。</small>
                </div>
              )}
            />
          )}
          <Button block onClick={onClose}>关闭</Button>
        </div>
      ) : (
        <>
          {application?.auditStatus === 'REJECTED' && (
            <Alert
              type="error"
              showIcon
              message="申请已被驳回，请修改材料后重新提交"
              description={application.auditRemark || '请根据审核要求完善入驻材料。'}
              className={styles.merchantRejected}
            />
          )}
          {!application && (
            <div className={styles.merchantRecovery}>
              <Button type="link" icon={<SearchOutlined />} onClick={() => setQueryOpen((value) => !value)}>
                已提交过申请？查询申请进度
              </Button>
              {queryOpen && (
                <Form form={queryForm} layout="vertical" onFinish={queryApplication}>
                  <div className={styles.merchantFormGrid}>
                    <Form.Item
                      name="contactPhone"
                      label="申请手机号"
                      rules={[
                        { required: true, message: '请输入申请手机号' },
                        { pattern: /^1\d{10}$/, message: '请输入11位手机号' },
                      ]}
                    >
                      <Input
                        size="large"
                        maxLength={11}
                        inputMode="numeric"
                        autoComplete="tel"
                        placeholder="请输入提交申请时填写的手机号"
                      />
                    </Form.Item>
                  </div>
                  <Button block htmlType="submit" loading={querying}>查询申请</Button>
                </Form>
              )}
            </div>
          )}
          <Form form={form} layout="vertical" requiredMark={false} className={styles.merchantForm} onFinish={submit}>
            <section className={styles.merchantFormSection}>
              <header className={styles.merchantSectionHeader}>
                <span>01</span>
                <div>
                  <h3>账号与企业信息</h3>
                  <p>用于创建商家后台账号并核验企业主体。</p>
                </div>
              </header>
              <div className={styles.merchantFormGrid}>
              <Form.Item
                name="accountUsername"
                label="商家登录账号"
                extra="4到30位，仅支持字母、数字或下划线"
                validateFirst
                rules={[
                  { required: true, message: '请输入商家登录账号' },
                  {
                    pattern: /^[A-Za-z0-9_]{4,30}$/,
                    message: '商家登录账号必须为4到30位字母、数字或下划线',
                  },
                ]}
              >
                <Input size="large" maxLength={30} placeholder="请输入4到30位商家登录账号" />
              </Form.Item>
              <Form.Item
                name="password"
                label={application ? '重新设置商家登录密码' : '商家登录密码'}
                extra="6到50位，必须同时包含字母和数字"
                validateFirst
                rules={[
                  { required: true, message: '请输入商家登录密码' },
                  { min: 6, max: 50, message: '商家登录密码必须为6到50位' },
                  {
                    pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/,
                    message: '商家登录密码必须同时包含字母和数字',
                  },
                ]}
              >
                <Input.Password size="large" maxLength={50} placeholder="请输入包含字母和数字的密码" />
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
            </section>
            <section className={styles.merchantFormSection}>
              <header className={styles.merchantSectionHeader}>
                <span>02</span>
                <div>
                  <h3>企业资质</h3>
                  <p>验证码用于保护匿名上传，营业执照仅用于平台审核。</p>
                </div>
              </header>
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
            <Form.Item name="businessLicense" hidden rules={[{ required: true, message: '请上传营业执照' }]}>
              <Input />
            </Form.Item>
            <div className={styles.merchantLicenseField}>
              <label>营业执照</label>
              <Upload
                accept=".jpg,.jpeg,.png"
                customRequest={uploadLicense}
                maxCount={1}
                showUploadList={false}
              >
                <Button block size="large" icon={<UploadOutlined />} loading={uploading}>
                  {businessLicense ? '重新上传营业执照' : '上传营业执照'}
                </Button>
              </Upload>
              <small>支持 JPG、PNG，文件不超过 5MB。上传时会校验当前验证码。</small>
              {businessLicense && (
                <img src={businessLicense} alt="营业执照预览" className={styles.merchantLicensePreview} />
              )}
            </div>
            </section>
            <section className={styles.merchantFormSection}>
              <header className={styles.merchantSectionHeader}>
                <span>03</span>
                <div>
                  <h3>经营与溯源信息</h3>
                  <p>帮助平台了解主营方向、产地信息与供应链真实性。</p>
                </div>
              </header>
              <div className={styles.merchantFormGrid}>
                <Form.Item name="productIntro" label="主营产品" rules={[{ required: true }]}>
                  <Input.TextArea rows={3} placeholder="请简要介绍主营品类、产品特点与供货能力" />
                </Form.Item>
                <Form.Item name="originTraceability" label="产地与溯源说明" rules={[{ required: true }]}>
                  <Input.TextArea rows={3} placeholder="请说明产地、生产主体及可提供的溯源材料" />
                </Form.Item>
              </div>
            </section>
            <section className={styles.merchantFormSection}>
              <header className={styles.merchantSectionHeader}>
                <span>04</span>
                <div>
                  <h3>平台合作确认</h3>
                  <p>请确认以下合作约定后提交审核。</p>
                </div>
              </header>
              <div className={styles.merchantConsentGrid}>
                <Form.Item
                  name="acceptsVerificationRecruitment"
                  label="接受甄客试用招募"
                  valuePropName="checked"
                  rules={[{ validator: (_, value) => value ? Promise.resolve() : Promise.reject(new Error('请确认接受甄客试用招募')) }]}
                >
                  <Switch />
                </Form.Item>
                <Form.Item
                  name="acceptsPublicWelfare"
                  label="参与平台公益合作（当前订单不扣款）"
                  valuePropName="checked"
                  rules={[{ validator: (_, value) => value ? Promise.resolve() : Promise.reject(new Error('请确认公益合作约定')) }]}
                >
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
              </div>
            </section>
            <div className={styles.merchantSubmitBar}>
              <p>提交后可使用申请手机号查询审核进度。</p>
              <Button type="primary" size="large" htmlType="submit" loading={loading}>
                {application?.auditStatus === 'REJECTED' ? '重新提交入驻申请' : '提交入驻申请'}
              </Button>
            </div>
          </Form>
        </>
      )}
    </Modal>
  );
}
