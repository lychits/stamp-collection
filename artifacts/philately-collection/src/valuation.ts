export type ValuationInput = { estimatedValue: string; estimateCurrency: string };
export function parseEstimate(value: string): [number, number] | null {
  const normalized = value.trim().replace(/\s/g, '').replace(/,/g, '.');
  const match = normalized.match(/^(\d+(?:\.\d+)?)(?:[–—-](\d+(?:\.\d+)?))?$/);
  if (!match) return null;
  const low = Number(match[1]);
  const high = Number(match[2] ?? match[1]);
  return Number.isFinite(low) && Number.isFinite(high) && low <= high ? [low, high] : null;
}
export function sumEstimates(records: ValuationInput[]) {
  const totals = { usd: [0, 0], rub: [0, 0], included: 0, excluded: 0 };
  for (const record of records) {
    const range = parseEstimate(record.estimatedValue);
    const currency = record.estimateCurrency.trim().toUpperCase();
    const target = ['USD', '$', 'ДОЛЛ.', 'ДОЛЛАР США'].includes(currency) ? totals.usd
      : ['RUB', 'RUR', '₽', 'РУБ', 'РУБ.', 'РУБЛЕЙ'].includes(currency) ? totals.rub : null;
    if (!range || !target) { totals.excluded++; continue; }
    target[0] += range[0];
    target[1] += range[1];
    totals.included++;
  }
  return totals;
}
