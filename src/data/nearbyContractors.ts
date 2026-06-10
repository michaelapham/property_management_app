import type { Trade } from "../types";

/**
 * Nearby-contractor aggregation.
 *
 * In production this calls a places/reviews provider (Google Places, Yelp
 * Fusion) using either device location or the geocoded rental addresses, and
 * derives price ranges from review text / area averages with outliers
 * trimmed. Until an API key is wired in, we generate deterministic,
 * realistic demo listings seeded by the user's property city so the
 * sort/UX is fully exercised. Listings are clearly labeled as estimates.
 */

export interface NearbyContractor {
  id: string;
  name: string;
  trade: Trade;
  rating: number;
  reviewCount: number;
  openNow: boolean;
  hoursToday: string;
  services: string[];
  weekdayRate: string;
  weekendRate: string;
  phone: string;
  distanceMi: number;
}

const NAME_PARTS: Record<string, { first: string[]; last: string[] }> = {
  plumber: {
    first: ["BlueLine", "RapidFlow", "AllClear", "TruFlo", "Beacon", "Crestview"],
    last: ["Plumbing", "Plumbing Co.", "Pipe & Drain", "Plumbing Services"],
  },
  hvac: {
    first: ["ComfortZone", "CoolBreeze", "AirPro", "Summit", "TotalTemp", "Evergreen"],
    last: ["Heating & Air", "HVAC", "Climate Services", "Air Solutions"],
  },
  electrician: {
    first: ["BrightWire", "Volt", "Amped", "Linehart", "Spark", "Granite"],
    last: ["Electric", "Electrical Services", "Electric Co.", "Power Solutions"],
  },
  handyman: {
    first: ["FixIt", "HomePro", "Anchor", "Redwood", "Keystone", "Hammer & Co."],
    last: ["Handyman", "Home Services", "Repair Co.", "Property Services"],
  },
  roofer: {
    first: ["Peak", "Skyline", "StormGuard", "Heritage", "Ironclad", "Cardinal"],
    last: ["Roofing", "Roofing Co.", "Roof & Exterior", "Roofing Systems"],
  },
  landscaper: {
    first: ["GreenScape", "Lawnworks", "Meadow", "EverGreen", "TurfPro", "Cedar"],
    last: ["Landscaping", "Lawn Care", "Outdoor Services", "Grounds Co."],
  },
  "pest-control": {
    first: ["ShieldPro", "BugOut", "Sentinel", "ClearHome", "Guardian", "Apex"],
    last: ["Pest Control", "Exterminators", "Pest Solutions", "Pest Services"],
  },
  appliance: {
    first: ["QuickFix", "Reliable", "HomeTech", "Premier", "MasterCare", "Citywide"],
    last: ["Appliance Repair", "Appliance Service", "Appliance Pros", "Repair Co."],
  },
  other: {
    first: ["AllTrades", "ProServe", "Metro", "Hometown", "First Call", "Bluebird"],
    last: ["Services", "Contracting", "Property Care", "Solutions"],
  },
};

const SERVICES: Record<string, string[]> = {
  plumber: ["Drain cleaning", "Leak repair", "Water heaters", "Toilet repair", "Repiping", "Sewer camera"],
  hvac: ["AC repair", "Furnace repair", "Maintenance plans", "Duct cleaning", "System replacement", "Thermostats"],
  electrician: ["Panel upgrades", "Outlet & switch repair", "Lighting", "Troubleshooting", "EV chargers", "Ceiling fans"],
  handyman: ["Drywall repair", "Door & lock repair", "Fixture install", "Painting", "Fence repair", "Gutter cleaning"],
  roofer: ["Leak repair", "Shingle replacement", "Inspections", "Gutter install", "Full re-roof", "Flashing repair"],
  landscaper: ["Mowing", "Tree trimming", "Cleanups", "Irrigation repair", "Mulching", "Sod install"],
  "pest-control": ["General pest", "Rodent control", "Termite treatment", "Wasp removal", "Quarterly plans", "Inspections"],
  appliance: ["Refrigerator repair", "Washer/dryer repair", "Oven & range", "Dishwasher repair", "Microwave", "Garbage disposals"],
  other: ["General repair", "Estimates", "Property maintenance", "Odd jobs"],
};

const BASE_WEEKDAY: Record<string, [number, number]> = {
  plumber: [95, 165],
  hvac: [90, 160],
  electrician: [100, 175],
  handyman: [55, 95],
  roofer: [85, 150],
  landscaper: [45, 80],
  "pest-control": [120, 250],
  appliance: [80, 140],
  other: [60, 110],
};

/** Deterministic PRNG so the same city always shows the same demo listings. */
function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 10000) / 10000;
  };
}

export function getNearbyContractors(
  trade: Trade,
  cityLabel: string
): NearbyContractor[] {
  const rand = seededRandom(`${trade}|${cityLabel.toLowerCase()}`);
  const parts = NAME_PARTS[trade] ?? NAME_PARTS.other;
  const services = SERVICES[trade] ?? SERVICES.other;
  const [lo, hi] = BASE_WEEKDAY[trade] ?? BASE_WEEKDAY.other;
  const count = 5 + Math.floor(rand() * 3);
  const hour = new Date().getHours();
  const day = new Date().getDay();

  const list: NearbyContractor[] = [];
  const usedNames = new Set<string>();
  for (let i = 0; i < count; i++) {
    let name = "";
    do {
      name = `${parts.first[Math.floor(rand() * parts.first.length)]} ${
        parts.last[Math.floor(rand() * parts.last.length)]
      }`;
    } while (usedNames.has(name));
    usedNames.add(name);

    const rating = Math.round((3.4 + rand() * 1.6) * 10) / 10;
    const reviewCount = 12 + Math.floor(rand() * 480);
    const is247 = rand() < 0.2;
    const opens = 7 + Math.floor(rand() * 2);
    const closes = 17 + Math.floor(rand() * 4);
    const openWeekends = is247 || rand() < 0.45;
    const isWeekend = day === 0 || day === 6;
    const openNow = is247 || ((!isWeekend || openWeekends) && hour >= opens && hour < closes);
    const wkLo = Math.round((lo + rand() * 25) / 5) * 5;
    const wkHi = Math.round((hi + rand() * 40) / 5) * 5;
    const weekendMult = 1.3 + rand() * 0.4;

    const svcCount = 3 + Math.floor(rand() * 2);
    const svc = [...services].sort(() => rand() - 0.5).slice(0, svcCount);

    const area = String(200 + Math.floor(rand() * 700)).padStart(3, "0");
    const line = String(1000 + Math.floor(rand() * 9000));

    list.push({
      id: `${trade}-${i}`,
      name,
      trade,
      rating,
      reviewCount,
      openNow,
      hoursToday: is247
        ? "Open 24/7"
        : isWeekend && !openWeekends
          ? "Closed today"
          : `${opens}:00 AM – ${closes - 12}:00 PM`,
      services: svc,
      weekdayRate: `$${wkLo}–$${wkHi}/hr`,
      weekendRate: `$${Math.round((wkLo * weekendMult) / 5) * 5}–$${Math.round((wkHi * weekendMult) / 5) * 5}/hr`,
      phone: `(555) ${area}-${line}`,
      distanceMi: Math.round((0.8 + rand() * 11) * 10) / 10,
    });
  }

  // Sort: availability first, then rating desc, then price ascending
  return list.sort((a, b) => {
    if (a.openNow !== b.openNow) return a.openNow ? -1 : 1;
    if (b.rating !== a.rating) return b.rating - a.rating;
    const priceA = parseInt(a.weekdayRate.replace(/\D+/, ""), 10);
    const priceB = parseInt(b.weekdayRate.replace(/\D+/, ""), 10);
    return priceA - priceB;
  });
}
