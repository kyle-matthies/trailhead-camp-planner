import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  X,
  Loader2,
  Sparkles,
  ListChecks,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/useAuth";
import { useTrip } from "@/context/useTrip";
import { PageSpinner } from "@/components/ui/Spinner";
import type { PackingItem } from "@/lib/types";

const CATEGORIES = [
  "shelter",
  "sleep",
  "clothing",
  "cooking",
  "safety",
  "hygiene",
  "misc",
] as const;

type Category = (typeof CATEGORIES)[number];

interface AddForm {
  name: string;
  category: Category;
}

const emptyForm: AddForm = { name: "", category: "misc" };

export default function TripPacking() {
  const { tripId } = useTrip();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AddForm>(emptyForm);

  const queryKey = ["trip", tripId, "packing"] as const;

  const itemsQ = useQuery({
    queryKey,
    queryFn: async (): Promise<PackingItem[]> => {
      // RLS already scopes rows to owner_id = current user; this list is private.
      const { data, error } = await supabase
        .from("trip_packing_items")
        .select("*")
        .eq("trip_id", tripId)
        .order("category");
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey });

  const addMut = useMutation({
    mutationFn: async (f: AddForm) => {
      const { error } = await supabase.from("trip_packing_items").insert({
        trip_id: tripId,
        owner_id: user!.id,
        name: f.name.trim(),
        category: f.category,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setForm(emptyForm);
      setShowForm(false);
    },
  });

  const toggleMut = useMutation({
    mutationFn: async (item: PackingItem) => {
      const { error } = await supabase
        .from("trip_packing_items")
        .update({ packed: !item.packed })
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("trip_packing_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  if (itemsQ.isLoading) return <PageSpinner />;

  if (itemsQ.isError) {
    return (
      <div className="card p-12 text-center">
        <p className="text-sm text-red-600">
          Couldn't load your packing list. Please try again.
        </p>
      </div>
    );
  }

  const items = itemsQ.data ?? [];
  const total = items.length;
  const packedCount = items.filter((i) => i.packed).length;
  const pct = total > 0 ? Math.round((packedCount / total) * 100) : 0;

  const byCategory = CATEGORIES.map((c) => ({
    category: c,
    items: items.filter((i) => i.category === c),
  })).filter((g) => g.items.length > 0);

  const mutationError =
    addMut.error || toggleMut.error || delMut.error
      ? "Something went wrong. Please try again."
      : null;

  return (
    <div className="max-w-3xl mx-auto py-2">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-forest-100 rounded-lg">
            <ListChecks className="w-6 h-6 text-forest-600" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-stone-900">
              My Packing List
            </h1>
            <p className="text-sm text-stone-500">
              Your private checklist for this trip
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setShowForm((s) => !s);
            setForm(emptyForm);
          }}
          className="btn-primary px-4 py-2 text-sm"
        >
          {showForm ? (
            <>
              <X className="w-4 h-4 mr-1" /> Cancel
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-1" /> Add Item
            </>
          )}
        </button>
      </div>

      {total > 0 && (
        <div className="card p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-stone-700">
              {packedCount} of {total} packed
            </span>
            <span className="text-sm text-stone-500">{pct}%</span>
          </div>
          <div
            className="h-2 w-full bg-stone-100 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full bg-forest-500 rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.name.trim()) return;
            addMut.mutate(form);
          }}
          className="card p-6 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Item
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              autoFocus
              className="w-full px-3 py-2 border-2 border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
              placeholder="e.g. Headlamp"
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
          <div className="sm:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={addMut.isPending || !form.name.trim()}
              className="btn-primary px-6 py-2 text-sm disabled:opacity-60"
            >
              {addMut.isPending && (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              )}
              Add to List
            </button>
          </div>
        </form>
      )}

      {mutationError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {mutationError}
        </div>
      )}

      {total === 0 ? (
        <div className="card p-12 text-center">
          <ListChecks className="w-12 h-12 text-stone-300 mx-auto mb-4" />
          <p className="text-sm font-medium text-stone-700">
            Your packing list is empty.
          </p>
          <p className="text-sm text-stone-500 mt-1">
            Add items above to start checking things off before you head out.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {byCategory.map(({ category, items: catItems }) => (
            <div key={category}>
              <h2 className="text-sm font-heading font-semibold text-stone-700 uppercase tracking-wide mb-2 capitalize">
                {category}
              </h2>
              <div className="space-y-2">
                {catItems.map((item) => (
                  <div
                    key={item.id}
                    className="card px-4 py-3 flex items-center gap-3"
                  >
                    <button
                      onClick={() => toggleMut.mutate(item)}
                      disabled={toggleMut.isPending}
                      aria-pressed={item.packed}
                      aria-label={item.packed ? "Mark as not packed" : "Mark as packed"}
                      className="shrink-0 text-stone-300 hover:text-forest-500 transition-colors disabled:opacity-50"
                    >
                      {item.packed ? (
                        <CheckSquare className="w-6 h-6 text-forest-600" />
                      ) : (
                        <Square className="w-6 h-6" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span
                        className={
                          item.packed
                            ? "text-stone-400 line-through truncate"
                            : "text-stone-900 truncate"
                        }
                      >
                        {item.name}
                      </span>
                      {item.is_recommendation && (
                        <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          <Sparkles className="w-3 h-3" /> AI
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => delMut.mutate(item.id)}
                      disabled={delMut.isPending}
                      aria-label="Delete item"
                      className="shrink-0 p-2 hover:bg-red-50 rounded-lg text-stone-400 hover:text-red-600 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
