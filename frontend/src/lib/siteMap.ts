import type { Campsite, SiteAssignment, Tent, Vehicle } from "@/lib/types";

export type SiteOccupancyStatus = "empty" | "open" | "full" | "over";

export interface SiteMapSummary {
  site: Campsite;
  camperCount: number;
  tentCount: number;
  vehicleCount: number;
  tentStatus: SiteOccupancyStatus;
  vehicleStatus: SiteOccupancyStatus;
  occupancyScore: number;
}

function countFor<T extends { campsite_id: string | null }>(items: T[], campsiteId: string): number {
  return items.filter((item) => item.campsite_id === campsiteId).length;
}

function status(count: number, max: number | null): SiteOccupancyStatus {
  if (count === 0) return "empty";
  if (max == null || max <= 0) return "open";
  if (count > max) return "over";
  if (count === max) return "full";
  return "open";
}

function ratio(count: number, max: number | null): number {
  if (max == null || max <= 0) return count > 0 ? 0.5 : 0;
  return count / max;
}

function naturalSiteSort(a: Campsite, b: Campsite): number {
  return a.site_number.localeCompare(b.site_number, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function buildSiteMapSummary(
  campsites: Campsite[],
  assignments: SiteAssignment[],
  tents: Tent[],
  vehicles: Vehicle[]
): SiteMapSummary[] {
  return [...campsites].sort(naturalSiteSort).map((site) => {
    const camperCount = countFor(assignments, site.id);
    const tentCount = countFor(tents, site.id);
    const vehicleCount = countFor(vehicles, site.id);
    return {
      site,
      camperCount,
      tentCount,
      vehicleCount,
      tentStatus: status(tentCount, site.max_tents),
      vehicleStatus: status(vehicleCount, site.max_vehicles),
      occupancyScore: Math.max(
        camperCount > 0 ? 0.35 : 0,
        ratio(tentCount, site.max_tents),
        ratio(vehicleCount, site.max_vehicles)
      ),
    };
  });
}
