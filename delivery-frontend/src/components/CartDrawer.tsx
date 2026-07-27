import { DeleteOutlined, MinusOutlined, PlusOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { Button, Drawer, Modal, Spin, message } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'umi';
import { useShop } from '@/app/ShopContext';
import { formatPrice, getCartCount, getCartTotal } from '@/utils/shop';
import { AddressManager } from './AddressManager';
import styles from '@/styles/commerce.less';

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const {
    user,
    cart,
    cartLoading,
    addresses,
    changeCartQuantity,
    removeCartItem,
    checkoutCart,
  } = useShop();
  const [mutatingId, setMutatingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const count = getCartCount(cart);
  const total = getCartTotal(cart);

  const checkout = async () => {
    if (!user) {
      onClose();
      navigate('/auth');
      return;
    }
    const address = addresses.find((item) => item.isDefault) ?? addresses[0];
    if (!address) {
      setAddressOpen(true);
      message.info('请先添加收货地址');
      return;
    }
    Modal.confirm({
      title: '确认结算',
      content: `使用 ${address.recipient} 的地址结算 ${count} 件商品？`,
      okText: '提交订单',
      cancelText: '再看看',
      onOk: async () => {
        setSubmitting(true);
        try {
          await checkoutCart(address.id);
          onClose();
          message.success('订单已创建，请在付款期限内完成支付');
          navigate('/profile/orders');
        } catch (error) {
          message.error(error instanceof Error ? error.message : '购物车结算失败');
        } finally {
          setSubmitting(false);
        }
      },
    });
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
              disabled={cart.length === 0}
              loading={submitting}
              onClick={() => void checkout()}
            >
              结算 {count} 件
            </Button>
          </div>
        )}
      >
        {cartLoading ? (
          <div className={styles.emptyCart}><Spin /></div>
        ) : cart.length === 0 ? (
          <div className={styles.emptyCart}>
            <ShoppingCartOutlined />
            <strong>购物车还是空的</strong>
            <p>看到合适的好物，先加入购物车慢慢比较。</p>
          </div>
        ) : (
          <div className={styles.cartList}>
            {cart.map((item) => (
              <article className={styles.cartItem} key={item.cartItemId}>
                <div className={styles.cartItemImage} style={{ backgroundImage: `url("${item.coverUrl}")` }} />
                <div className={styles.cartItemBody}>
                  <div className={styles.cartItemTitle}>
                    <strong>{item.productName}</strong>
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
        )}
      </Drawer>
      <AddressManager open={addressOpen} onClose={() => setAddressOpen(false)} />
    </>
  );
}
