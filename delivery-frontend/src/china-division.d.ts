declare module 'china-division/dist/pca-code.json' {
  export type ChinaDivisionNode = {
    code: string;
    name: string;
    children?: ChinaDivisionNode[];
  };

  const pcaCode: ChinaDivisionNode[];
  export default pcaCode;
}

declare module 'china-division/dist/pc-code.json' {
  export type ChinaDivisionNode = {
    code: string;
    name: string;
    children?: ChinaDivisionNode[];
  };

  const pcCode: ChinaDivisionNode[];
  export default pcCode;
}
