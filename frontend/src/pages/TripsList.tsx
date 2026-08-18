import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Tent, MapPin, Calendar, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/useAuth";
import { PageSpinner } from "@/components/ui/Spinner";
import type { Trip } from "@/lib/types";

const CAMPING_TYPES = [
  "car",
  "backpacking",
  "beach",
  "mountain",
  "desert",
  "winter",
  "glamping",
  "rv",
];

const emptyForm = {
  name: "",
  destination: "",
  start_date: "",
  end_date: "",
  camping_type: "car",
};

function fmt(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function TripsList() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const tripsQ = useQuery({
    queryKey: ["trips"],
    queryFn: async (): Promise<Trip[]> => {
      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMut = useMutation({
    mutationFn: async (): Promise<Trip> => {
      const { data, error } = await supabase
        .from("trips")
        .insert({
          owner_id: user!.id,
          name: form.name,
          destination: form.destination,
          start_date: form.start_date,
          end_date: form.end_date,
          camping_type: form.camping_type,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (trip) => {
      qc.invalidateQueries({ queryKey: ["trips"] });
      navigate(`/trips/${trip.id}`);
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Failed to create trip"),
  });

  if (tripsQ.isLoading) return <PageSpinner />;
  const trips = tripsQ.data ?? [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-forest-100 rounded-lg">
            <Tent className="w-6 h-6 text-forest-600" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-stone-900">My Trips</h1>
            <p className="text-sm text-stone-500">{trips.length} camping trips</p>
          </div>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setForm(emptyForm);
            setError("");
          }}
          className="btn-primary px-4 py-2 text-sm"
        >
          {showForm ? <><X className="w-4 h-4 mr-1" /> Cancel</> : <><Plus className="w-4 h-4 mr-1" /> New Trip</>}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            createMut.mutate();
          }}
          className="card p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <div className="sm:col-span-2">
            <label htmlFor="trip-name" className="block text-sm font-medium text-stone-700 mb-1">
              Trip Name
            </label>
            <input
              id="trip-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full px-3 py-2 border-2 border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
              placeholder="e.g. Fall Friends Campout"
            />
          </div>
          <div>
            <label htmlFor="trip-destination" className="block text-sm font-medium text-stone-700 mb-1">
              Destination
            </label>
            <input
              id="trip-destination"
              value={form.destination}
              onChange={(e) => setForm({ ...form, destination: e.target.value })}
              className="w-full px-3 py-2 border-2 border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
              placeholder="e.g. Big Basin, CA"
            />
          </div>
          <div>
            <label htmlFor="trip-camping-type" className="block text-sm font-medium text-stone-700 mb-1">
              Camping Type
            </label>
            <select
              id="trip-camping-type"
              value={form.camping_type}
              onChange={(e) => setForm({ ...form, camping_type: e.target.value })}
              className="w-full px-3 py-2 border-2 border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 capitalize"
            >
              {CAMPING_TYPES.map((t) => (
                <option key={t} value={t} className="capitalize">{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="trip-start-date" className="block text-sm font-medium text-stone-700 mb-1">
              Start Date
            </label>
            <input
              id="trip-start-date"
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              required
              className="w-full px-3 py-2 border-2 border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
            />
          </div>
          <div>
            <label htmlFor="trip-end-date" className="block text-sm font-medium text-stone-700 mb-1">
              End Date
            </label>
            <input
              id="trip-end-date"
              type="date"
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              required
              min={form.start_date || undefined}
              className="w-full px-3 py-2 border-2 border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" disabled={createMut.isPending} className="btn-primary px-6 py-2 text-sm">
              {createMut.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Create Trip
            </button>
          </div>
        </form>
      )}

      {trips.length === 0 ? (
        <div className="card p-12 text-center">
          <Tent className="w-12 h-12 text-stone-300 mx-auto mb-4" />
          <h3 className="text-lg font-heading font-semibold text-stone-700 mb-2">No trips yet</h3>
          <p className="text-sm text-stone-500 mb-4">
            Create a trip and invite your friends to start planning together.
          </p>
          <button onClick={() => setShowForm(true)} className="btn-primary px-4 py-2 text-sm">
            <Plus className="w-4 h-4 mr-1" /> Create Your First Trip
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {trips.map((trip) => (
            <Link
              key={trip.id}
              to={`/trips/${trip.id}`}
              className="card hover:shadow-md transition-shadow flex items-center p-4 gap-4"
            >
              <div className="hidden sm:flex p-3 bg-forest-50 rounded-lg">
                <Tent className="w-6 h-6 text-forest-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-heading font-semibold text-stone-900 truncate">{trip.name}</h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-stone-500">
                  {trip.destination && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {trip.destination}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {fmt(trip.start_date)} – {fmt(trip.end_date)}
                  </span>
                  <span className="px-2 py-0.5 bg-sand-100 rounded-full text-sand-700 capitalize">
                    {trip.camping_type}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-stone-400" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
