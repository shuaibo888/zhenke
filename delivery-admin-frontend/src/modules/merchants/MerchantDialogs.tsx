import { Button, Form, Image, Input, Modal, Select, Tag } from 'antd';
import type { FormInstance } from 'antd';
import type { MerchantAccount } from '@/types';
import { mediaPreviewUrl } from '@/utils/media';
import styles from '@/pages/index.less';

export interface MerchantFormValues {
  decision: 'APPROVED' | 'REJECTED';
  auditRemark?: string;
}

export interface MerchantAuditDialogProps {
  auditOpen: boolean;
  auditDecision?: MerchantFormValues['decision'];
  auditForm: FormInstance<MerchantFormValues>;
  onAuditClose: () => void;
  onAuditSubmit: (values: MerchantFormValues) => void;
}

export interface MerchantDetailDialogProps {
  detailMerchant: MerchantAccount | null;
  onDetailClose: () => void;
}

const responsiveModalProps = { rootClassName: styles.responsiveModal } as const;

export function MerchantAuditDialog(props: MerchantAuditDialogProps) {
  return (
    <Modal
      {...responsiveModalProps}
      title="商家入驻审核"
      open={props.auditOpen}
      onCancel={props.onAuditClose}
      footer={null}
      width={520}
      destroyOnHidden
    >
        <Form form={props.auditForm} layout="vertical" onFinish={props.onAuditSubmit}>
          <Form.Item name="decision" label="审核结论" rules={[{ required: true, message: '请选择审核结论' }]}>
            <Select
              size="large"
              options={[
                { value: 'APPROVED', label: '审核通过' },
                { value: 'REJECTED', label: '审核驳回' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="auditRemark"
            label="审核意见"
            rules={props.auditDecision === 'REJECTED'
              ? [{ required: true, message: '驳回时必须填写原因' }]
              : undefined}
          >
            <Input.TextArea rows={4} maxLength={500} showCount placeholder="填写审核说明或驳回原因" />
          </Form.Item>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 8 }}>
            <Button onClick={props.onAuditClose}>取消</Button>
            <Button type="primary" htmlType="submit">确认审核</Button>
          </div>
        </Form>
    </Modal>
  );
}

export function MerchantDetailDialog(props: MerchantDetailDialogProps) {
  return (
    <Modal
      {...responsiveModalProps}
      title={`${props.detailMerchant?.name} - 入驻材料`}
      open={!!props.detailMerchant}
      onCancel={props.onDetailClose}
      footer={null}
      width={600}
      destroyOnHidden
    >
        {props.detailMerchant && (
          <div className={styles.merchantDetail}>
            <div className={styles.detailSection}>
              <h4>基本信息</h4>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>店铺名称</span>
                <span>{props.detailMerchant.name}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>营业执照主体名称</span>
                <span>{props.detailMerchant.companyName ?? '-'}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>负责人</span>
                <span>{props.detailMerchant.ownerName}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>手机号</span>
                <span>{props.detailMerchant.phone}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>实体店地址（营业执照地址）</span>
                <span>{props.detailMerchant.companyAddress ?? '-'}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>统一社会信用代码</span>
                <span>{props.detailMerchant.companyCreditCode ?? '-'}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>法定代表人</span>
                <span>{props.detailMerchant.legalPerson ?? '-'}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>入驻时间</span>
                <span>{props.detailMerchant.registeredAt || '-'}</span>
              </div>
            </div>

            <div className={styles.detailSection}>
              <h4>自证材料</h4>
              {props.detailMerchant.businessLicense && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>营业执照</span>
                  <Image src={mediaPreviewUrl(props.detailMerchant.businessLicense)} alt="营业执照" className={styles.licenseImage} />
                </div>
              )}
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>营业执照核验</span>
                <Tag color={props.detailMerchant.licenseVerified ? 'green' : 'default'}>
                  {props.detailMerchant.licenseVerified ? '已核验' : '未核验'}
                </Tag>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>产品介绍</span>
                <p className={styles.detailText}>{props.detailMerchant.productIntro ?? '-'}</p>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>产地溯源</span>
                <p className={styles.detailText}>{props.detailMerchant.originTraceability ?? '-'}</p>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>实体门店证明（{props.detailMerchant.storeProofMedia?.length ?? 0}/9）</span>
                {props.detailMerchant.storeProofMedia?.length ? (
                  <div className={styles.merchantProofGrid}>
                    {props.detailMerchant.storeProofMedia.map((item, index) => (
                      <div className={styles.merchantProofItem} key={item.mediaId ?? `${item.mediaUrl}-${index}`}>
                        {item.mediaType === 'IMAGE' ? (
                          <Image src={mediaPreviewUrl(item.mediaUrl)} alt={`实体门店证明照片${index + 1}`} />
                        ) : (
                          <video src={mediaPreviewUrl(item.mediaUrl)} controls preload="metadata" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.detailText}>当前商家无实体门店证明材料</p>
                )}
              </div>
            </div>

            <div className={styles.detailSection}>
              <h4>入驻门槛承诺</h4>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>承诺发起验证招募</span>
                <Tag color={props.detailMerchant.acceptsVerificationRecruitment ? 'green' : 'default'}>
                  {props.detailMerchant.acceptsVerificationRecruitment ? '已承诺' : '未承诺'}
                </Tag>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>参与公益合作</span>
                <Tag color={props.detailMerchant.acceptsPublicWelfare ? 'green' : 'default'}>
                  {props.detailMerchant.acceptsPublicWelfare ? '已接受' : '未接受'}
                </Tag>
              </div>
            </div>

            <div className={styles.detailSection}>
              <h4>审核记录</h4>
              {props.detailMerchant.auditLogs?.length
                ? props.detailMerchant.auditLogs.map((log) => (
                    <div className={styles.detailRow} key={log.logId}>
                      <span className={styles.detailLabel}>
                        {({
                          SUBMIT: '提交申请',
                          RESUBMIT: '重新提交',
                          APPROVE: '审核通过',
                          REJECT: '审核驳回',
                          ENABLE: '启用商家',
                          DISABLE: '停用商家',
                        } as const)[log.action]}
                      </span>
                      <span>{log.operatorName} · {log.createTime ?? '-'} · {log.auditRemark || '无备注'}</span>
                    </div>
                  ))
                : <p className={styles.detailText}>暂无审核记录</p>}
            </div>
          </div>
        )}
    </Modal>
  );
}
