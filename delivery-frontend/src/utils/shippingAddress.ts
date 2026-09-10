import pcaCode from 'china-division/dist/pca-code.json';

type RegionNode = { code: string; name: string; children?: RegionNode[] };
type AddressDisplay = {
  region?: readonly string[];
  provinceCode?: string;
  cityCode?: string;
  districtCode?: string;
  detail?: string;
};

const regionNames = new Map<string, string>();
function collectRegionNames(nodes: RegionNode[]) {
  nodes.forEach(({ code, name, children }) => {
    regionNames.set(code, name);
    regionNames.set(code.padEnd(6, '0'), name);
    if (children) collectRegionNames(children);
  });
}
collectRegionNames(pcaCode as RegionNode[]);

// Use the editor's region dictionary for saved addresses and order snapshots.
// Keep legacy names and unknown values intact instead of guessing an address.
export function formatShippingAddress(address: AddressDisplay) {
  const region = address.region ?? [address.provinceCode, address.cityCode, address.districtCode];
  return [
    ...region.map((value) => {
      const part = value?.trim() ?? '';
      return regionNames.get(part) ?? part;
    }),
    address.detail?.trim(),
  ].filter(Boolean).join(' ');
}
