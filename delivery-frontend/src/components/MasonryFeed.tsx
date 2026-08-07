import {
  Children,
  ReactElement,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import styles from '@/styles/commerce.less';

/**
 * 瀑布流容器（小红书式）：卡片高度由整体内容（图片真实宽高比 + 标题换行 + 进度条等）
 * 的**实测渲染高度**决定，左右错落。
 *
 * - 列数随容器宽度变化：<768px 2 列 / 768-1023px 3 列 / >=1024px 4 列。
 * - 短列优先分配：每个下一项放进当前累计高度最短的列（贪心，O(n)）。
 * - 高度不靠图片估算：每张卡片用 ResizeObserver 实测 `offsetHeight`，
 *   标题换行、图片比例变化都会反映到实测高度上，判断高矮才准。
 * - 项 i 的落列只取决于 [0, i) 的高度，所以已加载项不会移动；
 *   后续卡片变高/变矮时，后序项自动重排到真正最短的列。
 */
function columnCountForWidth(width: number): number {
  if (width >= 1024) return 4;
  if (width >= 768) return 3;
  return 2;
}

function argmin(values: number[]): number {
  let min = values[0];
  let index = 0;
  for (let i = 1; i < values.length; i++) {
    if (values[i] < min) {
      min = values[i];
      index = i;
    }
  }
  return index;
}

export function MasonryFeed({
  children,
  gap = 10,
  estimateHeight,
  revision = 0,
}: {
  children: ReactNode[];
  gap?: number;
  estimateHeight?: (key: string | null, colWidth: number) => number;
  revision?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [columnCount, setColumnCount] = useState(2);
  const [colWidth, setColWidth] = useState(0);
  const [columnItems, setColumnItems] = useState<number[][]>([]);

  const keys = useMemo(
    () => Children.toArray(children).map((child) => (child as ReactElement).key as string | null),
    [children],
  );

  // 每张卡片的实测渲染高度（标题换行/图片比例/进度条都体现在 offsetHeight 上）。
  const heightsRef = useRef<Map<string | null, number>>(new Map());
  const [heightsVersion, setHeightsVersion] = useState(0);

  // ref 回调保持稳定：React 只在节点挂载/卸载时调用，避免每次渲染重建 observer。
  // 高度变化时记入 heightsRef 并递增 heightsVersion，触发重排。
  const attachRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const key = el.dataset.key || null;
    const report = () => {
      const height = el.offsetHeight;
      if (height > 0 && heightsRef.current.get(key) !== height) {
        heightsRef.current.set(key, height);
        setHeightsVersion((value) => value + 1);
      }
    };
    const observer = new ResizeObserver(report);
    observer.observe(el);
    report();
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const width = el.clientWidth;
      if (width <= 0) return;
      const count = columnCountForWidth(width);
      setColumnCount((current) => (current !== count ? count : current));
      setColWidth((width - gap * (count - 1)) / count);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
    // 容器在内容出现前为 null，必须依赖 keys.length 才能在首次有卡片时注册测量。
  }, [gap, keys.length]);

  useLayoutEffect(() => {
    const n = keys.length;
    if (n === 0 || colWidth <= 0) {
      setColumnItems([]);
      return;
    }

    // 短列优先贪心：每张卡片放进当前累计高度最短的列，高度用实测值，
    // 未测到的（首帧）才回退到 estimateHeight 估算。
    const colTotals = new Array<number>(columnCount).fill(0);
    const cols = new Array<number>(n);
    for (let i = 0; i < n; i++) {
      const height = heightsRef.current.get(keys[i]) ?? estimateHeight?.(keys[i], colWidth) ?? colWidth + 112;
      const column = argmin(colTotals);
      cols[i] = column;
      colTotals[column] += height + gap;
    }

    const built: number[][] = Array.from({ length: columnCount }, () => []);
    cols.forEach((column, i) => {
      if (column >= 0 && column < columnCount) built[column].push(i);
    });
    setColumnItems(built);
  }, [keys, columnCount, colWidth, gap, estimateHeight, heightsVersion, revision]);

  if (keys.length === 0) return null;

  const nodes = Children.toArray(children);

  return (
    <div ref={containerRef} className={styles.masonryFeed}>
      <div
        className={styles.masonryColumns}
        style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`, gap }}
      >
        {columnItems.map((indices, columnIndex) => (
          <div key={columnIndex} className={styles.masonryColumn} style={{ gap }}>
            {indices.map((itemIndex) => (
              <div
                key={itemIndex}
                data-key={keys[itemIndex] ?? ''}
                className={styles.masonryItem}
                ref={attachRef}
              >
                {nodes[itemIndex]}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
