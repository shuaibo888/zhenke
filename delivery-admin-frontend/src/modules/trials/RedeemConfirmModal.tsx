import { Alert, Descriptions, Modal } from 'antd';

export interface RedeemConfirmItem {
  label: string;
  value?: React.ReactNode;
}

export interface RedeemConfirmModalProps {
  open: boolean;
  title: string;
  loading: boolean;
  items: RedeemConfirmItem[];
  warning?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function RedeemConfirmModal({
  open,
  title,
  loading,
  items,
  warning = '请当面核对用户和权益信息。确认后将立即核销，且不可重复使用。',
  onCancel,
  onConfirm,
}: RedeemConfirmModalProps) {
  return (
    <Modal
      open={open}
      title={title}
      okText="确认核销"
      cancelText="取消"
      confirmLoading={loading}
      onCancel={onCancel}
      onOk={onConfirm}
      destroyOnHidden
    >
      <Alert type="warning" showIcon message={warning} style={{ marginBottom: 16 }} />
      <Descriptions bordered size="small" column={1}>
        {items.map((item) => (
          <Descriptions.Item key={item.label} label={item.label}>
            {item.value ?? '-'}
          </Descriptions.Item>
        ))}
      </Descriptions>
    </Modal>
  );
}
