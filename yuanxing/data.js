(function (root, factory) {
  const data = factory();
  if (typeof module === 'object' && module.exports) module.exports = data;
  else root.ZhenkeSeed = data;
})(globalThis, function () {
  return {
    region: { id: 'R001', code: 'DINGZHOU', name: '定州', operatorName: '定州甄客行运营中心', contact: '0312-0000000', status: 'ACTIVE' },
    adminRoles: ['operatorAdmin', 'platformAdmin'],
    currentUser: null,
    cities: [{ id: 'handan', name: '邯郸' }, { id: 'dingzhou', name: '定州' }],
    sections: ['土著', '旅游', '在外家乡人'],
    users: [
      { id: 'U001', nickname: '甄客用户', avatar: '甄', bio: '跟着燃赛去旅行' },
      { id: 'U002', nickname: '跑友小周', avatar: '周', bio: '跑过燃赛，也记录每座城' },
      { id: 'U003', nickname: '古城慢行', avatar: '古', bio: '定州生活记录者' },
      { id: 'U004', nickname: '在外邯郸人', avatar: '邯', bio: '人在远方，心在家乡' }
    ],
    follows: [],
    postLikes: [],
    postFavorites: [],
    postComments: [],
    postCommentLikes: [],
    serviceLikes: [],
    serviceFavorites: [],
    admins: [
      { id: 'A001', account: 'dingzhou-admin', name: '定州运营管理员', role: 'operatorAdmin', regionId: 'R001' },
      { id: 'A999', account: 'platform-admin', name: '平台管理员', role: 'platformAdmin', regionId: null }
    ],
    events: [
      { id: 'E001', title: '2026 定州古城路跑嘉年华', date: '2026-09-01', place: '定州古城南城门广场', cover: '跑进中山古都，体验赛事与城市消费一体化服务', intro: '以古城文化为主线，串联开元寺塔、贡院、文庙与宋街。赛事报名继续由燃赛承载。', status: 'PUBLISHED', relatedServiceIds: ['SV001', 'SV002', 'SV003'] },
      { id: 'E002', title: '定州三人制足球邀请赛', date: '2026-09-15', place: '定州市体育中心', cover: '赛事服务专题预告', intro: '面向参赛队伍和随行人员的住宿、餐饮与城市体验服务。', status: 'DRAFT', relatedServiceIds: ['SV001', 'SV002'] }
    ],
    cityBanners: [
      { id: 'B001', title: '跑进中山古都', subtitle: '2026 定州古城路跑嘉年华', targetRoute: 'event-detail', targetId: 'E001', tone: 'race', image: 'assets/images/city-race.jpg' },
      { id: 'B002', title: '一城古韵，一路风景', subtitle: '开元寺塔、贡院与宋街城市漫游', targetRoute: 'service-detail', targetId: 'SV003', tone: 'city', image: 'assets/images/ancient-city.jpg' },
      { id: 'B003', title: '为完赛干杯', subtitle: '赛事餐饮、住宿和赛后游一站安排', targetRoute: 'consume', targetId: '', tone: 'food', image: 'assets/images/dingzhou-food.jpg' }
    ],
    travelPackages: [
      { id: 'TP001', days: 1, title: '一日游 · 比赛日轻松完赛计划', stage: '比赛日', price: 26800, items: ['赛事早餐', '起点接驳', '赛后定州味', '古城轻游'] },
      { id: 'TP002', days: 2, title: '两日游 · 参赛与古城深度体验', stage: '赛前 + 比赛日', price: 69800, items: ['赛事友好酒店', '参赛包领取', '完赛恢复餐', '古城讲解'] },
      { id: 'TP003', days: 3, title: '多日游 · 亲友团城市假期', stage: '赛前 + 赛后', price: 99800, items: ['两晚住宿', '赛事观赛', '必吃榜体验', '古城与定瓷研学'] }
    ],
    merchants: [
      { id: 'M001', category: '住宿', name: '定州国际酒店', address: '定州市中山路 88 号', phone: '0312-0001001', hours: '全天', intro: '古城周边赛事友好酒店，提供早餐与停车服务。', status: 'ACTIVE', featured: true, symbol: '宿' },
      { id: 'M002', category: '餐饮', name: '中山宴·定州味', address: '定州古城宋街 16 号', phone: '0312-0001002', hours: '10:30–21:30', intro: '以焖子、手掰肠和八大碗为特色的本地餐饮商家。', status: 'ACTIVE', featured: true, symbol: '宴' },
      { id: 'M003', category: '景区', name: '定州古城文旅服务中心', address: '定州古城南城门游客中心', phone: '0312-0001003', hours: '08:30–20:30', intro: '提供古城讲解、景区联票与夜游预约服务。', status: 'ACTIVE', featured: true, symbol: '游' },
      { id: 'M004', category: '其他消费', name: '中山文化研学中心', address: '定州博物馆东侧', phone: '0312-0001004', hours: '09:00–18:00', intro: '提供亲子研学、非遗体验与城市文化课程。', status: 'ACTIVE', featured: false, symbol: '学' }
    ],
    services: [
      { id: 'SV001', merchantId: 'M001', category: '住宿', name: '赛事专享雅致大床房', description: '含双早、停车及赛事接驳咨询服务。', price: 35800, stock: 18, fulfillmentType: 'RESERVATION', validUntil: '2026-09-30', saleStart: '2026-08-24', saleEnd: '2026-09-30', notice: '入住需出示有效证件；模拟订单不产生真实预订。', status: 'ON_SALE', featured: true, symbol: '宿', popularity: 98, image: 'assets/images/hotel-room.jpg', gallery: ['assets/images/hotel-room.jpg', 'assets/images/hotel-room.jpg', 'assets/images/city-race.jpg'], eventTags: ['距起点 1.2km', '提前早餐', '延迟退房'], eventService: '比赛日可预约 05:30 早餐，并提供起点接驳咨询与赛后延迟退房。' },
      { id: 'SV002', merchantId: 'M002', category: '餐饮', name: '中山宴·定州味双人餐', description: '焖子、手掰肠、中山枣饼与时令热菜组合。', price: 13800, stock: 50, fulfillmentType: 'VERIFY_AT_STORE', validUntil: '2026-09-30', saleStart: '2026-08-24', saleEnd: '2026-09-30', notice: '到店出示核销码；高峰期建议提前预约。', status: 'ON_SALE', featured: true, symbol: '宴', popularity: 96, image: 'assets/images/dingzhou-food.jpg', gallery: ['assets/images/dingzhou-food.jpg', 'assets/images/dingzhou-food.jpg', 'assets/images/city-race.jpg'], eventTags: ['赛后恢复餐', '参赛者推荐', '距终点 800m'], eventService: '比赛日延长供餐时间，提供清淡主食、蛋白质和定州特色菜组合。' },
      { id: 'SV003', merchantId: 'M003', category: '景区', name: '定州古城文化讲解', description: '开元寺塔、贡院与宋街 90 分钟主题讲解。', price: 4900, stock: 80, fulfillmentType: 'VERIFY_AT_STORE', validUntil: '2026-09-30', saleStart: '2026-08-24', saleEnd: '2026-09-30', notice: '请提前 15 分钟到游客中心集合。', status: 'ON_SALE', featured: true, symbol: '游', popularity: 94, image: 'assets/images/ancient-city.jpg', gallery: ['assets/images/ancient-city.jpg', 'assets/images/night-tour.jpg', 'assets/images/city-race.jpg'], eventTags: ['赛后轻松游', '亲友团推荐', '赛事路线同款'], eventService: '提供完赛后低强度古城路线，也适合亲友团在比赛期间体验。' },
      { id: 'SV004', merchantId: 'M004', category: '其他消费', name: '定瓷纹样亲子研学课', description: '了解定瓷历史并完成一件纹样创作。', price: 8800, stock: 24, fulfillmentType: 'RESERVATION', validUntil: '2026-10-15', saleStart: '2026-08-24', saleEnd: '2026-10-10', notice: '适合 6 岁以上儿童，需监护人陪同。', status: 'ON_SALE', featured: false, symbol: '学' },
      { id: 'SV005', merchantId: 'M003', category: '景区', name: '定州古城夜游', description: '南城门、宋街与古城夜景城市漫游。', price: 3900, stock: 0, fulfillmentType: 'VERIFY_AT_STORE', validUntil: '2026-09-30', saleStart: '2026-08-24', saleEnd: '2026-09-30', notice: '当前场次售罄。', status: 'ON_SALE', featured: false, symbol: '夜', image: 'assets/images/night-tour.jpg', gallery: ['assets/images/night-tour.jpg', 'assets/images/ancient-city.jpg'] }
    ],
    contents: [
      { id: 'C001', type: 'BANNER', title: '跑进中山古都', subtitle: '赛事、食宿、景区一站聚合', targetRoute: 'event-detail', targetId: 'E001', status: 'PUBLISHED', order: 1 },
      { id: 'C002', type: 'RECOMMENDATION', title: '参赛者安心住', subtitle: '赛事友好住宿推荐', targetRoute: 'category', targetId: '住宿', status: 'PUBLISHED', order: 2 }
    ],
    orders: [
      { id: 'DZ202608240001', userId: 'U001', serviceId: 'SV003', serviceName: '定州古城文化讲解', merchantId: 'M003', merchantName: '定州古城文旅服务中心', category: '景区', quantity: 1, unitPrice: 4900, amount: 4900, contactName: '甄客用户', contactPhone: '13800000000', useDate: '2026-09-01', status: 'PAID', paymentStatus: 'SUCCESS', verificationCode: 'DZ-240001', createdAt: '2026-08-24 10:10', updatedAt: '2026-08-24 10:11', note: '', settlement: { platformFee: 245, operatorShare: 490, merchantAmount: 4165, ruleVersion: 'V1-MOCK' } },
      { id: 'DZ202608230002', userId: 'U001', serviceId: 'SV001', serviceName: '赛事专享雅致大床房', merchantId: 'M001', merchantName: '定州国际酒店', category: '住宿', quantity: 1, unitPrice: 35800, amount: 35800, contactName: '甄客用户', contactPhone: '13800000000', useDate: '2026-09-01', status: 'CONFIRMED', paymentStatus: 'SUCCESS', verificationCode: 'DZ-230002', createdAt: '2026-08-23 16:20', updatedAt: '2026-08-23 16:35', note: '安静房间', settlement: { platformFee: 1790, operatorShare: 3580, merchantAmount: 30430, ruleVersion: 'V1-MOCK' } },
      { id: 'DZ202608220003', userId: 'U001', serviceId: 'SV002', serviceName: '中山宴·定州味双人餐', merchantId: 'M002', merchantName: '中山宴·定州味', category: '餐饮', quantity: 1, unitPrice: 13800, amount: 13800, contactName: '甄客用户', contactPhone: '13800000000', useDate: '2026-08-22', status: 'COMPLETED', paymentStatus: 'SUCCESS', verificationCode: 'DZ-220003', createdAt: '2026-08-22 11:00', updatedAt: '2026-08-22 18:20', note: '', settlement: { platformFee: 690, operatorShare: 1380, merchantAmount: 11730, ruleVersion: 'V1-MOCK' } },
      { id: 'DZ202608210004', userId: 'U001', serviceId: 'SV004', serviceName: '定瓷纹样亲子研学课', merchantId: 'M004', merchantName: '中山文化研学中心', category: '其他消费', quantity: 1, unitPrice: 8800, amount: 8800, contactName: '甄客用户', contactPhone: '13800000000', useDate: '2026-09-03', status: 'CANCELLED', paymentStatus: 'UNPAID', verificationCode: null, createdAt: '2026-08-21 09:10', updatedAt: '2026-08-21 09:12', note: '', settlement: null },
      { id: 'DZ202608200005', userId: 'U001', serviceId: 'SV002', serviceName: '中山宴·定州味双人餐', merchantId: 'M002', merchantName: '中山宴·定州味', category: '餐饮', quantity: 1, unitPrice: 13800, amount: 13800, contactName: '甄客用户', contactPhone: '13800000000', useDate: '2026-09-01', status: 'PENDING_PAYMENT', paymentStatus: 'UNPAID', verificationCode: null, createdAt: '2026-08-24 12:00', updatedAt: '2026-08-24 12:00', note: '', settlement: null }
    ],
    reviews: [
      { id: 'RV001', user: '塔下听风', avatar: '塔', source: '已核销 · 定州古城文化讲解', category: '景区', text: '从开元寺塔一路走到宋街，讲解把古城历史串得很清楚。', date: '2 小时前', likes: 56 },
      { id: 'RV002', user: '中山客', avatar: '中', source: '已核销 · 中山宴定州味双人餐', category: '餐饮', text: '第一次把焖子、手掰肠和中山枣饼一起吃全，很适合外地参赛者。', date: '昨天', likes: 42 },
      { id: 'RV003', user: '古城慢行', avatar: '古', source: '已确认 · 定州国际酒店', category: '住宿', text: '距离古城和比赛服务点都方便，前台对赛事时间也很熟悉。', date: '2 天前', likes: 31 }
    ],
    comments: [
      { id: 'CM001', serviceId: 'SV001', user: '准备参赛', text: '比赛当天可以提前提供早餐吗？', reply: '商家回复：可以，赛事期间可预约 05:30 提前早餐。' },
      { id: 'CM002', serviceId: 'SV002', user: '跑友小周', text: '完赛后两个人吃分量够吗？', reply: '商家回复：双人套餐为正常两人份，也可以到店加菜。' },
      { id: 'CM003', serviceId: 'SV003', user: '亲友团领队', text: '不参赛的家属也适合参加吗？', reply: '商家回复：适合，讲解路线强度较低。' }
    ],
    posts: [
      { id: 'P001', authorId: 'U002', title: '我的第一次燃赛：跑完才真正认识定州', body: '从古城南门出发，沿途都是为跑者加油的人。完赛后我没有急着回酒店，而是沿宋街慢慢走了一圈，这座城因为一场比赛变得具体。', cityId: 'dingzhou', section: '旅游', images: ['assets/images/city-race.jpg'], tags: ['燃赛故事', '真实跑友', '赛后旅行'], placeId: 'SV003', eventId: 'E001', likeCount: 128, favoriteCount: 46, commentCount: 18, createdAt: '2 小时前' },
      { id: 'P002', authorId: 'U003', title: '比赛日清晨，本地人会去吃的热乎早餐', body: '不是网红套餐，是我们平时就会吃的味道。参赛当天早点来，避开七点后的高峰。', cityId: 'dingzhou', section: '土著', images: ['assets/images/dingzhou-food.jpg'], tags: ['本地味道', '燃赛早餐'], placeId: 'SV002', eventId: 'E001', likeCount: 86, favoriteCount: 39, commentCount: 9, createdAt: '昨天' },
      { id: 'P003', authorId: 'U004', title: '在外多年，我想把邯郸的这份味道讲给跑友', body: '每次有人因为比赛来到家乡，我都会把自己的老店清单发给他。赛事让更多人看见家乡，也让我们重新讲起家乡。', cityId: 'handan', section: '在外家乡人', images: ['assets/images/dingzhou-food.jpg'], tags: ['家乡代言', '燃赛同行'], placeId: null, eventId: null, likeCount: 72, favoriteCount: 31, commentCount: 11, createdAt: '2 天前' },
      { id: 'P004', authorId: 'U002', title: '为了燃赛来到邯郸，赛后多留了一天', body: '把比赛当成旅行的起点，去了古城、吃了本地菜，也认识了几位新的跑友。', cityId: 'handan', section: '旅游', images: ['assets/images/ancient-city.jpg'], tags: ['参赛旅行', '城市漫游'], placeId: null, eventId: null, likeCount: 64, favoriteCount: 28, commentCount: 7, createdAt: '3 天前' },
      { id: 'P005', authorId: 'U003', title: '邯郸本地跑者的赛前碳水清单', body: '如果你第一次来邯郸参赛，这几种家常主食比临时追网红店更稳妥。吃得舒服，第二天才跑得踏实。', cityId: 'handan', section: '土著', images: ['assets/images/dingzhou-food.jpg'], tags: ['本地跑者', '赛前准备'], placeId: null, eventId: null, likeCount: 93, favoriteCount: 52, commentCount: 14, createdAt: '4 小时前' },
      { id: 'P006', authorId: 'U004', title: '离开定州以后，我更懂古城赛道的意义', body: '在外地生活久了，看到跑友沿古城奔跑，会觉得家乡被更多人认真看见。把这条路线推荐给每个愿意慢下来的人。', cityId: 'dingzhou', section: '在外家乡人', images: ['assets/images/ancient-city.jpg'], tags: ['家乡记忆', '燃赛路线'], placeId: 'SV003', eventId: 'E001', likeCount: 81, favoriteCount: 37, commentCount: 12, createdAt: '昨天' },
      { id: 'P007', authorId: 'U002', title: '赛前住这家，早餐和接驳都省心', body: '离起点很近，前台熟悉赛事时间，赛事期间可以约 05:30 早餐，退房也能延后，很适合参赛住。', cityId: 'dingzhou', section: '旅游', images: ['assets/images/hotel-room.jpg'], tags: ['住宿推荐', '赛前准备'], placeId: 'SV001', eventId: 'E001', likeCount: 57, favoriteCount: 33, commentCount: 6, createdAt: '3 天前' },
      { id: 'P008', authorId: 'U003', title: '完赛当晚去古城夜游，整个人都松弛了', body: '白天跑完，晚上沿南城门和宋街慢慢走，灯一亮，古城完全是另一种样子，强度不高特别适合赛后。', cityId: 'dingzhou', section: '土著', images: ['assets/images/night-tour.jpg'], tags: ['古城漫游', '赛后美食'], placeId: 'SV005', eventId: 'E001', likeCount: 69, favoriteCount: 28, commentCount: 8, createdAt: '2 天前' },
      { id: 'P009', authorId: 'U004', title: '带爸妈来看比赛，这家双人餐分量刚好', body: '完赛后一家人到店，焖子、手掰肠、枣饼点齐，长辈也吃得惯，赛后补给很到位。', cityId: 'dingzhou', section: '旅游', images: ['assets/images/dingzhou-food.jpg'], tags: ['本地味道', '亲友团'], placeId: 'SV002', eventId: 'E001', likeCount: 48, favoriteCount: 22, commentCount: 5, createdAt: '4 小时前' }
    ],
    auditLogs: [
      { id: 'L001', actorId: 'A001', actorName: '定州运营管理员', resource: '赛事专题 E001', action: 'PUBLISH_CONTENT', summary: '发布定州古城路跑专题', time: '2026-08-24 09:30' }
    ]
  };
});
