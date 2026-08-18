"""Unit tests for the AI agent's translation + write-safety layer (no Gemini needed).
These prove the executor (a) only writes allow-listed tables, (b) ignores
client-supplied owner/trip columns and re-derives them, and (c) strips stray columns."""
from app.ai.tools import ALLOWED_TABLES, build_changes, execute_change, undo_result


class _FakeTable:
    def __init__(self, name, sink):
        self.name = name
        self.sink = sink
        self._fields = None
        self._delete = False
        self._filters = []

    def insert(self, fields):
        self._fields = fields
        return self

    def delete(self):
        self._delete = True
        return self

    def eq(self, key, value):
        self._filters.append((key, value))
        return self

    def execute(self):
        if self._delete:
            self.sink.append(("delete", self.name, self._filters))
            return type("Resp", (), {"data": []})()
        row = {"id": "inserted-row", **self._fields}
        self.sink.append(("insert", self.name, self._fields))
        return type("Resp", (), {"data": [row]})()


class _FakeClient:
    def __init__(self):
        self.inserts = []

    def table(self, name):
        return _FakeTable(name, self.inserts)


def test_build_changes_shopping_scales_and_labels():
    changes = build_changes(
        "add_shopping_items",
        {"items": [{"name": "Buns", "quantity": 3, "estimated_cost": 6}]},
    )
    assert len(changes) == 1
    c = changes[0]
    assert c["table"] == "shopping_items"
    assert c["op"] == "insert"
    assert c["fields"]["name"] == "Buns"
    assert "Buns" in c["label"]


def test_build_changes_unknown_tool_is_noop():
    assert build_changes("delete_everything", {"confirm": True}) == []
    assert build_changes("add_shopping_items", {"items": []}) == []


def test_build_changes_site_tools_resolve_context_ids():
    ctx = {
        "campsites": [{"id": "SITE-1", "site_number": "A-14"}],
        "members": [
            {
                "id": "MEMBER-1",
                "display_name": "Rowan",
                "email": "rowan@example.test",
            }
        ],
    }
    site_changes = build_changes(
        "create_campsite",
        {"site_number": "B-2", "max_tents": 2, "max_vehicles": 1, "nightly_cost": 45},
        ctx,
    )
    assert site_changes == [
        {
            "id": site_changes[0]["id"],
            "table": "campsites",
            "op": "insert",
            "label": "Campsite: site B-2",
            "fields": {
                "site_number": "B-2",
                "max_tents": 2,
                "max_vehicles": 1,
                "nightly_cost": 45.0,
                "notes": None,
            },
        }
    ]

    assignment_changes = build_changes(
        "assign_site",
        {
            "site_number": "A-14",
            "member_email": "rowan@example.test",
            "tent_label": "REI Kingdom",
            "tent_capacity": 4,
            "vehicle_label": "Subaru",
        },
        ctx,
    )
    assert [c["table"] for c in assignment_changes] == [
        "site_camper_assignments",
        "tents",
        "vehicles",
    ]
    assert assignment_changes[0]["fields"] == {
        "campsite_id": "SITE-1",
        "member_id": "MEMBER-1",
    }
    assert assignment_changes[1]["fields"]["owned_by"] == "MEMBER-1"
    assert assignment_changes[1]["fields"]["campsite_id"] == "SITE-1"
    assert assignment_changes[2]["fields"]["owned_by"] == "MEMBER-1"
    assert assignment_changes[2]["fields"]["campsite_id"] == "SITE-1"


def test_build_changes_site_tools_respect_known_capacity():
    ctx = {
        "campsites": [
            {
                "id": "SITE-1",
                "site_number": "A-14",
                "max_tents": 1,
                "tent_count": 1,
                "max_vehicles": 1,
                "vehicle_count": 1,
            }
        ],
        "members": [{"id": "MEMBER-1", "display_name": "Rowan"}],
    }

    changes = build_changes(
        "assign_site",
        {
            "site_number": "A-14",
            "member_name": "Rowan",
            "tent_label": "REI Kingdom",
            "vehicle_label": "Subaru",
        },
        ctx,
    )

    assert [c["table"] for c in changes] == ["site_camper_assignments"]


def test_format_context_includes_site_capacity_and_occupancy():
    from app.ai import agent

    text = agent._format_context(
        {
            "name": "June campout",
            "nights": 2,
            "start_date": "2026-06-20",
            "end_date": "2026-06-22",
            "camping_type": "car",
            "camper_count": 4,
            "members": [],
            "shopping": [],
            "campsites": [
                {
                    "id": "SITE-1",
                    "site_number": "A-14",
                    "assigned_campers": 2,
                    "tent_count": 1,
                    "max_tents": 2,
                    "vehicle_count": 1,
                    "max_vehicles": 1,
                    "notes": "quiet loop",
                }
            ],
        }
    )

    assert "site A-14" in text
    assert "campers=2" in text
    assert "tents=1/2" in text
    assert "vehicles=1/1" in text
    assert "quiet loop" in text


def test_build_plan_steps_groups_changes_for_review():
    from app.ai import agent

    changes = [
        {
            "id": "site",
            "table": "site_camper_assignments",
            "label": "Assign Rowan to site A-14",
        },
        {"id": "tent", "table": "tents", "label": "Tent at site A-14: REI Kingdom"},
        {"id": "shop", "table": "shopping_items", "label": "Shopping: 4x buns"},
        {"id": "board", "table": "board_posts", "label": "Board post: dinner at 6"},
    ]

    steps = agent.build_plan_steps(changes)

    assert [s["title"] for s in steps] == [
        "Plan campsite setup",
        "Update shared shopping",
        "Post to the board",
    ]
    assert steps[0]["change_ids"] == ["site", "tent"]
    assert "Assign Rowan" in steps[0]["detail"]
    assert "Shopping" in steps[1]["detail"]


def test_execute_change_injects_server_fields_and_strips_extras():
    client = _FakeClient()
    change = {
        "id": "x",
        "table": "shopping_items",
        "op": "insert",
        "fields": {
            "name": "Charcoal",
            "estimated_cost": 12,
            # Hostile/extra fields that must be ignored or overridden:
            "created_by": "SOMEONE_ELSE",
            "trip_id": "OTHER_TRIP",
            "purchased": True,
            "id": "forced-id",
        },
    }
    res = execute_change(client, change, trip_id="TRIP", user_id="ME")
    assert res["status"] == "applied"
    assert client.inserts[0][0] == "insert"
    _, table, fields = client.inserts[0]
    assert table == "shopping_items"
    assert fields["trip_id"] == "TRIP"  # re-derived, not the client's value
    assert fields["created_by"] == "ME"  # re-derived
    assert fields["source"] == "ai"  # constant injected
    assert fields["name"] == "Charcoal"
    # Stray / non-whitelisted columns must not be written.
    assert "purchased" not in fields
    assert "id" not in fields
    assert res["row_id"] == "inserted-row"


def test_execute_change_injects_campground_context_for_campsites():
    client = _FakeClient()
    res = execute_change(
        client,
        {
            "id": "site-change",
            "table": "campsites",
            "op": "insert",
            "fields": {
                "site_number": "A-14",
                "max_tents": 2,
                "campground_id": "AGENT_SUPPLIED_BAD_VALUE",
                "trip_id": "OTHER_TRIP",
            },
        },
        trip_id="TRIP",
        user_id="ME",
        context={"campground_id": "CAMPGROUND-1"},
    )
    assert res["status"] == "applied"
    _, table, fields = client.inserts[0]
    assert table == "campsites"
    assert fields["trip_id"] == "TRIP"
    assert fields["campground_id"] == "CAMPGROUND-1"
    assert "AGENT_SUPPLIED_BAD_VALUE" not in fields.values()


def test_execute_change_validates_assignment_refs_against_context():
    client = _FakeClient()
    valid_ctx = {"campsite_ids": ["SITE-1"], "member_ids": ["MEMBER-1"]}
    res = execute_change(
        client,
        {
            "id": "assign-change",
            "table": "site_camper_assignments",
            "op": "insert",
            "fields": {"campsite_id": "SITE-1", "member_id": "MEMBER-1"},
        },
        trip_id="TRIP",
        user_id="ME",
        context=valid_ctx,
    )
    assert res["status"] == "applied"

    invalid = execute_change(
        client,
        {
            "id": "bad-assign-change",
            "table": "site_camper_assignments",
            "op": "insert",
            "fields": {"campsite_id": "OTHER-SITE", "member_id": "MEMBER-1"},
        },
        trip_id="TRIP",
        user_id="ME",
        context=valid_ctx,
    )
    assert invalid["status"] == "error"
    assert "campsite_id" in invalid["detail"]
    assert len(client.inserts) == 1


def test_execute_change_rejects_tents_and_vehicles_over_capacity():
    client = _FakeClient()
    ctx = {
        "campsite_ids": ["SITE-1"],
        "member_ids": ["MEMBER-1"],
        "campsites": [
            {
                "id": "SITE-1",
                "site_number": "A-14",
                "max_tents": 1,
                "tent_count": 1,
                "max_vehicles": 2,
                "vehicle_count": 1,
            }
        ],
    }

    tent = execute_change(
        client,
        {
            "id": "tent-change",
            "table": "tents",
            "op": "insert",
            "fields": {
                "label": "REI Kingdom",
                "owned_by": "MEMBER-1",
                "campsite_id": "SITE-1",
            },
        },
        trip_id="TRIP",
        user_id="ME",
        context=ctx,
    )
    assert tent["status"] == "error"
    assert "no open tent slots" in tent["detail"]

    vehicle = execute_change(
        client,
        {
            "id": "vehicle-change",
            "table": "vehicles",
            "op": "insert",
            "fields": {
                "label": "Subaru",
                "owned_by": "MEMBER-1",
                "campsite_id": "SITE-1",
            },
        },
        trip_id="TRIP",
        user_id="ME",
        context=ctx,
    )
    assert vehicle["status"] == "applied"
    assert ctx["campsites"][0]["vehicle_count"] == 2
    assert ctx["campsites"][0]["open_vehicle_slots"] == 0

    second_vehicle = execute_change(
        client,
        {
            "id": "second-vehicle-change",
            "table": "vehicles",
            "op": "insert",
            "fields": {
                "label": "Truck",
                "owned_by": "MEMBER-1",
                "campsite_id": "SITE-1",
            },
        },
        trip_id="TRIP",
        user_id="ME",
        context=ctx,
    )
    assert second_vehicle["status"] == "error"
    assert "no open vehicle slots" in second_vehicle["detail"]


def test_execute_change_rejects_disallowed_table():
    client = _FakeClient()
    res = execute_change(
        client,
        {"id": "y", "table": "trip_members", "op": "insert", "fields": {"role": "director"}},
        trip_id="TRIP",
        user_id="ME",
    )
    assert res["status"] == "error"
    assert client.inserts == []  # nothing written
    assert "trip_members" not in ALLOWED_TABLES


def test_execute_change_rejects_non_insert():
    client = _FakeClient()
    res = execute_change(
        client,
        {"id": "z", "table": "shopping_items", "op": "delete", "fields": {}},
        trip_id="TRIP",
        user_id="ME",
    )
    assert res["status"] == "error"
    assert client.inserts == []


def test_undo_result_deletes_recorded_row_through_user_client():
    client = _FakeClient()
    res = undo_result(
        client,
        {"id": "change-1", "status": "applied", "table": "board_posts", "row_id": "row-1"},
        trip_id="TRIP",
    )
    assert res == {
        "id": "change-1",
        "status": "undone",
        "table": "board_posts",
        "row_id": "row-1",
    }
    assert client.inserts == [
        ("delete", "board_posts", [("id", "row-1"), ("trip_id", "TRIP")])
    ]


def test_undo_result_rejects_unrecorded_or_disallowed_results():
    client = _FakeClient()
    assert undo_result(
        client,
        {"id": "change-1", "status": "error", "table": "board_posts", "row_id": "row-1"},
        trip_id="TRIP",
    )["status"] == "skipped"
    assert undo_result(
        client,
        {"id": "change-2", "status": "applied", "table": "trip_members", "row_id": "row-2"},
        trip_id="TRIP",
    )["status"] == "error"
    assert undo_result(
        client,
        {"id": "change-3", "status": "applied", "table": "board_posts"},
        trip_id="TRIP",
    )["status"] == "skipped"
    assert client.inserts == []


def test_current_google_genai_sdk_imports():
    from google import genai
    from google.genai import types

    from app.ai import agent
    from app.services import gemini

    assert genai.Client is not None
    assert types.GenerateContentConfig is not None
    assert isinstance(agent.is_configured(), bool)
    assert isinstance(gemini.is_configured(), bool)
