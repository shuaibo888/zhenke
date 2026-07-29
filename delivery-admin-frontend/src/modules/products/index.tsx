import { EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Input, Select, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { ManagedProduct, ProductCategoryOption } from '@/types';
import type { ProductCategoryFilter, ProductStatusFilter } from '@/utils/productFilters';
import styles from '@/pages/index.less';

export interface ProductsModuleProps {
  isAdmin: boolean;
  canEditCategory: boolean;
  canAddProduct: boolean;
  products: ManagedProduct[];
  columns: ColumnsType<ManagedProduct>;
  loading: boolean;
  total: number;
  page: number;
  keyword: string;
  categoryFilter: ProductCategoryFilter;
  statusFilter: ProductStatusFilter;
  categories: ProductCategoryOption[];
  onKeywordChange: (value: string) => void;
  onCategoryChange: (value: ProductCategoryFilter) => void;
  onStatusChange: (value: ProductStatusFilter) => void;
  onSearch: (page: number) => void;
  onReset: () => void;
  onOpenCategorySettings: () => void;
  onCreateProduct: () => void;
}

export default function ProductsModule(props: ProductsModuleProps) {
  return (
    <section className={styles.tableSurface}>
      <div className={styles.tableHeader}>
        <div>
          <p className={styles.eyebrow}>商品上架、库存、成本</p>
          <h3>商品管理</h3>
        </div>
        {props.isAdmin && props.canEditCategory && (
          <Button icon={<EditOutlined />} onClick={props.onOpenCategorySettings}>分类设置</Button>
        )}
        {!props.isAdmin && props.canAddProduct && (
          <Button type="primary" icon={<PlusOutlined />} onClick={props.onCreateProduct}>新增商品</Button>
        )}
      </div>
      <div className={styles.productToolbar}>
        <Input
          className={styles.productSearch}
          prefix={<SearchOutlined />}
          allowClear
          placeholder="搜索商品名、匠人/品牌或商家"
          value={props.keyword}
          onChange={(event) => props.onKeywordChange(event.target.value)}
          onPressEnter={() => props.onSearch(1)}
        />
        <Select<ProductCategoryFilter>
          className={styles.productFilter}
          value={props.categoryFilter}
          onChange={props.onCategoryChange}
          options={[
            { label: '全部分类', value: 'all' },
            ...props.categories.map((item) => ({ label: item.categoryName, value: item.categoryCode })),
          ]}
        />
        <Select<ProductStatusFilter>
          className={styles.productFilter}
          value={props.statusFilter}
          onChange={props.onStatusChange}
          options={[
            { label: '全部状态', value: 'all' },
            { label: '草稿', value: 'draft' },
            { label: '在售', value: 'onSale' },
            { label: '已下架', value: 'offSale' },
            { label: '试用中', value: 'trial' },
          ]}
        />
        <Button type="primary" icon={<SearchOutlined />} onClick={() => props.onSearch(1)}>查询</Button>
        <Button icon={<ReloadOutlined />} onClick={props.onReset}>重置</Button>
        <span className={styles.filterSummary}>共 {props.total} 个商品</span>
      </div>
      <Table
        loading={props.loading}
        rowKey="id"
        columns={props.columns}
        dataSource={props.products}
        pagination={{
          current: props.page,
          pageSize: 10,
          total: props.total,
          showSizeChanger: false,
          showTotal: (total) => `共 ${total} 条`,
          onChange: props.onSearch,
        }}
      />
    </section>
  );
}
