import { SafetyCertificateOutlined, UploadOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Checkbox,
  Descriptions,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Tag,
  Upload,
  message,
} from 'antd';
import type { UploadFile } from 'antd';
import { useEffect, useState } from 'react';
import type { ManagedProduct } from '@/types';
import type {
  ProductCertificationDto,
  ProductCertificationMaterialDto,
} from '@/services/adminApi';
import styles from '@/pages/index.less';

interface CertificationFormValues {
  sourceType: string;
  supplierName: string;
  originPlace: string;
  shippingPlace: string;
  matchType: string;
  matchValue: string;
  proofType: string;
  declarationConfirmed: boolean;
}

interface Props {
  open: boolean;
  product: ManagedProduct | null;
  certification: ProductCertificationDto | null;
  loading: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (body: FormData) => void;
  onOpenMaterial: (material: ProductCertificationMaterialDto) => void;
}

const statusMeta = {
  PROCESSING: { label: '处理中', color: 'processing' },
  PASSED: { label: '已通过', color: 'success' },
  REJECTED: { label: '未通过', color: 'error' },
  EXPIRED: { label: '已失效', color: 'default' },
} as const;

const materialLabels = {
  PROOF: '供货证明',
  PRODUCT_FRONT: '商品正面照片',
  PACKAGE_LABEL: '包装、标签或条形码照片',
} as const;

const matchValuePlaceholders: Record<string, string> = {
  MODEL_OR_ITEM_NO: '填写材料或包装上的型号、货号',
  BARCODE: '填写条形码下方的数字',
  PRODUCT_NAME: '填写供货证明中显示的商品名称',
  PACKAGE_LABEL: '简单描述包装标签上的名称或明显标识',
};

function retainedFile(material?: ProductCertificationMaterialDto): UploadFile[] {
  return material ? [{ uid: `retained-${material.materialId}`, name: material.originalName, status: 'done' }] : [];
}

function validateFile(file: File, kind: keyof typeof materialLabels) {
  const image = ['image/jpeg', 'image/png'].includes(file.type);
  const pdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (kind === 'PROOF' ? !image && !pdf : !image) {
    throw new Error(kind === 'PROOF' ? '供货证明仅支持 JPG、PNG、PDF' : '商品实拍照片仅支持 JPG、PNG');
  }
  const maxSize = kind === 'PROOF' ? 10 : 5;
  if (file.size > maxSize * 1024 * 1024) throw new Error(`文件不能超过 ${maxSize}MB`);
}

export default function ProductCertificationDialog(props: Props) {
  const [form] = Form.useForm<CertificationFormValues>();
  const [proofFiles, setProofFiles] = useState<UploadFile[]>([]);
  const [frontFiles, setFrontFiles] = useState<UploadFile[]>([]);
  const [labelFiles, setLabelFiles] = useState<UploadFile[]>([]);
  const matchType = Form.useWatch('matchType', form);
  const editable = !props.certification || ['REJECTED', 'EXPIRED'].includes(props.certification.status);

  const material = (kind: keyof typeof materialLabels) =>
    props.certification?.materials?.find((item) => item.materialKind === kind);

  useEffect(() => {
    if (!props.open) return;
    const current = props.certification;
    form.resetFields();
    form.setFieldsValue({
      sourceType: current?.sourceType,
      supplierName: current?.supplierName,
      originPlace: current?.originPlace,
      shippingPlace: current?.shippingPlace,
      matchType: current?.matchType,
      matchValue: current?.matchValue,
      proofType: current?.proofType,
      declarationConfirmed: false,
    });
    setProofFiles(retainedFile(current?.materials?.find((item) => item.materialKind === 'PROOF')));
    setFrontFiles(retainedFile(current?.materials?.find((item) => item.materialKind === 'PRODUCT_FRONT')));
    setLabelFiles(retainedFile(current?.materials?.find((item) => item.materialKind === 'PACKAGE_LABEL')));
  }, [form, props.certification, props.open]);

  const uploader = (
    kind: keyof typeof materialLabels,
    files: UploadFile[],
    setFiles: (files: UploadFile[]) => void,
  ) => (
    <Upload
      accept={kind === 'PROOF' ? 'image/jpeg,image/png,application/pdf,.pdf' : 'image/jpeg,image/png'}
      maxCount={1}
      fileList={files}
      beforeUpload={(file) => {
        try {
          validateFile(file as File, kind);
          return false;
        } catch (error) {
          message.error(error instanceof Error ? error.message : '文件格式不符合要求');
          return Upload.LIST_IGNORE;
        }
      }}
      onChange={({ fileList }) => setFiles(fileList.slice(-1))}
      onRemove={() => {
        setFiles([]);
        return true;
      }}
      showUploadList={{ showPreviewIcon: false, showDownloadIcon: false, showRemoveIcon: true }}
    >
      {files.length === 0 && <Button icon={<UploadOutlined />}>选择文件</Button>}
    </Upload>
  );

  const retainedMaterialLink = (kind: keyof typeof materialLabels) => {
    const retained = material(kind);
    if (!retained) return null;
    return (
      <Button type="link" size="small" onClick={() => props.onOpenMaterial(retained)}>
        查看上一版材料
      </Button>
    );
  };

  const appendMaterial = (
    body: FormData,
    files: UploadFile[],
    kind: keyof typeof materialLabels,
    fileField: string,
    retainedField: string,
  ) => {
    const selected = files[0];
    if (!selected) throw new Error(`请上传或保留${materialLabels[kind]}`);
    if (selected.originFileObj) body.append(fileField, selected.originFileObj as File);
    else {
      const retained = material(kind);
      if (!retained) throw new Error(`请重新选择${materialLabels[kind]}`);
      body.append(retainedField, String(retained.materialId));
    }
  };

  const submit = (values: CertificationFormValues) => {
    try {
      const body = new FormData();
      body.append('sourceType', values.sourceType);
      body.append('supplierName', values.supplierName.trim());
      body.append('originPlace', values.originPlace.trim());
      body.append('shippingPlace', values.shippingPlace.trim());
      body.append('matchType', values.matchType);
      body.append('matchValue', values.matchValue.trim());
      body.append('proofType', values.proofType);
      body.append('declarationConfirmed', String(values.declarationConfirmed));
      appendMaterial(body, proofFiles, 'PROOF', 'proofFile', 'retainedProofMaterialId');
      appendMaterial(body, frontFiles, 'PRODUCT_FRONT', 'frontPhoto', 'retainedFrontMaterialId');
      appendMaterial(body, labelFiles, 'PACKAGE_LABEL', 'labelPhoto', 'retainedLabelMaterialId');
      props.onSubmit(body);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '请补全认证材料');
    }
  };

  const current = props.certification;
  return (
    <Modal
      rootClassName={styles.responsiveModal}
      title={<Space><SafetyCertificateOutlined />申请正品认证</Space>}
      open={props.open}
      onCancel={props.onClose}
      footer={null}
      width={760}
      destroyOnHidden
    >
      {props.loading ? (
        <div className={styles.certificationLoading}>认证信息加载中...</div>
      ) : (
        <>
          <div className={styles.certificationIntro}>
            <strong>{props.product?.title}</strong>
            <span>提交商品供货渠道自证资料，由平台进行材料核验，预计 3 分钟完成。</span>
          </div>

          {current && (
            <Alert
              showIcon
              type={current.status === 'PASSED' ? 'success' : current.status === 'REJECTED' ? 'error' : 'info'}
              message={<Space>当前状态<Tag color={statusMeta[current.status].color}>{statusMeta[current.status].label}</Tag></Space>}
              description={current.status === 'PROCESSING'
                ? '平台正在处理，技术重试期间也会保持此状态，请稍后重新查看。'
                : current.merchantReason || (current.status === 'EXPIRED' ? '认证已失效，请在原资料基础上重新申请。' : undefined)}
              className={styles.certificationAlert}
            />
          )}

          {current?.status === 'PASSED' && (
            <Descriptions bordered size="small" column={1} className={styles.certificationResult}>
              <Descriptions.Item label="存证编号">{current.certificationNo}</Descriptions.Item>
              <Descriptions.Item label="认证结论">正品认证已通过</Descriptions.Item>
              <Descriptions.Item label="通过时间">{current.passedAt || '-'}</Descriptions.Item>
              <Descriptions.Item label="有效期至">{current.expiresAt || '-'}</Descriptions.Item>
              <Descriptions.Item label="认证摘要">{current.publicSummary || current.merchantReason || '-'}</Descriptions.Item>
            </Descriptions>
          )}

          {!editable && current && (
            <div className={styles.certificationMaterials}>
              <strong>已提交材料</strong>
              {current.materials.map((item) => (
                <Button key={item.materialId} size="small" onClick={() => props.onOpenMaterial(item)}>
                  {materialLabels[item.materialKind]}：{item.originalName}
                </Button>
              ))}
            </div>
          )}

          {editable && (
            <Form form={form} layout="vertical" onFinish={submit} className={styles.certificationForm}>
              <Form.Item name="sourceType" label="1. 商品来源" rules={[{ required: true, message: '请选择商品来源' }]}>
                <Select placeholder="请选择商品来源" options={[
                  { label: '品牌方直接供货', value: 'BRAND_DIRECT' },
                  { label: '经销商或供应商供货', value: 'DISTRIBUTOR' },
                  { label: '自有品牌或自有生产', value: 'OWN_BRAND' },
                  { label: '其他来源', value: 'OTHER' },
                ]} />
              </Form.Item>
              <Form.Item name="supplierName" label="2. 供货方名称" rules={[{ required: true, message: '请填写供货方名称' }, { max: 128 }]}>
                <Input placeholder="品牌方、供应商或生产企业名称" />
              </Form.Item>
              <div className={styles.certificationTwoColumns}>
                <Form.Item name="originPlace" label="3. 商品产地" rules={[{ required: true, message: '请填写商品产地' }, { max: 128 }]}>
                  <Input placeholder="例如：浙江省杭州市" />
                </Form.Item>
                <Form.Item name="shippingPlace" label="实际发货地" rules={[{ required: true, message: '请填写实际发货地' }, { max: 128 }]}>
                  <Input placeholder="例如：江苏省南京市" />
                </Form.Item>
              </div>
              <div className={styles.certificationTwoColumns}>
                <Form.Item
                  name="matchType"
                  label="4. 材料里如何识别这个商品"
                  extra="选择供货证明和商品包装上都能找到的一项内容，平台会用它核对是不是同一个商品。"
                  rules={[{ required: true, message: '请选择平台如何核对这个商品' }]}
                >
                  <Select placeholder="请选择最容易核对的一项" options={[
                    { label: '按包装上的型号或货号', value: 'MODEL_OR_ITEM_NO' },
                    { label: '按包装条形码', value: 'BARCODE' },
                    { label: '按材料中的商品名称', value: 'PRODUCT_NAME' },
                    { label: '没有编号，按包装标签', value: 'PACKAGE_LABEL' },
                  ]} />
                </Form.Item>
                <Form.Item name="matchValue" label="材料上写的内容" rules={[{ required: true, message: '请填写材料上用于核对商品的内容' }, { max: 128 }]}>
                  <Input placeholder={matchValuePlaceholders[matchType || ''] || '请先选择左侧的核对方式'} />
                </Form.Item>
              </div>
              <Form.Item name="proofType" label="5. 供货证明类型" rules={[{ required: true, message: '请选择供货证明类型' }]}>
                <Select placeholder="请选择材料类型" options={[
                  { label: '品牌授权书', value: 'BRAND_AUTHORIZATION' },
                  { label: '采购合同', value: 'PURCHASE_CONTRACT' },
                  { label: '采购发票或订单', value: 'PURCHASE_INVOICE_OR_ORDER' },
                  { label: '送货单或入库单', value: 'DELIVERY_OR_WAREHOUSE_RECEIPT' },
                  { label: '自有生产证明', value: 'OWN_PRODUCTION' },
                  { label: '其他供货材料', value: 'OTHER' },
                ]} />
              </Form.Item>
              <Form.Item label="上传供货证明" extra="支持 JPG、PNG、PDF，单文件不超过 10MB；价格、银行账号等无关信息可以遮盖。">
                {uploader('PROOF', proofFiles, setProofFiles)}
                {retainedMaterialLink('PROOF')}
              </Form.Item>
              <div className={styles.certificationTwoColumns}>
                <Form.Item label="6. 商品正面照片" extra="JPG、PNG，最多 5MB">
                  {uploader('PRODUCT_FRONT', frontFiles, setFrontFiles)}
                  {retainedMaterialLink('PRODUCT_FRONT')}
                </Form.Item>
                <Form.Item label="包装、标签或条形码照片" extra="JPG、PNG，最多 5MB">
                  {uploader('PACKAGE_LABEL', labelFiles, setLabelFiles)}
                  {retainedMaterialLink('PACKAGE_LABEL')}
                </Form.Item>
              </div>
              <Form.Item name="declarationConfirmed" valuePropName="checked" rules={[{
                validator: (_, value) => value ? Promise.resolve() : Promise.reject(new Error('请确认真实性声明')),
              }]}>
                <Checkbox>
                  我确认以上信息和材料真实、完整、有效，并同意平台进行信息核验、必要的脱敏展示和电子存证。
                </Checkbox>
              </Form.Item>
              <Alert
                type="warning"
                showIcon
                message="正品认证基于商家提交材料，不代表平台对商品真伪、质量或法律合规作出鉴定或担保。"
              />
              <Button type="primary" htmlType="submit" loading={props.submitting} block className={styles.certificationSubmit}>
                {current ? '重新提交正品认证' : '提交正品认证'}
              </Button>
            </Form>
          )}
        </>
      )}
    </Modal>
  );
}
