GEAR_CATEGORIES = [
    {
        "id": "shelter",
        "name": "Shelter",
        "icon": "tent",
        "description": "Your home away from home. A good shelter keeps you dry, warm, and protected.",
        "items": [
            {
                "name": "Tent",
                "essential": True,
                "description": "Your primary shelter from the elements.",
                "tiers": {
                    "good": {
                        "name": "Coleman Sundome 4-Person",
                        "price": "$70-90",
                        "pros": ["Affordable", "Easy setup", "Decent rain protection"],
                        "cons": ["Heavier", "Less durable fabric"],
                    },
                    "better": {
                        "name": "REI Co-op Half Dome SL 2+",
                        "price": "$200-280",
                        "pros": ["Lightweight", "Great ventilation", "Quality zippers"],
                        "cons": ["Pricier", "Smaller footprint"],
                    },
                    "best": {
                        "name": "Big Agnes Copper Spur HV UL2",
                        "price": "$400-500",
                        "pros": ["Ultralight", "Premium materials", "Excellent design"],
                        "cons": ["Expensive", "Requires careful handling"],
                    },
                },
            },
            {
                "name": "Ground Tarp / Footprint",
                "essential": False,
                "description": "Protects your tent floor from rocks, moisture, and wear.",
                "tiers": {
                    "good": {
                        "name": "Generic poly tarp (cut to size)",
                        "price": "$10-15",
                        "pros": ["Very cheap", "Easy to find"],
                        "cons": ["Needs trimming", "Heavier"],
                    },
                    "better": {
                        "name": "Kelty Footprint",
                        "price": "$25-40",
                        "pros": ["Pre-cut sizes", "Grommets included"],
                        "cons": ["Tent-specific sizing"],
                    },
                    "best": {
                        "name": "Gossamer Gear Polycryo",
                        "price": "$15-25",
                        "pros": ["Ultra-lightweight", "Waterproof"],
                        "cons": ["Less durable", "Slippery"],
                    },
                },
            },
        ],
    },
    {
        "id": "sleep",
        "name": "Sleep System",
        "icon": "moon",
        "description": "Good sleep makes everything better. Invest in comfort here.",
        "items": [
            {
                "name": "Sleeping Bag",
                "essential": True,
                "description": "Keep warm through the night. Temperature rating matters most.",
                "tiers": {
                    "good": {
                        "name": "Coleman Palmetto 30F",
                        "price": "$30-50",
                        "pros": ["Budget-friendly", "Warm enough for summer"],
                        "cons": ["Bulky", "Heavy for backpacking"],
                    },
                    "better": {
                        "name": "Kelty Cosmic 20",
                        "price": "$100-140",
                        "pros": ["Down fill", "Lightweight", "Compressible"],
                        "cons": ["Down loses warmth when wet"],
                    },
                    "best": {
                        "name": "REI Magma 15",
                        "price": "$300-370",
                        "pros": ["Excellent warmth-to-weight", "Premium down", "Very packable"],
                        "cons": ["Expensive", "Requires dry storage"],
                    },
                },
            },
            {
                "name": "Sleeping Pad",
                "essential": True,
                "description": "Insulates you from the cold ground and adds comfort.",
                "tiers": {
                    "good": {
                        "name": "Klymit Static V",
                        "price": "$35-50",
                        "pros": ["Affordable", "Comfortable V-chamber design"],
                        "cons": ["Lower R-value", "Requires blowing up"],
                    },
                    "better": {
                        "name": "Therm-a-Rest NeoAir XLite NXT",
                        "price": "$180-220",
                        "pros": ["Ultralight", "High R-value", "Very comfortable"],
                        "cons": ["Crinkly noise", "Expensive"],
                    },
                    "best": {
                        "name": "NEMO Tensor Insulated",
                        "price": "$160-200",
                        "pros": ["Quiet fabric", "Great R-value", "Comfortable"],
                        "cons": ["Slightly heavier than XLite"],
                    },
                },
            },
            {
                "name": "Camping Pillow",
                "essential": False,
                "description": "A small luxury that makes a big difference in sleep quality.",
                "tiers": {
                    "good": {
                        "name": "Stuff sack with clothes",
                        "price": "$0",
                        "pros": ["Free!", "Already in your pack"],
                        "cons": ["Not very comfortable"],
                    },
                    "better": {
                        "name": "Therm-a-Rest Compressible Pillow",
                        "price": "$25-40",
                        "pros": ["Foam fill", "Comfortable", "Washable"],
                        "cons": ["Bulky when packed"],
                    },
                    "best": {
                        "name": "Sea to Summit Aeros Premium",
                        "price": "$40-55",
                        "pros": ["Ultralight", "Packs tiny", "Soft fabric"],
                        "cons": ["Inflatable (can pop)", "Less pillow-like feel"],
                    },
                },
            },
        ],
    },
    {
        "id": "cooking",
        "name": "Cooking & Food",
        "icon": "flame",
        "description": "Campfire meals are half the fun. From simple to gourmet.",
        "items": [
            {
                "name": "Camp Stove",
                "essential": True,
                "description": "Reliable cooking when campfires aren't an option.",
                "tiers": {
                    "good": {
                        "name": "Coleman Classic Propane Stove",
                        "price": "$35-50",
                        "pros": ["Two burners", "Reliable", "Easy to use"],
                        "cons": ["Heavy", "Bulky", "Needs propane canisters"],
                    },
                    "better": {
                        "name": "Jetboil Flash",
                        "price": "$100-120",
                        "pros": ["Ultra-fast boiling", "Compact", "Fuel efficient"],
                        "cons": ["Single burner", "Mainly for boiling"],
                    },
                    "best": {
                        "name": "MSR WindBurner",
                        "price": "$150-180",
                        "pros": ["Wind-resistant", "Modular system", "Fuel efficient"],
                        "cons": ["Expensive", "Proprietary pots"],
                    },
                },
            },
            {
                "name": "Cookware Set",
                "essential": True,
                "description": "Pots, pans, and utensils for camp cooking.",
                "tiers": {
                    "good": {
                        "name": "Stanley Adventure Camp Cook Set",
                        "price": "$20-30",
                        "pros": ["Durable", "Nesting design", "Affordable"],
                        "cons": ["Heavy stainless steel"],
                    },
                    "better": {
                        "name": "GSI Outdoors Pinnacle Camper",
                        "price": "$60-90",
                        "pros": ["Non-stick", "Complete set", "Folding handles"],
                        "cons": ["Non-stick coating can wear"],
                    },
                    "best": {
                        "name": "Snow Peak Titanium Cook Set",
                        "price": "$80-120",
                        "pros": ["Ultralight titanium", "Virtually indestructible", "Easy to clean"],
                        "cons": ["Food can stick", "Expensive"],
                    },
                },
            },
            {
                "name": "Cooler",
                "essential": True,
                "description": "Keeps food fresh and drinks cold at camp.",
                "tiers": {
                    "good": {
                        "name": "Coleman 48-Quart Cooler",
                        "price": "$25-40",
                        "pros": ["Affordable", "Good capacity", "Widely available"],
                        "cons": ["Ice lasts 1-2 days", "Heavier"],
                    },
                    "better": {
                        "name": "Ozark Trail 52-Quart High Performance",
                        "price": "$80-110",
                        "pros": ["Better insulation", "Bear-resistant lock points"],
                        "cons": ["Heavier", "Larger"],
                    },
                    "best": {
                        "name": "YETI Tundra 45",
                        "price": "$300-350",
                        "pros": ["Ice lasts 5+ days", "Bear-resistant", "Indestructible"],
                        "cons": ["Very expensive", "Very heavy"],
                    },
                },
            },
        ],
    },
    {
        "id": "clothing",
        "name": "Clothing & Layers",
        "icon": "shirt",
        "description": "Dress in layers and be ready for anything Mother Nature throws at you.",
        "items": [
            {
                "name": "Base Layer",
                "essential": True,
                "description": "Moisture-wicking layer worn next to skin. Avoid cotton!",
                "tiers": {
                    "good": {
                        "name": "Russell Athletic Dri-Power",
                        "price": "$15-25",
                        "pros": ["Affordable", "Synthetic wicking"],
                        "cons": ["Can retain odor"],
                    },
                    "better": {
                        "name": "Patagonia Capilene Cool",
                        "price": "$40-55",
                        "pros": ["Excellent wicking", "Odor-resistant", "Recycled materials"],
                        "cons": ["More expensive"],
                    },
                    "best": {
                        "name": "Smartwool Merino 150",
                        "price": "$65-85",
                        "pros": ["Natural odor resistance", "Temperature regulating", "Soft"],
                        "cons": ["Expensive", "Requires gentle care"],
                    },
                },
            },
            {
                "name": "Insulation Layer",
                "essential": True,
                "description": "Traps warmth. Fleece or puffy jacket depending on conditions.",
                "tiers": {
                    "good": {
                        "name": "Columbia Steens Mountain Fleece",
                        "price": "$30-45",
                        "pros": ["Warm", "Affordable", "Durable"],
                        "cons": ["Bulky", "Not wind-resistant"],
                    },
                    "better": {
                        "name": "Patagonia Nano Puff",
                        "price": "$150-200",
                        "pros": ["Lightweight", "Packable", "Warm when wet"],
                        "cons": ["Synthetic fill", "Pricey"],
                    },
                    "best": {
                        "name": "Arc'teryx Cerium LT Hoody",
                        "price": "$300-380",
                        "pros": ["Premium down", "Ultralight", "Excellent warmth"],
                        "cons": ["Very expensive", "Down needs to stay dry"],
                    },
                },
            },
            {
                "name": "Rain Jacket",
                "essential": True,
                "description": "Waterproof and breathable outer shell. Don't skip this!",
                "tiers": {
                    "good": {
                        "name": "Frogg Toggs Ultra-Lite2",
                        "price": "$15-25",
                        "pros": ["Super cheap", "Very lightweight"],
                        "cons": ["Not durable", "No pockets"],
                    },
                    "better": {
                        "name": "REI Co-op Rainier",
                        "price": "$80-120",
                        "pros": ["Durable", "Good features", "Breathable"],
                        "cons": ["Heavier than premium options"],
                    },
                    "best": {
                        "name": "Arc'teryx Beta LT",
                        "price": "$350-450",
                        "pros": ["Gore-Tex Pro", "Ultralight", "Bomber durability"],
                        "cons": ["Very expensive"],
                    },
                },
            },
        ],
    },
    {
        "id": "safety",
        "name": "Safety & Navigation",
        "icon": "shield",
        "description": "Be prepared for the unexpected. Safety gear is non-negotiable.",
        "items": [
            {
                "name": "First Aid Kit",
                "essential": True,
                "description": "Bandages, antiseptic, medications, and emergency supplies.",
                "tiers": {
                    "good": {
                        "name": "Johnson & Johnson All-Purpose Kit",
                        "price": "$10-15",
                        "pros": ["Basic essentials", "Compact", "Cheap"],
                        "cons": ["Limited supplies", "May need supplementing"],
                    },
                    "better": {
                        "name": "Adventure Medical Kits Ultralight .7",
                        "price": "$30-45",
                        "pros": ["Outdoor-specific", "Organized pouches", "Comprehensive"],
                        "cons": ["May want to add personal meds"],
                    },
                    "best": {
                        "name": "Adventure Medical Kits Mountain Series",
                        "price": "$60-90",
                        "pros": ["Hospital-grade supplies", "Detailed guide included", "Complete"],
                        "cons": ["Heavier", "More than most beginners need"],
                    },
                },
            },
            {
                "name": "Headlamp",
                "essential": True,
                "description": "Hands-free lighting is essential at camp after dark.",
                "tiers": {
                    "good": {
                        "name": "Energizer Vision LED",
                        "price": "$10-15",
                        "pros": ["Cheap", "Reliable", "Uses AAA batteries"],
                        "cons": ["Dimmer", "Not water-resistant"],
                    },
                    "better": {
                        "name": "Black Diamond Spot 400",
                        "price": "$35-45",
                        "pros": ["Bright", "Rechargeable", "Waterproof"],
                        "cons": ["Battery life could be better"],
                    },
                    "best": {
                        "name": "Petzl Actik Core",
                        "price": "$55-75",
                        "pros": ["Bright", "Red light mode", "Dual power (rechargeable + AAA)"],
                        "cons": ["Pricier"],
                    },
                },
            },
            {
                "name": "Multi-tool / Knife",
                "essential": True,
                "description": "Invaluable for camp tasks, repairs, and food prep.",
                "tiers": {
                    "good": {
                        "name": "Ozark Trail Multi-tool",
                        "price": "$8-15",
                        "pros": ["Affordable", "Basic tools included"],
                        "cons": ["Lower quality steel", "Tools can be stiff"],
                    },
                    "better": {
                        "name": "Leatherman Wingman",
                        "price": "$50-65",
                        "pros": ["Quality construction", "25-year warranty", "One-hand opening"],
                        "cons": ["Heavier"],
                    },
                    "best": {
                        "name": "Leatherman Wave+",
                        "price": "$90-110",
                        "pros": ["18 tools", "Premium steel", "Replaceable wire cutters"],
                        "cons": ["Expensive", "Heavy"],
                    },
                },
            },
        ],
    },
    {
        "id": "comfort",
        "name": "Comfort & Extras",
        "icon": "armchair",
        "description": "Nice-to-haves that elevate your camping experience.",
        "items": [
            {
                "name": "Camp Chair",
                "essential": False,
                "description": "A comfortable seat around the campfire makes all the difference.",
                "tiers": {
                    "good": {
                        "name": "Ozark Trail Basic Quad Chair",
                        "price": "$15-20",
                        "pros": ["Super cheap", "Cup holder", "Folds easily"],
                        "cons": ["Heavy", "Not very comfortable long-term"],
                    },
                    "better": {
                        "name": "REI Co-op Camp X Chair",
                        "price": "$40-55",
                        "pros": ["Comfortable", "Durable", "Good back support"],
                        "cons": ["Bulkier to transport"],
                    },
                    "best": {
                        "name": "Helinox Chair One",
                        "price": "$100-130",
                        "pros": ["Ultra-portable", "Lightweight", "Strong"],
                        "cons": ["Expensive for a chair", "Low to ground"],
                    },
                },
            },
            {
                "name": "Camp Lantern",
                "essential": False,
                "description": "Ambient lighting for your campsite.",
                "tiers": {
                    "good": {
                        "name": "Coleman Classic LED Lantern",
                        "price": "$15-20",
                        "pros": ["Bright", "Long battery life", "Affordable"],
                        "cons": ["Bulky", "Uses D batteries"],
                    },
                    "better": {
                        "name": "Black Diamond Moji Lantern",
                        "price": "$25-35",
                        "pros": ["Compact", "Rechargeable", "Dimmable"],
                        "cons": ["Smaller light radius"],
                    },
                    "best": {
                        "name": "Goal Zero Lighthouse 600",
                        "price": "$65-80",
                        "pros": ["USB charging", "Solar compatible", "Very bright"],
                        "cons": ["Heavier", "More expensive"],
                    },
                },
            },
        ],
    },
]
