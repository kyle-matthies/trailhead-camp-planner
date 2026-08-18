"""Gemini function declarations for the planning agent, plus the server-side
translation to (and safe execution of) PlannedChange records.

Safety model:
- The agent can only call the functions declared here (all are non-destructive adds).
- The server re-derives trip_id and the owner/author/creator columns from the verified
  request — client/agent-supplied values for those are ignored.
- Only an allow-listed set of columns per table is ever written.
- Execution goes through the USER's Supabase client, so RLS is the final gate.
"""
import uuid
from typing import Any

# ---- Gemini tool declarations (uppercase types match the Gemini schema enums) ----
GEMINI_TOOLS: list[dict[str, Any]] = [
    {
        "function_declarations": [
            {
                "name": "add_shopping_items",
                "description": "Add one or more items to the trip's shared shopping list.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "items": {
                            "type": "ARRAY",
                            "items": {
                                "type": "OBJECT",
                                "properties": {
                                    "name": {"type": "STRING"},
                                    "quantity": {"type": "NUMBER"},
                                    "unit": {"type": "STRING"},
                                    "category": {"type": "STRING"},
                                    "estimated_cost": {"type": "NUMBER"},
                                },
                                "required": ["name"],
                            },
                        }
                    },
                    "required": ["items"],
                },
            },
            {
                "name": "add_shared_gear",
                "description": "Add shared/group gear the group needs (stove, BBQ, big tent, etc.).",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "items": {
                            "type": "ARRAY",
                            "items": {
                                "type": "OBJECT",
                                "properties": {
                                    "name": {"type": "STRING"},
                                    "quantity": {"type": "NUMBER"},
                                    "category": {"type": "STRING"},
                                },
                                "required": ["name"],
                            },
                        }
                    },
                    "required": ["items"],
                },
            },
            {
                "name": "add_expense",
                "description": "Record a trip expense (campsite fee, gas, firewood, etc.).",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "description": {"type": "STRING"},
                        "amount": {"type": "NUMBER"},
                        "category": {"type": "STRING"},
                    },
                    "required": ["description", "amount"],
                },
            },
            {
                "name": "create_campsite",
                "description": "Add a reserved campsite to the trip's current campground.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "site_number": {"type": "STRING"},
                        "max_tents": {"type": "NUMBER"},
                        "max_vehicles": {"type": "NUMBER"},
                        "nightly_cost": {"type": "NUMBER"},
                        "notes": {"type": "STRING"},
                    },
                    "required": ["site_number"],
                },
            },
            {
                "name": "assign_site",
                "description": (
                    "Assign a camper to a campsite using member_id and campsite_id from CONTEXT. "
                    "Optionally records one tent and/or vehicle label at that site."
                ),
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "campsite_id": {"type": "STRING"},
                        "site_number": {"type": "STRING"},
                        "member_id": {"type": "STRING"},
                        "member_email": {"type": "STRING"},
                        "member_name": {"type": "STRING"},
                        "member_self": {"type": "BOOLEAN"},
                        "tent_label": {"type": "STRING"},
                        "tent_capacity": {"type": "NUMBER"},
                        "vehicle_label": {"type": "STRING"},
                        "license_plate": {"type": "STRING"},
                    },
                },
            },
            {
                "name": "add_packing_items",
                "description": "Add items to the speaker's own personal packing checklist.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "items": {
                            "type": "ARRAY",
                            "items": {
                                "type": "OBJECT",
                                "properties": {
                                    "name": {"type": "STRING"},
                                    "category": {"type": "STRING"},
                                },
                                "required": ["name"],
                            },
                        }
                    },
                    "required": ["items"],
                },
            },
            {
                "name": "post_to_board",
                "description": "Post a short message to the camp bulletin board for the group.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {"body": {"type": "STRING"}},
                    "required": ["body"],
                },
            },
        ]
    }
]

# ---- Per-table write contract (defense in depth on top of RLS) ----
# user_field: the column set to the caller's uuid; extra server fields added on commit.
TABLE_RULES: dict[str, dict[str, Any]] = {
    "campsites": {
        "user_field": None,
        "columns": {"site_number", "max_tents", "max_vehicles", "nightly_cost", "notes"},
        "constants": {},
        "context_fields": {"campground_id": "campground_id"},
    },
    "site_camper_assignments": {
        "user_field": None,
        "columns": {"campsite_id", "member_id"},
        "constants": {},
        "validate_context": {"campsite_id": "campsite_ids", "member_id": "member_ids"},
    },
    "tents": {
        "user_field": None,
        "columns": {"label", "capacity", "owned_by", "campsite_id"},
        "constants": {},
        "validate_context": {"campsite_id": "campsite_ids", "owned_by": "member_ids"},
    },
    "vehicles": {
        "user_field": None,
        "columns": {"label", "license_plate", "owned_by", "campsite_id"},
        "constants": {},
        "validate_context": {"campsite_id": "campsite_ids", "owned_by": "member_ids"},
    },
    "shopping_items": {
        "user_field": "created_by",
        "columns": {"name", "quantity", "unit", "category", "estimated_cost"},
        "constants": {"source": "ai"},
    },
    "trip_shared_gear": {
        "user_field": "created_by",
        "columns": {"name", "quantity", "category", "notes"},
        "constants": {},
    },
    "expenses": {
        "user_field": "created_by",
        "columns": {"description", "amount", "category", "incurred_on"},
        "constants": {},
    },
    "trip_packing_items": {
        "user_field": "owner_id",
        "columns": {"name", "category"},
        "constants": {},
    },
    "board_posts": {
        "user_field": "author_id",
        "columns": {"body"},
        "constants": {},
    },
}

ALLOWED_TABLES = set(TABLE_RULES.keys())


def _money(v: Any) -> str:
    try:
        return f"${float(v):.0f}"
    except (TypeError, ValueError):
        return ""


def _optional_text(v: Any) -> str | None:
    s = str(v or "").strip()
    return s or None


def _positive_int(v: Any) -> int | None:
    try:
        n = int(float(v))
    except (TypeError, ValueError):
        return None
    return n if n > 0 else None


def _int_or_none(v: Any) -> int | None:
    try:
        return int(v) if v is not None else None
    except (TypeError, ValueError):
        return None


def _positive_money(v: Any) -> float | None:
    try:
        n = float(v)
    except (TypeError, ValueError):
        return None
    return n if 0 <= n <= 10000 else None


def _change(table: str, fields: dict[str, Any], label: str) -> dict[str, Any]:
    return {
        "id": uuid.uuid4().hex,
        "table": table,
        "op": "insert",
        "label": label,
        "fields": fields,
    }


def _resolve_member_id(args: dict[str, Any], ctx: dict[str, Any] | None) -> str | None:
    if args.get("member_id"):
        return str(args["member_id"]).strip()
    if args.get("member_self") and ctx and ctx.get("current_member_id"):
        return str(ctx["current_member_id"])

    email = str(args.get("member_email") or "").strip().lower()
    member_name = str(args.get("member_name") or "").strip().lower()
    for member in (ctx or {}).get("members", []) or []:
        if email and str(member.get("email") or "").strip().lower() == email:
            return member.get("id")
        names = {
            str(member.get("display_name") or "").strip().lower(),
            str(member.get("name") or "").strip().lower(),
        }
        if member_name and member_name in names:
            return member.get("id")
    return None


def _resolve_campsite_id(args: dict[str, Any], ctx: dict[str, Any] | None) -> str | None:
    if args.get("campsite_id"):
        return str(args["campsite_id"]).strip()

    site_number = str(args.get("site_number") or "").strip().lower()
    for site in (ctx or {}).get("campsites", []) or []:
        if site_number and str(site.get("site_number") or "").strip().lower() == site_number:
            return site.get("id")
    return None


def _member_label(member_id: str, ctx: dict[str, Any] | None) -> str:
    for member in (ctx or {}).get("members", []) or []:
        if member.get("id") == member_id:
            return member.get("display_name") or member.get("name") or member.get("email") or "Camper"
    return "Camper"


def _site_label(campsite_id: str, ctx: dict[str, Any] | None) -> str:
    for site in (ctx or {}).get("campsites", []) or []:
        if site.get("id") == campsite_id:
            return f"site {site.get('site_number')}"
    return "site"


def _site_context(campsite_id: str | None, ctx: dict[str, Any] | None) -> dict[str, Any] | None:
    if not campsite_id:
        return None
    for site in (ctx or {}).get("campsites", []) or []:
        if site.get("id") == campsite_id:
            return site
    return None


def _site_has_capacity(
    campsite_id: str | None,
    ctx: dict[str, Any] | None,
    *,
    max_key: str,
    count_key: str,
) -> bool:
    site = _site_context(campsite_id, ctx)
    if not site:
        return True
    maximum = _int_or_none(site.get(max_key))
    if maximum is None:
        return True
    count = _int_or_none(site.get(count_key)) or 0
    return count < maximum


def _capacity_error(table: str, fields: dict[str, Any], ctx: dict[str, Any] | None) -> str | None:
    if table == "tents":
        label, max_key, count_key = "tent", "max_tents", "tent_count"
    elif table == "vehicles":
        label, max_key, count_key = "vehicle", "max_vehicles", "vehicle_count"
    else:
        return None

    campsite_id = fields.get("campsite_id")
    site = _site_context(campsite_id, ctx)
    if not site:
        return None
    maximum = _int_or_none(site.get(max_key))
    if maximum is None:
        return None
    count = _int_or_none(site.get(count_key)) or 0
    if count >= maximum:
        return f"site {site.get('site_number') or campsite_id} has no open {label} slots"
    return None


def _reflect_applied_capacity(table: str, fields: dict[str, Any], ctx: dict[str, Any] | None) -> None:
    if table not in {"tents", "vehicles"} or ctx is None:
        return
    site = _site_context(fields.get("campsite_id"), ctx)
    if not site:
        return
    count_key = "tent_count" if table == "tents" else "vehicle_count"
    open_key = "open_tent_slots" if table == "tents" else "open_vehicle_slots"
    max_key = "max_tents" if table == "tents" else "max_vehicles"
    site[count_key] = (_int_or_none(site.get(count_key)) or 0) + 1
    maximum = _int_or_none(site.get(max_key))
    if maximum is not None:
        site[open_key] = max(maximum - site[count_key], 0)


def build_changes(
    name: str,
    args: dict[str, Any],
    ctx: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    """Translate one Gemini function call into preview PlannedChange records.
    Owner/trip columns are filled in at commit time from the verified request."""
    out: list[dict[str, Any]] = []
    if name == "add_shopping_items":
        for it in args.get("items", []) or []:
            nm = str(it.get("name", "")).strip()
            if not nm:
                continue
            qty = it.get("quantity") or 1
            est = it.get("estimated_cost")
            label = f"Shopping: {qty}× {nm}" + (f" (est {_money(est)})" if est else "")
            out.append(
                _change(
                    "shopping_items",
                    {
                        "name": nm,
                        "quantity": qty,
                        "unit": it.get("unit"),
                        "category": it.get("category"),
                        "estimated_cost": est,
                    },
                    label,
                )
            )
    elif name == "add_shared_gear":
        for it in args.get("items", []) or []:
            nm = str(it.get("name", "")).strip()
            if not nm:
                continue
            qty = it.get("quantity") or 1
            out.append(
                _change(
                    "trip_shared_gear",
                    {"name": nm, "quantity": qty, "category": it.get("category")},
                    f"Shared gear: {qty}× {nm}",
                )
            )
    elif name == "add_expense":
        desc = str(args.get("description", "")).strip()
        amt = args.get("amount")
        if desc and amt is not None:
            out.append(
                _change(
                    "expenses",
                    {"description": desc, "amount": amt, "category": args.get("category")},
                    f"Expense: {desc} ({_money(amt)})",
                )
            )
    elif name == "create_campsite":
        site_number = str(args.get("site_number", "")).strip()
        if site_number:
            fields = {
                "site_number": site_number,
                "max_tents": _positive_int(args.get("max_tents")),
                "max_vehicles": _positive_int(args.get("max_vehicles")),
                "nightly_cost": _positive_money(args.get("nightly_cost")),
                "notes": _optional_text(args.get("notes")),
            }
            out.append(_change("campsites", fields, f"Campsite: site {site_number}"))
    elif name == "assign_site":
        campsite_id = _resolve_campsite_id(args, ctx)
        member_id = _resolve_member_id(args, ctx)
        if campsite_id and member_id:
            member = _member_label(member_id, ctx)
            site = _site_label(campsite_id, ctx)
            out.append(
                _change(
                    "site_camper_assignments",
                    {"campsite_id": campsite_id, "member_id": member_id},
                    f"Assign {member} to {site}",
                )
            )
            tent_label = _optional_text(args.get("tent_label"))
            if tent_label and _site_has_capacity(
                campsite_id,
                ctx,
                max_key="max_tents",
                count_key="tent_count",
            ):
                out.append(
                    _change(
                        "tents",
                        {
                            "label": tent_label,
                            "capacity": _positive_int(args.get("tent_capacity")),
                            "owned_by": member_id,
                            "campsite_id": campsite_id,
                        },
                        f"Tent at {site}: {tent_label}",
                    )
                )
            vehicle_label = _optional_text(args.get("vehicle_label"))
            if vehicle_label and _site_has_capacity(
                campsite_id,
                ctx,
                max_key="max_vehicles",
                count_key="vehicle_count",
            ):
                out.append(
                    _change(
                        "vehicles",
                        {
                            "label": vehicle_label,
                            "license_plate": _optional_text(args.get("license_plate")),
                            "owned_by": member_id,
                            "campsite_id": campsite_id,
                        },
                        f"Vehicle at {site}: {vehicle_label}",
                    )
                )
    elif name == "add_packing_items":
        for it in args.get("items", []) or []:
            nm = str(it.get("name", "")).strip()
            if not nm:
                continue
            out.append(
                _change(
                    "trip_packing_items",
                    {"name": nm, "category": it.get("category")},
                    f"Packing: {nm}",
                )
            )
    elif name == "post_to_board":
        body = str(args.get("body", "")).strip()
        if body:
            preview = body if len(body) <= 60 else body[:57] + "…"
            out.append(_change("board_posts", {"body": body}, f"Board post: “{preview}”"))
    return out


def execute_change(
    client,
    change: dict[str, Any],
    *,
    trip_id: str,
    user_id: str,
    context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Run one approved change via the user-scoped client. Re-derives the trip and
    owner columns server-side and writes only allow-listed columns."""
    table = change.get("table")
    if table not in ALLOWED_TABLES:
        return {"id": change.get("id"), "status": "error", "detail": f"table not allowed: {table}"}
    if change.get("op") != "insert":
        return {"id": change.get("id"), "status": "error", "detail": "only insert is supported"}

    rule = TABLE_RULES[table]
    raw = change.get("fields") or {}
    fields = {k: v for k, v in raw.items() if k in rule["columns"] and v is not None}
    fields["trip_id"] = trip_id
    if rule.get("user_field"):
        fields[rule["user_field"]] = user_id
    for field, ctx_key in rule.get("context_fields", {}).items():
        value = (context or {}).get(ctx_key)
        if not value:
            return {
                "id": change.get("id"),
                "status": "error",
                "detail": f"missing context field: {ctx_key}",
            }
        fields[field] = value
    for field, ctx_key in rule.get("validate_context", {}).items():
        value = fields.get(field)
        if not value:
            continue
        allowed = set((context or {}).get(ctx_key) or [])
        if value not in allowed:
            return {
                "id": change.get("id"),
                "status": "error",
                "detail": f"{field} is not part of this trip",
            }
    capacity_error = _capacity_error(table, fields, context)
    if capacity_error:
        return {"id": change.get("id"), "status": "error", "detail": capacity_error}
    fields.update(rule["constants"])

    try:
        resp = client.table(table).insert(fields).execute()
        data = getattr(resp, "data", None) or []
        row = data[0] if data else {}
        _reflect_applied_capacity(table, fields, context)
        return {
            "id": change.get("id"),
            "status": "applied",
            "table": table,
            "row_id": row.get("id"),
        }
    except Exception as e:  # noqa: BLE001 - surface RLS / validation errors cleanly
        return {"id": change.get("id"), "status": "error", "detail": str(e)[:300]}


def undo_result(client, result: dict[str, Any], *, trip_id: str) -> dict[str, Any]:
    """Undo one previously-applied AI result by deleting its inserted row.

    The delete still runs through the user-scoped client, so normal RLS decides whether
    the caller can remove the row. Missing row IDs are treated as no-ops; a repeated
    undo should be harmless instead of destructive.
    """
    table = result.get("table")
    row_id = result.get("row_id")
    if result.get("status") != "applied":
        return {
            "id": result.get("id"),
            "status": "skipped",
            "detail": "only applied inserts can be undone",
        }
    if table not in ALLOWED_TABLES:
        return {"id": result.get("id"), "status": "error", "detail": f"table not allowed: {table}"}
    if not row_id:
        return {"id": result.get("id"), "status": "skipped", "detail": "no inserted row id recorded"}

    try:
        client.table(table).delete().eq("id", row_id).eq("trip_id", trip_id).execute()
        return {"id": result.get("id"), "status": "undone", "table": table, "row_id": row_id}
    except Exception as e:  # noqa: BLE001 - surface RLS / validation errors cleanly
        return {"id": result.get("id"), "status": "error", "detail": str(e)[:300]}
