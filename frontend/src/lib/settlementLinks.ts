import type { SettlementEntry } from "./types";

export interface PaymentTarget {
  venmo_handle?: string | null;
  paypal_me?: string | null;
}

export interface SettlementPayment extends PaymentTarget {
  from: string;
  to: string;
  amount: number;
}

function cents(value: number): number {
  return Math.round(value * 100);
}

export function cleanPaymentHandle(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .replace(/^@+/, "")
    .replace(/^https?:\/\/(www\.)?paypal\.me\//i, "")
    .replace(/^paypal\.me\//i, "")
    .replace(/^https?:\/\/(www\.)?venmo\.com\/u\//i, "")
    .replace(/^https?:\/\/(www\.)?venmo\.com\//i, "")
    .split(/[/?#]/)[0]
    .trim();
}

export function paypalMeUrl(handle: string | null | undefined, amount: number): string | null {
  const clean = cleanPaymentHandle(handle);
  if (!clean) return null;
  return `https://paypal.me/${encodeURIComponent(clean)}/${amount.toFixed(2)}`;
}

export function venmoProfileUrl(handle: string | null | undefined): string | null {
  const clean = cleanPaymentHandle(handle);
  if (!clean) return null;
  return `https://venmo.com/u/${encodeURIComponent(clean)}`;
}

export function buildSettlementPayments(
  entries: Array<SettlementEntry & PaymentTarget>
): SettlementPayment[] {
  const debtors = entries
    .filter((entry) => entry.net < 0)
    .map((entry) => ({ ...entry, remaining: cents(Math.abs(entry.net)) }));
  const creditors = entries
    .filter((entry) => entry.net > 0)
    .map((entry) => ({ ...entry, remaining: cents(entry.net) }));

  const payments: SettlementPayment[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amountCents = Math.min(debtor.remaining, creditor.remaining);

    if (amountCents > 0) {
      payments.push({
        from: debtor.name,
        to: creditor.name,
        amount: amountCents / 100,
        venmo_handle: creditor.venmo_handle,
        paypal_me: creditor.paypal_me,
      });
    }

    debtor.remaining -= amountCents;
    creditor.remaining -= amountCents;
    if (debtor.remaining === 0) debtorIndex += 1;
    if (creditor.remaining === 0) creditorIndex += 1;
  }

  return payments;
}
