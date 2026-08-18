import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Backpack, X, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/useAuth";
import { PageSpinner } from "@/components/ui/Spinner";
import type { GearItem } from "@/lib/types";

const CATEGORIES = ["shelter", "sleep", "clothing", "cooking", "safety", "hygiene", "navigation", "misc"];

interface GearForm {
  name: string;
  category: string;
  weight_oz: string;
  condition: string;
  notes: string;
}

const emptyForm: GearForm = { name: "", category: "shelter", weight_oz: "", condition: "good", notes: "" };

export default function MyGear() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<GearForm>(emptyForm);

  const gearQ = useQuery({
    queryKey: ["my-gear"],
    queryFn: async (): Promise<GearItem[]> => {
      const { data, error } = await supabase
        .from("gear_items")
        .select("*")
        .order("category");
      if (error) throw error;
      return data;
    },
  });

  const addMut = useMutation({
    mutationFn: async (f: GearForm) => {
      const { error } = await supabase.from("gear_items").insert({
        user_id: user!.id,
        name: f.name,
        category: f.category,
        weight_oz: f.weight_oz ? parseFloat(f.weight_oz) : null,
        condition: f.condition,
        notes: f.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-gear"] });
      setForm(emptyForm);
      setShowForm(false);
    },
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gear_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-gear"] }),
  });

  if (gearQ.isLoading) return <PageSpinner />;
  const gear = gearQ.data ?? [];
  const byCategory = CATEGORIES.map((c) => ({ category: c, items: gear.filter((g) => g.category === c) })).filter(
    (g) => g.items.length > 0
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-forest-100 rounded-lg">
            <Backpack className="w-6 h-6 text-forest-600" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-stone-900">My Gear</h1>
            <p className="text-sm text-stone-500">{gear.length} items in your kit</p>
          </div>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setForm(emptyForm);
          }}
          className="btn-primary px-4 py-2 text-sm"
        >
          {showForm ? <><X className="w-4 h-4 mr-1" /> Cancel</> : <><Plus className="w-4 h-4 mr-1" /> Add Gear</>}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addMut.mutate(form);
          }}
          className="card p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-stone-700 mb-1">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full px-3 py-2 border-2 border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
              placeholder="e.g. REI Half Dome 2 Tent"
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
            <label className="block text-sm font-medium text-stone-700 mb-1">Weight (oz)</label>
            <input
              type="number"
              step="any"
              value={form.weight_oz}
              onChange={(e) => setForm({ ...form, weight_oz: e.target.value })}
              className="w-full px-3 py-2 border-2 border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
              placeholder="optional"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-stone-700 mb-1">Notes</label>
            <input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 border-2 border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
              placeholder="optional"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" disabled={addMut.isPending} className="btn-primary px-6 py-2 text-sm">
              {addMut.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Save Gear
            </button>
          </div>
        </form>
      )}

      {gear.length === 0 ? (
        <div className="card p-12 text-center">
          <Backpack className="w-12 h-12 text-stone-300 mx-auto mb-4" />
          <p className="text-sm text-stone-500">No gear yet. Add your first item to build your kit.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {byCategory.map(({ category, items }) => (
            <div key={category}>
              <h2 className="text-sm font-heading font-semibold text-stone-700 uppercase tracking-wide mb-2 capitalize">
                {category}
              </h2>
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="card px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-stone-900">{item.name}</p>
                      <p className="text-xs text-stone-500">
                        {item.weight_oz ? `${item.weight_oz} oz · ` : ""}
                        {item.condition}
                        {item.notes ? ` · ${item.notes}` : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => delMut.mutate(item.id)}
                      className="p-2 hover:bg-red-50 rounded-lg text-stone-400 hover:text-red-600"
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
