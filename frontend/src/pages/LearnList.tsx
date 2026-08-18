import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Loader2,
  ArrowRight,
  Waves,
  Mountain,
  Sun,
  Tent,
} from "lucide-react";
import { fetchLearnTopics } from "@/lib/api";
import Footer from "@/components/Footer";

const heroImages: Record<string, { icon: React.ElementType; gradient: string }> = {
  beach: { icon: Waves, gradient: "from-sky-400 to-cyan-500" },
  mountain: { icon: Mountain, gradient: "from-slate-500 to-emerald-600" },
  desert: { icon: Sun, gradient: "from-amber-400 to-orange-500" },
  campfire: { icon: Tent, gradient: "from-forest-500 to-forest-700" },
};

const difficultyColors: Record<string, string> = {
  beginner: "bg-green-100 text-green-800",
  intermediate: "bg-amber-100 text-amber-800",
  advanced: "bg-red-100 text-red-800",
};

interface TopicSummary {
  id: string;
  title: string;
  subtitle: string;
  difficulty: string;
  heroImage: string;
}

export default function LearnList() {
  const [topics, setTopics] = useState<TopicSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLearnTopics()
      .then((data) => setTopics(data.topics))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-forest-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="bg-gradient-to-br from-sand-50 to-forest-50 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-heading font-bold text-stone-900 mb-4">
            Learn About Camping
          </h1>
          <p className="text-lg text-stone-600 max-w-2xl mx-auto">
            Explore different camping environments and find the style that's
            right for you. Each guide covers what to expect, what to bring, and
            expert tips.
          </p>
        </div>
      </section>

      {/* Topics grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid sm:grid-cols-2 gap-6">
          {topics.map((topic) => {
            const hero = heroImages[topic.heroImage] || heroImages.campfire;
            const Icon = hero.icon;
            return (
              <Link
                key={topic.id}
                to={`/learn/${topic.id}`}
                className="card overflow-hidden group hover:shadow-lg transition-shadow"
              >
                <div
                  className={`bg-gradient-to-br ${hero.gradient} p-8 flex items-center justify-center`}
                >
                  <Icon className="w-16 h-16 text-white/90" />
                </div>
                <div className="p-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        difficultyColors[topic.difficulty] || difficultyColors.beginner
                      }`}
                    >
                      {topic.difficulty}
                    </span>
                  </div>
                  <h2 className="text-xl font-heading font-bold text-stone-900 group-hover:text-forest-700 transition-colors">
                    {topic.title}
                  </h2>
                  <p className="text-sm text-stone-600">{topic.subtitle}</p>
                  <div className="flex items-center gap-1 text-sm font-medium text-forest-600">
                    Read Guide
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <Footer />
    </div>
  );
}
