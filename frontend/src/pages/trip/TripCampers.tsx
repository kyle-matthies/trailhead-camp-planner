import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UserPlus,
  Mail,
  Copy,
  Check,
  Trash2,
  Users2,
  CreditCard,
  Loader2,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/useAuth";
import { useTrip } from "@/context/useTrip";
import { PageSpinner } from "@/components/ui/Spinner";
import RoleBadge from "@/components/ui/RoleBadge";
import CamperAvatar from "@/components/ui/CamperAvatar";
import PermissionGate from "@/components/ui/PermissionGate";
import { sendTripInvite, type SendTripInviteResponse } from "@/lib/invites";
import { roleAtLeast, type TripInvite, type TripParty, type TripRole } from "@/lib/types";

const ROLES: TripRole[] = ["director", "counselor", "cit", "camper"];
const INVITE_ROLES: Exclude<TripRole, "director">[] = ["counselor", "cit", "camper"];
const EMPTY_PAYMENT = { venmo_handle: "", paypal_me: "" };

function nullIfBlank(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export default function TripCampers() {
  const { user } = useAuth();
  const { tripId, members, myRole } = useTrip();
  const qc = useQueryClient();

  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Exclude<TripRole, "director">>("cit");
  const [partyName, setPartyName] = useState("");
  const [profilePayment, setProfilePayment] = useState(EMPTY_PAYMENT);
  const [partyPaymentDrafts, setPartyPaymentDrafts] = useState<Record<string, typeof EMPTY_PAYMENT>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isDirector = roleAtLeast(myRole, "director");
  const canManageParties = roleAtLeast(myRole, "counselor");
  const myMember = members.find((member) => member.user_id === user?.id);

  const invitesQ = useQuery({
    queryKey: ["trip", tripId, "invites"],
    enabled: isDirector,
    queryFn: async (): Promise<TripInvite[]> => {
      const { data, error } = await supabase
        .from("trip_invites")
        .select("*")
        .eq("trip_id", tripId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const partiesQ = useQuery({
    queryKey: ["trip", tripId, "parties"],
    queryFn: async (): Promise<TripParty[]> => {
      const { data, error } = await supabase
        .from("trip_parties")
        .select("*")
        .eq("trip_id", tripId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    setProfilePayment({
      venmo_handle: myMember?.profile?.venmo_handle ?? "",
      paypal_me: myMember?.profile?.paypal_me ?? "",
    });
  }, [myMember?.profile?.paypal_me, myMember?.profile?.venmo_handle]);

  useEffect(() => {
    setPartyPaymentDrafts((drafts) => {
      const next = { ...drafts };
      for (const party of partiesQ.data ?? []) {
        next[party.id] = next[party.id] ?? {
          venmo_handle: party.venmo_handle ?? "",
          paypal_me: party.paypal_me ?? "",
        };
      }
      return next;
    });
  }, [partiesQ.data]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["trip", tripId] });
  const fail = (e: unknown) => setError(e instanceof Error ? e.message : "Something went wrong");

  function inviteNotice(res: SendTripInviteResponse): string {
    if (res.email_sent) return `Invite email sent to ${res.email}.`;
    return `${res.delivery_error ?? "Email was not sent."} Copy the invite link below.`;
  }

  const inviteMut = useMutation({
    mutationFn: () =>
      sendTripInvite({
        tripId,
        email: email.trim(),
        role: inviteRole,
      }),
    onSuccess: (res) => {
      invalidate();
      setEmail("");
      setNotice(inviteNotice(res));
    },
    onError: fail,
  });

  const revokeMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trip_invites").update({ status: "revoked" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: fail,
  });

  const roleMut = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: TripRole }) => {
      const { error } = await supabase.from("trip_members").update({ role }).eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: fail,
  });

  const removeMut = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from("trip_members").delete().eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: fail,
  });

  const partyMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("trip_parties").insert({ trip_id: tripId, name: partyName.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setPartyName("");
    },
    onError: fail,
  });

  const profilePaymentMut = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("You must be signed in.");
      const { error } = await supabase
        .from("profiles")
        .update({
          venmo_handle: nullIfBlank(profilePayment.venmo_handle),
          paypal_me: nullIfBlank(profilePayment.paypal_me),
        })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: fail,
  });

  const partyPaymentMut = useMutation({
    mutationFn: async (partyId: string) => {
      const draft = partyPaymentDrafts[partyId] ?? EMPTY_PAYMENT;
      const { error } = await supabase
        .from("trip_parties")
        .update({
          venmo_handle: nullIfBlank(draft.venmo_handle),
          paypal_me: nullIfBlank(draft.paypal_me),
        })
        .eq("id", partyId)
        .eq("trip_id", tripId);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: fail,
  });

  const assignPartyMut = useMutation({
    mutationFn: async ({ memberId, partyId }: { memberId: string; partyId: string | null }) => {
      const { error } = await supabase.from("trip_members").update({ party_id: partyId }).eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: fail,
  });

  function copyLink(token: string) {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard?.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied((c) => (c === token ? null : c)), 1500);
  }

  if (partiesQ.isLoading) return <PageSpinner />;
  const parties = partiesQ.data ?? [];
  const invites = invitesQ.data ?? [];

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex justify-between">
          {error}
          <button onClick={() => setError("")}><X className="w-4 h-4" /></button>
        </div>
      )}
      {notice && (
        <div className="p-3 bg-forest-50 border border-forest-200 rounded-lg text-sm text-forest-700 flex justify-between">
          {notice}
          <button onClick={() => setNotice("")}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Personal payment handles */}
      <div className="card p-5">
        <h2 className="font-heading font-semibold text-stone-900 flex items-center gap-2 mb-3">
          <CreditCard className="w-4 h-4 text-forest-600" /> Your Payment Links
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            profilePaymentMut.mutate();
          }}
          className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end"
        >
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Venmo</label>
            <input
              value={profilePayment.venmo_handle}
              onChange={(e) => setProfilePayment({ ...profilePayment, venmo_handle: e.target.value })}
              className="w-full px-3 py-2 border-2 border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
              placeholder="@username"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">PayPal.Me</label>
            <input
              value={profilePayment.paypal_me}
              onChange={(e) => setProfilePayment({ ...profilePayment, paypal_me: e.target.value })}
              className="w-full px-3 py-2 border-2 border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
              placeholder="paypal.me/username"
            />
          </div>
          <button type="submit" disabled={profilePaymentMut.isPending} className="btn-primary px-4 py-2 text-sm">
            Save
          </button>
        </form>
      </div>

      {/* Members roster */}
      <div className="card p-5">
        <h2 className="font-heading font-semibold text-stone-900 flex items-center gap-2 mb-4">
          <Users2 className="w-4 h-4 text-forest-600" /> Campers ({members.length})
        </h2>
        <div className="space-y-2">
          {members.map((m) => {
            const name = m.display_name || m.profile?.name || m.profile?.email || "Camper";
            const isSelf = m.user_id === user?.id;
            return (
              <div key={m.id} className="flex flex-wrap items-center gap-3 py-2 border-b border-stone-100 last:border-0">
                <CamperAvatar name={name} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800">
                    {name} {isSelf && <span className="text-xs text-stone-400">(you)</span>}
                  </p>
                  {m.profile?.email && <p className="text-xs text-stone-400 truncate">{m.profile.email}</p>}
                </div>

                {/* Party assignment */}
                {canManageParties && parties.length > 0 ? (
                  <select
                    value={m.party_id ?? ""}
                    onChange={(e) => assignPartyMut.mutate({ memberId: m.id, partyId: e.target.value || null })}
                    className="text-xs px-2 py-1 border border-stone-200 rounded"
                  >
                    <option value="">No household</option>
                    {parties.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                ) : (
                  m.party_id && (
                    <span className="text-xs text-stone-500">
                      {parties.find((p) => p.id === m.party_id)?.name}
                    </span>
                  )
                )}

                {/* Role */}
                {isDirector && !isSelf ? (
                  <select
                    value={m.role}
                    onChange={(e) => roleMut.mutate({ memberId: m.id, role: e.target.value as TripRole })}
                    className="text-xs px-2 py-1 border border-stone-200 rounded capitalize"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r} className="capitalize">{r}</option>
                    ))}
                  </select>
                ) : (
                  <RoleBadge role={m.role} />
                )}

                {isDirector && !isSelf && (
                  <button
                    onClick={() => {
                      if (confirm(`Remove ${name} from this trip?`)) removeMut.mutate(m.id);
                    }}
                    className="p-1 text-stone-300 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Invites (director only) */}
      <PermissionGate role={myRole} min="director">
        <div className="card p-5">
          <h2 className="font-heading font-semibold text-stone-900 flex items-center gap-2 mb-3">
            <UserPlus className="w-4 h-4 text-forest-600" /> Invite Campers
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError("");
              setNotice("");
              inviteMut.mutate();
            }}
            className="flex flex-wrap gap-2 items-end"
          >
            <div className="flex-1 min-w-[12rem]">
              <label className="block text-xs font-medium text-stone-600 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border-2 border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
                placeholder="friend@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as Exclude<TripRole, "director">)}
                className="px-3 py-2 border-2 border-stone-200 rounded-lg text-sm capitalize focus:outline-none focus:ring-2 focus:ring-forest-500"
              >
                {INVITE_ROLES.map((r) => (
                  <option key={r} value={r} className="capitalize">{r}</option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={inviteMut.isPending} className="btn-primary px-4 py-2 text-sm">
              {inviteMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Mail className="w-4 h-4 mr-1" />}
              {inviteMut.isPending ? "Sending" : "Send invite"}
            </button>
          </form>

          {invites.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-stone-500">
                Pending invites. Email is sent when delivery is configured; copy a link anytime:
              </p>
              {invites.map((inv) => (
                <div key={inv.id} className="flex items-center gap-2 text-sm bg-stone-50 rounded-lg px-3 py-2">
                  <span className="flex-1 truncate">{inv.email}</span>
                  <RoleBadge role={inv.role} showIcon={false} />
                  <button
                    onClick={() => copyLink(inv.token)}
                    className="btn-outline px-2 py-1 text-xs"
                    title="Copy invite link"
                  >
                    {copied === inv.token ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </button>
                  <button onClick={() => revokeMut.mutate(inv.id)} className="p-1 text-stone-300 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </PermissionGate>

      {/* Households / parties */}
      <PermissionGate role={myRole} min="counselor">
        <div className="card p-5">
          <h2 className="font-heading font-semibold text-stone-900 flex items-center gap-2 mb-2">
            <Users2 className="w-4 h-4 text-forest-600" /> Households
          </h2>
          <p className="text-xs text-stone-500 mb-3">
            Group families/campers who share a car, tent, and costs. Expenses settle per household.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError("");
              partyMut.mutate();
            }}
            className="flex gap-2"
          >
            <input
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
              required
              className="flex-1 px-3 py-2 border-2 border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
              placeholder="e.g. Trail Crew"
            />
            <button type="submit" disabled={partyMut.isPending} className="btn-primary px-4 py-2 text-sm">
              Add
            </button>
          </form>
          {parties.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              {parties.map((p) => {
                const count = members.filter((m) => m.party_id === p.id).length;
                const draft = partyPaymentDrafts[p.id] ?? {
                  venmo_handle: p.venmo_handle ?? "",
                  paypal_me: p.paypal_me ?? "",
                };
                return (
                  <div key={p.id} className="rounded-lg border border-sand-200 bg-sand-50 p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-sm font-medium text-sand-900">{p.name}</span>
                      <span className="text-xs text-sand-700">{count} camper{count === 1 ? "" : "s"}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        value={draft.venmo_handle}
                        onChange={(e) =>
                          setPartyPaymentDrafts({
                            ...partyPaymentDrafts,
                            [p.id]: { ...draft, venmo_handle: e.target.value },
                          })
                        }
                        className="px-2 py-1.5 border border-sand-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-forest-500"
                        placeholder="Venmo @username"
                      />
                      <input
                        value={draft.paypal_me}
                        onChange={(e) =>
                          setPartyPaymentDrafts({
                            ...partyPaymentDrafts,
                            [p.id]: { ...draft, paypal_me: e.target.value },
                          })
                        }
                        className="px-2 py-1.5 border border-sand-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-forest-500"
                        placeholder="PayPal.Me"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => partyPaymentMut.mutate(p.id)}
                      disabled={partyPaymentMut.isPending}
                      className="mt-2 text-xs font-medium text-forest-700 hover:text-forest-900 disabled:text-stone-400"
                    >
                      Save payment links
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PermissionGate>
    </div>
  );
}
