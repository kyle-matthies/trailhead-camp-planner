import { useMemo, useState } from "react";
import {
  Backpack,
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  DollarSign,
  MapPin,
  MessageSquare,
  Plus,
  Receipt,
  Send,
  ShieldCheck,
  Sparkles,
  TentTree,
  Users,
  X,
} from "lucide-react";

type Section =
  | "overview"
  | "people"
  | "sites"
  | "gear"
  | "costs"
  | "bulletin"
  | "assistant";

type ChecklistItem = {
  id: string;
  name: string;
  owner: string;
  done: boolean;
};

type Proposal = {
  id: string;
  label: string;
  item: string;
  selected: boolean;
};

const sections: { id: Section; label: string; icon: typeof ClipboardCheck }[] = [
  { id: "overview", label: "Overview", icon: ClipboardCheck },
  { id: "people", label: "People & invites", icon: Users },
  { id: "sites", label: "Sites & itinerary", icon: TentTree },
  { id: "gear", label: "Gear & shopping", icon: Backpack },
  { id: "costs", label: "Shared costs", icon: Receipt },
  { id: "bulletin", label: "Bulletin", icon: MessageSquare },
  { id: "assistant", label: "AI review flow", icon: Sparkles },
];

const members = [
  { initials: "RC", name: "Rowan Chen", role: "Director", note: "Trip, roles, and members" },
  { initials: "MP", name: "Morgan Patel", role: "Counselor", note: "All trip content" },
  { initials: "JL", name: "Jordan Lee", role: "CIT", note: "Adds and claims items" },
  { initials: "SK", name: "Sam Kim", role: "Camper", note: "Read-only trip view" },
];

const expenses = [
  { label: "Campsites", paidBy: "Rowan", amount: 288 },
  { label: "Groceries", paidBy: "Morgan", amount: 124 },
  { label: "Firewood", paidBy: "Jordan", amount: 56 },
];

const settlement = [
  { name: "Rowan", paid: 288, share: 117, net: 171 },
  { name: "Morgan", paid: 124, share: 117, net: 7 },
  { name: "Jordan", paid: 56, share: 117, net: -61 },
  { name: "Sam", paid: 0, share: 117, net: -117 },
];

const initialGear: ChecklistItem[] = [
  { id: "gear-1", name: "Two-burner stove", owner: "Morgan", done: true },
  { id: "gear-2", name: "Water filter", owner: "Jordan", done: true },
  { id: "gear-3", name: "Group first-aid kit", owner: "Rowan", done: false },
  { id: "gear-4", name: "Lanterns", owner: "Sam", done: true },
];

const initialShopping: ChecklistItem[] = [
  { id: "shop-1", name: "Breakfast oats", owner: "Morgan", done: true },
  { id: "shop-2", name: "Trail snacks", owner: "Jordan", done: false },
  { id: "shop-3", name: "Coffee", owner: "Rowan", done: true },
  { id: "shop-4", name: "Firewood bundle", owner: "Unclaimed", done: false },
];

const initialPosts = [
  { id: "post-1", author: "Morgan", time: "Today · 9:20 AM", body: "I confirmed both sites. Check-in opens at 2 PM." },
  { id: "post-2", author: "Jordan", time: "Yesterday · 6:45 PM", body: "I can bring the water filter and an extra lantern." },
];

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-stone-200" aria-label={`${value}% ready`}>
      <div className="h-full rounded-full bg-forest-600" style={{ width: `${value}%` }} />
    </div>
  );
}

function Checklist({
  title,
  items,
  onToggle,
}: {
  title: string;
  items: ChecklistItem[];
  onToggle: (id: string) => void;
}) {
  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-heading text-lg font-semibold text-stone-900">{title}</h3>
        <span className="text-xs font-medium text-stone-500">
          {items.filter((item) => item.done).length}/{items.length} ready
        </span>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onToggle(item.id)}
              className="flex w-full items-center gap-3 rounded-lg border border-stone-200 p-3 text-left transition-colors hover:bg-stone-50"
            >
              {item.done ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-forest-600" />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-stone-300" />
              )}
              <span className={`flex-1 text-sm font-medium ${item.done ? "text-stone-500 line-through" : "text-stone-800"}`}>
                {item.name}
              </span>
              <span className="rounded-full bg-sand-100 px-2 py-1 text-xs text-stone-600">
                {item.owner}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function DemoWorkspace() {
  const [active, setActive] = useState<Section>("overview");
  const [gear, setGear] = useState(initialGear);
  const [shopping, setShopping] = useState(initialShopping);
  const [inviteCreated, setInviteCreated] = useState(false);
  const [posts, setPosts] = useState(initialPosts);
  const [postText, setPostText] = useState("");
  const [prompt, setPrompt] = useState("Add ingredients for campfire tacos and assign them to me");
  const [proposal, setProposal] = useState<Proposal[]>([]);
  const [appliedMessage, setAppliedMessage] = useState("");

  const readiness = useMemo(() => {
    const items = [...gear, ...shopping];
    return Math.round((items.filter((item) => item.done).length / items.length) * 100);
  }, [gear, shopping]);

  function toggleItem(
    setter: React.Dispatch<React.SetStateAction<ChecklistItem[]>>,
    id: string
  ) {
    setter((items) => items.map((item) => (item.id === id ? { ...item, done: !item.done } : item)));
  }

  function addPost() {
    const body = postText.trim();
    if (!body) return;
    setPosts((current) => [
      { id: `post-${current.length + 1}`, author: "You", time: "Just now", body },
      ...current,
    ]);
    setPostText("");
  }

  function planSuggestion() {
    if (!prompt.trim()) return;
    setAppliedMessage("");
    setProposal([
      { id: "proposal-1", label: "Add 12 corn tortillas to shopping", item: "Corn tortillas", selected: true },
      { id: "proposal-2", label: "Add black beans to shopping", item: "Black beans", selected: true },
      { id: "proposal-3", label: "Add salsa and limes to shopping", item: "Salsa and limes", selected: true },
    ]);
  }

  function applySuggestion() {
    const selected = proposal.filter((change) => change.selected);
    setShopping((current) => [
      ...current,
      ...selected
        .filter((change) => !current.some((item) => item.name === change.item))
        .map((change) => ({
          id: `ai-${change.id}`,
          name: change.item,
          owner: "Rowan",
          done: false,
        })),
    ]);
    setProposal([]);
    setAppliedMessage(`Applied ${selected.length} reviewed change${selected.length === 1 ? "" : "s"} to this in-memory demo.`);
  }

  return (
    <div className="min-h-screen bg-sand-50 pb-16">
      <div className="border-b border-forest-900 bg-forest-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4 text-forest-300" />
            <span className="font-semibold">Fictional demo</span>
            <span className="text-forest-200">No account, network, or persistent data</span>
          </div>
          <span className="text-xs text-forest-300">Reset by refreshing the page</span>
        </div>
      </div>

      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-forest-600">Group trip workspace</p>
              <h1 className="font-heading text-3xl font-bold text-stone-900 sm:text-4xl">Northstar Ridge Weekend</h1>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-stone-600">
                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> Northstar Ridge Campground</span>
                <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" /> September 18–20 · 2 nights</span>
              </div>
            </div>
            <div className="w-full max-w-sm rounded-xl border border-stone-200 bg-sand-50 p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-stone-800">Trip readiness</span>
                <span className="font-bold text-forest-700">{readiness}%</span>
              </div>
              <ProgressBar value={readiness} />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-7 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-8">
        <aside>
          <nav className="card overflow-hidden p-2" aria-label="Demo sections">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActive(section.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                    active === section.id
                      ? "bg-forest-100 text-forest-800"
                      : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {section.label}
                </button>
              );
            })}
          </nav>
          <div className="mt-4 rounded-xl border border-forest-200 bg-forest-50 p-4">
            <div className="flex items-center gap-2 font-semibold text-forest-900">
              <ShieldCheck className="h-4 w-4" /> Permission boundary
            </div>
            <p className="mt-2 text-xs leading-relaxed text-forest-800">
              The interface hides actions a role cannot take; connected mode repeats the same boundary in Postgres RLS.
            </p>
          </div>
        </aside>

        <main>
          {active === "overview" && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "People", value: "4", detail: "4 role levels", icon: Users },
                  { label: "Campsites", value: "2", detail: "8 tent slots", icon: TentTree },
                  { label: "Checklist", value: `${readiness}%`, detail: "Shared readiness", icon: CheckCircle2 },
                  { label: "Trip costs", value: "$468", detail: "$117 per person", icon: DollarSign },
                ].map((metric) => {
                  const Icon = metric.icon;
                  return (
                    <section key={metric.label} className="card p-5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-stone-500">{metric.label}</span>
                        <Icon className="h-5 w-5 text-forest-600" />
                      </div>
                      <p className="mt-3 text-3xl font-bold text-stone-900">{metric.value}</p>
                      <p className="mt-1 text-xs text-stone-500">{metric.detail}</p>
                    </section>
                  );
                })}
              </div>
              <div className="grid gap-6 xl:grid-cols-2">
                <section className="card p-5">
                  <h2 className="font-heading text-xl font-semibold text-stone-900">Today’s decisions</h2>
                  <ul className="mt-4 space-y-3">
                    {[
                      "Claim the remaining firewood purchase",
                      "Confirm who brings the first-aid kit",
                      "Review the proposed campfire taco shopping items",
                    ].map((item) => (
                      <li key={item} className="flex gap-3 rounded-lg bg-sand-50 p-3 text-sm text-stone-700">
                        <Circle className="mt-0.5 h-4 w-4 shrink-0 text-campfire-500" /> {item}
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="card p-5">
                  <h2 className="font-heading text-xl font-semibold text-stone-900">Friday arrival</h2>
                  <div className="mt-4 space-y-4 border-l-2 border-forest-200 pl-5">
                    <div><p className="text-sm font-semibold text-stone-900">2:00 PM · Check in</p><p className="text-xs text-stone-500">Director picks up both site tags</p></div>
                    <div><p className="text-sm font-semibold text-stone-900">3:00 PM · Site setup</p><p className="text-xs text-stone-500">Tents first, shared kitchen second</p></div>
                    <div><p className="text-sm font-semibold text-stone-900">6:30 PM · Group dinner</p><p className="text-xs text-stone-500">Campfire tacos after the safety check</p></div>
                  </div>
                </section>
              </div>
            </div>
          )}

          {active === "people" && (
            <div className="space-y-6">
              <section className="card overflow-hidden">
                <div className="border-b border-stone-200 p-5">
                  <h2 className="font-heading text-xl font-semibold text-stone-900">Membership and roles</h2>
                  <p className="mt-1 text-sm text-stone-500">Each role expands a deliberate set of collaboration rights.</p>
                </div>
                <ul className="divide-y divide-stone-100">
                  {members.map((member) => (
                    <li key={member.name} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-forest-100 text-sm font-bold text-forest-800">{member.initials}</span>
                      <div className="flex-1"><p className="font-semibold text-stone-900">{member.name}</p><p className="text-xs text-stone-500">{member.note}</p></div>
                      <span className="w-fit rounded-full bg-sand-100 px-3 py-1 text-xs font-semibold text-stone-700">{member.role}</span>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="card p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div><h3 className="font-heading text-lg font-semibold text-stone-900">Invite a camper</h3><p className="mt-1 text-sm text-stone-500">Demo recipient: casey@example.test · Camper role</p></div>
                  <button type="button" onClick={() => setInviteCreated(true)} disabled={inviteCreated} className="btn-primary px-4 py-2 text-sm disabled:cursor-default disabled:bg-forest-300">
                    {inviteCreated ? <Check className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                    {inviteCreated ? "Invite created" : "Create demo invite"}
                  </button>
                </div>
                {inviteCreated && <p className="mt-4 rounded-lg bg-forest-50 p-3 text-sm text-forest-800">A fictional invite link was created in memory. No email was sent.</p>}
              </section>
            </div>
          )}

          {active === "sites" && (
            <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
              <section className="card p-5">
                <h2 className="font-heading text-xl font-semibold text-stone-900">Campsite allocation</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {[
                    { site: "Site A12", people: "Rowan · Morgan", tents: "2 of 4 tents", vehicles: "1 of 2 vehicles" },
                    { site: "Site A13", people: "Jordan · Sam", tents: "1 of 4 tents", vehicles: "2 of 2 vehicles" },
                  ].map((site) => (
                    <article key={site.site} className="rounded-xl border border-stone-200 bg-sand-50 p-4">
                      <div className="flex items-center justify-between"><h3 className="font-semibold text-stone-900">{site.site}</h3><TentTree className="h-5 w-5 text-forest-600" /></div>
                      <p className="mt-4 text-sm text-stone-700">{site.people}</p>
                      <p className="mt-2 text-xs text-stone-500">{site.tents}</p>
                      <p className="mt-1 text-xs text-stone-500">{site.vehicles}</p>
                    </article>
                  ))}
                </div>
              </section>
              <section className="card p-5">
                <h2 className="font-heading text-xl font-semibold text-stone-900">Weekend itinerary</h2>
                <ol className="mt-5 space-y-4">
                  {[
                    ["Friday", "Arrival, setup, shared dinner"],
                    ["Saturday", "Ridge walk, lake lunch, campfire"],
                    ["Sunday", "Breakfast, pack-down, 11 AM checkout"],
                  ].map(([day, plan], index) => (
                    <li key={day} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest-100 text-xs font-bold text-forest-700">{index + 1}</span><div><p className="text-sm font-semibold text-stone-900">{day}</p><p className="text-sm text-stone-500">{plan}</p></div></li>
                  ))}
                </ol>
              </section>
            </div>
          )}

          {active === "gear" && (
            <div className="grid gap-6 xl:grid-cols-2">
              <Checklist title="Shared gear" items={gear} onToggle={(id) => toggleItem(setGear, id)} />
              <Checklist title="Shopping list" items={shopping} onToggle={(id) => toggleItem(setShopping, id)} />
            </div>
          )}

          {active === "costs" && (
            <div className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
              <section className="card p-5">
                <div className="flex items-center justify-between"><h2 className="font-heading text-xl font-semibold text-stone-900">Recorded costs</h2><span className="text-xl font-bold text-stone-900">$468</span></div>
                <ul className="mt-5 divide-y divide-stone-100">
                  {expenses.map((expense) => <li key={expense.label} className="flex items-center justify-between py-3"><div><p className="text-sm font-semibold text-stone-800">{expense.label}</p><p className="text-xs text-stone-500">Paid by {expense.paidBy}</p></div><span className="font-semibold text-stone-900">${expense.amount}</span></li>)}
                </ul>
              </section>
              <section className="card overflow-hidden">
                <div className="border-b border-stone-200 p-5"><h2 className="font-heading text-xl font-semibold text-stone-900">Settlement</h2><p className="mt-1 text-sm text-stone-500">Equal split shown; connected mode also supports custom party or member allocations.</p></div>
                <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-sand-50 text-xs uppercase tracking-wide text-stone-500"><tr><th className="px-5 py-3">Camper</th><th className="px-5 py-3">Paid</th><th className="px-5 py-3">Share</th><th className="px-5 py-3">Net</th></tr></thead><tbody className="divide-y divide-stone-100">{settlement.map((row) => <tr key={row.name}><td className="px-5 py-3 font-semibold text-stone-800">{row.name}</td><td className="px-5 py-3">${row.paid}</td><td className="px-5 py-3">${row.share}</td><td className={`px-5 py-3 font-semibold ${row.net >= 0 ? "text-forest-700" : "text-campfire-700"}`}>{row.net >= 0 ? "+" : "−"}${Math.abs(row.net)}</td></tr>)}</tbody></table></div>
              </section>
            </div>
          )}

          {active === "bulletin" && (
            <div className="space-y-5">
              <section className="card p-5">
                <label htmlFor="demo-post" className="font-heading text-lg font-semibold text-stone-900">Post an update</label>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row"><input id="demo-post" value={postText} onChange={(event) => setPostText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addPost(); }} placeholder="Share a reminder with the group" className="min-w-0 flex-1 rounded-lg border-2 border-stone-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-forest-500" /><button type="button" onClick={addPost} className="btn-primary px-4 py-2 text-sm"><Send className="mr-2 h-4 w-4" />Post</button></div>
                <p className="mt-2 text-xs text-stone-500">Private photo attachments are available only in connected mode and use member-scoped storage policies.</p>
              </section>
              <section className="space-y-3">{posts.map((post) => <article key={post.id} className="card p-5"><div className="flex items-center justify-between"><span className="font-semibold text-stone-900">{post.author}</span><span className="text-xs text-stone-400">{post.time}</span></div><p className="mt-3 text-sm leading-relaxed text-stone-700">{post.body}</p></article>)}</section>
            </div>
          )}

          {active === "assistant" && (
            <section className="card overflow-hidden">
              <div className="border-b border-stone-200 bg-gradient-to-r from-forest-50 to-sand-50 p-6">
                <div className="flex items-center gap-2 text-forest-800"><Sparkles className="h-5 w-5" /><span className="text-sm font-bold uppercase tracking-wide">Review before write</span></div>
                <h2 className="mt-3 font-heading text-2xl font-bold text-stone-900">The assistant proposes. A person decides.</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">Generating a plan never changes trip data. Reviewers can deselect individual changes, cancel the proposal, or explicitly apply the approved subset.</p>
              </div>
              <div className="p-6">
                <label htmlFor="demo-prompt" className="text-sm font-semibold text-stone-800">Planning request</label>
                <textarea id="demo-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={3} className="mt-2 w-full rounded-lg border-2 border-stone-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-forest-500" />
                {proposal.length === 0 ? (
                  <div className="mt-4 flex items-center justify-between gap-4"><p className="text-xs text-stone-500">This demo returns a deterministic local proposal and makes no AI request.</p><button type="button" onClick={planSuggestion} className="btn-primary shrink-0 px-4 py-2 text-sm"><Sparkles className="mr-2 h-4 w-4" />Generate proposal</button></div>
                ) : (
                  <div className="mt-5 rounded-xl border border-stone-200">
                    <div className="border-b border-stone-200 bg-sand-50 px-4 py-3"><p className="text-sm font-semibold text-stone-900">Proposed shopping changes</p><p className="text-xs text-stone-500">Select only what should be applied.</p></div>
                    <ul className="divide-y divide-stone-100">{proposal.map((change) => <li key={change.id} className="flex items-center gap-3 p-4"><input aria-label={change.label} type="checkbox" checked={change.selected} onChange={() => setProposal((items) => items.map((item) => item.id === change.id ? { ...item, selected: !item.selected } : item))} className="h-4 w-4 accent-forest-600" /><Plus className="h-4 w-4 text-forest-600" /><span className="text-sm text-stone-700">{change.label}</span></li>)}</ul>
                    <div className="flex justify-end gap-2 border-t border-stone-200 p-4"><button type="button" onClick={() => setProposal([])} className="btn-outline px-4 py-2 text-sm"><X className="mr-2 h-4 w-4" />Cancel</button><button type="button" onClick={applySuggestion} disabled={!proposal.some((item) => item.selected)} className="btn-primary px-4 py-2 text-sm disabled:bg-forest-300"><Check className="mr-2 h-4 w-4" />Apply selected changes</button></div>
                  </div>
                )}
                {appliedMessage && <div role="status" className="mt-4 rounded-lg border border-forest-200 bg-forest-50 p-3 text-sm text-forest-800">{appliedMessage}</div>}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
