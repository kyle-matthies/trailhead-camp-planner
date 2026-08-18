export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `$${Number(value).toFixed(2)}`;
}
