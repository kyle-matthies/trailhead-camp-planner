import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, ShoppingCart, Loader2, Sparkles, Check, Hand, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/useAuth";
import { useTrip } from "@/context/useTrip";
import { useTripRealtime } from "@/hooks/useTripRealtime";
import { PageSpinner } from "@/components/ui/Spinner";
import MoneyCell from "@/components/ui/MoneyCell";
import { formatMoney } from "@/lib/money";
import CamperAvatar from "@/components/ui/CamperAvatar";
import PermissionGate from "@/components/ui/PermissionGate";
import {
  allocateEvenSplitDrafts,
  buildCustomSplitRows,
  centsToAmount,
  sumSplitDraftCents,
  type SplitTarget,
} from "@/lib/expenseSplits";
import { roleAtLeast, type CostSplit, type ShoppingItem, type TripParty } from "@/lib/types";
import { cn } from "@/lib/utils";

const CATEGORIES = ["food", "drinks", "supplies", "fuel", "other"];

const emptyForm = { name: "", quantity: "1", unit: "", category: "food", estimated_cost: "" };

export default function TripShopping() {
  const { user } = useAuth();
  const { tripId, members, myRole, myMemberId } = useTrip();
  const qc = useQueryClient();
  useTripRealtime(tripId, ["shopping_items", "cost_splits"]);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [actualDraft, setActualDraft] = useState<Record<string, string>>({});
  const [splitEditorId, setSplitEditorId] = useState<string | null>(null);
  const [splitDrafts, setSplitDrafts] = useState<Record<string, Record<string, string>>>({});
  const [error, setError] = useState("");

  const itemsQ = useQuery({
    queryKey: ["trip", tripId, "shopping"],
    queryFn: async (): Promise<ShoppingItem[]> => {
      const { data, error } = await supabase
        .from("shopping_items")
        .select("*")
        .eq("trip_id", tripId)
        .order("purchased")
        .order("created_at");
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

  const parties = useMemo(() => partiesQ.data ?? [], [partiesQ.data]);

  const partyById = useMemo(
    () => new Map(parties.map((party) => [party.id, party.name])),
    [parties]
  );

  const memberNameById = useMemo(() => {
    const names = new Map<string, string>();
    for (const member of members) {
      names.set(member.id, member.display_name || member.profile?.name || member.profile?.email || "Camper");
    }
    return names;
  }, [members]);

  const splitTargets = useMemo<SplitTarget[]>(() => {
    if (parties.length > 0) {
      return parties.map((party) => ({ id: party.id, kind: "party", label: party.name }));
    }

    return members.map((member) => ({
      id: member.id,
      kind: "member",
      label: member.display_name || member.profile?.name || member.profile?.email || "Camper",
    }));
  }, [members, parties]);

  const splitsByItem = useMemo(() => {
    const byItem = new Map<string, CostSplit[]>();
    for (const split of splitsQ.data ?? []) {
      if (!split.shopping_item_id) continue;
      const current = byItem.get(split.shopping_item_id) ?? [];
      current.push(split);
      byItem.set(split.shopping_item_id, current);
    }
    return byItem;
  }, [splitsQ.data]);

  function splitLabel(split: CostSplit): string {
    if (split.party_id) return partyById.get(split.party_id) ?? "A household";
    if (split.member_id) return memberNameById.get(split.member_id) ?? "A camper";
    return "Unknown";
  }

  function splitSummary(itemId: string): string | null {
    const splits = splitsByItem.get(itemId) ?? [];
    if (splits.length === 0) return null;

    return splits
      .map((split) => `${splitLabel(split)} ${formatMoney(split.amount)}`)
      .join(" · ");
  }

  function draftFromExisting(item: ShoppingItem): Record<string, string> {
    const existing = splitsByItem.get(item.id) ?? [];
    if (existing.length > 0) {
      return Object.fromEntries(
        existing
          .map((split) => [split.party_id ?? split.member_id, split.amount.toFixed(2)])
          .filter((entry): entry is [string, string] => Boolean(entry[0]))
      );
    }

    return allocateEvenSplitDrafts(item.actual_cost ?? 0, splitTargets);
  }

  function openSplitEditor(item: ShoppingItem) {
    if (item.actual_cost === null) return;
    setSplitDrafts((drafts) => ({
      ...drafts,
      [item.id]: drafts[item.id] ?? draftFromExisting(item),
    }));
    setSplitEditorId(item.id);
  }

  function splitStatus(item: ShoppingItem) {
    const amount = item.actual_cost ?? 0;
    const amountCents = Math.round(amount * 100);
    const drafts = splitDrafts[item.id] ?? {};
    let draftCents = 0;
    let invalid = false;
    try {
      draftCents = sumSplitDraftCents(drafts);
    } catch {
      invalid = true;
    }

    const remaining = centsToAmount(amountCents - draftCents);
    const matches = !invalid && draftCents === amountCents;
    const message = invalid
      ? "Fix invalid split amounts."
      : matches
        ? `Allocated ${formatMoney(centsToAmount(draftCents))}`
        : remaining >= 0
          ? `${formatMoney(remaining)} left to allocate`
          : `${formatMoney(Math.abs(remaining))} over amount`;

    return { invalid, matches, message, remaining };
  }

  const invalidate = () => qc.invalidateQueries({ queryKey: ["trip", tripId] });
  const fail = (e: unknown) => setError(e instanceof Error ? e.message : "Something went wrong");

  const addMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("shopping_items").insert({
        trip_id: tripId,
        created_by: user!.id,
        name: form.name,
        quantity: form.quantity ? Number(form.quantity) : 1,
        unit: form.unit || null,
        category: form.category,
        estimated_cost: form.estimated_cost ? Number(form.estimated_cost) : null,
        source: "manual",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setForm(emptyForm);
      setShowForm(false);
    },
    onError: fail,
  });

  const claimMut = useMutation({
    mutationFn: async ({ id, memberId }: { id: string; memberId: string | null }) => {
      const { error } = await supabase.from("shopping_items").update({ claimed_by: memberId }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: fail,
  });

  const buyMut = useMutation({
    mutationFn: async ({ id, actual }: { id: string; actual: number | null }) => {
      if (actual === null) {
        const { error: splitError } = await supabase
          .from("cost_splits")
          .delete()
          .eq("trip_id", tripId)
          .eq("shopping_item_id", id);
        if (splitError) throw splitError;
      }

      const { error } = await supabase.from("shopping_items").update({ actual_cost: actual }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: fail,
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shopping_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: fail,
  });

  const saveSplitMut = useMutation({
    mutationFn: async ({ item, drafts }: { item: ShoppingItem; drafts: Record<string, string> }) => {
      if (item.actual_cost === null) throw new Error("Mark the item bought before splitting it.");
      const customSplits = buildCustomSplitRows(item.actual_cost, drafts, splitTargets, "item");

      const { error: deleteError } = await supabase
        .from("cost_splits")
        .delete()
        .eq("trip_id", tripId)
        .eq("shopping_item_id", item.id);
      if (deleteError) throw deleteError;

      if (customSplits.length === 0) return;

      const { error: insertError } = await supabase.from("cost_splits").insert(
        customSplits.map((split) => ({
          trip_id: tripId,
          shopping_item_id: item.id,
          party_id: split.kind === "party" ? split.id : null,
          member_id: split.kind === "member" ? split.id : null,
          amount: split.amount,
          created_by: user!.id,
        }))
      );
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      invalidate();
      setSplitEditorId(null);
    },
    onError: fail,
  });

  const clearSplitMut = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("cost_splits")
        .delete()
        .eq("trip_id", tripId)
        .eq("shopping_item_id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setSplitEditorId(null);
    },
    onError: fail,
  });

  if (itemsQ.isLoading || splitsQ.isLoading || partiesQ.isLoading) return <PageSpinner />;
  const items = itemsQ.data ?? [];
  const loadError =
    itemsQ.error || splitsQ.error || partiesQ.error
      ? "Failed to load shopping items. Try refreshing."
      : "";

  const estTotal = items.filter((i) => !i.purchased).reduce((s, i) => s + (i.estimated_cost ?? 0), 0);
  const actualTotal = items.filter((i) => i.purchased).reduce((s, i) => s + (i.actual_cost ?? 0), 0);

  const claimerName = (id: string | null) => {
    if (!id) return null;
    const m = members.find((mm) => mm.id === id);
    return m?.display_name || m?.profile?.name || m?.profile?.email || "Camper";
  };
  const canWrite = roleAtLeast(myRole, "counselor");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-heading font-semibold text-stone-900 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-forest-600" /> Shopping List
          </h2>
          <p className="text-sm text-stone-500">
            Estimated <span className="italic text-stone-400">{formatMoney(estTotal)}</span> · Spent{" "}
            <span className="font-semibold text-forest-700">{formatMoney(actualTotal)}</span>
          </p>
        </div>
        <PermissionGate role={myRole} min="cit">
          <button
            onClick={() => {
              setShowForm(!showForm);
              setForm(emptyForm);
              setError("");
            }}
            className="btn-primary px-4 py-2 text-sm"
          >
            {showForm ? <><X className="w-4 h-4 mr-1" /> Cancel</> : <><Plus className="w-4 h-4 mr-1" /> Add Item</>}
          </button>
        </PermissionGate>
      </div>

      {(loadError || error) && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {loadError || error}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            addMut.mutate();
          }}
          className="card p-4 grid grid-cols-2 sm:grid-cols-6 gap-3"
        >
          <div className="col-span-2 sm:col-span-2">
            <label className="block text-xs font-medium text-stone-600 mb-1">Item</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full px-2.5 py-1.5 border-2 border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
              placeholder="Hot dog buns"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Qty</label>
            <input
              type="number"
              step="any"
              min="0"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              className="w-full px-2.5 py-1.5 border-2 border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Unit</label>
            <input
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className="w-full px-2.5 py-1.5 border-2 border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
              placeholder="packs"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-2.5 py-1.5 border-2 border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 capitalize"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="capitalize">{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Est. $</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.estimated_cost}
              onChange={(e) => setForm({ ...form, estimated_cost: e.target.value })}
              className="w-full px-2.5 py-1.5 border-2 border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
              placeholder="0.00"
            />
          </div>
          <div className="col-span-2 sm:col-span-6 flex justify-end">
            <button type="submit" disabled={addMut.isPending} className="btn-primary px-5 py-1.5 text-sm">
              {addMut.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />} Add
            </button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <div className="card p-10 text-center">
          <ShoppingCart className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-sm text-stone-500">
            No items yet. Add them above — or tap the assistant and say your grocery list.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const claimer = claimerName(item.claimed_by);
            const canBuy = roleAtLeast(myRole, "cit");
            // A CIT may only set actual cost on an item they have claimed; counselors anyone.
            const mayBuyThis = canWrite || (canBuy && item.claimed_by === myMemberId);
            const customSplit = splitSummary(item.id);
            const isEditingSplit = splitEditorId === item.id;
            const status = splitStatus(item);
            return (
              <li
                key={item.id}
                className={cn(
                  "card px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2",
                  item.purchased && "bg-forest-50/50"
                )}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {item.purchased ? (
                    <Check className="w-4 h-4 text-forest-600 shrink-0" />
                  ) : (
                    <span className="w-4 h-4 rounded-full border-2 border-stone-300 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className={cn("font-medium text-stone-900 truncate", item.purchased && "line-through text-stone-500")}>
                      {item.name}
                      {item.source === "ai" && (
                        <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700 align-middle">
                          <Sparkles className="w-2.5 h-2.5" /> AI
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-stone-500">
                      {Number(item.quantity)}
                      {item.unit ? ` ${item.unit}` : ""}
                      {item.category ? ` · ${item.category}` : ""}
                    </p>
                    {customSplit && (
                      <p className="text-xs text-stone-500 truncate">
                        Split {customSplit}
                      </p>
                    )}
                  </div>
                </div>

                {/* Cost (estimate vs actual color rule lives in MoneyCell) */}
                <div className="w-20 text-right">
                  <MoneyCell estimated={item.estimated_cost} actual={item.actual_cost} purchased={item.purchased} />
                </div>

                {/* Claim */}
                <div className="w-28">
                  {claimer ? (
                    <span className="flex items-center gap-1.5 text-xs text-stone-600">
                      <CamperAvatar name={claimer} className="w-6 h-6 text-[10px]" />
                      <span className="truncate">{item.claimed_by === myMemberId ? "You" : claimer}</span>
                    </span>
                  ) : (
                    roleAtLeast(myRole, "cit") && myMemberId && (
                      <button
                        onClick={() => claimMut.mutate({ id: item.id, memberId: myMemberId })}
                        className="text-xs flex items-center gap-1 text-forest-700 hover:underline"
                      >
                        <Hand className="w-3 h-3" /> I'll buy it
                      </button>
                    )
                  )}
                </div>

                {/* Buy / actual cost */}
                <div className="flex items-center gap-2">
                  {!item.purchased ? (
                    mayBuyThis ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="actual $"
                          value={actualDraft[item.id] ?? ""}
                          onChange={(e) => setActualDraft({ ...actualDraft, [item.id]: e.target.value })}
                          className="w-20 px-2 py-1 border-2 border-stone-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
                        />
                        <button
                          onClick={() => {
                            const v = actualDraft[item.id];
                            if (v) buyMut.mutate({ id: item.id, actual: Number(v) });
                          }}
                          className="btn-primary px-2 py-1 text-xs"
                        >
                          Bought
                        </button>
                      </div>
                    ) : null
                  ) : (
                    mayBuyThis && (
                      <>
                        <button
                          onClick={() => openSplitEditor(item)}
                          className="text-xs text-forest-700 hover:underline"
                        >
                          {customSplit ? "edit split" : "split"}
                        </button>
                        <button
                          onClick={() => buyMut.mutate({ id: item.id, actual: null })}
                          className="text-xs text-stone-400 hover:text-stone-700"
                          title="Mark as not purchased"
                        >
                          undo
                        </button>
                      </>
                    )
                  )}
                  <PermissionGate role={myRole} min="counselor">
                    <button
                      onClick={() => delMut.mutate(item.id)}
                      className="p-1 text-stone-300 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </PermissionGate>
                </div>

                {isEditingSplit && (
                  <div className="basis-full rounded-lg border-2 border-stone-100 bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <p
                        className={cn(
                          "text-xs",
                          status.matches
                            ? "text-forest-700"
                            : status.invalid || status.remaining < 0
                              ? "text-red-600"
                              : "text-stone-500"
                        )}
                      >
                        {status.message}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setSplitDrafts((drafts) => ({
                            ...drafts,
                            [item.id]: allocateEvenSplitDrafts(item.actual_cost ?? 0, splitTargets),
                          }))
                        }
                        className="text-xs font-medium text-forest-700 hover:text-forest-900"
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
                            value={splitDrafts[item.id]?.[target.id] ?? ""}
                            onChange={(e) =>
                              setSplitDrafts((drafts) => ({
                                ...drafts,
                                [item.id]: {
                                  ...(drafts[item.id] ?? {}),
                                  [target.id]: e.target.value,
                                },
                              }))
                            }
                            className="w-full px-3 py-2 border-2 border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 tabular-nums"
                            placeholder="0.00"
                          />
                        </label>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                      {customSplit && (
                        <button
                          type="button"
                          onClick={() => clearSplitMut.mutate(item.id)}
                          disabled={clearSplitMut.isPending}
                          className="px-3 py-1.5 text-xs font-medium text-stone-500 hover:text-stone-800 disabled:opacity-50"
                        >
                          Use equal split
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSplitEditorId(null)}
                        className="px-3 py-1.5 text-xs font-medium text-stone-500 hover:text-stone-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          saveSplitMut.mutate({ item, drafts: splitDrafts[item.id] ?? {} })
                        }
                        disabled={!status.matches || saveSplitMut.isPending}
                        className="btn-primary px-4 py-1.5 text-xs disabled:opacity-60"
                      >
                        {saveSplitMut.isPending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                        Save split
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
