import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";

/**
 * Encodes the estimate-vs-actual color rule used across the app:
 *  - purchased (actual_cost set) -> solid "bought" style.
 *  - estimate only             -> muted/italic "not yet bought" style.
 * A single component so the rule is consistent everywhere (shopping, summaries).
 */
export default function MoneyCell({
  estimated,
  actual,
  purchased,
  className,
}: {
  estimated?: number | null;
  actual?: number | null;
  purchased?: boolean | null;
  className?: string;
}) {
  const isPurchased = purchased ?? actual !== null;
  if (isPurchased && actual !== null && actual !== undefined) {
    return (
      <span className={cn("font-semibold text-forest-700 tabular-nums", className)}>
        {formatMoney(actual)}
      </span>
    );
  }
  if (estimated !== null && estimated !== undefined) {
    return (
      <span
        className={cn("italic text-stone-400 tabular-nums", className)}
        title="Estimated — not yet purchased"
      >
        {formatMoney(estimated)}
      </span>
    );
  }
  return <span className={cn("text-stone-300", className)}>—</span>;
}
