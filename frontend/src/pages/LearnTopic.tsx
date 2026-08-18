import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  Backpack,
  Waves,
  Mountain,
  Sun,
  Tent,
} from "lucide-react";
import { fetchLearnTopic } from "@/lib/api";
import Footer from "@/components/Footer";

const heroImages: Record<string, { icon: React.ElementType; gradient: string }> = {
  beach: { icon: Waves, gradient: "from-sky-400 to-cyan-500" },
  mountain: { icon: Mountain, gradient: "from-slate-500 to-emerald-600" },
  desert: { icon: Sun, gradient: "from-amber-400 to-orange-500" },
  campfire: { icon: Tent, gradient: "from-forest-500 to-forest-700" },
};

interface TopicDetail {
  id: string;
  title: string;
  subtitle: string;
  heroImage: string;
  overview: string;
  bestFor: string[];
  pros: string[];
  cons: string[];
  essentialGear: string[];
  tips: string[];
  difficulty: string;
  stepByStep?: { step: number; title: string; description: string }[];
}

export default function LearnTopic() {
  const { topicId } = useParams<{ topicId: string }>();
  const [topic, setTopic] = useState<TopicDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!topicId) return;
    fetchLearnTopic(topicId)
      .then((data) => setTopic(data.topic))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [topicId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-forest-600" />
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-stone-600">Topic not found.</p>
        <Link to="/learn" className="btn-primary px-6 py-2 text-sm">
          Back to Learn
        </Link>
      </div>
    );
  }

  const hero = heroImages[topic.heroImage] || heroImages.campfire;
  const Icon = hero.icon;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section
        className={`bg-gradient-to-br ${hero.gradient} py-16 sm:py-20 text-white`}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/learn"
            className="inline-flex items-center gap-1 text-sm text-white/80 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Learn
          </Link>
          <div className="flex items-start gap-4">
            <Icon className="w-12 h-12 text-white/80 flex-shrink-0 hidden sm:block mt-1" />
            <div>
              <span className="text-xs font-medium bg-white/20 px-2.5 py-1 rounded-full uppercase">
                {topic.difficulty}
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold mt-3">
                {topic.title}
              </h1>
              <p className="text-lg text-white/80 mt-2">{topic.subtitle}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        {/* Overview */}
        <section>
          <h2 className="text-2xl font-heading font-bold text-stone-900 mb-4">
            Overview
          </h2>
          <p className="text-stone-700 leading-relaxed text-lg">
            {topic.overview}
          </p>
        </section>

        {/* Best For */}
        <section className="card p-6">
          <h2 className="text-xl font-heading font-bold text-stone-900 mb-4">
            Best For
          </h2>
          <ul className="space-y-2">
            {topic.bestFor.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-stone-700">
                <CheckCircle2 className="w-5 h-5 text-forest-500 flex-shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Pros & Cons */}
        <div className="grid sm:grid-cols-2 gap-6">
          <section className="card p-6 bg-green-50 border-green-200">
            <h2 className="text-xl font-heading font-bold text-stone-900 mb-4 flex items-center gap-2">
              <ThumbsUp className="w-5 h-5 text-green-600" />
              Pros
            </h2>
            <ul className="space-y-2">
              {topic.pros.map((pro, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-stone-700"
                >
                  <span className="text-green-600 font-bold mt-0.5">+</span>
                  {pro}
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-6 bg-red-50 border-red-200">
            <h2 className="text-xl font-heading font-bold text-stone-900 mb-4 flex items-center gap-2">
              <ThumbsDown className="w-5 h-5 text-red-500" />
              Cons
            </h2>
            <ul className="space-y-2">
              {topic.cons.map((con, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-stone-700"
                >
                  <span className="text-red-500 font-bold mt-0.5">-</span>
                  {con}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Essential Gear */}
        <section className="card p-6">
          <h2 className="text-xl font-heading font-bold text-stone-900 mb-4 flex items-center gap-2">
            <Backpack className="w-5 h-5 text-forest-600" />
            Essential Gear
          </h2>
          <div className="flex flex-wrap gap-2">
            {topic.essentialGear.map((gear, i) => (
              <span
                key={i}
                className="px-3 py-1.5 bg-forest-50 text-forest-800 rounded-full text-sm font-medium border border-forest-200"
              >
                {gear}
              </span>
            ))}
          </div>
        </section>

        {/* Step by Step (first-trip only) */}
        {topic.stepByStep && topic.stepByStep.length > 0 && (
          <section>
            <h2 className="text-2xl font-heading font-bold text-stone-900 mb-6">
              Step-by-Step Guide
            </h2>
            <div className="space-y-4">
              {topic.stepByStep.map((step) => (
                <div key={step.step} className="card p-5 flex gap-4">
                  <div className="w-10 h-10 bg-forest-600 text-white rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0">
                    {step.step}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-stone-900">
                      {step.title}
                    </h3>
                    <p className="text-sm text-stone-600 mt-1 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tips */}
        <section>
          <h2 className="text-2xl font-heading font-bold text-stone-900 mb-6 flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-campfire-500" />
            Pro Tips
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {topic.tips.map((tip, i) => (
              <div
                key={i}
                className="card p-4 bg-campfire-50 border-campfire-200"
              >
                <p className="text-sm text-stone-700 leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center space-y-4 pt-6">
          <p className="text-lg text-stone-600">
            Have questions about {topic.title.toLowerCase()}?
          </p>
          <Link to="/chat" className="btn-primary px-8 py-3 text-lg">
            Ask Our AI Assistant
          </Link>
        </section>
      </div>

      <Footer />
    </div>
  );
}
