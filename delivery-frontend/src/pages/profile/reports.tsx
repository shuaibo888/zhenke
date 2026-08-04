import { LikeOutlined, RightOutlined } from '@ant-design/icons';
import { Spin, Tag } from 'antd';
import { Navigate, useNavigate } from 'umi';
import { useShop } from '@/app/ShopContext';
import { ProfileBackButton } from '@/components/ProfileBackButton';
import { useRefreshOnRoute } from '@/hooks/useRefreshOnRoute';
import { getReportType } from '@/utils/shop';
import styles from '@/styles/commerce.less';

export default function MyReportsPage() {
  const navigate = useNavigate();
  const { user, reports, reportsLoading, refreshReports } = useShop();
  useRefreshOnRoute('/profile/reports', refreshReports, '甄客验记录刷新失败');
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  return (
    <main className={`${styles.profileDetailPage} ${styles.profileReportsPage}`}>
      <div className={styles.profileDetailToolbar}>
        <ProfileBackButton onClick={() => navigate('/profile')} />
        <span>查看我发布的真实体验内容</span>
      </div>
      <section className={styles.orderPanel}>
        <div className={styles.orderPanelHeading}>
          <div>
            <span className={styles.eyebrow}>甄客验记录</span>
            <h3>我的甄客验</h3>
          </div>
          <span>共 {reports.length} 篇</span>
        </div>
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
          {!reportsLoading && reports.length === 0 && <p className={styles.empty}>还没有发布甄客验。</p>}
        </Spin>
      </section>
    </main>
  );
}
