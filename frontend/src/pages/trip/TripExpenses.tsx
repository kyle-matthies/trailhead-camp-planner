import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Receipt,
  Plus,
  X,
  Trash2,
  Loader2,
  Scale,
  Copy,
  ExternalLink,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/useAuth";
import { useTrip } from "@/context/useTrip";
import { useTripRealtime } from "@/hooks/useTripRealtime";
import { PageSpinner } from "@/components/ui/Spinner";
import PermissionGate from "@/components/ui/PermissionGate";
import { formatMoney } from "@/lib/money";
import { roleAtLeast } from "@/lib/types";
import {
  allocateEvenSplitDrafts,
  buildCustomSplitRows,
  centsToAmount,
  sumSplitDraftCents,
  type SplitTarget,
} from "@/lib/expenseSplits";
import { buildSettlementPayments, paypalMeUrl, venmoProfileUrl } from "@/lib/settlementLinks";
import type { CostSplit, Expense, TripParty, Settlement } from "@/lib/types";

const CATEGORIES = ["campsite", "gas", "firewood", "food", "permit", "supplies", "other"];

/** Format an ISO date (yyyy-mm-dd) for display without timezone drift. */
function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Encodes the "who pays" selection: a household party, an individual member, or unspecified. */
type PayerValue = "" | `party:${string}` | `member:${string}`;
type SplitMode = "equal" | "custom";

interface ExpenseForm {
  description: string;
  amount: string;
  category: string;
  payer: PayerValue;
  incurred_on: string;
  splitMode: SplitMode;
  splits: Record<string, string>;
}

function emptyForm(myMemberId: string | null): ExpenseForm {
  return {
    description: "",
    amount: "",
    category: CATEGORIES[0],
    payer: myMemberId ? `member:${myMemberId}` : "",
    incurred_on: todayISO(),
    splitMode: "equal",
    splits: {},
  };
}

export default function TripExpenses() {
  const { trip, tripId, members, myRole, myMemberId, nameFor } = useTrip();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ExpenseForm>(() => emptyForm(myMemberId));
  const [copiedPayment, setCopiedPayment] = useState<string | null>(null);

  // Live updates: expenses and custom splits both feed settlement.
  useTripRealtime(tripId, ["expenses", "cost_splits"]);

  const expensesQ = useQuery({
    queryKey: ["trip", tripId, "expenses"],
    queryFn: async (): Promise<Expense[]> => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("trip_id", tripId)
        .order("incurred_on", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const splitsQ = useQuery({
    queryKey: ["trip", tripId, "cost-splits"],
    queryFn: async (): Promise<CostSplit[]> => {
      const { data, error } = await supabase
        .from("cost_splits")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const partiesQ = useQuery({
    queryKey: ["trip", tripId, "parties"],
    queryFn: async (): Promise<TripParty[]> => {
      const { data, error } = await supabase
        .from("trip_parties")
        .select("*")
        .eq("trip_id", tripId)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const settlementQ = useQuery({
    queryKey: ["trip", tripId, "settlement"],
    queryFn: async (): Promise<Settlement> => {
      const { data, error } = await supabase.rpc("trip_settlement", { p_trip: tripId });
      if (error) throw error;
      // The RPC is typed as `Json`; its shape is the Settlement contract.
      return data as unknown as Settlement;
    },
  });

  const parties = useMemo(() => partiesQ.data ?? [], [partiesQ.data]);

  // Lookups for resolving "who paid" on each expense row.
  const partyById = useMemo(
    () => new Map(parties.map((p) => [p.id, p.name])),
    [parties]
  );
  const memberNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const mem of members) {
      m.set(mem.id, mem.display_name || mem.profile?.name || mem.profile?.email || "Camper");
    }
    return m;
  }, [members]);
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const splitTargets = useMemo<SplitTarget[]>(() => {
    if (parties.length > 0) {
      return parties.map((p) => ({ id: p.id, kind: "party", label: p.name }));
    }

    return members.map((m) => ({
      id: m.id,
      kind: "member",
      label: m.display_name || m.profile?.name || m.profile?.email || "Camper",
    }));
  }, [members, parties]);

  const splitsByExpense = useMemo(() => {
    const byExpense = new Map<string, CostSplit[]>();
    for (const split of splitsQ.data ?? []) {
      if (!split.expense_id) continue;
      const current = byExpense.get(split.expense_id) ?? [];
      current.push(split);
      byExpense.set(split.expense_id, current);
    }
    return byExpense;
  }, [splitsQ.data]);

  function payerLabel(e: Expense): string {
    if (e.paid_by_party_id) return partyById.get(e.paid_by_party_id) ?? "A household";
    if (e.paid_by_member_id) return memberNameById.get(e.paid_by_member_id) ?? "A camper";
    return "Unspecified";
  }

  function splitLabel(split: CostSplit): string {
    if (split.party_id) return partyById.get(split.party_id) ?? "A household";
    if (split.member_id) return memberNameById.get(split.member_id) ?? "A camper";
    return "Unknown";
  }

  function splitSummary(expenseId: string): string | null {
    const splits = splitsByExpense.get(expenseId) ?? [];
    if (splits.length === 0) return null;

    return splits
      .map((split) => `${splitLabel(split)} ${formatMoney(split.amount)}`)
      .join(" · ");
  }

  const addMut = useMutation({
    mutationFn: async (f: ExpenseForm) => {
      const amount = parseFloat(f.amount);
      if (!Number.isFinite(amount) || amount < 0) throw new Error("Enter a valid amount.");
      const customSplits =
        f.splitMode === "custom"
          ? buildCustomSplitRows(amount, f.splits, splitTargets, "expense")
          : [];

      let paid_by_party_id: string | null = null;
      let paid_by_member_id: string | null = null;
      if (f.payer.startsWith("party:")) paid_by_party_id = f.payer.slice("party:".length);
      else if (f.payer.startsWith("member:")) paid_by_member_id = f.payer.slice("member:".length);

      const { data, error } = await supabase
        .from("expenses")
        .insert({
          // trip_id is always set so the composite FKs (party/member) stay valid.
          trip_id: tripId,
          description: f.description.trim(),
          amount,
          category: f.category || null,
          paid_by_party_id,
          paid_by_member_id,
          incurred_on: f.incurred_on || null,
          created_by: user!.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      if (!data) throw new Error("Could not create expense.");

      if (customSplits.length > 0) {
        const { error: splitError } = await supabase.from("cost_splits").insert(
          customSplits.map((split) => ({
            trip_id: tripId,
            expense_id: data.id,
            party_id: split.kind === "party" ? split.id : null,
            member_id: split.kind === "member" ? split.id : null,
            amount: split.amount,
            created_by: user!.id,
          }))
        );
        if (splitError) {
          await supabase.from("expenses").delete().eq("id", data.id);
          throw splitError;
        }
      }
    },
    onSuccess: () => {
      // Expenses feed the settlement, so refresh both.
      qc.invalidateQueries({ queryKey: ["trip", tripId, "expenses"] });
      qc.invalidateQueries({ queryKey: ["trip", tripId, "cost-splits"] });
      qc.invalidateQueries({ queryKey: ["trip", tripId, "settlement"] });
      setForm(emptyForm(myMemberId));
      setShowForm(false);
    },
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trip", tripId, "expenses"] });
      qc.invalidateQueries({ queryKey: ["trip", tripId, "cost-splits"] });
      qc.invalidateQueries({ queryKey: ["trip", tripId, "settlement"] });
    },
  });

  const settlement = settlementQ.data;
  const settlementPayments = useMemo(() => {
    if (!settlement) return [];

    return buildSettlementPayments(
      settlement.breakdown.map((row) => {
        if (row.party_id) {
          const party = parties.find((p) => p.id === row.party_id);
          return {
            ...row,
            venmo_handle: party?.venmo_handle,
            paypal_me: party?.paypal_me,
          };
        }

        const member = row.member_id ? memberById.get(row.member_id) : null;
        return {
          ...row,
          venmo_handle: member?.profile?.venmo_handle,
          paypal_me: member?.profile?.paypal_me,
        };
      })
    );
  }, [memberById, parties, settlement]);

  if (expensesQ.isLoading || splitsQ.isLoading || partiesQ.isLoading || settlementQ.isLoading) {
    return <PageSpinner />;
  }

  const expenses = expensesQ.data ?? [];

  const loadError =
    expensesQ.error || splitsQ.error || partiesQ.error || settlementQ.error
      ? "Failed to load expenses. Try refreshing."
      : null;

  const canDelete = (e: Expense) =>
    roleAtLeast(myRole, "counselor") || e.created_by === user?.id;

  const unitLabel = settlement?.settle_unit === "member" ? "person" : "household";
  const hasSettlement =
    !!settlement && settlement.total_spent > 0 && settlement.breakdown.length > 0;
  const hasCustomSettlement = (settlement?.custom_split_count ?? 0) > 0;
  const shareColumnLabel = hasCustomSettlement ? "Share" : "Fair share";
  const amountNumber = Number(form.amount);
  const amountCents =
    Number.isFinite(amountNumber) && amountNumber >= 0 ? Math.round(amountNumber * 100) : null;
  let splitDraftCents = 0;
  let splitDraftInvalid = false;
  try {
    splitDraftCents = sumSplitDraftCents(form.splits);
  } catch {
    splitDraftInvalid = true;
  }
  const splitRemaining =
    amountCents === null || splitDraftInvalid
      ? null
      : centsToAmount(amountCents - splitDraftCents);
  const splitMatches = amountCents !== null && !splitDraftInvalid && splitDraftCents === amountCents;
  const splitStatus =
    splitDraftInvalid
      ? "Fix invalid split amounts."
      : amountCents === null
        ? "Enter an amount before allocating shares."
        : splitMatches
          ? `Allocated ${formatMoney(centsToAmount(splitDraftCents))}`
          : splitRemaining !== null && splitRemaining >= 0
            ? `${formatMoney(splitRemaining)} left to allocate`
            : `${formatMoney(Math.abs(splitRemaining ?? 0))} over amount`;

  function fillEqualSplits() {
    if (amountCents === null) return;
    setForm({
      ...form,
      splitMode: "custom",
      splits: allocateEvenSplitDrafts(centsToAmount(amountCents), splitTargets),
    });
  }

  function copyPaymentNote(id: string, from: string, to: string, amount: number) {
    const note = `${from} pays ${to} ${formatMoney(amount)} for ${trip?.name ?? "camping trip"}`;
    navigator.clipboard?.writeText(note);
    setCopiedPayment(id);
    setTimeout(() => setCopiedPayment((current) => (current === id ? null : current)), 1500);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-forest-100 rounded-lg">
          <Receipt className="w-6 h-6 text-forest-600" />
        </div>
        <div>
          <h1 className="text-2xl font-heading font-bold text-stone-900">Expenses</h1>
          <p className="text-sm text-stone-500">
            Track shared costs and settle up at the end of the trip.
          </p>
        </div>
      </div>

      {loadError && (
        <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-700">{loadError}</div>
      )}

      {/* Settlement summary — whole-trip, includes purchased shopping items too. */}
      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-forest-600" />
            <h2 className="text-lg font-heading font-semibold text-stone-900">Settle up</h2>
          </div>
          {settlement && (
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span className="text-stone-500">
                Total spent{" "}
                <span className="font-semibold text-stone-900 tabular-nums">
                  {formatMoney(settlement.total_spent)}
                </span>
              </span>
              {hasCustomSettlement ? (
                <span className="text-stone-500">
                  Custom split costs{" "}
                  <span className="font-semibold text-stone-900 tabular-nums">
                    {settlement.custom_split_count}
                  </span>
                </span>
              ) : (
                <span className="text-stone-500">
                  Fair share / {unitLabel}{" "}
                  <span className="font-semibold text-stone-900 tabular-nums">
                    {formatMoney(settlement.fair_share)}
                  </span>
                </span>
              )}
            </div>
          )}
        </div>

        {!hasSettlement ? (
          <p className="text-sm text-stone-500 py-2">
            Nothing to settle yet — add an expense or purchase shopping items to see who owes what.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-stone-400 border-b border-stone-200">
                  <th className="py-2 pr-3 font-medium">
                    {settlement!.settle_unit === "member" ? "Camper" : "Household"}
                  </th>
                  <th className="py-2 px-3 font-medium text-right">Paid</th>
                  <th className="py-2 px-3 font-medium text-right">{shareColumnLabel}</th>
                  <th className="py-2 pl-3 font-medium text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                {settlement!.breakdown.map((row, i) => {
                  const owes = row.net < 0;
                  return (
                    <tr
                      key={row.party_id ?? row.member_id ?? `${row.name}-${i}`}
                      className="border-b border-stone-100 last:border-0"
                    >
                      <td className="py-2.5 pr-3 font-medium text-stone-800">{row.name}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-stone-600">
                        {formatMoney(row.paid)}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-stone-600">
                        {formatMoney(row.fair_share)}
                      </td>
                      <td
                        className={
                          "py-2.5 pl-3 text-right font-semibold tabular-nums " +
                          (owes ? "text-red-600" : "text-forest-700")
                        }
                      >
                        <span className="inline-flex items-center justify-end gap-1">
                          {owes ? (
                            <TrendingDown className="w-3.5 h-3.5" />
                          ) : (
                            <TrendingUp className="w-3.5 h-3.5" />
                          )}
                          {owes
                            ? `owes ${formatMoney(Math.abs(row.net))}`
                            : `gets ${formatMoney(row.net)}`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-stone-400">
              Whole-trip summary — includes purchased shopping items, not just the expenses below.
            </p>

            {settlementPayments.length > 0 && (
              <div className="mt-4 border-t border-stone-100 pt-4">
                <h3 className="text-sm font-semibold text-stone-800 mb-2">Settle-up links</h3>
                <div className="space-y-2">
                  {settlementPayments.map((payment, index) => {
                    const id = `${payment.from}-${payment.to}-${index}`;
                    const paypalUrl = paypalMeUrl(payment.paypal_me, payment.amount);
                    const venmoUrl = venmoProfileUrl(payment.venmo_handle);
                    return (
                      <div
                        key={id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-stone-50 px-3 py-2 text-sm"
                      >
                        <span className="text-stone-700">
                          <span className="font-medium">{payment.from}</span> pays{" "}
                          <span className="font-medium">{payment.to}</span>{" "}
                          <span className="font-semibold tabular-nums">{formatMoney(payment.amount)}</span>
                        </span>
                        <span className="flex flex-wrap items-center gap-2">
                          {paypalUrl && (
                            <a
                              href={paypalUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-forest-700 hover:underline"
                            >
                              PayPal <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          {venmoUrl && (
                            <a
                              href={venmoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-forest-700 hover:underline"
                            >
                              Venmo <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => copyPaymentNote(id, payment.from, payment.to, payment.amount)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-stone-800"
                          >
                            {copiedPayment === id ? "Copied" : "Copy note"}
                            <Copy className="w-3 h-3" />
                          </button>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Add expense (cit and up). */}
      <PermissionGate role={myRole} min="cit">
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-heading font-semibold text-stone-900">
              {expenses.length} expense{expenses.length === 1 ? "" : "s"}
            </h2>
            <button
              onClick={() => {
                setShowForm((s) => !s);
                setForm(emptyForm(myMemberId));
              }}
              className="btn-primary px-4 py-2 text-sm"
            >
              {showForm ? (
                <>
                  <X className="w-4 h-4 mr-1" /> Cancel
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-1" /> Add expense
                </>
              )}
            </button>
          </div>

          {showForm && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addMut.mutate(form);
              }}
              className="card p-5 sm:p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  required
                  className="w-full px-3 py-2 border-2 border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
                  placeholder="e.g. Campsite reservation"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                  className="w-full px-3 py-2 border-2 border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 tabular-nums"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 capitalize"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} className="capitalize">
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Paid by</label>
                <select
                  value={form.payer}
                  onChange={(e) => setForm({ ...form, payer: e.target.value as PayerValue })}
                  className="w-full px-3 py-2 border-2 border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
                >
                  <option value="">Unspecified</option>
                  {myMemberId && <option value={`member:${myMemberId}`}>Me</option>}
                  {parties.length > 0 && (
                    <optgroup label="Households">
                      {parties.map((p) => (
                        <option key={p.id} value={`party:${p.id}`}>
                          {p.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Campers">
                    {members
                      .filter((m) => m.id !== myMemberId)
                      .map((m) => (
                        <option key={m.id} value={`member:${m.id}`}>
                          {nameFor(m.user_id)}
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Date</label>
                <input
                  type="date"
                  value={form.incurred_on}
                  onChange={(e) => setForm({ ...form, incurred_on: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
                />
              </div>

              <div className="sm:col-span-2 border-t border-stone-100 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <label className="block text-sm font-medium text-stone-700">Split</label>
                  <div className="inline-flex rounded-lg border-2 border-stone-200 bg-white p-0.5 text-sm">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, splitMode: "equal" })}
                      className={
                        "px-3 py-1.5 rounded-md " +
                        (form.splitMode === "equal"
                          ? "bg-forest-600 text-white"
                          : "text-stone-600 hover:bg-stone-50")
                      }
                    >
                      Equal
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const nextSplits =
                          Object.keys(form.splits).length > 0
                            ? form.splits
                            : amountCents !== null
                              ? allocateEvenSplitDrafts(centsToAmount(amountCents), splitTargets)
                              : {};
                        setForm({ ...form, splitMode: "custom", splits: nextSplits });
                      }}
                      className={
                        "px-3 py-1.5 rounded-md " +
                        (form.splitMode === "custom"
                          ? "bg-forest-600 text-white"
                          : "text-stone-600 hover:bg-stone-50")
                      }
                    >
                      Custom
                    </button>
                  </div>
                </div>

                {form.splitMode === "custom" && (
                  <div className="rounded-lg border-2 border-stone-100 bg-stone-50/60 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <p
                        className={
                          "text-xs " +
                          (splitMatches
                            ? "text-forest-700"
                            : splitDraftInvalid || (splitRemaining ?? 0) < 0
                              ? "text-red-600"
                              : "text-stone-500")
                        }
                      >
                        {splitStatus}
                      </p>
                      <button
                        type="button"
                        onClick={fillEqualSplits}
                        disabled={amountCents === null || splitTargets.length === 0}
                        className="text-xs font-medium text-forest-700 hover:text-forest-900 disabled:text-stone-400"
                      >
                        Fill equal
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {splitTargets.map((target) => (
                        <label key={target.id} className="block">
                          <span className="block text-xs font-medium text-stone-600 mb-1 truncate">
                            {target.label}
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            inputMode="decimal"
                            value={form.splits[target.id] ?? ""}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                splits: { ...form.splits, [target.id]: e.target.value },
                              })
                            }
                            className="w-full px-3 py-2 border-2 border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 tabular-nums"
                            placeholder="0.00"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="sm:col-span-2">
                {addMut.error && (
                  <p className="text-sm text-red-600 mb-2">
                    {addMut.error instanceof Error ? addMut.error.message : "Could not add expense."}
                  </p>
                )}
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-stone-400">
                    Tip: purchased shopping items are included automatically.
                  </p>
                  <button
                    type="submit"
                    disabled={addMut.isPending || (form.splitMode === "custom" && !splitMatches)}
                    className="btn-primary px-6 py-2 text-sm disabled:opacity-60"
                  >
                    {addMut.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                    Save expense
                  </button>
                </div>
              </div>
            </form>
          )}
        </section>
      </PermissionGate>

      {/* Expense list. */}
      {expenses.length === 0 ? (
        <div className="card p-12 text-center">
          <Receipt className="w-12 h-12 text-stone-300 mx-auto mb-4" />
          <p className="text-sm text-stone-500">
            No expenses logged yet. Campsite fees, gas, and firewood show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {expenses.map((e) => {
            const customSplit = splitSummary(e.id);
            return (
              <div key={e.id} className="card px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-stone-900 truncate">{e.description}</p>
                  <p className="text-xs text-stone-500">
                    {e.category && (
                      <span className="capitalize">{e.category}</span>
                    )}
                    {e.category ? " · " : ""}
                    Paid by {payerLabel(e)} · {fmtDate(e.incurred_on)}
                  </p>
                  {customSplit && (
                    <p className="text-xs text-stone-500 truncate">
                      Split {customSplit}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="font-semibold text-forest-700 tabular-nums">
                    {formatMoney(e.amount)}
                  </span>
                  {canDelete(e) && (
                    <button
                      onClick={() => delMut.mutate(e.id)}
                      disabled={delMut.isPending}
                      title="Delete expense"
                      className="p-2 hover:bg-red-50 rounded-lg text-stone-400 hover:text-red-600 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
