"""Load the trip context the agent needs to scale quantities and avoid duplicates.
Reads run through the USER's client, so a non-member simply gets empty context (and
camper_count == 0, which the router treats as no-access)."""
from datetime import date
from typing import Any


def _parse_date(s: Any) -> date | None:
    try:
        return date.fromisoformat(str(s))
    except (TypeError, ValueError):
        return None


def _nights(start: Any, end: Any) -> int:
    a, b = _parse_date(start), _parse_date(end)
    if a and b:
        return max((b - a).days, 1)
    return 1


def _count_by(rows: list[dict[str, Any]], key: str) -> dict[str, int]:
    counts: dict[str, int] = {}
    for row in rows:
        value = row.get(key)
        if value:
            counts[str(value)] = counts.get(str(value), 0) + 1
    return counts


def _int_or_none(value: Any) -> int | None:
    try:
        return int(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def _remaining(maximum: int | None, count: int) -> int | None:
    if maximum is None:
        return None
    return max(maximum - count, 0)


def load_trip_context(client, trip_id: str, user_id: str | None = None) -> dict[str, Any]:
    ctx: dict[str, Any] = {
        "name": "this trip",
        "camper_count": 0,
        "nights": 1,
        "camping_type": "",
        "start_date": "",
        "end_date": "",
        "campground_id": None,
        "current_member_id": None,
        "members": [],
        "member_ids": [],
        "campsites": [],
        "campsite_ids": [],
        "shopping": [],
    }
    try:
        trip = client.table("trips").select("*").eq("id", trip_id).maybe_single().execute()
        t = getattr(trip, "data", None)
        if t:
            ctx["name"] = t.get("name") or ctx["name"]
            ctx["camping_type"] = t.get("camping_type") or ""
            ctx["start_date"] = t.get("start_date") or ""
            ctx["end_date"] = t.get("end_date") or ""
            ctx["nights"] = _nights(t.get("start_date"), t.get("end_date"))
        campground = (
            client.table("campgrounds")
            .select("id,name")
            .eq("trip_id", trip_id)
            .maybe_single()
            .execute()
        )
        cg = getattr(campground, "data", None)
        if cg:
            ctx["campground_id"] = cg.get("id")

        members = (
            client.table("trip_members")
            .select("id,user_id,display_name")
            .eq("trip_id", trip_id)
            .execute()
        )
        member_rows = getattr(members, "data", None) or []
        ctx["camper_count"] = len(member_rows)
        profiles_by_id: dict[str, dict[str, Any]] = {}
        user_ids = [r.get("user_id") for r in member_rows if r.get("user_id")]
        if user_ids:
            try:
                profiles = client.table("profiles").select("id,email,name").in_("id", user_ids).execute()
                profiles_by_id = {
                    r["id"]: r for r in (getattr(profiles, "data", None) or []) if r.get("id")
                }
            except Exception:
                profiles_by_id = {}
        ctx["members"] = [
            {
                "id": r.get("id"),
                "user_id": r.get("user_id"),
                "display_name": r.get("display_name"),
                "email": (profiles_by_id.get(r.get("user_id")) or {}).get("email"),
                "name": (profiles_by_id.get(r.get("user_id")) or {}).get("name"),
            }
            for r in member_rows
            if r.get("id")
        ]
        ctx["member_ids"] = [r["id"] for r in ctx["members"]]
        if user_id:
            mine = next((r for r in member_rows if r.get("user_id") == user_id), None)
            ctx["current_member_id"] = mine.get("id") if mine else None

        campsite_resp = (
            client.table("campsites")
            .select("id,site_number,max_tents,max_vehicles,notes")
            .eq("trip_id", trip_id)
            .execute()
        )
        campsite_rows = getattr(campsite_resp, "data", None) or []
        assignment_counts: dict[str, int] = {}
        tent_counts: dict[str, int] = {}
        vehicle_counts: dict[str, int] = {}
        try:
            assignments = (
                client.table("site_camper_assignments")
                .select("campsite_id")
                .eq("trip_id", trip_id)
                .execute()
            )
            tents = client.table("tents").select("campsite_id").eq("trip_id", trip_id).execute()
            vehicles = (
                client.table("vehicles")
                .select("campsite_id")
                .eq("trip_id", trip_id)
                .execute()
            )
            assignment_counts = _count_by(getattr(assignments, "data", None) or [], "campsite_id")
            tent_counts = _count_by(getattr(tents, "data", None) or [], "campsite_id")
            vehicle_counts = _count_by(getattr(vehicles, "data", None) or [], "campsite_id")
        except Exception:
            # Site counts are an optimization signal, not an access-control dependency.
            assignment_counts = {}
            tent_counts = {}
            vehicle_counts = {}

        ctx["campsites"] = [
            {
                "id": r.get("id"),
                "site_number": r.get("site_number"),
                "max_tents": _int_or_none(r.get("max_tents")),
                "max_vehicles": _int_or_none(r.get("max_vehicles")),
                "assigned_campers": assignment_counts.get(str(r.get("id")), 0),
                "tent_count": tent_counts.get(str(r.get("id")), 0),
                "vehicle_count": vehicle_counts.get(str(r.get("id")), 0),
                "open_tent_slots": _remaining(
                    _int_or_none(r.get("max_tents")),
                    tent_counts.get(str(r.get("id")), 0),
                ),
                "open_vehicle_slots": _remaining(
                    _int_or_none(r.get("max_vehicles")),
                    vehicle_counts.get(str(r.get("id")), 0),
                ),
                "notes": r.get("notes"),
            }
            for r in campsite_rows
            if r.get("id")
        ]
        ctx["campsite_ids"] = [r["id"] for r in ctx["campsites"]]

        shop = client.table("shopping_items").select("name").eq("trip_id", trip_id).execute()
        ctx["shopping"] = [r["name"] for r in (getattr(shop, "data", None) or []) if r.get("name")]
    except Exception:
        # Any read failure -> leave defaults; the router's camper_count==0 guard handles access.
        pass
    return ctx
