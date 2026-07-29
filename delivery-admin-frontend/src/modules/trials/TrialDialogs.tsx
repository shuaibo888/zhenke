import { Button, Checkbox, DatePicker, Form, Input, InputNumber, Modal, Select, Space } from 'antd';
import type { FormInstance } from 'antd';
import type { ManagedProduct, ManagedTrialApplication } from '@/types';
import styles from '@/pages/index.less';

export interface TrialFormValues {
  productId: number;
  trialTypes: Array<'ONLINE' | 'OFFLINE'>;
  campaignTitle: string;
  campaignSummary: string;
  targetCount: number;
  deadline: { format: (pattern: string) => string };
}

export interface TrialApplicationActionFormValues {
  auditRemark?: string;
  trackingNo?: string;
}

export interface TrialDialogsProps {
  trialModalOpen: boolean;
  trialForm: FormInstance<TrialFormValues>;
  trialProductOptions: ManagedProduct[];
  selectedTrialAvailableTypes: Array<'ONLINE' | 'OFFLINE'>;
  selectedTrialProductId?: number;
  trialSaving: boolean;
  applicationAction: 'reject' | 'ship' | null;
  selectedApplication: ManagedTrialApplication | null;
  applicationActionForm: FormInstance<TrialApplicationActionFormValues>;
  onTrialClose: () => void;
  onTrialSubmit: (values: TrialFormValues) => void;
  onProductSearch: (keyword: string) => void;
  onProductChange: (productId: number) => void;
  onApplicationActionClose: () => void;
  onApplicationActionSubmit: (values: TrialApplicationActionFormValues) => void;
}

const responsiveModalProps = { rootClassName: styles.responsiveModal } as const;

export default function TrialDialogs(props: TrialDialogsProps) {
  return (
    <>
      <Modal
        {...responsiveModalProps}
        title="发布试用招募"
        open={props.trialModalOpen}
        onCancel={props.onTrialClose}
        footer={null}
        width={520}
        destroyOnClose
      >
        <Form form={props.trialForm} layout="vertical" onFinish={props.onTrialSubmit}>
          <Form.Item name="productId" label="选择商品" rules={[{ required: true, message: '请选择商品' }]}>
            <Select
              placeholder="请选择要发布试用的商品"
              size="large"
              showSearch
              filterOption={false}
              onSearch={props.onProductSearch}
              onChange={props.onProductChange}
            >
              {props.trialProductOptions.map((product) => (
                <Select.Option key={product.id} value={product.id}>
                  {product.title}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="trialTypes"
            label="试用方式"
            initialValue={['ONLINE']}
            rules={[{ required: true, message: '请至少选择一种试用方式' }]}
          >
            <Checkbox.Group
              options={[
                {
                  label: '线上试用（审核通过 → 发货 → 收货 → 发布甄客验）',
                  value: 'ONLINE',
                  disabled: !props.selectedTrialAvailableTypes.includes('ONLINE'),
                },
                {
                  label: '线下试用（审核通过 → 发布甄客验）',
                  value: 'OFFLINE',
                  disabled: !props.selectedTrialAvailableTypes.includes('OFFLINE'),
                },
              ]}
            />
          </Form.Item>
          {props.selectedTrialProductId && props.selectedTrialAvailableTypes.length < 2 && (
            <p className={styles.subText}>
              已有正在招募且未满的类型已被禁用；提前终止或名额招满后即可发布下一轮。
            </p>
          )}
          <Form.Item name="campaignTitle" label="招募标题" rules={[{ required: true, message: '请输入招募标题' }, { max: 120 }]}>
            <Input size="large" placeholder="请输入招募标题" />
          </Form.Item>
          <Form.Item name="campaignSummary" label="招募说明" rules={[{ required: true, message: '请输入招募说明' }, { max: 500 }]}>
            <Input.TextArea rows={4} showCount maxLength={500} placeholder="说明申请方式和报告发布规则" />
          </Form.Item>
          <Form.Item name="targetCount" label="招募人数" rules={[{ required: true, message: '请输入招募人数' }]}>
            <InputNumber min={1} max={100} size="large" style={{ width: '100%' }} placeholder="请输入招募人数" />
          </Form.Item>
          <Form.Item
            name="deadline"
            label="截止日期"
            extra="截止日期当天仍可申请，次日凌晨自动结束招募。"
            rules={[{ required: true, message: '请选择截止日期' }]}
          >
            <DatePicker
              size="large"
              format="YYYY-MM-DD"
              placeholder="请选择截止日期"
              allowClear={false}
              inputReadOnly
              disabledDate={(current) => current.startOf('day').valueOf() < new Date().setHours(0, 0, 0, 0)}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 8 }}>
            <Button onClick={props.onTrialClose}>取消</Button>
            <Button loading={props.trialSaving} type="primary" htmlType="submit">发布</Button>
          </div>
        </Form>
      </Modal>

      <Modal
        {...responsiveModalProps}
        title={props.applicationAction === 'ship' ? '填写线上试用物流' : '驳回试用申请'}
        open={Boolean(props.applicationAction && props.selectedApplication)}
        onCancel={props.onApplicationActionClose}
        footer={null}
        destroyOnHidden
      >
        <Form
          form={props.applicationActionForm}
          layout="vertical"
          onFinish={props.onApplicationActionSubmit}
        >
          {props.applicationAction === 'reject' ? (
            <Form.Item name="auditRemark" label="驳回原因" rules={[{ required: true, message: '请输入驳回原因' }, { max: 500 }]}>
              <Input.TextArea rows={4} showCount maxLength={500} />
            </Form.Item>
          ) : (
            <Form.Item name="trackingNo" label="物流单号" rules={[{ required: true, message: '请输入物流单号' }, { max: 100 }]}>
              <Input placeholder="只需填写物流单号，系统会自动识别快递公司" />
            </Form.Item>
          )}
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={props.onApplicationActionClose}>取消</Button>
            <Button type="primary" htmlType="submit">确认</Button>
          </Space>
        </Form>
      </Modal>
    </>
  );
}
