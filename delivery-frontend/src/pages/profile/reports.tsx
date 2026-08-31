import { LikeOutlined, RightOutlined } from '@ant-design/icons';
import { Spin, Tag } from 'antd';
import { useNavigate } from 'umi';
import { useShop } from '@/app/ShopContext';
import { LoginRedirect } from '@/components/LoginRedirect';
import { ZkProfilePage, ZkProfilePanel, ZkTaskHeader } from '@/components/ZkPage';
import { useRefreshOnRoute } from '@/hooks/useRefreshOnRoute';
import { getReportType } from '@/utils/shop';
import styles from '@/styles/commerce.less';

export default function MyReportsPage() {
  const navigate = useNavigate();
  const { user, reports, reportsLoading, refreshReports } = useShop();
  useRefreshOnRoute('/profile/reports', refreshReports, '甄客验记录刷新失败');
  if (!user) {
    return <LoginRedirect />;
  }
  return (
    <ZkProfilePage className={styles.profileReportsPage}>
      <ZkTaskHeader
        eyebrow="内容创作"
        title="我的甄客验"
        description="查看基于订单、试用或核销资格发布的真实体验。"
        backTo="/profile"
      />
      <ZkProfilePanel title="已发布内容" meta={`共 ${reports.length} 篇`}>
        <Spin spinning={reportsLoading}>
          <div className={styles.reportList}>
            {reports.map((report) => {
              const type = getReportType(report);
              const image = report.resources?.find((item) => item.resourceType === 'IMAGE')?.resourceUrl
                || report.productCoverUrl;
              return (
                <button
                  type="button"
                  className={styles.reportListCard}
                  key={report.reportId}
                  onClick={() => navigate(`/reports/${report.reportId}`)}
                >
                  <img className={styles.reportListThumb} src={image} alt={report.productName} />
                  <div className={styles.reportListBody}>
                    <p className={styles.reportListTitle}>{report.title || report.productName}</p>
                    <p className={styles.reportListExcerpt}>{report.productName}</p>
                    <div className={styles.reportListMeta}>
                      <Tag color={type.color}>{type.label}</Tag>
                      <span className={styles.reportListUseful}><LikeOutlined /> {report.usefulCount}</span>
                    </div>
                  </div>
                  <span className={styles.profileReportHint}><RightOutlined /></span>
                </button>
              );
            })}
          </div>
          {!reportsLoading && reports.length === 0 && (
            <div className={styles.profileListEmpty}>
              <strong>还没有发布甄客验</strong>
              <p>完成订单、试用或到店核销后，可从对应记录进入发布。</p>
            </div>
          )}
        </Spin>
      </ZkProfilePanel>
    </ZkProfilePage>
  );
}
