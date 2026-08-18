import { Link } from "react-router-dom";
import {
  Map,
  Package,
  ShoppingCart,
  Receipt,
  MessageSquare,
  ListChecks,
  Users,
} from "lucide-react";
import { useTrip } from "@/context/useTrip";
import RoleBadge from "@/components/ui/RoleBadge";
import CamperAvatar from "@/components/ui/CamperAvatar";

const MODULES = [
  { to: "campers", label: "Campers", Icon: Users, blurb: "Invite friends & set roles" },
  { to: "sites", label: "Sites", Icon: Map, blurb: "Campsites & spot assignments" },
  { to: "gear", label: "Shared Gear", Icon: Package, blurb: "Who brings the stove" },
  { to: "shopping", label: "Shopping", Icon: ShoppingCart, blurb: "List, claim & buy" },
  { to: "expenses", label: "Expenses", Icon: Receipt, blurb: "Track & settle up" },
  { to: "board", label: "Board", Icon: MessageSquare, blurb: "Group messages" },
  { to: "packing", label: "Packing", Icon: ListChecks, blurb: "Your checklist" },
];

export default function TripOverview() {
  const { trip, members } = useTrip();
  if (!trip) return null;

  return (
    <div className="space-y-6">
      {trip.notes && (
        <div className="card p-4 text-sm text-stone-600 whitespace-pre-wrap">{trip.notes}</div>
      )}

      {/* Campers */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-semibold text-stone-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-forest-600" /> Campers ({members.length})
          </h2>
          <Link to="campers" className="text-sm text-forest-600 hover:underline">
            Manage
          </Link>
        </div>
        <div className="flex flex-wrap gap-4">
          {members.map((m) => {
            const name = m.display_name || m.profile?.name || m.profile?.email || "Camper";
            return (
              <div key={m.id} className="flex items-center gap-2">
                <CamperAvatar name={name} />
                <div>
                  <p className="text-sm font-medium text-stone-800 leading-tight">{name}</p>
                  <RoleBadge role={m.role} showIcon={false} className="mt-0.5" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Module shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {MODULES.map(({ to, label, Icon, blurb }) => (
          <Link
            key={to}
            to={to}
            className="card p-4 hover:shadow-md transition-shadow flex flex-col gap-1"
          >
            <Icon className="w-5 h-5 text-forest-600" />
            <span className="font-medium text-stone-800 text-sm mt-1">{label}</span>
            <span className="text-xs text-stone-500">{blurb}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
