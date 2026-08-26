(function (root, factory) {
  const adapters = factory();
  if (typeof module === 'object' && module.exports) module.exports = adapters;
  else root.ZhenkeAdapters = adapters;
})(globalThis, function () {
  return {
    ransai: { getStatus: async () => ({ status: 'UNAVAILABLE', message: '燃赛接口暂未接入' }) },
    payment: { create: async () => ({ status: 'MOCK', choices: ['SUCCESS', 'PROCESSING', 'FAILED'] }) },
    digitalRmb: { getStatus: async () => ({ status: 'UNAVAILABLE', message: '数字人民币接口暂未接入' }) },
    blockchain: { getStatus: async () => ({ status: 'UNAVAILABLE', message: '区块链存证暂未接入' }) },
    mall: { getStatus: async () => ({ status: 'COMING_SOON', message: '商城暂未开放' }) }
  };
});
