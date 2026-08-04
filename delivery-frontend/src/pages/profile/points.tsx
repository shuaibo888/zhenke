import { HistoryOutlined, MinusOutlined, PlusOutlined, TrophyOutlined } from '@ant-design/icons';
import { Pagination, Spin, message } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'umi';
import { useShop } from '@/app/ShopContext';
import { ProfileBackButton } from '@/components/ProfileBackButton';
import { useRefreshOnRoute } from '@/hooks/useRefreshOnRoute';
import { fetchMyPointRecords, type ShopPointRecord } from '@/services/shopAuth';
import styles from '@/styles/commerce.less';

const PAGE_SIZE = 20;

function formatDate(value: string) {
  return value?.replace('T', ' ').slice(0, 16);
}

export default function PointsPage() {
  const navigate = useNavigate();
  const { user, points, pointsLoading, refreshPoints } = useShop();
  const [records, setRecords] = useState<ShopPointRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [pageNum, setPageNum] = useState(1);
  const [total, setTotal] = useState(0);
  const requestVersion = useRef(0);

  const loadRecords = useCallback(async (nextPage = 1) => {
    const version = ++requestVersion.current;
    setRecordsLoading(true);
    try {
      const result = await fetchMyPointRecords(nextPage, PAGE_SIZE);
      if (requestVersion.current !== version) return;
      setRecords(result.rows);
      setTotal(result.total);
      setPageNum(nextPage);
    } finally {
      if (requestVersion.current === version) setRecordsLoading(false);
    }
  }, []);

  useEffect(() => () => {
    requestVersion.current += 1;
  }, []);

  const refreshPage = useCallback(async () => {
    await Promise.all([refreshPoints(), loadRecords(1)]);
  }, [loadRecords, refreshPoints]);

  useRefreshOnRoute('/profile/points', refreshPage, '积分记录刷新失败');

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const changePage = (nextPage: number) => {
    void loadRecords(nextPage).catch((error) => {
      message.error(error instanceof Error ? error.message : '积分记录加载失败');
    });
  };

  return (
    <main className={`${styles.profileDetailPage} ${styles.pointsPage}`}>
      <div className={styles.profileDetailToolbar}>
        <ProfileBackButton onClick={() => navigate('/profile')} />
      </div>

      <section className={styles.pointBalancePanel}>
        <span className={styles.pointBalanceIcon}><TrophyOutlined /></span>
        <div className={styles.pointCurrentBalance}>
          <span>当前积分</span>
          <strong>{pointsLoading ? '--' : points.balance}</strong>
          <small>可用积分余额</small>
        </div>
        <div className={styles.pointSummaryStats}>
          <div>
            <span>累计划入</span>
            <strong>{pointsLoading ? '--' : points.totalTransferredIn}</strong>
          </div>
          <div>
            <span>累计消费</span>
            <strong>{pointsLoading ? '--' : points.totalConsumed}</strong>
          </div>
        </div>
      </section>

      <section className={styles.orderPanel}>
        <div className={styles.orderPanelHeading}>
          <div>
            <span className={styles.eyebrow}>积分明细</span>
            <h3>积分变更记录</h3>
          </div>
          <span>共 {total} 条</span>
        </div>

        <Spin spinning={recordsLoading}>
          <div className={styles.pointRecordList}>
            {records.map((record) => {
              const increased = record.changeAmount > 0;
              return (
                <article className={styles.pointRecordItem} key={record.pointRecordId}>
                  <span className={`${styles.pointRecordIcon} ${increased ? styles.pointRecordIncrease : styles.pointRecordDecrease}`}>
                    {increased ? <PlusOutlined /> : <MinusOutlined />}
                  </span>
                  <div className={styles.pointRecordCopy}>
                    <strong>{record.changeReason}</strong>
                    <small>{formatDate(record.createTime)}</small>
                  </div>
                  <div className={styles.pointRecordAmount}>
                    <strong className={increased ? styles.pointAmountIncrease : styles.pointAmountDecrease}>
                      {increased ? '+' : ''}{record.changeAmount}
                    </strong>
                    <small>余额 {record.balanceAfter}</small>
                  </div>
                </article>
              );
            })}
          </div>

          {!recordsLoading && records.length === 0 && (
            <div className={styles.pointRecordEmpty}>
              <HistoryOutlined />
              <strong>暂无积分变更记录</strong>
              <p>后续产生积分增加或减少时，会在这里显示原因和变更后余额。</p>
            </div>
          )}
        </Spin>

        {total > PAGE_SIZE && (
          <Pagination
            className={styles.pointRecordPagination}
            current={pageNum}
            pageSize={PAGE_SIZE}
            total={total}
            showSizeChanger={false}
            onChange={changePage}
          />
        )}
      </section>
    </main>
  );
}
