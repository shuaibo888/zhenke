import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const pageSource = readFileSync(new URL('./index.tsx', import.meta.url), 'utf8');
const authServiceSource = readFileSync(new URL('../services/shopAuth.ts', import.meta.url), 'utf8');
const contentServiceSource = readFileSync(new URL('../services/shopContent.ts', import.meta.url), 'utf8');

test('cart and first-stage orders use authenticated server APIs', () => {
  assert.match(contentServiceSource, /\/shop\/users\/me\/cart/);
  assert.match(contentServiceSource, /\/shop\/orders\/from-cart/);
  assert.match(contentServiceSource, /\/shop\/orders\/\$\{orderId\}\/cancel/);
  assert.match(pageSource, /Promise\.all\(\[fetchShopCart\(\), fetchShopOrders\(\)\]\)/);
  assert.match(pageSource, /checkoutShopCart\(defaultShippingAddress\.id\)/);
  assert.match(pageSource, /createShopOrders\(/);
  assert.doesNotMatch(pageSource, /orders as seedOrders/);
  assert.doesNotMatch(pageSource, /createOrdersFromCart\(/);
});

test('second-stage orders use backend payment, logistics, and receipt APIs', () => {
  assert.match(contentServiceSource, /\/shop\/orders\/\$\{orderId\}\/pay/);
  assert.match(contentServiceSource, /\/shop\/orders\/\$\{orderId\}\/received/);
  assert.match(pageSource, /payShopOrder\(payOrder\.id\)/);
  assert.match(pageSource, /confirmShopOrderReceived\(order\.id\)/);
  assert.match(pageSource, /模拟支付成功/);
  assert.doesNotMatch(pageSource, /advanceOrderStatus/);
});

test('home feed separates online and offline trial recruitment through the backend query', () => {
  assert.match(pageSource, /type HomeFeedFilter = 'ALL' \| 'ONLINE' \| 'OFFLINE' \| 'REPORT';/);
  assert.match(pageSource, /\{ label: '线上试用', value: 'ONLINE' \}/);
  assert.match(pageSource, /\{ label: '线下试用', value: 'OFFLINE' \}/);
  assert.match(pageSource, /fetchHomeFeed\(categoryCode, contentType, trialType\)/);
  assert.match(contentServiceSource, /if \(trialType !== 'ALL'\) params\.set\('trialType', trialType\)/);
  assert.doesNotMatch(pageSource, /\{ label: '试用招募', value: 'TRIAL' \}/);
});

test('merchant application is available on the public home page without a shop-user session', () => {
  assert.match(pageSource, /onClick=\{openMerchantApplication\}/);
  assert.match(pageSource, /商家后台账号/);
  assert.match(pageSource, /renderAuth\(\)[\s\S]*renderMerchantModal\(\)/);
  assert.doesNotMatch(pageSource, /请先登录商城账号/);
  assert.match(authServiceSource, /\/shop\/merchants\/apply/);
  assert.match(authServiceSource, /\/shop\/merchants\/status/);
  assert.doesNotMatch(authServiceSource, /\/shop\/merchants\/me/);
});

test('login waits for a confirmed captcha state and exposes retry on load failure', () => {
  assert.match(pageSource, /captchaReady/);
  assert.match(pageSource, /captchaLoading/);
  assert.match(pageSource, /captchaLoadError/);
  assert.match(pageSource, /验证码尚未准备好，请重新获取后再登录/);
  assert.match(pageSource, /重新获取/);
  assert.match(pageSource, /验证码尚未准备好，请重新获取后再提交/);
  assert.doesNotMatch(pageSource, /\.catch\(\(\) => undefined\)/);
  assert.doesNotMatch(pageSource, /onClick=\{loadCaptcha\}/);
  assert.match(pageSource, /onClick=\{\(\) => void loadCaptcha\(\)\}/);
});

test('merchant commitment switches are direct Form.Item controls', () => {
  assert.match(pageSource, /name="acceptsVerificationRecruitment"[\s\S]*?extra="我承诺发起验证招募（不验证不上架）"[\s\S]*?>\s*<Switch/);
  assert.match(pageSource, /name="acceptsPublicWelfare"[\s\S]*?extra="我接受公益分成"[\s\S]*?>\s*<Switch/);
  assert.match(pageSource, /name="agreeProtocol"[\s\S]*?extra="我已阅读并同意《商家入驻协议》[^\"]*"[\s\S]*?>\s*<Switch/);
  assert.doesNotMatch(pageSource, /<Switch[^>]*\/>\s*<span className=\{styles\.switchLabel\}>/);
});

test('primary navigation only exposes reviews and profile', () => {
  assert.match(pageSource, /type TabKey = 'reviews' \| 'profile';/);
  assert.match(pageSource, /\{ key: 'reviews', label: '甄客验'/);
  assert.match(pageSource, /\{ key: 'profile', label: '我的'/);
  assert.doesNotMatch(pageSource, /\{ key: 'goods', label: '好物'/);
  assert.doesNotMatch(pageSource, /\{ key: 'verify', label: '真实验'/);
  assert.doesNotMatch(pageSource, /\{ key: 'notifications', label: '消息'/);
  assert.match(pageSource, /useState<TabKey>\('reviews'\)/);
  assert.match(pageSource, /setActiveTab\('reviews'\)/);
  assert.match(pageSource, /activeTab === 'reviews' && journeyView === 'feed' && renderReviews\(\)/);
});

test('profile hides simulated earnings and message modules', () => {
  const profileStart = pageSource.indexOf('const renderProfile = () =>');
  const profileEnd = pageSource.indexOf('if (!activeUser)', profileStart);
  const profileBlock = pageSource.slice(profileStart, profileEnd);

  assert.notEqual(profileStart, -1);
  assert.doesNotMatch(profileBlock, /profileView === 'earnings'/);
  assert.doesNotMatch(profileBlock, /profileView === 'messages'/);
  assert.doesNotMatch(profileBlock, /<h3>我的收益<\/h3>/);
  assert.doesNotMatch(profileBlock, /<h3>消息<\/h3>/);
});

test('orders expose the real refund flow for paid, shipped, and received states', () => {
  assert.match(contentServiceSource, /\/shop\/orders\/\$\{orderId\}\/refund/);
  assert.match(pageSource, /requestShopOrderRefund\(refundOrder\.id, reason\)/);
  assert.match(pageSource, /订单已发货，请先确认收货后再申请退款/);
  assert.match(pageSource, /退款申请已提交，等待商家审核/);
  assert.match(pageSource, /退款审核中/);
});

test('profile uses a menu layer before rendering each detail section', () => {
  const profileStart = pageSource.indexOf('const renderProfile = () =>');
  const profileEnd = pageSource.indexOf('if (!activeUser)', profileStart);
  const profileBlock = pageSource.slice(profileStart, profileEnd);

  assert.match(pageSource, /type ProfileView = 'menu' \| 'orders' \| 'trials' \| 'reports';/);
  assert.match(pageSource, /useState<ProfileView>\('menu'\)/);
  assert.match(profileBlock, /profileView === 'menu'/);
  assert.match(profileBlock, /className=\{styles\.profileMenuGrid\}/);
  assert.match(profileBlock, /onClick=\{\(\) => setProfileView\(item\.key\)\}/);
  assert.match(profileBlock, /返回“我的”/);
  assert.match(profileBlock, /profileView === 'orders'/);
  assert.match(profileBlock, /profileView === 'trials'/);
  assert.match(profileBlock, /profileView === 'reports'/);
});

test('profile orders expose logistics and render a logistics modal', () => {
  assert.match(pageSource, /查看物流/);
  assert.match(pageSource, /selectedLogisticsOrder/);
  assert.match(pageSource, /title="物流详情"/);
  assert.match(pageSource, /getLogisticsView/);
});

test('profile renders real trial and zhenke report sections', () => {
  const profileStart = pageSource.indexOf('const renderProfile = () =>');
  const profileEnd = pageSource.indexOf('if (!activeUser)', profileStart);
  const profileBlock = pageSource.slice(profileStart, profileEnd);

  assert.match(profileBlock, /<h3>我的试用<\/h3>/);
  assert.match(profileBlock, /确认收货/);
  assert.match(profileBlock, /自愿发布甄客验/);
  assert.match(profileBlock, /<h3>我的甄客验<\/h3>/);
  assert.doesNotMatch(profileBlock, /<h3>我的验证<\/h3>/);
});

test('report comments show a backend-provided author badge for comments and replies', () => {
  assert.match(pageSource, /comment\.reportAuthor && <span className=\{styles\.commentAuthorBadge\}>作者<\/span>/);
  assert.match(pageSource, /\(comment\.replies \?\? \[\]\)\.map\(\(reply\) => renderComment\(reply, true\)\)/);
});

test('report useful action uses the backend count instead of local-only increments', () => {
  assert.match(pageSource, /await toggleReportUseful\(reportId\)/);
  assert.match(pageSource, /usefulCount: result\.usefulCount/);
  assert.match(pageSource, /usefulByMe: result\.usefulByMe/);
  assert.doesNotMatch(pageSource, /report\.usefulByMe \? report\.usefulCount - 1/);
});

test('received order items publish purchase verification reports into the shared feed', () => {
  assert.match(pageSource, /publishPurchaseVerificationReport/);
  assert.match(pageSource, /orderItemId: reviewOrderItem\.orderItemId/);
  assert.match(pageSource, /购买甄客验已发布，已进入甄客验内容流/);
  assert.match(pageSource, /item\.verificationReportId \? '查看甄客验' : '发布甄客验'/);
  assert.match(pageSource, /report\.reportSource === 'PURCHASE'/);
  assert.match(pageSource, /购买评价/);
});

test('product journey covers recruitment, evidence, report detail, and attribution', () => {
  assert.match(pageSource, /招募中/);
  assert.match(pageSource, /线上试用正在招募/);
  assert.match(pageSource, /线下试用正在招募/);
  assert.match(pageSource, /申请验证/);
  assert.match(pageSource, /商家自证与溯源/);
  assert.match(pageSource, /查看 \/ 购买该商品/);
  assert.match(pageSource, /本次购买会记录来源甄客验/);
  assert.match(pageSource, /sourceReportId: journeyReport\.id/);
  assert.match(pageSource, /pendingBuyAttribution\?\.sourceReportId/);
  assert.match(pageSource, /getProductJourneyState/);
  assert.match(pageSource, /applyForTrial/);
  assert.match(pageSource, /fetchMyTrialApplications/);
});

test('home shell uses a masthead plus nav row without a repeated trust strip', () => {
  assert.match(pageSource, /className=\{styles\.masthead\}/);
  assert.match(pageSource, /className=\{styles\.navBar\}/);
  assert.match(pageSource, /真正的消费指南，信任就从一次次验证里长出来。/);
  assert.doesNotMatch(pageSource, /className=\{styles\.trustStrip\}/);
  assert.doesNotMatch(pageSource, /<h1>㤫者商城<\/h1>/);
});

test('masthead account action exposes a hover logout menu', () => {
  const accountMenuBlock =
    pageSource.slice(pageSource.indexOf('className={styles.accountMenu}'), pageSource.indexOf('className={styles.accountDropdown}')) ?? '';

  assert.match(pageSource, /className=\{styles\.accountMenu\}/);
  assert.match(pageSource, /className=\{styles\.accountButton\}/);
  assert.match(pageSource, /styles\.accountAvatar/);
  assert.match(pageSource, /styles\.accountName/);
  assert.match(pageSource, /styles\.accountRole/);
  assert.match(pageSource, /className=\{styles\.logoutButton\}/);
  assert.match(pageSource, /退出登录/);
  assert.doesNotMatch(accountMenuBlock, /<Badge/);
});

test('masthead exposes a shipping address action beside account info', () => {
  assert.match(pageSource, /className=\{styles\.addressButton\}/);
  assert.match(pageSource, /收货地址/);
  assert.match(pageSource, /setAddressOpen\(true\)/);
  assert.match(pageSource, /title="我的地址"/);
  assert.match(pageSource, /label="收货人"/);
  assert.match(pageSource, /label="手机号"/);
  assert.match(pageSource, /china-division/);
  assert.match(pageSource, /pcaCode/);
  assert.match(pageSource, /Cascader/);
  assert.match(pageSource, /name="region"/);
  assert.match(pageSource, /label="所在地区"/);
  assert.match(pageSource, /请选择省市区/);
  assert.match(pageSource, /label="详细地址"/);
});

test('shipping addresses support multiple entries and a default radio action', () => {
  assert.match(pageSource, /type ShippingAddress/);
  assert.match(pageSource, /fetchShopShippingAddresses/);
  assert.match(pageSource, /createShopShippingAddress/);
  assert.match(pageSource, /updateShopShippingAddress/);
  assert.match(pageSource, /deleteShopShippingAddress/);
  assert.match(pageSource, /setDefaultShopShippingAddress/);
  assert.doesNotMatch(pageSource, /seedShippingAddresses/);
  assert.match(pageSource, /shippingAddresses/);
  assert.match(pageSource, /defaultShippingAddress/);
  assert.match(pageSource, /Radio/);
  assert.match(pageSource, /设为默认/);
  assert.match(pageSource, /新增地址/);
  assert.match(pageSource, /handleSetDefaultAddress/);
  assert.match(pageSource, /handleStartNewAddress/);
  assert.match(pageSource, /className=\{styles\.addressList\}/);
});

test('address region data uses a static china-division json import for browser bundling', () => {
  assert.match(pageSource, /from 'china-division\/dist\/pca-code\.json'/);
  assert.doesNotMatch(pageSource, /from 'china-division'/);
});

test('verification publishing binds the eligible online or offline trial application', () => {
  assert.match(pageSource, /publishVerificationReport/);
  assert.match(pageSource, /trial\.status === 'pending_report'/);
  assert.match(pageSource, /name="trialApplicationId"/);
  assert.match(pageSource, /选择可发布试用/);
  assert.match(pageSource, /reviewableTrials/);
  assert.doesNotMatch(pageSource, /getReviewableProductsFromOrders/);
});

test('verification uploads keep resource URLs outside the form event value', () => {
  assert.match(pageSource, /useState<string\[\]>\(\[\]\)/);
  assert.match(pageSource, /setReportImageUrls/);
  assert.match(pageSource, /setReportVideoUrl/);
  assert.doesNotMatch(pageSource, /<Form\.Item name="images"/);
  assert.doesNotMatch(pageSource, /<Form\.Item name="video"/);
});

test('cart checkout footer shows a clear item-count checkout action', () => {
  assert.match(pageSource, /className=\{styles\.checkoutButton\}/);
  assert.match(pageSource, /结算 \{cartCount\} 件/);
});

test('avatar editing uses local file upload instead of URL input', () => {
  assert.match(pageSource, /type="file"/);
  assert.match(pageSource, /accept="image\/jpeg,image\/png,image\/gif"/);
  assert.match(pageSource, /uploadShopAvatar\(file\)/);
  assert.match(pageSource, /file\.size > 5 \* 1024 \* 1024/);
  assert.doesNotMatch(pageSource, /uploadAvatarFile/);
  assert.doesNotMatch(pageSource, /label="图片 URL"/);
});

test('profile and order views do not advertise return-day benefits', () => {
  assert.doesNotMatch(pageSource, /天退换/);
  assert.doesNotMatch(pageSource, /当前退换天数/);
  assert.doesNotMatch(pageSource, /升级演示/);
  assert.doesNotMatch(pageSource, /styles\.progressTrack/);
  assert.match(pageSource, /这里汇总你的试用、甄客验与订单进度/);
});

test('goods image preview opens only from product image button', () => {
  assert.match(pageSource, /className=\{styles\.productImageButton\}/);
  assert.match(pageSource, /aria-label=\{`查看\$\{product\.title\}图片详情`\}/);
  assert.match(pageSource, /className=\{styles\.productBodyButton\}/);

  const bodyButtonStart = pageSource.indexOf('className={styles.productBodyButton}');
  const bodyButtonEnd = pageSource.indexOf('</button>', bodyButtonStart);
  const bodyButtonBlock = pageSource.slice(bodyButtonStart, bodyButtonEnd);

  assert.notEqual(bodyButtonStart, -1);
  assert.doesNotMatch(bodyButtonBlock, /setImageProduct/);
});

test('goods cards expose cart and direct buy actions outside the selectable body', () => {
  assert.match(pageSource, /const handleBuyNow = \(product: Product, attribution\?: ReportAttribution\)/);
  assert.match(pageSource, /className=\{styles\.productQuickActions\}/);
  assert.match(pageSource, /handleAddToCart\(product\)/);
  assert.match(pageSource, /加入购物车/);
  assert.match(pageSource, /立即购买/);

  const bodyButtonStart = pageSource.indexOf('className={styles.productBodyButton}');
  const bodyButtonEnd = pageSource.indexOf('</button>', bodyButtonStart);
  const bodyButtonBlock = pageSource.slice(bodyButtonStart, bodyButtonEnd);

  assert.notEqual(bodyButtonStart, -1);
  assert.doesNotMatch(bodyButtonBlock, /加入购物车/);
  assert.doesNotMatch(bodyButtonBlock, /立即购买/);
});

test('direct buy opens an order confirmation modal before creating the order', () => {
  const buyNowStart = pageSource.indexOf('const handleBuyNow = (product: Product, attribution?: ReportAttribution)');
  const buyNowEnd = pageSource.indexOf('const handleAdvanceOrder', buyNowStart);
  const buyNowBlock = pageSource.slice(buyNowStart, buyNowEnd);

  assert.notEqual(buyNowStart, -1);
  assert.match(pageSource, /pendingBuyProduct/);
  assert.match(pageSource, /handleConfirmBuyNow/);
  assert.match(pageSource, /title="确认订单"/);
  assert.match(pageSource, /商品信息/);
  assert.match(pageSource, /收货地址/);
  assert.match(pageSource, /确认下单/);
  assert.match(pageSource, /formatShippingAddress\(defaultShippingAddress\)/);
  assert.doesNotMatch(buyNowBlock, /createOrdersFromCart/);
  assert.doesNotMatch(buyNowBlock, /setActiveTab\('profile'\)/);
});

test('shipping address modal rises above order confirmation when opened from direct buy', () => {
  const orderModalStart = pageSource.indexOf('title="确认订单"');
  const orderModalEnd = pageSource.indexOf('<Modal', orderModalStart + 1);
  const orderModalBlock = pageSource.slice(orderModalStart, orderModalEnd);
  const addressModalStart = pageSource.indexOf('title="我的地址"');
  const addressModalEnd = pageSource.indexOf('<Modal', addressModalStart + 1);
  const addressModalBlock = pageSource.slice(addressModalStart, addressModalEnd);

  assert.notEqual(orderModalStart, -1);
  assert.notEqual(addressModalStart, -1);
  assert.match(pageSource, /const orderConfirmModalZIndex = 1000;/);
  assert.match(pageSource, /const addressModalOverOrderZIndex = 1300;/);
  assert.match(orderModalBlock, /zIndex=\{orderConfirmModalZIndex\}/);
  assert.match(addressModalBlock, /zIndex=\{pendingBuyProduct \? addressModalOverOrderZIndex : undefined\}/);
});

test('goods card cart action stays compact and text visible', () => {
  const actionStart = pageSource.indexOf('className={styles.productQuickActions}');
  const actionEnd = pageSource.indexOf('</div>', actionStart);
  const actionBlock = pageSource.slice(actionStart, actionEnd);
  const styleSource = readFileSync(new URL('./index.less', import.meta.url), 'utf8');

  assert.notEqual(actionStart, -1);
  assert.doesNotMatch(actionBlock, /icon=\{<ShoppingCartOutlined \/>}/);
  assert.match(styleSource, /\.productQuickActions\s+:global\(\.ant-btn\)\s+\{[^}]*padding-inline: 8px;/);
  assert.match(styleSource, /\.productQuickActions\s+:global\(\.ant-btn\)\s+\{[^}]*white-space: nowrap;/);
});

test('goods card copy has its own padded content area', () => {
  const styleSource = readFileSync(new URL('./index.less', import.meta.url), 'utf8');

  assert.match(styleSource, /\.productBodyButton\s+\{[^}]*padding: 16px 18px 14px;/);
  assert.match(styleSource, /\.productQuickActions\s+\{[^}]*padding: 0 18px 18px;/);
});

test('goods card titles truncate long names without changing card height', () => {
  const styleSource = readFileSync(new URL('./index.less', import.meta.url), 'utf8');

  assert.match(pageSource, /<h3 title=\{product\.title\}>\{product\.title\}<\/h3>/);
  assert.match(styleSource, /\.productBodyButton h3\s+\{[^}]*overflow: hidden;/);
  assert.match(styleSource, /\.productBodyButton h3\s+\{[^}]*text-overflow: ellipsis;/);
  assert.match(styleSource, /\.productBodyButton h3\s+\{[^}]*white-space: nowrap;/);
});
