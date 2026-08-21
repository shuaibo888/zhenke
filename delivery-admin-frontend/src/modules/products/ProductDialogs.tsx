import { CheckCircleOutlined, UploadOutlined } from '@ant-design/icons';
import {
  App as AntApp,
  Button,
  Checkbox,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Upload,
} from 'antd';
import type { FormInstance, UploadFile } from 'antd';
import { useState } from 'react';
import type { AdminSession, ProductCategoryOption } from '@/types';
import { uploadAdminFile } from '@/services/adminApi';
import styles from '@/pages/index.less';

export interface ProductFormValues {
  title: string;
  subtitle?: string;
  brandName: string;
  categoryId: number;
  imageUrl: string;
  mainImageUrls: string[];
  detailImageUrls: string[];
  price: number;
  stock: number;
  supportsOnline: boolean;
  supportsOffline: boolean;
}

export interface ProductDialogsProps {
  categoryModalOpen: boolean;
  categoriesLoading: boolean;
  categoryDrafts: ProductCategoryOption[];
  onCategoryModalClose: () => void;
  onCategoryDraftsChange: (
    updater: (rows: ProductCategoryOption[]) => ProductCategoryOption[],
  ) => void;
  onSaveCategory: (item: ProductCategoryOption) => void;
  editingProductId: number | null;
  productDrawerOpen: boolean;
  productForm: FormInstance<ProductFormValues>;
  productCategories: ProductCategoryOption[];
  productSaving: boolean;
  session: AdminSession;
  onProductDrawerClose: () => void;
  onSaveProduct: (values: ProductFormValues) => void;
}

const responsiveModalProps = { rootClassName: styles.responsiveModal } as const;
const responsiveDrawerProps = { rootClassName: styles.responsiveDrawer } as const;

type ProductImageKind = 'COVER' | 'MAIN' | 'DETAIL';

interface ProductImageUploaderProps {
  kind: ProductImageKind;
  maxCount: number;
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  session: AdminSession;
  productId: number | null;
}

function validateProductImage(file: File) {
  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    throw new Error('仅支持 JPG、PNG 图片');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('单张图片不能超过 5MB');
  }
}

function ProductImageUploader({ kind, maxCount, value, onChange, session, productId }: ProductImageUploaderProps) {
  const { message } = AntApp.useApp();
  const [uploading, setUploading] = useState(false);
  const urls = Array.isArray(value) ? value : value ? [value] : [];
  const label = kind === 'COVER' ? '商品封面' : kind === 'MAIN' ? '商品主图' : '商品详情图';
  const fileList: UploadFile[] = urls.map((url, index) => ({
    uid: `${kind}-${index}-${url}`,
    name: `${label}${index + 1}`,
    status: 'done',
    url,
    thumbUrl: url,
  }));

  const updateUrls = (nextUrls: string[]) => {
    onChange?.(kind === 'COVER' ? (nextUrls[0] ?? '') : nextUrls);
  };

  return (
    <div className={styles.productImageUploader}>
      <Upload
        accept="image/jpeg,image/png"
        listType="picture-card"
        fileList={fileList}
        maxCount={maxCount}
        multiple={false}
        disabled={uploading}
        showUploadList={{ showPreviewIcon: false, showDownloadIcon: false, showRemoveIcon: true }}
        beforeUpload={(file) => {
          try {
            validateProductImage(file as File);
            return true;
          } catch (error) {
            message.error(error instanceof Error ? error.message : '图片格式不符合要求');
            return Upload.LIST_IGNORE;
          }
        }}
        onRemove={(file) => {
          updateUrls(urls.filter((url) => url !== file.url));
          return true;
        }}
        customRequest={async (options) => {
          setUploading(true);
          try {
            const url = await uploadAdminFile(session, productId, options.file as File, kind);
            updateUrls(kind === 'COVER' ? [url] : [...urls.filter((item) => item !== url), url]);
            options.onSuccess?.({ url });
            message.success(`${label}上传成功`);
          } catch (error) {
            options.onError?.(error as Error);
            message.error(error instanceof Error ? error.message : `${label}上传失败`);
          } finally {
            setUploading(false);
          }
        }}
      >
        {urls.length < maxCount && (
          <div className={styles.productImageUploadButton}>
            <UploadOutlined />
            <span>{uploading ? '上传中' : '上传图片'}</span>
          </div>
        )}
      </Upload>
    </div>
  );
}

export default function ProductDialogs(props: ProductDialogsProps) {
  return (
    <>
      <Modal
        {...responsiveModalProps}
        title="固定四分类设置"
        open={props.categoryModalOpen}
        onCancel={props.onCategoryModalClose}
        footer={null}
        width={760}
        destroyOnHidden
      >
        <p className={styles.subText}>分类编码永久稳定；修改显示名称、排序或启停不会改变已有商品关联。</p>
        <Table
          loading={props.categoriesLoading}
          rowKey="categoryId"
          pagination={false}
          dataSource={props.categoryDrafts}
          columns={[
            { title: '稳定编码', dataIndex: 'categoryCode', responsive: ['md'] },
            {
              title: '显示名称',
              key: 'name',
              render: (_, item: ProductCategoryOption) => (
                <Input
                  value={item.categoryName}
                  maxLength={50}
                  onChange={(event) => props.onCategoryDraftsChange((rows) => rows.map((row) => (
                    row.categoryId === item.categoryId ? { ...row, categoryName: event.target.value } : row
                  )))}
                />
              ),
            },
            {
              title: '排序',
              key: 'sort',
              width: 100,
              responsive: ['md'],
              render: (_, item: ProductCategoryOption) => (
                <InputNumber
                  min={1}
                  max={9999}
                  value={item.categorySort}
                  onChange={(value) => props.onCategoryDraftsChange((rows) => rows.map((row) => (
                    row.categoryId === item.categoryId ? { ...row, categorySort: value ?? 1 } : row
                  )))}
                />
              ),
            },
            {
              title: '启用',
              key: 'status',
              width: 90,
              render: (_, item: ProductCategoryOption) => (
                <Switch
                  checked={item.status === '0'}
                  onChange={(checked) => props.onCategoryDraftsChange((rows) => rows.map((row) => (
                    row.categoryId === item.categoryId ? { ...row, status: checked ? '0' : '1' } : row
                  )))}
                />
              ),
            },
            {
              title: '操作',
              key: 'action',
              width: 90,
              render: (_, item: ProductCategoryOption) => (
                <Button type="primary" size="small" onClick={() => props.onSaveCategory(item)}>保存</Button>
              ),
            },
          ]}
        />
      </Modal>

      <Drawer
        {...responsiveDrawerProps}
        title={props.editingProductId ? '编辑商品' : '新增商品'}
        size="large"
        open={props.productDrawerOpen}
        onClose={props.onProductDrawerClose}
        destroyOnHidden
      >
        <Form form={props.productForm} layout="vertical" onFinish={props.onSaveProduct}>
          <Form.Item
            name="title"
            label="商品名（请包含规格）"
            extra="不同容量、颜色或包装作为独立商品创建，例如“矿泉水 550ml×24瓶”。"
            rules={[{ required: true, message: '请输入包含完整规格的商品名' }, { max: 120, message: '商品名不能超过 120 个字' }]}
          >
            <Input placeholder="例如：矿泉水 550ml×24瓶" />
          </Form.Item>
          <Form.Item
            name="brandName"
            label="品牌"
            rules={[{ required: true, message: '请输入商品品牌' }, { max: 100, message: '商品品牌不能超过 100 个字' }]}
          >
            <Input maxLength={100} placeholder="例如：农夫山泉；没有品牌可填写“无品牌”" />
          </Form.Item>
          <Form.Item name="subtitle" label="商品副标题" rules={[{ max: 200, message: '副标题不能超过 200 个字' }]}>
            <Input placeholder="一句话说明商品特点（选填）" />
          </Form.Item>
          <Form.Item
            name="imageUrl"
            label="商品封面"
            extra="1 张；支持 JPG/PNG，单张不超过 5MB。建议使用清晰方图，系统会自动适配展示。"
            rules={[{ required: true, message: '请上传商品封面' }, { max: 500 }]}
          >
            <ProductImageUploader kind="COVER" maxCount={1} session={props.session} productId={props.editingProductId} />
          </Form.Item>
          <Form.Item
            name="mainImageUrls"
            label="商品主图"
            extra="新建商品至少上传 1 张，最多 6 张；用于商品详情页轮播。支持 JPG/PNG，单张不超过 5MB。"
            rules={props.editingProductId ? undefined : [
              { required: true, type: 'array', min: 1, message: '请至少上传 1 张商品主图' },
            ]}
          >
            <ProductImageUploader kind="MAIN" maxCount={6} session={props.session} productId={props.editingProductId} />
          </Form.Item>
          <Form.Item
            name="detailImageUrls"
            label="商品详情图"
            extra="新建商品至少上传 1 张，最多 6 张；普通图片和长图均可。支持 JPG/PNG，单张不超过 5MB。"
            rules={props.editingProductId ? undefined : [
              { required: true, type: 'array', min: 1, message: '请至少上传 1 张商品详情图' },
            ]}
          >
            <ProductImageUploader kind="DETAIL" maxCount={6} session={props.session} productId={props.editingProductId} />
          </Form.Item>
          <Form.Item name="categoryId" label="分类" rules={[{ required: true, message: '请选择分类' }]}>
            <Select
              options={props.productCategories.map((item) => ({
                label: item.categoryName,
                value: item.categoryId,
              }))}
            />
          </Form.Item>
          <Space size={12} className={styles.formRow}>
            <Form.Item name="price" label="售价" rules={[{ required: true, message: '请输入售价' }]}>
              <InputNumber min={0.01} precision={2} prefix="¥" />
            </Form.Item>
            <Form.Item name="stock" label="库存" rules={[{ required: true, message: '请输入库存' }]}>
              <InputNumber min={0} precision={0} />
            </Form.Item>
          </Space>
          <Form.Item label="销售方式" required extra="至少选择一种；到店核销在支付后生成核销券，与试用线上线下无关。">
            <Space size={20}>
              <Form.Item name="supportsOnline" valuePropName="checked" noStyle>
                <Checkbox>线上快递配送</Checkbox>
              </Form.Item>
              <Form.Item name="supportsOffline" valuePropName="checked" noStyle>
                <Checkbox>到店核销</Checkbox>
              </Form.Item>
            </Space>
          </Form.Item>
          <Button loading={props.productSaving} type="primary" htmlType="submit" block icon={<CheckCircleOutlined />}>
            {props.editingProductId ? '保存修改' : '保存商品'}
          </Button>
        </Form>
      </Drawer>
    </>
  );
}
