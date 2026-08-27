import { DeleteOutlined, MinusOutlined, PlusOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { Alert, Button, Drawer, Spin, Tag, message } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'umi';
import { useShop } from '@/app/ShopContext';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { buildLoginPath } from '@/utils/safeRedirect';
import { formatPrice, getCartCount, getCartTotal } from '@/utils/shop';
import styles from '@/styles/commerce.less';

const localLifeCategoryCodes = new Set(['ZHENKE_HOTEL', 'ZHENKE_RESTAURANT', 'ZHENKE_SCENIC']);

function cartItemUsesOffline(item: { categoryCode: string; supportsOnline: '0' | '1'; supportsOffline: '0' | '1' }) {
  return localLifeCategoryCodes.has(item.categoryCode)
    || (item.supportsOnline === '0' && item.supportsOffline === '1');
}

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const {
    user,
    cart,
    cartLoading,
    refreshCart,
    changeCartQuantity,
    removeCartItem,
  } = useShop();
  const [mutatingId, setMutatingId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState('');
  useBodyScrollLock(open);

  const loadCart = useCallback(async () => {
    setLoadError('');
    try {
      await refreshCart();
    } catch (error) {
      const reason = error instanceof Error ? error.message : '购物车刷新失败';
      setLoadError(reason);
      message.error(reason);
    }
  }, [refreshCart]);

  useEffect(() => {
    if (!open || !user) return;
    void loadCart();
  }, [loadCart, open, user]);
  const count = getCartCount(cart);
  const total = getCartTotal(cart);
  const hasUnavailableItems = cart.some((item) => (
    item.productStatus !== 'ON_SALE' || item.stock < item.quantity
  ));

  const checkout = () => {
    if (!user) {
      onClose();
      navigate(buildLoginPath('/checkout?source=cart'));
      return;
    }
    if (hasUnavailableItems) {
      message.warning('购物车包含已下架或库存不足的商品，请先移除或调整数量');
      return;
    }
    const merchantCount = new Set(cart.map((item) => item.merchantId)).size;
    const fulfillmentCount = new Set(cart.map((item) => (
      cartItemUsesOffline(item) ? 'OFFLINE' : 'ONLINE'
    ))).size;
    if (merchantCount > 1 || fulfillmentCount > 1) {
      message.info('系统将按商家和履约方式拆单；优惠券仅支持单一结算分组使用');
    }
    onClose();
    navigate('/checkout?source=cart');
  };

  const changeQuantity = async (cartItemId: number, quantity: number) => {
    setMutatingId(cartItemId);
    try {
      await changeCartQuantity(cartItemId, quantity);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '购物车更新失败');
    } finally {
      setMutatingId(null);
    }
  };

  const remove = async (cartItemId: number) => {
    setMutatingId(cartItemId);
    try {
      await removeCartItem(cartItemId);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '商品移除失败');
    } finally {
      setMutatingId(null);
    }
  };

  return (
    <>
      <Drawer
        title="购物车"
        open={open}
        onClose={onClose}
        size={420}
        className={styles.cartDrawer}
        rootClassName={styles.responsiveDrawer}
        footer={(
          <div className={styles.cartFooter}>
            <div className={styles.cartSummary}>
              <span>合计</span>
              <strong>{formatPrice(total)}</strong>
            </div>
            <Button
              className={styles.checkoutButton}
              type="primary"
              size="large"
              disabled={Boolean(loadError) || cart.length === 0 || hasUnavailableItems}
              onClick={checkout}
            >
              结算 {count} 件
            </Button>
          </div>
        )}
      >
        {cartLoading ? (
          <div className={styles.emptyCart}><Spin /></div>
        ) : (
          <>
            {loadError && (
              <Alert
                type="error"
                showIcon
                message="购物车暂时无法加载"
                description={loadError}
                action={<Button size="small" danger onClick={() => void loadCart()}>重新加载</Button>}
                style={{ marginBottom: 16 }}
              />
            )}
            {!loadError && cart.length === 0 ? (
              <div className={styles.emptyCart}>
                <ShoppingCartOutlined />
                <strong>购物车还是空的</strong>
                <p>看到合适的好物，先加入购物车慢慢比较。</p>
              </div>
            ) : cart.length > 0 ? (
              <div className={styles.cartList}>
                {cart.map((item) => (
                  <article className={styles.cartItem} key={item.cartItemId}>
                    <div className={styles.cartItemImage} style={{ backgroundImage: `url("${item.coverUrl}")` }} />
                    <div className={styles.cartItemBody}>
                      <div className={styles.cartItemTitle}>
                        <span>
                          <strong>{item.productName}</strong>
                          {cartItemUsesOffline(item) && <Tag color="volcano">到店核销</Tag>}
                          {item.productStatus !== 'ON_SALE' && <Tag>已下架</Tag>}
                          {item.productStatus === 'ON_SALE' && item.stock < item.quantity && <Tag color="error">库存不足</Tag>}
                        </span>
                        <Button
                          size="small"
                          type="text"
                          icon={<DeleteOutlined />}
                          loading={mutatingId === item.cartItemId}
                          onClick={() => void remove(item.cartItemId)}
                        />
                      </div>
                      <span>{formatPrice(item.price)}</span>
                      <div className={styles.quantityRow}>
                        <Button
                          size="small"
                          icon={<MinusOutlined />}
                          disabled={mutatingId === item.cartItemId}
                          onClick={() => void changeQuantity(item.cartItemId, item.quantity - 1)}
                        />
                        <b>{item.quantity}</b>
                        <Button
                          size="small"
                          icon={<PlusOutlined />}
                          disabled={mutatingId === item.cartItemId || item.quantity >= item.stock}
                          onClick={() => void changeQuantity(item.cartItemId, item.quantity + 1)}
                        />
                        <em>{formatPrice(item.price * item.quantity)}</em>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </>
        )}
      </Drawer>
    </>
  );
}
