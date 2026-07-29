import { CheckCircleOutlined, UploadOutlined } from '@ant-design/icons';
import {
  App as AntApp,
  Button,
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
import type { FormInstance } from 'antd';
import type { ProductCategory, ProductCategoryOption } from '@/types';
import { uploadAdminFile } from '@/services/adminApi';
import styles from '@/pages/index.less';

export interface ProductFormValues {
  title: string;
  subtitle?: string;
  categoryId: number;
  imageUrl: string;
  detail: string;
  price: number;
  stock: number;
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
  productImageUrl?: string;
  productCategories: ProductCategory[];
  productSaving: boolean;
  onProductDrawerClose: () => void;
  onSaveProduct: (values: ProductFormValues) => void;
}

const responsiveModalProps = { rootClassName: styles.responsiveModal } as const;
const responsiveDrawerProps = { rootClassName: styles.responsiveDrawer } as const;

export default function ProductDialogs(props: ProductDialogsProps) {
  const { message } = AntApp.useApp();

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
          <Form.Item name="title" label="商品名" rules={[{ required: true, message: '请输入商品名' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="subtitle" label="商品副标题" rules={[{ max: 200, message: '副标题不能超过 200 个字' }]}>
            <Input placeholder="一句话说明商品特点（选填）" />
          </Form.Item>
          <Form.Item label="商品封面" required>
            <div className={styles.uploadBlock}>
              <div
                className={styles.uploadPreview}
                style={{ backgroundImage: props.productImageUrl ? `url(${props.productImageUrl})` : undefined }}
              >
                {!props.productImageUrl && <span>暂无图片</span>}
              </div>
              <div className={styles.uploadActions}>
                <Upload
                  accept="image/*"
                  showUploadList={false}
                  customRequest={async (options) => {
                    try {
                      const url = await uploadAdminFile(options.file as File);
                      props.productForm.setFieldValue('imageUrl', url);
                      options.onSuccess?.({ url });
                      message.success('商品封面上传成功');
                    } catch (error) {
                      options.onError?.(error as Error);
                      message.error(error instanceof Error ? error.message : '商品封面上传失败');
                    }
                  }}
                >
                  <Button icon={<UploadOutlined />}>上传商品封面</Button>
                </Upload>
                <p>上传成功后会自动填写资源地址，也可以手动输入已有图片地址。</p>
              </div>
            </div>
            <Form.Item name="imageUrl" noStyle rules={[{ required: true, message: '请输入商品封面地址' }, { max: 500 }]}>
              <Input placeholder="例如 /profile/upload/2026/07/product.jpg" />
            </Form.Item>
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
          <Form.Item
            name="detail"
            label="商品详细介绍"
            rules={[
              { required: true, message: '请输入商品详细介绍' },
              { min: 10, message: '商品详细介绍至少 10 个字' },
            ]}
          >
            <Input.TextArea rows={5} showCount maxLength={500} placeholder="介绍产地、工艺、规格、适合人群和使用建议" />
          </Form.Item>
          <Button loading={props.productSaving} type="primary" htmlType="submit" block icon={<CheckCircleOutlined />}>
            {props.editingProductId ? '保存修改' : '保存商品'}
          </Button>
        </Form>
      </Drawer>
    </>
  );
}
