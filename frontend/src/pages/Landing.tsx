import { Link } from "react-router-dom";
import {
  ArrowRight,
  Backpack,
  BadgeDollarSign,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  TentTree,
  Users,
} from "lucide-react";
import Footer from "@/components/Footer";

const features = [
  {
    icon: Users,
    title: "Roles that match the group",
    description:
      "Directors manage people, counselors coordinate the plan, CITs contribute, and campers stay informed.",
  },
  {
    icon: TentTree,
    title: "One trip operating picture",
    description:
      "Keep itinerary, sites, vehicles, tents, and camper assignments together instead of across separate chats.",
  },
  {
    icon: Backpack,
    title: "Shared readiness",
    description:
      "Turn gear, shopping, and personal packing into owned checklists the whole group can understand.",
  },
  {
    icon: BadgeDollarSign,
    title: "Costs people can trust",
    description:
      "Track who paid, split by household or camper, and make the final settle-up transparent.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden bg-gradient-to-br from-sand-50 via-white to-forest-50">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-forest-100/70 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-forest-200 bg-white/80 px-4 py-2 text-sm font-semibold text-forest-700 shadow-sm">
              <ShieldCheck className="h-4 w-4" />
              Open-source group trip planning
            </div>
            <h1 className="mt-7 font-heading text-4xl font-bold leading-tight text-stone-900 sm:text-6xl">
              Get the group aligned
              <span className="block text-forest-600">before anyone leaves the trailhead.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-stone-600 sm:text-xl">
              Trailhead Camp Planner brings people, campsites, shared lists, costs,
              and trip updates into one permission-aware workspace.
            </p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/demo" className="btn-primary group px-7 py-3.5 text-base font-semibold">
                Explore the fictional demo
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="https://github.com/kyle-matthies/trailhead-camp-planner"
                className="btn-outline px-7 py-3.5 text-base font-semibold"
              >
                View source on GitHub
              </a>
            </div>
            <p className="mt-4 text-xs text-stone-500">
              Demo mode uses fictional in-memory data and makes no network requests.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-forest-600">Built around coordination</p>
            <h2 className="mt-3 font-heading text-3xl font-bold text-stone-900 sm:text-4xl">
              The jobs that become painful as a trip grows
            </h2>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="card p-6 transition-transform hover:-translate-y-1">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-forest-100">
                    <Icon className="h-5 w-5 text-forest-700" />
                  </div>
                  <h3 className="mt-5 font-heading text-lg font-semibold text-stone-900">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600">{feature.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-sand-50 py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-forest-700">
              <Sparkles className="h-5 w-5" /> AI with a human decision point
            </div>
            <h2 className="mt-4 font-heading text-3xl font-bold text-stone-900 sm:text-4xl">
              Suggestions are useful. Silent writes are not.
            </h2>
            <p className="mt-5 leading-relaxed text-stone-600">
              The assistant can translate a planning request into structured changes,
              but it cannot commit them by itself. Every proposed item is visible,
              individually selectable, and applied only after confirmation.
            </p>
            <Link to="/demo" className="mt-7 inline-flex items-center font-semibold text-forest-700 hover:text-forest-900">
              Try the review flow <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
          <div className="card p-6 shadow-md">
            <div className="flex items-center gap-3 border-b border-stone-200 pb-4">
              <MessageSquare className="h-5 w-5 text-forest-600" />
              <div><p className="text-sm font-semibold text-stone-900">“Add campfire taco ingredients for four.”</p><p className="text-xs text-stone-500">Planning request · no changes yet</p></div>
            </div>
            <div className="mt-4 space-y-2">
              {["12 corn tortillas", "Black beans", "Salsa and limes"].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-lg border border-stone-200 p-3 text-sm text-stone-700">
                  <span className="flex h-5 w-5 items-center justify-center rounded border border-forest-500 bg-forest-50 text-forest-700">✓</span>
                  Add {item} to shopping
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2"><span className="btn-outline px-4 py-2 text-sm">Cancel</span><span className="btn-primary px-4 py-2 text-sm">Apply selected changes</span></div>
          </div>
        </div>
      </section>

      <section className="bg-forest-900 py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-heading text-3xl font-bold sm:text-4xl">See the whole workflow in five minutes.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-forest-200">Explore every role and planning surface with safe, resettable sample data.</p>
          <Link to="/demo" className="mt-7 inline-flex items-center rounded-lg bg-white px-7 py-3.5 font-semibold text-forest-900 transition-colors hover:bg-sand-50">Open demo workspace <ArrowRight className="ml-2 h-5 w-5" /></Link>
        </div>
      </section>
      <Footer />
    </div>
  );
}
