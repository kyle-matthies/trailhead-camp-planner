import { useState, useEffect } from "react";
import {
  Tent,
  Moon,
  Flame,
  Shirt,
  Shield,
  Armchair,
  ChevronDown,
  ChevronUp,
  Star,
  Loader2,
} from "lucide-react";
import { fetchGearCategories } from "@/lib/api";
import Footer from "@/components/Footer";

const iconMap: Record<string, React.ElementType> = {
  tent: Tent,
  moon: Moon,
  flame: Flame,
  shirt: Shirt,
  shield: Shield,
  armchair: Armchair,
};

const tierColors = {
  good: { bg: "bg-green-50", border: "border-green-200", badge: "bg-green-100 text-green-800" },
  better: { bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-100 text-blue-800" },
  best: { bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-800" },
};

interface GearTier {
  name: string;
  price: string;
  pros: string[];
  cons: string[];
}

interface GearItem {
  name: string;
  essential: boolean;
  description: string;
  tiers: { good: GearTier; better: GearTier; best: GearTier };
}

interface GearCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  items: GearItem[];
}

export default function Gear() {
  const [categories, setCategories] = useState<GearCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchGearCategories()
      .then((data) => setCategories(data.categories))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const toggleItem = (key: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

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
            Camping Gear Guide
          </h1>
          <p className="text-lg text-stone-600 max-w-2xl mx-auto">
            Good, Better, and Best options for every budget. We recommend gear
            that gets beginners outdoors without breaking the bank.
          </p>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-12">
          {categories.map((category) => {
            const Icon = iconMap[category.icon] || Tent;
            return (
              <div key={category.id}>
                {/* Category header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-forest-100 rounded-lg">
                    <Icon className="w-6 h-6 text-forest-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-heading font-bold text-stone-900">
                      {category.name}
                    </h2>
                    <p className="text-sm text-stone-500">{category.description}</p>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-4">
                  {category.items.map((item) => {
                    const key = `${category.id}-${item.name}`;
                    const isExpanded = expandedItems.has(key);

                    return (
                      <div key={key} className="card overflow-hidden">
                        <button
                          onClick={() => toggleItem(key)}
                          className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-stone-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-semibold text-stone-900">
                                  {item.name}
                                </h3>
                                {item.essential && (
                                  <span className="text-xs px-2 py-0.5 bg-forest-100 text-forest-700 rounded-full font-medium">
                                    Essential
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-stone-500 mt-0.5">
                                {item.description}
                              </p>
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-stone-400 flex-shrink-0" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-stone-400 flex-shrink-0" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="px-4 sm:px-5 pb-5 border-t border-stone-100">
                            <div className="grid md:grid-cols-3 gap-4 mt-4">
                              {(
                                Object.entries(item.tiers) as [
                                  keyof typeof tierColors,
                                  GearTier,
                                ][]
                              ).map(([tier, data]) => {
                                const colors = tierColors[tier];
                                return (
                                  <div
                                    key={tier}
                                    className={`${colors.bg} ${colors.border} border rounded-lg p-4 space-y-3`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span
                                        className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${colors.badge}`}
                                      >
                                        {tier === "best" && (
                                          <Star className="w-3 h-3 inline mr-1" />
                                        )}
                                        {tier}
                                      </span>
                                      <span className="text-sm font-semibold text-stone-700">
                                        {data.price}
                                      </span>
                                    </div>
                                    <p className="text-sm font-medium text-stone-900">
                                      {data.name}
                                    </p>
                                    <div className="space-y-1">
                                      {data.pros.map((pro, i) => (
                                        <p
                                          key={i}
                                          className="text-xs text-green-700 flex items-start gap-1"
                                        >
                                          <span className="mt-0.5">+</span> {pro}
                                        </p>
                                      ))}
                                      {data.cons.map((con, i) => (
                                        <p
                                          key={i}
                                          className="text-xs text-stone-500 flex items-start gap-1"
                                        >
                                          <span className="mt-0.5">-</span> {con}
                                        </p>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <Footer />
    </div>
  );
}
