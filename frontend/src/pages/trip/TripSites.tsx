import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Tent as TentIcon,
  Car,
  MapPin,
  Plus,
  X,
  Loader2,
  Trash2,
  UserPlus,
  Users,
  DollarSign,
  CalendarDays,
  Hash,
  Pencil,
  Check,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useTrip } from "@/context/useTrip";
import type { MemberWithProfile } from "@/context/trip-context";
import { useTripRealtime } from "@/hooks/useTripRealtime";
import { PageSpinner } from "@/components/ui/Spinner";
import PermissionGate from "@/components/ui/PermissionGate";
import CamperAvatar from "@/components/ui/CamperAvatar";
import { roleAtLeast } from "@/lib/types";
import { buildSiteMapSummary, type SiteMapSummary, type SiteOccupancyStatus } from "@/lib/siteMap";
import type {
  Campground,
  Campsite,
  Tent,
  Vehicle,
  SiteAssignment,
} from "@/lib/types";

/** Resolve a trip_members.id to a friendly display name using the roster. */
function memberName(members: MemberWithProfile[], memberId: string | null | undefined): string {
  if (!memberId) return "Unassigned";
  const m = members.find((mm) => mm.id === memberId);
  if (!m) return "Camper";
  return m.display_name || m.profile?.name || m.profile?.email || "Camper";
}

interface CampgroundForm {
  name: string;
  address: string;
  reservation_ref: string;
  check_in_date: string;
  check_out_date: string;
  notes: string;
}

interface CampsiteForm {
  site_number: string;
  max_tents: string;
  max_vehicles: string;
  nightly_cost: string;
  notes: string;
}

interface GearForm {
  label: string;
  detail: string; // capacity for tents, license_plate for vehicles
}

const emptyCampgroundForm: CampgroundForm = {
  name: "",
  address: "",
  reservation_ref: "",
  check_in_date: "",
  check_out_date: "",
  notes: "",
};

const emptyCampsiteForm: CampsiteForm = {
  site_number: "",
  max_tents: "",
  max_vehicles: "",
  nightly_cost: "",
  notes: "",
};

function inputCls() {
  return "w-full px-3 py-2 border-2 border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500";
}

export default function TripSites() {
  const { tripId, members, myRole, myMemberId } = useTrip();
  const qc = useQueryClient();

  useTripRealtime(tripId, ["campsites", "tents", "vehicles", "site_camper_assignments"]);

  const canManage = roleAtLeast(myRole, "counselor");
  const canBringGear = roleAtLeast(myRole, "cit");

  // ---- Queries -----------------------------------------------------------
  const campgroundQ = useQuery({
    queryKey: ["trip", tripId, "sites", "campground"],
    queryFn: async (): Promise<Campground | null> => {
      const { data, error } = await supabase
        .from("campgrounds")
        .select("*")
        .eq("trip_id", tripId)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });

  const campsitesQ = useQuery({
    queryKey: ["trip", tripId, "sites", "campsites"],
    queryFn: async (): Promise<Campsite[]> => {
      const { data, error } = await supabase
        .from("campsites")
        .select("*")
        .eq("trip_id", tripId)
        .order("site_number");
      if (error) throw error;
      return data ?? [];
    },
  });

  const tentsQ = useQuery({
    queryKey: ["trip", tripId, "sites", "tents"],
    queryFn: async (): Promise<Tent[]> => {
      const { data, error } = await supabase
        .from("tents")
        .select("*")
        .eq("trip_id", tripId)
        .order("label");
      if (error) throw error;
      return data ?? [];
    },
  });

  const vehiclesQ = useQuery({
    queryKey: ["trip", tripId, "sites", "vehicles"],
    queryFn: async (): Promise<Vehicle[]> => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("trip_id", tripId)
        .order("label");
      if (error) throw error;
      return data ?? [];
    },
  });

  const assignmentsQ = useQuery({
    queryKey: ["trip", tripId, "sites", "assignments"],
    queryFn: async (): Promise<SiteAssignment[]> => {
      const { data, error } = await supabase
        .from("site_camper_assignments")
        .select("*")
        .eq("trip_id", tripId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const invalidateAll = () =>
    qc.invalidateQueries({ queryKey: ["trip", tripId, "sites"] });

  // ---- Mutations ---------------------------------------------------------
  const createCampgroundMut = useMutation({
    mutationFn: async (f: CampgroundForm) => {
      const { error } = await supabase.from("campgrounds").insert({
        trip_id: tripId,
        name: f.name.trim(),
        address: f.address.trim() || null,
        reservation_ref: f.reservation_ref.trim() || null,
        check_in_date: f.check_in_date || null,
        check_out_date: f.check_out_date || null,
        notes: f.notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  const updateCampgroundMut = useMutation({
    mutationFn: async (vars: { id: string; f: CampgroundForm }) => {
      const { error } = await supabase
        .from("campgrounds")
        .update({
          name: vars.f.name.trim(),
          address: vars.f.address.trim() || null,
          reservation_ref: vars.f.reservation_ref.trim() || null,
          check_in_date: vars.f.check_in_date || null,
          check_out_date: vars.f.check_out_date || null,
          notes: vars.f.notes.trim() || null,
        })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingCampground(false);
      invalidateAll();
    },
  });

  const addCampsiteMut = useMutation({
    mutationFn: async (vars: { campgroundId: string; f: CampsiteForm }) => {
      // Composite FK: BOTH campground_id and trip_id must be set together.
      const { error } = await supabase.from("campsites").insert({
        trip_id: tripId,
        campground_id: vars.campgroundId,
        site_number: vars.f.site_number.trim(),
        max_tents: vars.f.max_tents ? parseInt(vars.f.max_tents, 10) : null,
        max_vehicles: vars.f.max_vehicles ? parseInt(vars.f.max_vehicles, 10) : null,
        nightly_cost: vars.f.nightly_cost ? parseFloat(vars.f.nightly_cost) : null,
        notes: vars.f.notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setShowSiteForm(false);
      setSiteForm(emptyCampsiteForm);
      invalidateAll();
    },
  });

  const deleteCampsiteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campsites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  const assignCamperMut = useMutation({
    mutationFn: async (vars: { campsiteId: string; memberId: string }) => {
      // INSERT must set trip_id, campsite_id AND member_id.
      const { error } = await supabase.from("site_camper_assignments").insert({
        trip_id: tripId,
        campsite_id: vars.campsiteId,
        member_id: vars.memberId,
      });
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  const unassignCamperMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("site_camper_assignments")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  const addTentMut = useMutation({
    mutationFn: async (vars: { campsiteId: string; f: GearForm; mine: boolean }) => {
      // campsite_id + trip_id is a composite FK, set together. owned_by also needs trip_id.
      const { error } = await supabase.from("tents").insert({
        trip_id: tripId,
        campsite_id: vars.campsiteId,
        label: vars.f.label.trim(),
        capacity: vars.f.detail ? parseInt(vars.f.detail, 10) : null,
        owned_by: vars.mine ? myMemberId : null,
      });
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  const addVehicleMut = useMutation({
    mutationFn: async (vars: { campsiteId: string; f: GearForm; mine: boolean }) => {
      const { error } = await supabase.from("vehicles").insert({
        trip_id: tripId,
        campsite_id: vars.campsiteId,
        label: vars.f.label.trim(),
        license_plate: vars.f.detail.trim() || null,
        owned_by: vars.mine ? myMemberId : null,
      });
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  const removeTentMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  const removeVehicleMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vehicles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  // ---- Local UI state ----------------------------------------------------
  const [cgForm, setCgForm] = useState<CampgroundForm>(emptyCampgroundForm);
  const [editingCampground, setEditingCampground] = useState(false);
  const [showSiteForm, setShowSiteForm] = useState(false);
  const [siteForm, setSiteForm] = useState<CampsiteForm>(emptyCampsiteForm);

  // ---- Loading -----------------------------------------------------------
  const loading =
    campgroundQ.isLoading ||
    campsitesQ.isLoading ||
    tentsQ.isLoading ||
    vehiclesQ.isLoading ||
    assignmentsQ.isLoading;
  if (loading) return <PageSpinner />;

  const campground = campgroundQ.data ?? null;
  const campsites = campsitesQ.data ?? [];
  const tents = tentsQ.data ?? [];
  const vehicles = vehiclesQ.data ?? [];
  const assignments = assignmentsQ.data ?? [];
  const siteMap = buildSiteMapSummary(campsites, assignments, tents, vehicles);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-forest-100 rounded-lg">
          <MapPin className="w-6 h-6 text-forest-600" />
        </div>
        <div>
          <h1 className="text-2xl font-heading font-bold text-stone-900">Sites</h1>
          <p className="text-sm text-stone-500">Campground, sites &amp; who&apos;s where</p>
        </div>
      </div>

      {/* ---- Campground header card -------------------------------------- */}
      {!campground ? (
        <PermissionGate
          role={myRole}
          min="counselor"
          fallback={
            <div className="card p-12 text-center mb-8">
              <MapPin className="w-12 h-12 text-stone-300 mx-auto mb-4" />
              <p className="text-sm text-stone-500">
                No campground set yet. A counselor will add one.
              </p>
            </div>
          }
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createCampgroundMut.mutate(cgForm);
            }}
            className="card p-6 mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <div className="sm:col-span-2">
              <h2 className="text-lg font-heading font-semibold text-stone-900">
                Set the campground
              </h2>
              <p className="text-xs text-stone-500">One campground per trip.</p>
            </div>
            <CampgroundFields form={cgForm} setForm={setCgForm} />
            {createCampgroundMut.isError && (
              <p className="sm:col-span-2 text-sm text-red-600">
                {(createCampgroundMut.error as Error).message}
              </p>
            )}
            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={createCampgroundMut.isPending || !cgForm.name.trim()}
                className="btn-primary px-6 py-2 text-sm disabled:opacity-50"
              >
                {createCampgroundMut.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                )}
                Save Campground
              </button>
            </div>
          </form>
        </PermissionGate>
      ) : editingCampground ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateCampgroundMut.mutate({ id: campground.id, f: cgForm });
          }}
          className="card p-6 mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <div className="sm:col-span-2 flex items-center justify-between">
            <h2 className="text-lg font-heading font-semibold text-stone-900">
              Edit campground
            </h2>
            <button
              type="button"
              onClick={() => setEditingCampground(false)}
              className="p-2 hover:bg-stone-100 rounded-lg text-stone-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <CampgroundFields form={cgForm} setForm={setCgForm} />
          {updateCampgroundMut.isError && (
            <p className="sm:col-span-2 text-sm text-red-600">
              {(updateCampgroundMut.error as Error).message}
            </p>
          )}
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={updateCampgroundMut.isPending || !cgForm.name.trim()}
              className="btn-primary px-6 py-2 text-sm disabled:opacity-50"
            >
              {updateCampgroundMut.isPending && (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              )}
              Save Changes
            </button>
          </div>
        </form>
      ) : (
        <div className="card p-6 mb-8">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-heading font-semibold text-stone-900 truncate">
                {campground.name}
              </h2>
              {campground.address && (
                <p className="text-sm text-stone-600 mt-1 flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-stone-400 shrink-0" />
                  {campground.address}
                </p>
              )}
            </div>
            <PermissionGate role={myRole} min="counselor">
              <button
                onClick={() => {
                  setCgForm({
                    name: campground.name,
                    address: campground.address ?? "",
                    reservation_ref: campground.reservation_ref ?? "",
                    check_in_date: campground.check_in_date ?? "",
                    check_out_date: campground.check_out_date ?? "",
                    notes: campground.notes ?? "",
                  });
                  setEditingCampground(true);
                }}
                className="p-2 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-forest-600 shrink-0"
                title="Edit campground"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </PermissionGate>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-stone-600">
            {campground.reservation_ref && (
              <span className="flex items-center gap-1">
                <Hash className="w-4 h-4 text-stone-400" />
                {campground.reservation_ref}
              </span>
            )}
            {(campground.check_in_date || campground.check_out_date) && (
              <span className="flex items-center gap-1">
                <CalendarDays className="w-4 h-4 text-stone-400" />
                {campground.check_in_date || "?"} &rarr; {campground.check_out_date || "?"}
              </span>
            )}
          </div>
          {campground.notes && (
            <p className="mt-3 text-sm text-stone-500 whitespace-pre-wrap">
              {campground.notes}
            </p>
          )}
        </div>
      )}

      {/* ---- Campsites --------------------------------------------------- */}
      {campground && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-heading font-semibold text-stone-700 uppercase tracking-wide">
              Campsites
            </h2>
            <PermissionGate role={myRole} min="counselor">
              <button
                onClick={() => {
                  setShowSiteForm((s) => !s);
                  setSiteForm(emptyCampsiteForm);
                }}
                className="btn-outline px-3 py-1.5 text-sm"
              >
                {showSiteForm ? (
                  <>
                    <X className="w-4 h-4 mr-1" /> Cancel
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-1" /> Add Site
                  </>
                )}
              </button>
            </PermissionGate>
          </div>

          {showSiteForm && canManage && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addCampsiteMut.mutate({ campgroundId: campground.id, f: siteForm });
              }}
              className="card p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Site number
                </label>
                <input
                  value={siteForm.site_number}
                  onChange={(e) => setSiteForm({ ...siteForm, site_number: e.target.value })}
                  required
                  className={inputCls()}
                  placeholder="e.g. A12"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Nightly cost
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={siteForm.nightly_cost}
                  onChange={(e) => setSiteForm({ ...siteForm, nightly_cost: e.target.value })}
                  className={inputCls()}
                  placeholder="optional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Max tents
                </label>
                <input
                  type="number"
                  min="0"
                  value={siteForm.max_tents}
                  onChange={(e) => setSiteForm({ ...siteForm, max_tents: e.target.value })}
                  className={inputCls()}
                  placeholder="optional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Max vehicles
                </label>
                <input
                  type="number"
                  min="0"
                  value={siteForm.max_vehicles}
                  onChange={(e) => setSiteForm({ ...siteForm, max_vehicles: e.target.value })}
                  className={inputCls()}
                  placeholder="optional"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-stone-700 mb-1">Notes</label>
                <input
                  value={siteForm.notes}
                  onChange={(e) => setSiteForm({ ...siteForm, notes: e.target.value })}
                  className={inputCls()}
                  placeholder="optional"
                />
              </div>
              {addCampsiteMut.isError && (
                <p className="sm:col-span-2 text-sm text-red-600">
                  {(addCampsiteMut.error as Error).message}
                </p>
              )}
              <div className="sm:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={addCampsiteMut.isPending || !siteForm.site_number.trim()}
                  className="btn-primary px-6 py-2 text-sm disabled:opacity-50"
                >
                  {addCampsiteMut.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  )}
                  Add Site
                </button>
              </div>
            </form>
          )}

          {campsites.length === 0 ? (
            <div className="card p-12 text-center">
              <TentIcon className="w-12 h-12 text-stone-300 mx-auto mb-4" />
              <p className="text-sm text-stone-500">
                No campsites reserved yet.
                {canManage ? " Add one to start assigning campers." : ""}
              </p>
            </div>
          ) : (
            <>
              <SiteMapPanel summaries={siteMap} />
              <div className="space-y-4">
                {campsites.map((site) => (
                  <CampsiteCard
                    key={site.id}
                    site={site}
                    members={members}
                    myMemberId={myMemberId}
                    canManage={canManage}
                    canBringGear={canBringGear}
                    assignments={assignments.filter((a) => a.campsite_id === site.id)}
                    tents={tents.filter((t) => t.campsite_id === site.id)}
                    vehicles={vehicles.filter((v) => v.campsite_id === site.id)}
                    onAssign={(memberId) =>
                      assignCamperMut.mutate({ campsiteId: site.id, memberId })
                    }
                    onUnassign={(id) => unassignCamperMut.mutate(id)}
                    onAddTent={(f, mine) =>
                      addTentMut.mutate({ campsiteId: site.id, f, mine })
                    }
                    onAddVehicle={(f, mine) =>
                      addVehicleMut.mutate({ campsiteId: site.id, f, mine })
                    }
                    onRemoveTent={(id) => removeTentMut.mutate(id)}
                    onRemoveVehicle={(id) => removeVehicleMut.mutate(id)}
                    onDeleteSite={(id) => deleteCampsiteMut.mutate(id)}
                    assignError={
                      assignCamperMut.isError ? (assignCamperMut.error as Error).message : null
                    }
                    gearError={
                      addTentMut.isError
                        ? (addTentMut.error as Error).message
                        : addVehicleMut.isError
                        ? (addVehicleMut.error as Error).message
                        : null
                    }
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

/** Shared campground form fields (used for both create and edit). */
function CampgroundFields({
  form,
  setForm,
}: {
  form: CampgroundForm;
  setForm: (f: CampgroundForm) => void;
}) {
  return (
    <>
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-stone-700 mb-1">Name</label>
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          className={inputCls()}
          placeholder="e.g. Northstar Ridge Campground"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-stone-700 mb-1">Address</label>
        <input
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          className={inputCls()}
          placeholder="optional"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Reservation #
        </label>
        <input
          value={form.reservation_ref}
          onChange={(e) => setForm({ ...form, reservation_ref: e.target.value })}
          className={inputCls()}
          placeholder="optional"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Check-in</label>
          <input
            type="date"
            value={form.check_in_date}
            onChange={(e) => setForm({ ...form, check_in_date: e.target.value })}
            className={inputCls()}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Check-out</label>
          <input
            type="date"
            value={form.check_out_date}
            onChange={(e) => setForm({ ...form, check_out_date: e.target.value })}
            className={inputCls()}
          />
        </div>
      </div>
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-stone-700 mb-1">Notes</label>
        <input
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className={inputCls()}
          placeholder="optional"
        />
      </div>
    </>
  );
}

function statusClass(status: SiteOccupancyStatus): string {
  if (status === "over") return "bg-red-100 text-red-700 border-red-200";
  if (status === "full") return "bg-amber-100 text-amber-700 border-amber-200";
  if (status === "open") return "bg-forest-100 text-forest-700 border-forest-200";
  return "bg-stone-100 text-stone-500 border-stone-200";
}

function statusLabel(status: SiteOccupancyStatus): string {
  if (status === "over") return "Over";
  if (status === "full") return "Full";
  if (status === "open") return "Open";
  return "Empty";
}

function capacityLabel(count: number, max: number | null): string {
  return max == null || max <= 0 ? `${count}` : `${count}/${max}`;
}

function SiteMapPanel({ summaries }: { summaries: SiteMapSummary[] }) {
  const assignedCampers = summaries.reduce((sum, site) => sum + site.camperCount, 0);
  const totalTents = summaries.reduce((sum, site) => sum + site.tentCount, 0);
  const totalVehicles = summaries.reduce((sum, site) => sum + site.vehicleCount, 0);

  return (
    <section className="mb-6 border border-stone-200 rounded-lg bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h3 className="text-sm font-heading font-semibold text-stone-900">Site map</h3>
          <p className="text-xs text-stone-500">
            {summaries.length} sites - {assignedCampers} campers - {totalTents} tents - {totalVehicles} vehicles
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          {(["empty", "open", "full", "over"] as SiteOccupancyStatus[]).map((status) => (
            <span key={status} className={`px-2 py-1 border rounded-full ${statusClass(status)}`}>
              {statusLabel(status)}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {summaries.map((summary) => {
          const alertStatus =
            summary.tentStatus === "over" || summary.vehicleStatus === "over"
              ? "over"
              : summary.tentStatus === "full" || summary.vehicleStatus === "full"
              ? "full"
              : summary.camperCount || summary.tentCount || summary.vehicleCount
              ? "open"
              : "empty";
          return (
            <div
              key={summary.site.id}
              className={`min-h-[132px] rounded-lg border p-3 ${statusClass(alertStatus)}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase opacity-75">Site</p>
                  <p className="text-lg font-heading font-semibold truncate">
                    {summary.site.site_number}
                  </p>
                </div>
                <span className="px-2 py-1 rounded-full bg-white/70 border border-current/10 text-[11px]">
                  {statusLabel(alertStatus)}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-md bg-white/70 p-2">
                  <Users className="w-3.5 h-3.5 mb-1" />
                  <span className="block font-semibold">{summary.camperCount}</span>
                  <span className="opacity-75">Campers</span>
                </div>
                <div className="rounded-md bg-white/70 p-2">
                  <TentIcon className="w-3.5 h-3.5 mb-1" />
                  <span className="block font-semibold">
                    {capacityLabel(summary.tentCount, summary.site.max_tents)}
                  </span>
                  <span className="opacity-75">Tents</span>
                </div>
                <div className="rounded-md bg-white/70 p-2">
                  <Car className="w-3.5 h-3.5 mb-1" />
                  <span className="block font-semibold">
                    {capacityLabel(summary.vehicleCount, summary.site.max_vehicles)}
                  </span>
                  <span className="opacity-75">Cars</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

interface CampsiteCardProps {
  site: Campsite;
  members: MemberWithProfile[];
  myMemberId: string | null;
  canManage: boolean;
  canBringGear: boolean;
  assignments: SiteAssignment[];
  tents: Tent[];
  vehicles: Vehicle[];
  onAssign: (memberId: string) => void;
  onUnassign: (id: string) => void;
  onAddTent: (f: GearForm, mine: boolean) => void;
  onAddVehicle: (f: GearForm, mine: boolean) => void;
  onRemoveTent: (id: string) => void;
  onRemoveVehicle: (id: string) => void;
  onDeleteSite: (id: string) => void;
  assignError: string | null;
  gearError: string | null;
}

function CampsiteCard({
  site,
  members,
  myMemberId,
  canManage,
  canBringGear,
  assignments,
  tents,
  vehicles,
  onAssign,
  onUnassign,
  onAddTent,
  onAddVehicle,
  onRemoveTent,
  onRemoveVehicle,
  onDeleteSite,
  assignError,
  gearError,
}: CampsiteCardProps) {
  const [assignPick, setAssignPick] = useState("");
  const [showGear, setShowGear] = useState<null | "tent" | "vehicle">(null);
  const [gearForm, setGearForm] = useState<GearForm>({ label: "", detail: "" });

  // Members not already assigned to this site.
  const assignedIds = new Set(assignments.map((a) => a.member_id));
  const available = useMemo(
    () => members.filter((m) => !assignedIds.has(m.id)),
    // assignedIds derives from assignments; members/assignments are the real deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [members, assignments]
  );

  const submitGear = (mine: boolean) => {
    if (!gearForm.label.trim()) return;
    if (showGear === "tent") onAddTent(gearForm, mine);
    else if (showGear === "vehicle") onAddVehicle(gearForm, mine);
    setGearForm({ label: "", detail: "" });
    setShowGear(null);
  };

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-heading font-semibold text-stone-900 flex items-center gap-2">
            <TentIcon className="w-4 h-4 text-forest-600" />
            Site {site.site_number}
          </h3>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-stone-500">
            {site.max_tents != null && (
              <span className="flex items-center gap-1">
                <TentIcon className="w-3.5 h-3.5" /> {tents.length}/{site.max_tents} tents
              </span>
            )}
            {site.max_vehicles != null && (
              <span className="flex items-center gap-1">
                <Car className="w-3.5 h-3.5" /> {vehicles.length}/{site.max_vehicles} vehicles
              </span>
            )}
            {site.nightly_cost != null && (
              <span className="flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" /> {site.nightly_cost.toFixed(2)}/night
              </span>
            )}
          </div>
          {site.notes && <p className="mt-1 text-xs text-stone-500">{site.notes}</p>}
        </div>
        {canManage && (
          <button
            onClick={() => {
              if (window.confirm(`Delete site ${site.site_number}? This removes its assignments.`)) {
                onDeleteSite(site.id);
              }
            }}
            className="p-2 hover:bg-red-50 rounded-lg text-stone-400 hover:text-red-600 shrink-0"
            title="Delete site"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Campers */}
      <div className="mt-4">
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2 flex items-center gap-1">
          <Users className="w-3.5 h-3.5" /> Campers
        </p>
        {assignments.length === 0 ? (
          <p className="text-xs text-stone-400">No campers assigned.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {assignments.map((a) => {
              const name = memberName(members, a.member_id);
              return (
                <span
                  key={a.id}
                  className="inline-flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-full pl-1 pr-2 py-0.5"
                >
                  <CamperAvatar name={name} className="w-6 h-6 text-[10px]" />
                  <span className="text-sm text-stone-700">{name}</span>
                  {canManage && (
                    <button
                      onClick={() => onUnassign(a.id)}
                      className="text-stone-400 hover:text-red-600"
                      title="Remove from site"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </span>
              );
            })}
          </div>
        )}

        {canManage && (
          <div className="mt-2">
            <div className="flex items-center gap-2">
              <select
                value={assignPick}
                onChange={(e) => setAssignPick(e.target.value)}
                className="flex-1 px-3 py-1.5 border-2 border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
              >
                <option value="">Assign a camper…</option>
                {available.map((m) => (
                  <option key={m.id} value={m.id}>
                    {memberName(members, m.id)}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  if (assignPick) {
                    onAssign(assignPick);
                    setAssignPick("");
                  }
                }}
                disabled={!assignPick}
                className="btn-outline px-3 py-1.5 text-sm disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4 mr-1" /> Add
              </button>
            </div>
            {assignError && <p className="mt-1 text-xs text-red-600">{assignError}</p>}
          </div>
        )}
      </div>

      {/* Tents */}
      <div className="mt-4">
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2 flex items-center gap-1">
          <TentIcon className="w-3.5 h-3.5" /> Tents
        </p>
        {tents.length === 0 ? (
          <p className="text-xs text-stone-400">No tents pitched here.</p>
        ) : (
          <ul className="space-y-1">
            {tents.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between text-sm text-stone-700"
              >
                <span>
                  {t.label}
                  {t.capacity != null && (
                    <span className="text-stone-400"> · sleeps {t.capacity}</span>
                  )}
                  {t.owned_by && (
                    <span className="text-stone-400"> · {memberName(members, t.owned_by)}</span>
                  )}
                </span>
                {(canManage || (t.owned_by && t.owned_by === myMemberId)) && (
                  <button
                    onClick={() => onRemoveTent(t.id)}
                    className="text-stone-400 hover:text-red-600"
                    title="Remove tent"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Vehicles */}
      <div className="mt-4">
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2 flex items-center gap-1">
          <Car className="w-3.5 h-3.5" /> Vehicles
        </p>
        {vehicles.length === 0 ? (
          <p className="text-xs text-stone-400">No vehicles parked here.</p>
        ) : (
          <ul className="space-y-1">
            {vehicles.map((v) => (
              <li
                key={v.id}
                className="flex items-center justify-between text-sm text-stone-700"
              >
                <span>
                  {v.label}
                  {v.license_plate && (
                    <span className="text-stone-400"> · {v.license_plate}</span>
                  )}
                  {v.owned_by && (
                    <span className="text-stone-400"> · {memberName(members, v.owned_by)}</span>
                  )}
                </span>
                {(canManage || (v.owned_by && v.owned_by === myMemberId)) && (
                  <button
                    onClick={() => onRemoveVehicle(v.id)}
                    className="text-stone-400 hover:text-red-600"
                    title="Remove vehicle"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add gear controls — counselor+ can place any, CIT+ can bring their own */}
      {(canManage || canBringGear) && (
        <div className="mt-4 pt-3 border-t border-stone-100">
          {showGear ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <input
                  value={gearForm.label}
                  onChange={(e) => setGearForm({ ...gearForm, label: e.target.value })}
                  placeholder={showGear === "tent" ? "Tent label" : "Vehicle label"}
                  className="flex-1 px-3 py-1.5 border-2 border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
                />
                <input
                  value={gearForm.detail}
                  onChange={(e) => setGearForm({ ...gearForm, detail: e.target.value })}
                  placeholder={showGear === "tent" ? "Sleeps #" : "Plate"}
                  type={showGear === "tent" ? "number" : "text"}
                  min={showGear === "tent" ? "0" : undefined}
                  className="w-28 px-3 py-1.5 border-2 border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
                />
              </div>
              <div className="flex items-center gap-2">
                {/* CIT+ adds their own (owned_by = me). Counselor+ may add shared. */}
                <button
                  onClick={() => submitGear(true)}
                  disabled={!gearForm.label.trim() || !myMemberId}
                  className="btn-primary px-3 py-1.5 text-sm disabled:opacity-50"
                  title="Add as yours"
                >
                  <Check className="w-4 h-4 mr-1" /> Add mine
                </button>
                {canManage && (
                  <button
                    onClick={() => submitGear(false)}
                    disabled={!gearForm.label.trim()}
                    className="btn-outline px-3 py-1.5 text-sm disabled:opacity-50"
                    title="Add unassigned"
                  >
                    Add shared
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowGear(null);
                    setGearForm({ label: "", detail: "" });
                  }}
                  className="p-1.5 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {gearError && <p className="text-xs text-red-600">{gearError}</p>}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setShowGear("tent");
                  setGearForm({ label: "", detail: "" });
                }}
                className="btn-outline px-3 py-1.5 text-xs"
              >
                <TentIcon className="w-3.5 h-3.5 mr-1" /> Add tent
              </button>
              <button
                onClick={() => {
                  setShowGear("vehicle");
                  setGearForm({ label: "", detail: "" });
                }}
                className="btn-outline px-3 py-1.5 text-xs"
              >
                <Car className="w-3.5 h-3.5 mr-1" /> Add vehicle
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
