from fastapi import HTTPException

from app.routers import invites
from app.services.auth import AuthUser


class _FakeInviteTable:
    def __init__(self, sink):
        self.sink = sink
        self.payload = None

    def insert(self, payload):
        self.payload = payload
        return self

    def execute(self):
        self.sink.append(self.payload)
        return type(
            "Resp",
            (),
            {
                "data": [
                    {
                        "id": "invite-1",
                        "token": "70000000-0000-4000-8000-000000000013",
                    }
                ]
            },
        )()


class _FakeUserClient:
    def __init__(self):
        self.inserts = []

    def table(self, name):
        assert name == "trip_invites"
        return _FakeInviteTable(self.inserts)


class _FakeAdmin:
    def __init__(self):
        self.calls = []

    def invite_user_by_email(self, email, options):
        self.calls.append((email, options))


class _FakeServiceClient:
    def __init__(self):
        self.admin = _FakeAdmin()
        self.auth = type("Auth", (), {"admin": self.admin})()


def test_send_invite_creates_rls_scoped_invite_then_sends_auth_email(monkeypatch):
    user_client = _FakeUserClient()
    service_client = _FakeServiceClient()
    monkeypatch.setenv("SUPABASE_URL", "https://project.supabase.co")
    monkeypatch.setenv("SUPABASE_SECRET_KEY", "test-secret-key")
    monkeypatch.setenv("PUBLIC_APP_URL", "https://planner.example.test")
    monkeypatch.setattr(invites, "make_user_client", lambda token: user_client)
    monkeypatch.setattr(invites, "create_client", lambda url, key: service_client)

    res = invites.send_invite(
        invites.SendInviteRequest(
            trip_id="trip-1",
            email=" Friend@Example.COM ",
            role="cit",
        ),
        AuthUser(id="director-1", email="director@example.com", token="user-jwt"),
    )

    assert user_client.inserts == [
        {
            "trip_id": "trip-1",
            "email": "friend@example.com",
            "role": "cit",
            "invited_by": "director-1",
        }
    ]
    assert service_client.admin.calls == [
        (
            "friend@example.com",
            {
                "redirect_to": "https://planner.example.test/invite/70000000-0000-4000-8000-000000000013",
                "data": {
                    "trip_id": "trip-1",
                    "trip_invite_id": "invite-1",
                    "trip_role": "cit",
                },
            },
        )
    ]
    assert res.email_sent is True
    assert res.invite_url == "https://planner.example.test/invite/70000000-0000-4000-8000-000000000013"


def test_send_invite_returns_copy_link_fallback_when_email_is_not_configured(monkeypatch):
    user_client = _FakeUserClient()
    monkeypatch.delenv("SUPABASE_SECRET_KEY", raising=False)
    monkeypatch.setenv("FRONTEND_ORIGINS", "http://localhost:5173,http://localhost:4173")
    monkeypatch.setattr(invites, "make_user_client", lambda token: user_client)

    res = invites.send_invite(
        invites.SendInviteRequest(
            trip_id="trip-1",
            email="friend@example.com",
            role="camper",
        ),
        AuthUser(id="director-1", email="director@example.com", token="user-jwt"),
    )

    assert user_client.inserts[0]["role"] == "camper"
    assert res.email_sent is False
    assert res.delivery_error == "Email delivery is not configured on the backend."
    assert res.invite_url == "http://localhost:5173/invite/70000000-0000-4000-8000-000000000013"


def test_send_invite_rejects_invalid_email_before_writing(monkeypatch):
    called = False

    def _make_user_client(_token):
        nonlocal called
        called = True
        return _FakeUserClient()

    monkeypatch.setattr(invites, "make_user_client", _make_user_client)

    try:
        invites.send_invite(
            invites.SendInviteRequest(
                trip_id="trip-1",
                email="not-an-email",
                role="cit",
            ),
            AuthUser(id="director-1", email="director@example.com", token="user-jwt"),
        )
    except HTTPException as e:
        assert e.status_code == 400
    else:
        raise AssertionError("invalid email was accepted")

    assert called is False
