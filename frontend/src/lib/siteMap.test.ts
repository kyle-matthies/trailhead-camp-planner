import { describe, expect, it } from "vitest";
import { buildSiteMapSummary } from "./siteMap";
import type { Campsite, SiteAssignment, Tent, Vehicle } from "@/lib/types";

function campsite(id: string, siteNumber: string, maxTents: number | null, maxVehicles: number | null): Campsite {
  return {
    id,
    trip_id: "trip",
    campground_id: "campground",
    site_number: siteNumber,
    max_tents: maxTents,
    max_vehicles: maxVehicles,
    nightly_cost: null,
    notes: null,
    created_at: "2026-06-10T00:00:00Z",
    updated_at: null,
  };
}

function assignment(id: string, campsiteId: string): SiteAssignment {
  return {
    id,
    trip_id: "trip",
    campsite_id: campsiteId,
    member_id: `member-${id}`,
    created_at: "2026-06-10T00:00:00Z",
  };
}

function tent(id: string, campsiteId: string): Tent {
  return {
    id,
    trip_id: "trip",
    campsite_id: campsiteId,
    label: `Tent ${id}`,
    capacity: null,
    owned_by: null,
    created_at: "2026-06-10T00:00:00Z",
    updated_at: null,
  };
}

function vehicle(id: string, campsiteId: string): Vehicle {
  return {
    id,
    trip_id: "trip",
    campsite_id: campsiteId,
    label: `Vehicle ${id}`,
    license_plate: null,
    owned_by: null,
    created_at: "2026-06-10T00:00:00Z",
    updated_at: null,
  };
}

describe("buildSiteMapSummary", () => {
  it("sorts sites naturally and counts campers, tents, and vehicles", () => {
    const summaries = buildSiteMapSummary(
      [campsite("site-10", "10", 2, 2), campsite("site-2", "2", 2, 2)],
      [assignment("a", "site-2"), assignment("b", "site-2")],
      [tent("a", "site-2")],
      [vehicle("a", "site-10")]
    );

    expect(summaries.map((summary) => summary.site.site_number)).toEqual(["2", "10"]);
    expect(summaries[0]).toMatchObject({
      camperCount: 2,
      tentCount: 1,
      vehicleCount: 0,
      tentStatus: "open",
      vehicleStatus: "empty",
    });
    expect(summaries[1]).toMatchObject({
      camperCount: 0,
      tentCount: 0,
      vehicleCount: 1,
    });
  });

  it("marks exact capacity as full and over-capacity as over", () => {
    const summaries = buildSiteMapSummary(
      [campsite("site-a", "A", 1, 1)],
      [],
      [tent("a", "site-a")],
      [vehicle("a", "site-a"), vehicle("b", "site-a")]
    );

    expect(summaries[0].tentStatus).toBe("full");
    expect(summaries[0].vehicleStatus).toBe("over");
    expect(summaries[0].occupancyScore).toBeGreaterThan(1);
  });
});
