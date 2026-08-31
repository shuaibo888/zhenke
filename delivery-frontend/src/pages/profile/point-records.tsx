import { MinusOutlined, PlusOutlined } from '@ant-design/icons';
import { Pagination, Spin, message } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LoginRedirect } from '@/components/LoginRedirect';
import { useShop } from '@/app/ShopContext';
import { ZkProfilePage, ZkProfilePanel, ZkTaskHeader } from '@/components/ZkPage';
import { useRefreshOnRoute } from '@/hooks/useRefreshOnRoute';
import { fetchMyPointRecords, type ShopPointRecord } from '@/services/shopAuth';
import styles from '@/styles/commerce.less';

const PAGE_SIZE = 20;

export default function PointRecordsPage() {
  const { user } = useShop();
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

  const refreshRecords = useCallback(() => loadRecords(1), [loadRecords]);

  useEffect(() => () => {
    requestVersion.current += 1;
  }, []);

  useRefreshOnRoute('/profile/point-records', refreshRecords, '积分记录刷新失败');

  if (!user) {
    return <LoginRedirect />;
  }

  const changePage = (nextPage: number) => {
    void loadRecords(nextPage).catch((error) => {
      message.error(error instanceof Error ? error.message : '积分记录加载失败');
    });
  };

  return (
    <ZkProfilePage className={styles.pointsPage}>
      <ZkTaskHeader
        eyebrow="权益资产"
        title="积分明细"
        description="查看积分获取与使用记录。"
        backTo="/profile/points"
      />
      <ZkProfilePanel title="积分变更记录" meta={`共 ${total} 条`}>
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
                    <small>
                      {record.sourceName ? `${record.sourceName} · ` : ''}{record.createTime}
                    </small>
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
      </ZkProfilePanel>
    </ZkProfilePage>
  );
}
