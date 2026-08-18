import { NavLink, Outlet, useParams, Link } from "react-router-dom";
import {
  Tent,
  Users,
  Map,
  Package,
  ShoppingCart,
  Receipt,
  MessageSquare,
  ListChecks,
  ChevronLeft,
  MapPin,
  Calendar,
} from "lucide-react";
import { TripProvider } from "@/context/TripContext";
import { useTrip } from "@/context/useTrip";
import RoleBadge from "@/components/ui/RoleBadge";
import { PageSpinner } from "@/components/ui/Spinner";
import AIComposer from "@/components/AIComposer";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "", label: "Overview", Icon: Tent, end: true },
  { to: "campers", label: "Campers", Icon: Users },
  { to: "sites", label: "Sites", Icon: Map },
  { to: "gear", label: "Gear", Icon: Package },
  { to: "shopping", label: "Shopping", Icon: ShoppingCart },
  { to: "expenses", label: "Expenses", Icon: Receipt },
  { to: "board", label: "Board", Icon: MessageSquare },
  { to: "packing", label: "Packing", Icon: ListChecks },
];

function fmt(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function TripShellInner() {
  const { trip, myRole, isLoading, error, members } = useTrip();

  if (isLoading) return <PageSpinner />;
  if (error || !trip) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-stone-500">{error ?? "Trip not found."}</p>
        <Link to="/trips" className="text-forest-600 hover:underline mt-2 inline-block">
          Back to trips
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Link
        to="/trips"
        className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800 mb-3"
      >
        <ChevronLeft className="w-4 h-4" /> All trips
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-heading font-bold text-stone-900">{trip.name}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-stone-500">
            {trip.destination && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {trip.destination}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> {fmt(trip.start_date)} – {fmt(trip.end_date)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> {members.length} camper{members.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        {myRole && <RoleBadge role={myRole} />}
      </div>

      {/* Module sub-nav */}
      <nav className="flex gap-1 overflow-x-auto border-b border-stone-200 mb-6 -mx-1 px-1">
        {TABS.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to || "overview"}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
                isActive
                  ? "border-forest-600 text-forest-700"
                  : "border-transparent text-stone-500 hover:text-stone-800"
              )
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <Outlet />

      {/* AI read/write agent — available across every module, scoped to this trip */}
      <AIComposer />
    </div>
  );
}

export default function TripShell() {
  const { tripId } = useParams<{ tripId: string }>();
  if (!tripId) return null;
  return (
    <TripProvider tripId={tripId}>
      <TripShellInner />
    </TripProvider>
  );
}
