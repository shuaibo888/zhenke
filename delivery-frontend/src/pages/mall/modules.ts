export const BUSINESS_MODULES = [
  { code: 'MALL', title: '商城', kicker: '城市好物', caption: '自营与商家商品，支持配送或到店核销' },
  { code: 'ZHENKE_HOTEL', title: '酒店', kicker: '城市住宿', caption: '住宿套餐与房型服务，到店出示核销码' },
  { code: 'ZHENKE_SCENIC', title: '景区', kicker: '城市游玩', caption: '门票与线路套餐，按使用规则现场核销' },
  { code: 'ZHENKE_RESTAURANT', title: '饭店', kicker: '城市餐饮', caption: '餐券与套餐服务，到店使用更方便' },
] as const;

export type BusinessModuleCode = (typeof BUSINESS_MODULES)[number]['code'];

export const LOCAL_LIFE_CODES = new Set<BusinessModuleCode>([
  'ZHENKE_HOTEL',
  'ZHENKE_SCENIC',
  'ZHENKE_RESTAURANT',
]);

export function normalizeBusinessModule(value: string | null): BusinessModuleCode {
  return BUSINESS_MODULES.some((item) => item.code === value)
    ? value as BusinessModuleCode
    : 'MALL';
}
