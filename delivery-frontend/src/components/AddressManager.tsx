import { CheckCircleFilled, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Cascader, Form, Input, Modal, Radio, Spin, Tag, message } from 'antd';
import { useMemo, useState } from 'react';
import pcaCode from 'china-division/dist/pca-code.json';
import { useShop } from '@/app/ShopContext';
import type { ShopShippingAddress, ShopShippingAddressBody } from '@/services/shopAuth';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import styles from '@/styles/commerce.less';

type RegionNode = { code: string; name: string; children?: RegionNode[] };
type RegionOption = { value: string; label: string; children?: RegionOption[] };

const emptyAddress: ShopShippingAddressBody = { recipient: '', phone: '', region: [], detail: '' };

function formatAddress(address: ShopShippingAddressBody) {
  return `${address.region.join(' ')} ${address.detail}`.trim();
}

export function AddressManager({
  open,
  onClose,
  picker,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  picker?: boolean;
  onSelect?: (address: ShopShippingAddress) => void;
}) {
  const { addresses, privateLoading, saveAddress, makeDefaultAddress, removeAddress } = useShop();
  const [form] = Form.useForm<ShopShippingAddressBody>();
  const [editing, setEditing] = useState<ShopShippingAddress | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mutatingId, setMutatingId] = useState<number | null>(null);
  useBodyScrollLock(open || editorOpen);
  const options = useMemo<RegionOption[]>(() => (pcaCode as RegionNode[]).map((province) => ({
    value: province.code,
    label: province.name,
    children: province.children?.map((city) => ({
      value: city.code,
      label: city.name,
      children: city.children?.map((area) => ({ value: area.code, label: area.name })),
    })),
  })), []);

  const startCreate = () => {
    setEditing(null);
    form.setFieldsValue(emptyAddress);
    setEditorOpen(true);
  };

  const startEdit = (address: ShopShippingAddress) => {
    setEditing(address);
    form.setFieldsValue(address);
    setEditorOpen(true);
  };

  const submit = async (values: ShopShippingAddressBody) => {
    setSubmitting(true);
    try {
      await saveAddress(values, editing?.id);
      setEditorOpen(false);
      setEditing(null);
      form.setFieldsValue(emptyAddress);
      message.success(editing ? '地址已更新' : '地址已添加');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '地址保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  const setDefault = async (addressId: number) => {
    setMutatingId(addressId);
    try {
      await makeDefaultAddress(addressId);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '默认地址设置失败');
    } finally {
      setMutatingId(null);
    }
  };

  const confirmRemove = (address: ShopShippingAddress) => {
    Modal.confirm({
      title: '删除收货地址',
      content: `确定删除 ${address.recipient} 的地址吗？`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        setMutatingId(address.id);
        try {
          await removeAddress(address.id);
        } catch (error) {
          message.error(error instanceof Error ? error.message : '地址删除失败');
        } finally {
          setMutatingId(null);
        }
      },
    });
  };

  return (
    <>
      <Modal
        title={picker ? '选择收货地址' : '我的地址'}
        open={open}
        onCancel={onClose}
        footer={null}
        width={620}
        rootClassName={styles.responsiveModal}
      >
        {!picker && (
          <div className={styles.addressManagerHeader}>
            <Button type="primary" icon={<PlusOutlined />} onClick={startCreate}>新增地址</Button>
          </div>
        )}
        <Spin spinning={privateLoading}>
          <div className={picker ? styles.addressPickerList : styles.addressList}>
            {addresses.length === 0 ? (
              <div className={styles.empty}>
                <p>暂无保存的地址</p>
                <Button type="primary" onClick={startCreate}>新增地址</Button>
              </div>
            ) : addresses.map((address) => picker ? (
              <button
                type="button"
                key={address.id}
                className={`${styles.addressPickerItem} ${address.isDefault ? styles.selectedAddress : ''}`}
                onClick={() => onSelect?.(address)}
              >
                <div className={styles.addressPickerContent}>
                  <div className={styles.addressPickerTop}>
                    <strong>{address.recipient}</strong>
                    <em>{address.phone}</em>
                    {address.isDefault && <Tag color="success">默认地址</Tag>}
                  </div>
                  <p>{formatAddress(address)}</p>
                </div>
                <CheckCircleFilled className={styles.addressPickerCheck} />
              </button>
            ) : (
              <div className={styles.addressItem} key={address.id}>
                <Radio
                  checked={address.isDefault}
                  disabled={mutatingId !== null}
                  onChange={() => void setDefault(address.id)}
                >
                  设为默认
                </Radio>
                <div className={styles.addressContent}>
                  <span>
                    <strong>{address.recipient}</strong>
                    <em>{address.phone}</em>
                    {address.isDefault && <Tag color="success">默认地址</Tag>}
                  </span>
                  <p>{formatAddress(address)}</p>
                </div>
                <Button size="small" onClick={() => startEdit(address)}>编辑</Button>
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  loading={mutatingId === address.id}
                  onClick={() => confirmRemove(address)}
                >
                  删除
                </Button>
              </div>
            ))}
          </div>
        </Spin>
      </Modal>

      <Modal
        title={editing ? '编辑地址' : '新增地址'}
        open={editorOpen}
        onCancel={() => setEditorOpen(false)}
        footer={null}
        width={520}
        rootClassName={styles.responsiveModal}
      >
        <Form form={form} layout="vertical" initialValues={emptyAddress} onFinish={submit}>
          <Form.Item name="recipient" label="收货人" rules={[{ required: true, message: '请输入收货人' }]}>
            <Input size="large" />
          </Form.Item>
          <Form.Item
            name="phone"
            label="手机号"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1\d{10}$/, message: '请输入 11 位手机号' },
            ]}
          >
            <Input size="large" />
          </Form.Item>
          <Form.Item name="region" label="所在地区" rules={[{ required: true, message: '请选择省市区' }]}>
            <Cascader options={options} size="large" showSearch placeholder="请选择省 / 市 / 区" />
          </Form.Item>
          <Form.Item name="detail" label="详细地址" rules={[{ required: true, message: '请输入详细地址' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Button block type="primary" size="large" htmlType="submit" loading={submitting}>
            保存地址
          </Button>
        </Form>
      </Modal>
    </>
  );
}
