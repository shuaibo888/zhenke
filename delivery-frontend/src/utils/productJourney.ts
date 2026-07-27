export function getProductJourneyState(productId: number, reports: Array<{ productId: number }>) {
  return reports.some((report) => report.productId === productId) ? 'verified' : 'recruiting';
}
