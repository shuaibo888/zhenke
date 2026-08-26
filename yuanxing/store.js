(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ZhenkeStore = api;
})(globalThis, function () {
  const clone = value => JSON.parse(JSON.stringify(value));
  const now = () => new Date().toLocaleString('zh-CN', { hour12: false }).replaceAll('/', '-');
  const hydrateState = (seed, saved) => {
    const merged = { ...clone(seed), ...saved };
    ['services', 'merchants', 'events', 'contents'].forEach(collection => {
      const defaults = seed[collection] || [];
      const persisted = saved[collection] || [];
      merged[collection] = persisted.map(item => ({ ...(defaults.find(base => base.id === item.id) || {}), ...item }));
    });
    return merged;
  };

  function createStore(seed, storage) {
    const key = 'zhenkexing-mock-v3';
    let state;
    try { state = storage && storage.getItem(key) ? hydrateState(seed, JSON.parse(storage.getItem(key))) : clone(seed); }
    catch (_) { state = clone(seed); }

    const persist = () => { if (storage) storage.setItem(key, JSON.stringify(state)); };
    const audit = (actorId, resource, action, summary) => {
      const actor = state.admins.find(item => item.id === actorId) || { name: '系统' };
      state.auditLogs.unshift({ id: `L${Date.now()}`, actorId, actorName: actor.name, resource, action, summary, time: now() });
    };
    const getMerchant = id => state.merchants.find(item => item.id === id);
    const getService = id => state.services.find(item => item.id === id);
    const getOrder = id => state.orders.find(item => item.id === id);

    return {
      getState: () => state,
      reset() { state = clone(seed); persist(); return state; },
      getAdminRoles: () => clone(state.adminRoles),
      loginUser(phone) { const user = (state.users || []).find(item => item.id === 'U001'); state.currentUser = { id: 'U001', name: user?.nickname || '甄客用户', phone, avatar: state.currentUser?.avatar || user?.avatar || '甄' }; persist(); return state.currentUser; },
      logout() { state.currentUser = null; persist(); return null; },
      updateUserProfile(input) {
        if (!state.currentUser) state.currentUser = { id: 'U001', name: '甄客用户', phone: '', avatar: '甄' };
        const name = String(input.name ?? state.currentUser.name).trim();
        state.currentUser = { ...state.currentUser, name, phone: String(input.phone ?? state.currentUser.phone ?? '').trim() };
        const user = (state.users || []).find(item => item.id === (state.currentUser.id || 'U001'));
        if (user) { user.nickname = name || user.nickname; if (input.bio !== undefined) user.bio = String(input.bio).trim(); }
        persist(); return state.currentUser;
      },
      updateUserAvatar(avatar) {
        const value = String(avatar || '甄');
        const next = /\.(jpg|jpeg|png|webp)$/i.test(value) ? value : value.slice(0, 1);
        if (!state.currentUser) state.currentUser = { id: 'U001', name: '甄客用户', phone: '', avatar: next };
        state.currentUser.avatar = next;
        const user = (state.users || []).find(item => item.id === (state.currentUser.id || 'U001'));
        if (user) user.avatar = next;
        persist(); return state.currentUser;
      },
      addComment(input) {
        const comment = { id: `CM${Date.now()}`, serviceId: input.serviceId, user: input.user || state.currentUser?.name || '甄客用户', text: String(input.text || '').trim(), reply: '商家将在后续回复。', createdAt: now() };
        if (!comment.text) throw new Error('评论内容不能为空');
        if (!state.comments) state.comments = [];
        state.comments.unshift(comment); persist(); return comment;
      },
      addPost(input) {
        if (!input.cityId) throw new Error('请选择城市');
        if (!input.section) throw new Error('请选择分区');
        if (!(state.cities || []).some(city => city.id === input.cityId)) throw new Error('城市不存在');
        if (!(state.sections || []).includes(input.section)) throw new Error('分区不存在');
        const body = String(input.text || input.body || '').trim();
        if (!body) throw new Error('帖子内容不能为空');
        const post = { id: `P${Date.now()}`, authorId: state.currentUser?.id || 'U001', title: String(input.title || '我的燃赛城市体验').trim(), body, cityId: input.cityId, section: input.section, images: input.images || [], tags: input.tags || [], placeId: input.placeId || input.serviceId || null, eventId: input.eventId || null, likeCount: 0, favoriteCount: 0, commentCount: 0, createdAt: '刚刚' };
        if (!state.posts) state.posts = [];
        state.posts.unshift(post); persist(); return post;
      },
      listPosts(filters = {}) {
        const followingIds = new Set((state.follows || []).filter(item => item.followerId === 'U001').map(item => item.followeeId));
        return (state.posts || []).filter(post => (!filters.cityId || post.cityId === filters.cityId) && (!filters.section || post.section === filters.section) && (!filters.authorId || post.authorId === filters.authorId) && (!filters.tag || (post.tags || []).includes(filters.tag)) && (!filters.followingOnly || followingIds.has(post.authorId)));
      },
      toggleFollow(authorId) {
        const followerId = state.currentUser?.id || 'U001';
        if (authorId === followerId) throw new Error('不能关注自己');
        if (!state.follows) state.follows = [];
        const index = state.follows.findIndex(item => item.followerId === followerId && item.followeeId === authorId);
        if (index >= 0) state.follows.splice(index, 1); else state.follows.push({ followerId, followeeId: authorId, createdAt: now() });
        persist(); return { authorId, following: index < 0 };
      },
      togglePostLike(postId) {
        const userId = state.currentUser?.id || 'U001';
        if (!state.postLikes) state.postLikes = [];
        const post = state.posts.find(item => item.id === postId); if (!post) throw new Error('帖子不存在');
        const index = state.postLikes.findIndex(item => item.userId === userId && item.postId === postId);
        if (index >= 0) { state.postLikes.splice(index, 1); post.likeCount = Math.max(0, (post.likeCount || 0) - 1); } else { state.postLikes.push({ userId, postId }); post.likeCount = (post.likeCount || 0) + 1; }
        persist(); return { postId, liked: index < 0 };
      },
      togglePostFavorite(postId) {
        const userId = state.currentUser?.id || 'U001';
        if (!state.postFavorites) state.postFavorites = [];
        const post = state.posts.find(item => item.id === postId); if (!post) throw new Error('帖子不存在');
        const index = state.postFavorites.findIndex(item => item.userId === userId && item.postId === postId);
        if (index >= 0) { state.postFavorites.splice(index, 1); post.favoriteCount = Math.max(0, (post.favoriteCount || 0) - 1); } else { state.postFavorites.push({ userId, postId }); post.favoriteCount = (post.favoriteCount || 0) + 1; }
        persist(); return { postId, favorited: index < 0 };
      },
      addPostComment(postId, text, options = null) {
        const opts = typeof options === 'string' ? { parentId: options } : (options || {});
        const parentId = opts.parentId || null;
        const images = Array.isArray(opts.images) ? opts.images.filter(Boolean).slice(0, 9) : [];
        const body = String(text || '').trim();
        if (!body && !images.length) throw new Error('评论内容不能为空');
        const post = state.posts.find(item => item.id === postId); if (!post) throw new Error('帖子不存在');
        if (!state.postComments) state.postComments = [];
        if (parentId && !state.postComments.some(item => item.id === parentId)) throw new Error('被回复的评论不存在');
        const comment = { id: `PC${Date.now()}${Math.floor(state.postComments.length)}`, postId, authorId: state.currentUser?.id || 'U001', body, images, parentId, likeCount: 0, createdAt: now() };
        state.postComments.push(comment); post.commentCount = (post.commentCount || 0) + 1; persist(); return comment;
      },
      listPostComments(postId) {
        const all = (state.postComments || []).filter(item => item.postId === postId);
        const roots = all.filter(item => !item.parentId).map(item => ({ ...item, likeCount: item.likeCount || 0, images: item.images || [], replies: [] }));
        const rootMap = new Map(roots.map(item => [item.id, item]));
        all.filter(item => item.parentId).forEach(reply => { const parent = rootMap.get(reply.parentId); if (parent) parent.replies.push({ ...reply, likeCount: reply.likeCount || 0, images: reply.images || [] }); });
        return roots;
      },
      togglePostCommentLike(commentId) {
        const userId = state.currentUser?.id || 'U001';
        const comment = (state.postComments || []).find(item => item.id === commentId); if (!comment) throw new Error('评论不存在');
        if (!state.postCommentLikes) state.postCommentLikes = [];
        const index = state.postCommentLikes.findIndex(item => item.userId === userId && item.commentId === commentId);
        if (index >= 0) { state.postCommentLikes.splice(index, 1); comment.likeCount = Math.max(0, (comment.likeCount || 0) - 1); } else { state.postCommentLikes.push({ userId, commentId }); comment.likeCount = (comment.likeCount || 0) + 1; }
        persist(); return { commentId, liked: index < 0 };
      },
      isPostCommentLiked(commentId) { const userId = state.currentUser?.id || 'U001'; return (state.postCommentLikes || []).some(item => item.userId === userId && item.commentId === commentId); },
      toggleServiceLike(serviceId) { const userId = state.currentUser?.id || 'U001'; if (!state.serviceLikes) state.serviceLikes = []; const index = state.serviceLikes.findIndex(item => item.userId === userId && item.serviceId === serviceId); if (index >= 0) state.serviceLikes.splice(index, 1); else state.serviceLikes.push({ userId, serviceId }); persist(); return { serviceId, liked: index < 0 }; },
      toggleServiceFavorite(serviceId) { const userId = state.currentUser?.id || 'U001'; if (!state.serviceFavorites) state.serviceFavorites = []; const index = state.serviceFavorites.findIndex(item => item.userId === userId && item.serviceId === serviceId); if (index >= 0) state.serviceFavorites.splice(index, 1); else state.serviceFavorites.push({ userId, serviceId }); persist(); return { serviceId, favorited: index < 0 }; },
      isServiceLiked(serviceId) { const userId = state.currentUser?.id || 'U001'; return (state.serviceLikes || []).some(item => item.userId === userId && item.serviceId === serviceId); },
      isServiceFavorited(serviceId) { const userId = state.currentUser?.id || 'U001'; return (state.serviceFavorites || []).some(item => item.userId === userId && item.serviceId === serviceId); },
      serviceLikeCount(serviceId) { return (state.serviceLikes || []).filter(item => item.serviceId === serviceId).length; },
      serviceFavoriteCount(serviceId) { return (state.serviceFavorites || []).filter(item => item.serviceId === serviceId).length; },
      servicePostCount(serviceId) { return (state.posts || []).filter(item => item.placeId === serviceId).length; },
      isFollowing(authorId) { const followerId = state.currentUser?.id || 'U001'; return (state.follows || []).some(item => item.followerId === followerId && item.followeeId === authorId); },
      isPostLiked(postId) { const userId = state.currentUser?.id || 'U001'; return (state.postLikes || []).some(item => item.userId === userId && item.postId === postId); },
      isPostFavorited(postId) { const userId = state.currentUser?.id || 'U001'; return (state.postFavorites || []).some(item => item.userId === userId && item.postId === postId); },
      listFollowing(userId) { const id = userId || state.currentUser?.id || 'U001'; const ids = (state.follows || []).filter(item => item.followerId === id).map(item => item.followeeId); return ids.map(followeeId => (state.users || []).find(user => user.id === followeeId)).filter(Boolean); },
      listFollowers(userId) { const id = userId || state.currentUser?.id || 'U001'; const ids = (state.follows || []).filter(item => item.followeeId === id).map(item => item.followerId); return ids.map(followerId => (state.users || []).find(user => user.id === followerId)).filter(Boolean); },
      listLikedPosts(userId) { const id = userId || state.currentUser?.id || 'U001'; const ids = new Set((state.postLikes || []).filter(item => item.userId === id).map(item => item.postId)); return (state.posts || []).filter(post => ids.has(post.id)); },
      listFavoritePosts(userId) { const id = userId || state.currentUser?.id || 'U001'; const ids = new Set((state.postFavorites || []).filter(item => item.userId === id).map(item => item.postId)); return (state.posts || []).filter(post => ids.has(post.id)); },
      listReceivedInteractions(userId) {
        const id = userId || state.currentUser?.id || 'U001';
        const myPostIds = new Set((state.posts || []).filter(post => post.authorId === id).map(post => post.id));
        const likes = (state.postLikes || []).filter(item => myPostIds.has(item.postId) && item.userId !== id).map(item => ({ type: 'like', postId: item.postId, userId: item.userId }));
        const favorites = (state.postFavorites || []).filter(item => myPostIds.has(item.postId) && item.userId !== id).map(item => ({ type: 'favorite', postId: item.postId, userId: item.userId }));
        const comments = (state.postComments || []).filter(item => myPostIds.has(item.postId) && item.authorId !== id).map(item => ({ type: 'comment', postId: item.postId, userId: item.authorId, body: item.body, createdAt: item.createdAt }));
        const follows = (state.follows || []).filter(item => item.followeeId === id).map(item => ({ type: 'follow', userId: item.followerId, createdAt: item.createdAt }));
        return [...comments, ...likes, ...favorites, ...follows];
      },
      loginAdmin(account) { return state.admins.find(item => item.account === account) || null; },
      getEvent: id => state.events.find(item => item.id === id),
      getMerchant,
      getService,
      getOrder,
      canPurchase(serviceId) {
        const service = getService(serviceId);
        if (!service) return { ok: false, reason: '服务不存在' };
        const merchant = getMerchant(service.merchantId);
        if (!merchant || merchant.status !== 'ACTIVE') return { ok: false, reason: '商家已停用' };
        if (service.status !== 'ON_SALE') return { ok: false, reason: '服务已下架' };
        if (service.stock <= 0) return { ok: false, reason: '当前已售罄' };
        return { ok: true };
      },
      createOrder(input) {
        const check = this.canPurchase(input.serviceId);
        if (!check.ok) throw new Error(check.reason);
        const service = getService(input.serviceId);
        const merchant = getMerchant(service.merchantId);
        const id = `DZ${Date.now()}`;
        const quantity = Number(input.quantity || 1);
        const order = { id, userId: input.userId, serviceId: service.id, serviceName: service.name, merchantId: merchant.id, merchantName: merchant.name, category: service.category, quantity, unitPrice: service.price, amount: service.price * quantity, contactName: input.contactName, contactPhone: input.contactPhone, guestName: input.guestName || input.contactName, useDate: input.useDate, endDate: input.endDate || null, useTime: input.useTime || null, visitSlot: input.visitSlot || null, bookingType: input.bookingType || service.category, status: 'PENDING_PAYMENT', paymentStatus: 'UNPAID', verificationCode: null, createdAt: now(), updatedAt: now(), note: input.note || '', settlement: null };
        state.orders.unshift(order); persist(); return order;
      },
      applyPaymentResult(orderId, result) {
        const order = getOrder(orderId);
        if (!order) throw new Error('订单不存在');
        order.paymentStatus = result;
        if (result === 'SUCCESS') {
          order.status = 'PAID';
          order.verificationCode = `DZ-${String(Date.now()).slice(-6)}`;
          order.settlement = { platformFee: Math.round(order.amount * 0.05), operatorShare: Math.round(order.amount * 0.10), merchantAmount: Math.round(order.amount * 0.85), ruleVersion: 'V1-MOCK' };
        }
        order.updatedAt = now(); persist(); return order;
      },
      verifyOrder(orderId, adminId) {
        const order = getOrder(orderId);
        if (!order || !['PAID', 'CONFIRMED'].includes(order.status)) throw new Error('当前订单不可核销');
        order.status = 'COMPLETED'; order.updatedAt = now();
        audit(adminId, `订单 ${order.id}`, 'VERIFY_ORDER', '完成到店核销'); persist(); return order;
      },
      updateOrderStatus(orderId, status, adminId) {
        const order = getOrder(orderId); if (!order) throw new Error('订单不存在');
        order.status = status; order.updatedAt = now();
        if (status === 'REFUNDED') order.paymentStatus = 'REFUNDED';
        audit(adminId, `订单 ${order.id}`, 'UPDATE_ORDER', `订单状态更新为 ${status}`); persist(); return order;
      },
      updateMerchantStatus(merchantId, status, adminId) {
        const merchant = getMerchant(merchantId); if (!merchant) throw new Error('商家不存在');
        merchant.status = status;
        audit(adminId, `商家 ${merchant.name}`, status === 'ACTIVE' ? 'ENABLE_MERCHANT' : 'DISABLE_MERCHANT', `商家状态更新为 ${status}`); persist(); return merchant;
      },
      updateServiceStatus(serviceId, status, adminId) {
        const service = getService(serviceId); if (!service) throw new Error('服务不存在');
        service.status = status;
        audit(adminId, `服务 ${service.name}`, status === 'ON_SALE' ? 'PUBLISH_SERVICE' : 'UNPUBLISH_SERVICE', `服务状态更新为 ${status}`); persist(); return service;
      },
      updateContentStatus(contentId, status, adminId) {
        const content = state.contents.find(item => item.id === contentId); if (!content) throw new Error('内容不存在');
        content.status = status;
        audit(adminId, `内容 ${content.title}`, 'UPDATE_CONTENT', `内容状态更新为 ${status}`); persist(); return content;
      },
      listOrders(filters = {}) {
        return state.orders.filter(order => (!filters.status || order.status === filters.status) && (!filters.query || JSON.stringify(order).includes(filters.query)));
      },
      likeReview(id) { const review = state.reviews.find(item => item.id === id); if (review) { review.likes += 1; persist(); } return review; }
    };
  }
  return { createStore };
});
