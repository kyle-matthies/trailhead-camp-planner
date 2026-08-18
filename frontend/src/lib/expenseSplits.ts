export type SplitTargetKind = "party" | "member";

export interface SplitTarget {
  id: string;
  kind: SplitTargetKind;
  label: string;
}

export interface SplitRowDraft {
  id: string;
  kind: SplitTargetKind;
  amount: number;
}

export function parseMoneyCents(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount < 0) return null;

  return Math.round(amount * 100);
}

function draftCents(value: string | undefined): number {
  if (!value?.trim()) return 0;
  const cents = parseMoneyCents(value);
  if (cents === null) {
    throw new Error("Split amounts must be valid non-negative numbers.");
  }
  return cents;
}

export function sumSplitDraftCents(drafts: Record<string, string>): number {
  return Object.values(drafts).reduce((sum, value) => sum + draftCents(value), 0);
}

export function centsToAmount(cents: number): number {
  return cents / 100;
}

export function allocateEvenSplitDrafts(
  amount: number,
  targets: SplitTarget[]
): Record<string, string> {
  if (targets.length === 0) return {};

  const totalCents = Math.round(amount * 100);
  const base = Math.floor(totalCents / targets.length);
  const remainder = totalCents % targets.length;

  return Object.fromEntries(
    targets.map((target, index) => {
      const cents = base + (index < remainder ? 1 : 0);
      return [target.id, centsToAmount(cents).toFixed(2)];
    })
  );
}

export function buildCustomSplitRows(
  amount: number,
  drafts: Record<string, string>,
  targets: SplitTarget[],
  costLabel = "cost"
): SplitRowDraft[] {
  if (targets.length === 0) {
    throw new Error("Add campers or households before using a custom split.");
  }

  const expectedCents = Math.round(amount * 100);
  const rows = targets
    .map((target) => ({
      id: target.id,
      kind: target.kind,
      cents: draftCents(drafts[target.id]),
    }))
    .filter((row) => row.cents > 0);

  const actualCents = rows.reduce((sum, row) => sum + row.cents, 0);
  if (actualCents !== expectedCents) {
    throw new Error(`Custom split amounts must add up to the ${costLabel} amount.`);
  }

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    amount: centsToAmount(row.cents),
  }));
}
