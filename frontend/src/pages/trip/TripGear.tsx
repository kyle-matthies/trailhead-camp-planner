import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  Tent,
  X,
  Loader2,
  Hand,
  Undo2,
  AlertCircle,
  PackageOpen,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/useAuth";
import { useTrip } from "@/context/useTrip";
import type { MemberWithProfile } from "@/context/trip-context";
import { useTripRealtime } from "@/hooks/useTripRealtime";
import { PageSpinner } from "@/components/ui/Spinner";
import PermissionGate from "@/components/ui/PermissionGate";
import CamperAvatar from "@/components/ui/CamperAvatar";
import { roleAtLeast, type SharedGear } from "@/lib/types";

const CATEGORIES = ["shelter", "cooking", "safety", "comfort", "misc"] as const;
type Category = (typeof CATEGORIES)[number];

interface GearForm {
  name: string;
  category: Category;
  quantity: string;
  notes: string;
  mine: boolean;
}

const emptyForm: GearForm = {
  name: "",
  category: "shelter",
  quantity: "1",
  notes: "",
  mine: false,
};

function memberLabel(m: MemberWithProfile): string {
  return m.display_name || m.profile?.name || m.profile?.email || "Camper";
}

function errMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return "Something went wrong. Please try again.";
}

export default function TripGear() {
  const { user } = useAuth();
  const { tripId, members, myRole, myMemberId } = useTrip();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<GearForm>(emptyForm);

  useTripRealtime(tripId, ["trip_shared_gear"]);

  const gearQ = useQuery({
    queryKey: ["trip", tripId, "shared-gear"],
    queryFn: async (): Promise<SharedGear[]> => {
      const { data, error } = await supabase
        .from("trip_shared_gear")
        .select("*")
        .eq("trip_id", tripId)
        .order("category", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["trip", tripId, "shared-gear"] });

  const addMut = useMutation({
    mutationFn: async (f: GearForm) => {
      const qty = parseInt(f.quantity, 10);
      const { error } = await supabase.from("trip_shared_gear").insert({
        trip_id: tripId,
        name: f.name.trim(),
        category: f.category,
        quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
        notes: f.notes.trim() || null,
        // Composite FK: brought_by requires trip_id (set above) in the same insert.
        brought_by: f.mine ? myMemberId : null,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setForm(emptyForm);
      setShowForm(false);
    },
  });

  const claimMut = useMutation({
    mutationFn: async ({
      id,
      broughtBy,
    }: {
      id: string;
      broughtBy: string | null;
    }) => {
      // brought_by + trip_id together satisfy the composite FK on claim;
      // releasing simply nulls brought_by.
      const { error } = await supabase
        .from("trip_shared_gear")
        .update({ brought_by: broughtBy, trip_id: tripId })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("trip_shared_gear")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const gear = useMemo(() => gearQ.data ?? [], [gearQ.data]);
  const needed = useMemo(() => gear.filter((g) => !g.brought_by), [gear]);
  const claimed = useMemo(() => gear.filter((g) => g.brought_by), [gear]);

  const canAdd = roleAtLeast(myRole, "cit");
  const canManageAny = roleAtLeast(myRole, "counselor");

  if (gearQ.isLoading) return <PageSpinner />;

  const mutationError =
    addMut.error || claimMut.error || delMut.error || gearQ.error;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-forest-100 rounded-lg">
            <Tent className="w-6 h-6 text-forest-600" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-stone-900">
              Group Gear
            </h1>
            <p className="text-sm text-stone-500">
              {claimed.length} covered · {needed.length} still needed
            </p>
          </div>
        </div>
        <PermissionGate role={myRole} min="cit">
          <button
            onClick={() => {
              setShowForm((s) => !s);
              setForm(emptyForm);
              addMut.reset();
            }}
            className="btn-primary px-4 py-2 text-sm"
          >
            {showForm ? (
              <>
                <X className="w-4 h-4 mr-1" /> Cancel
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-1" /> Add Gear
              </>
            )}
          </button>
        </PermissionGate>
      </div>

      {mutationError && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{errMessage(mutationError)}</span>
        </div>
      )}

      <PermissionGate role={myRole} min="cit">
        {showForm && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addMut.mutate(form);
            }}
            className="card p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Name
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full px-3 py-2 border-2 border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
                placeholder="e.g. 2-burner camp stove"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value as Category })
                }
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
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="w-full px-3 py-2 border-2 border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Notes
              </label>
              <input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full px-3 py-2 border-2 border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
                placeholder="optional"
              />
            </div>
            <label className="sm:col-span-2 flex items-center gap-2 text-sm text-stone-700 select-none">
              <input
                type="checkbox"
                checked={form.mine}
                disabled={!myMemberId}
                onChange={(e) => setForm({ ...form, mine: e.target.checked })}
                className="w-4 h-4 rounded border-2 border-stone-300 text-forest-600 focus:ring-forest-500"
              />
              I&apos;ll bring this
            </label>
            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={addMut.isPending}
                className="btn-primary px-6 py-2 text-sm"
              >
                {addMut.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                )}
                Add to Group Gear
              </button>
            </div>
          </form>
        )}
      </PermissionGate>

      {gear.length === 0 ? (
        <div className="card p-12 text-center">
          <Tent className="w-12 h-12 text-stone-300 mx-auto mb-4" />
          <p className="text-sm text-stone-500">
            No group gear yet.
            {canAdd
              ? " Add the big shared items — stove, tent, water jug — so everyone knows what's covered."
              : " Shared items like the stove and tent will show up here once someone adds them."}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          <GearSection
            title="Still needed"
            icon={
              <PackageOpen className="w-4 h-4 text-campfire-600" />
            }
            emptyText="Nothing outstanding — every item has someone bringing it."
            tone="needed"
            items={needed}
            members={members}
            myMemberId={myMemberId}
            canManageAny={canManageAny}
            canClaim={canAdd}
            currentUserId={user?.id}
            claimMut={claimMut}
            delMut={delMut}
          />
          <GearSection
            title="Claimed"
            icon={<CheckCircle2 className="w-4 h-4 text-forest-600" />}
            emptyText="No items claimed yet."
            tone="claimed"
            items={claimed}
            members={members}
            myMemberId={myMemberId}
            canManageAny={canManageAny}
            canClaim={canAdd}
            currentUserId={user?.id}
            claimMut={claimMut}
            delMut={delMut}
          />
        </div>
      )}
    </div>
  );
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  emptyText: string;
  tone: "needed" | "claimed";
  items: SharedGear[];
  members: MemberWithProfile[];
  myMemberId: string | null;
  canManageAny: boolean;
  canClaim: boolean;
  currentUserId: string | undefined;
  claimMut: ReturnType<
    typeof useMutation<void, Error, { id: string; broughtBy: string | null }>
  >;
  delMut: ReturnType<typeof useMutation<void, Error, string>>;
}

function GearSection({
  title,
  icon,
  emptyText,
  tone,
  items,
  members,
  myMemberId,
  canManageAny,
  canClaim,
  currentUserId,
  claimMut,
  delMut,
}: SectionProps) {
  return (
    <section>
      <h2 className="flex items-center gap-2 text-sm font-heading font-semibold text-stone-700 uppercase tracking-wide mb-3">
        {icon}
        {title}
        <span className="text-stone-400 normal-case font-normal">
          ({items.length})
        </span>
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-stone-400 italic px-1">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const bringer = item.brought_by
              ? members.find((m) => m.id === item.brought_by) ?? null
              : null;
            const isMine = !!myMemberId && item.brought_by === myMemberId;
            const isPending =
              (claimMut.isPending &&
                claimMut.variables?.id === item.id) ||
              (delMut.isPending && delMut.variables === item.id);
            const canManageThis =
              canManageAny || item.created_by === currentUserId;

            return (
              <div
                key={item.id}
                className={
                  "card px-4 py-3 flex items-center justify-between gap-3" +
                  (tone === "needed"
                    ? " border-l-4 border-l-campfire-400"
                    : "")
                }
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-stone-900">{item.name}</p>
                    {item.quantity > 1 && (
                      <span className="text-xs font-semibold text-forest-700 bg-forest-100 rounded-full px-2 py-0.5">
                        ×{item.quantity}
                      </span>
                    )}
                    {item.category && (
                      <span className="text-xs text-stone-500 capitalize">
                        {item.category}
                      </span>
                    )}
                  </div>
                  {item.notes && (
                    <p className="text-xs text-stone-500 mt-0.5 truncate">
                      {item.notes}
                    </p>
                  )}
                  {bringer && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <CamperAvatar
                        name={memberLabel(bringer)}
                        className="w-6 h-6 text-[10px]"
                      />
                      <span className="text-xs text-stone-600">
                        {memberLabel(bringer)}
                        {isMine && (
                          <span className="text-forest-600 font-medium">
                            {" "}
                            (you)
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Claim an unclaimed item — any cit+ member. */}
                  {!item.brought_by && canClaim && myMemberId && (
                    <button
                      onClick={() =>
                        claimMut.mutate({
                          id: item.id,
                          broughtBy: myMemberId,
                        })
                      }
                      disabled={isPending}
                      className="inline-flex items-center gap-1 text-xs font-medium text-forest-700 hover:bg-forest-50 rounded-lg px-2.5 py-1.5 disabled:opacity-50"
                    >
                      {isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Hand className="w-3.5 h-3.5" />
                      )}
                      I&apos;ll bring it
                    </button>
                  )}
                  {/* Release my own claim. */}
                  {isMine && (
                    <button
                      onClick={() =>
                        claimMut.mutate({ id: item.id, broughtBy: null })
                      }
                      disabled={isPending}
                      className="inline-flex items-center gap-1 text-xs font-medium text-stone-500 hover:bg-stone-100 rounded-lg px-2.5 py-1.5 disabled:opacity-50"
                    >
                      {isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Undo2 className="w-3.5 h-3.5" />
                      )}
                      Release
                    </button>
                  )}
                  {/* Counselor+ or the creator can delete any item. */}
                  {canManageThis && (
                    <button
                      onClick={() => delMut.mutate(item.id)}
                      disabled={isPending}
                      title="Delete item"
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
    </section>
  );
}
