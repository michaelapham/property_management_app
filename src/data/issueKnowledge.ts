import type { Trade } from "../types";

/**
 * Local knowledge base powering "Prepare for this call".
 * Keyword-matched against the landlord's problem description; designed so a
 * hosted AI endpoint can replace `analyzeIssue` later with the same shape.
 */

export interface LikelyCause {
  cause: string;
  solution: string;
  partsEstimate: string;
  laborEstimate: string;
}

export interface IssueProfile {
  id: string;
  trade: Trade;
  title: string;
  keywords: string[];
  safety: string[];
  causes: LikelyCause[];
  typicalTotal: string;
}

export const ISSUE_PROFILES: IssueProfile[] = [
  {
    id: "water-leak",
    trade: "plumber",
    title: "Active water leak",
    keywords: ["leak", "leaking", "water on floor", "dripping", "burst", "flood"],
    safety: [
      "Shut off the water at the fixture stop valve or the main shutoff immediately.",
      "If water is near outlets or the panel, shut off electricity to that area first.",
      "Move belongings and lay towels — document damage with photos for insurance.",
    ],
    causes: [
      {
        cause: "Failed supply line or fitting (under sink / toilet / washer)",
        solution: "Replace braided supply line and shutoff valve",
        partsEstimate: "$8–$30 (supply line), $12–$25 (quarter-turn valve)",
        laborEstimate: "$100–$200 (0.5–1 hr service call)",
      },
      {
        cause: "Worn wax ring or cracked toilet tank components",
        solution: "Reset toilet with new wax ring, or replace flush/fill valve",
        partsEstimate: "$5–$15 (wax ring), $20–$40 (valve kit)",
        laborEstimate: "$125–$250",
      },
      {
        cause: "Pinhole leak in copper or failing PEX/CPVC joint in wall",
        solution: "Open wall, cut out section, repair with coupling or SharkBite",
        partsEstimate: "$10–$50 in fittings/pipe",
        laborEstimate: "$200–$500 (plus drywall patch)",
      },
    ],
    typicalTotal: "$150–$600 depending on access; emergency/after-hours adds 1.5–2×",
  },
  {
    id: "clogged-drain",
    trade: "plumber",
    title: "Clogged drain / backup",
    keywords: ["clog", "clogged", "drain", "backed up", "backup", "slow drain", "sewage", "gurgling"],
    safety: [
      "Stop running water to prevent overflow.",
      "Sewage backups are a health hazard — keep tenants and pets away, ventilate.",
      "Avoid chemical drain cleaners before a pro visit; they make snaking hazardous.",
    ],
    causes: [
      {
        cause: "Localized clog (hair, grease) in fixture trap or branch line",
        solution: "Snake the fixture or branch line",
        partsEstimate: "$0 (no parts) — $25 if trap replaced",
        laborEstimate: "$100–$250",
      },
      {
        cause: "Main line clog (roots, wipes) — multiple fixtures backing up",
        solution: "Cable or hydro-jet the main; camera inspection recommended",
        partsEstimate: "$0; camera inspection $100–$300",
        laborEstimate: "$200–$500 (jetting $350–$600)",
      },
      {
        cause: "Broken/bellied sewer pipe (recurring backups)",
        solution: "Spot repair or line replacement after camera locate",
        partsEstimate: "Materials minor vs. excavation",
        laborEstimate: "$1,500–$5,000+ for spot repair",
      },
    ],
    typicalTotal: "$100–$500 for most clogs; get a camera inspection if it recurs",
  },
  {
    id: "water-heater",
    trade: "plumber",
    title: "Water heater problem (no hot water / leaking tank)",
    keywords: ["water heater", "no hot water", "hot water", "lukewarm", "pilot"],
    safety: [
      "Gas smell? Have everyone leave, don't flip switches, call the gas utility from outside.",
      "For a leaking tank, turn off the cold inlet valve and the power/gas to the heater.",
      "Tank water can be scalding — let it cool before draining.",
    ],
    causes: [
      {
        cause: "Failed heating element or thermostat (electric)",
        solution: "Replace element/thermostat",
        partsEstimate: "$15–$40 each",
        laborEstimate: "$120–$250",
      },
      {
        cause: "Bad thermocouple / gas control valve (gas)",
        solution: "Replace thermocouple or gas valve",
        partsEstimate: "$15–$25 (thermocouple), $100–$250 (gas valve)",
        laborEstimate: "$120–$300",
      },
      {
        cause: "Tank corroded through (leaking from tank body)",
        solution: "Replace water heater — tanks are not repairable",
        partsEstimate: "$450–$900 (40–50 gal unit)",
        laborEstimate: "$300–$700 install",
      },
    ],
    typicalTotal: "$150–$350 repair; $900–$1,800 full replacement",
  },
  {
    id: "ac-not-cooling",
    trade: "hvac",
    title: "AC not cooling",
    keywords: ["ac", "a/c", "air condition", "not cooling", "warm air", "blowing warm", "freon", "condenser"],
    safety: [
      "Ask the tenant to switch the system OFF (not just up) — running a frozen or failing unit causes damage.",
      "Check/replace the air filter first; a clogged filter is the #1 cause of freeze-ups.",
      "In extreme heat, provide a window unit or fan for habitability while waiting.",
    ],
    causes: [
      {
        cause: "Clogged filter or frozen evaporator coil",
        solution: "Replace filter, let coil thaw 4–24h, restart",
        partsEstimate: "$5–$20 (filter)",
        laborEstimate: "$0 DIY — $150 service visit",
      },
      {
        cause: "Failed capacitor or contactor on outdoor unit",
        solution: "Replace capacitor/contactor",
        partsEstimate: "$10–$45 part",
        laborEstimate: "$150–$300 (very common fix)",
      },
      {
        cause: "Refrigerant leak / low charge",
        solution: "Leak search, repair, recharge",
        partsEstimate: "$50–$150 per lb refrigerant",
        laborEstimate: "$200–$1,500 depending on leak location",
      },
    ],
    typicalTotal: "$150–$450 for the common fixes; ask for the diagnostic fee up front",
  },
  {
    id: "no-heat",
    trade: "hvac",
    title: "Furnace / no heat",
    keywords: ["furnace", "no heat", "heater", "not heating", "cold", "igniter", "pilot light"],
    safety: [
      "If anyone smells gas: leave, don't operate switches, call the gas utility immediately.",
      "Carbon monoxide risk — confirm the unit has a working CO detector nearby.",
      "Below-freezing temps: drip faucets to protect pipes until heat is restored.",
    ],
    causes: [
      {
        cause: "Dirty flame sensor or failed hot-surface igniter",
        solution: "Clean sensor or replace igniter",
        partsEstimate: "$0 (cleaning), $20–$60 (igniter)",
        laborEstimate: "$120–$250",
      },
      {
        cause: "Failed blower motor or capacitor",
        solution: "Replace capacitor or motor",
        partsEstimate: "$10–$45 (capacitor), $150–$500 (motor)",
        laborEstimate: "$150–$400",
      },
      {
        cause: "Cracked heat exchanger (older furnace)",
        solution: "Replace furnace — safety condemnation likely",
        partsEstimate: "$1,500–$3,500 (equipment)",
        laborEstimate: "$1,500–$3,000 install",
      },
    ],
    typicalTotal: "$150–$450 typical repair; igniter/flame sensor are most common",
  },
  {
    id: "breaker-tripping",
    trade: "electrician",
    title: "Breaker tripping / partial power loss",
    keywords: ["breaker", "tripping", "trips", "no power", "outlet", "outlets dead", "sparks", "burning smell", "flickering"],
    safety: [
      "Burning smell or warm panel = stop, leave the breaker OFF, call an electrician today.",
      "Never replace a breaker with a larger one to 'fix' tripping — fire hazard.",
      "Ask the tenant to unplug devices on the circuit before any testing.",
    ],
    causes: [
      {
        cause: "Overloaded circuit (space heaters, window ACs)",
        solution: "Redistribute loads; possibly add a dedicated circuit",
        partsEstimate: "$0 — $80 (breaker) if adding circuit: $150–$300 materials",
        laborEstimate: "$0 — $150 diagnostic; new circuit $300–$800",
      },
      {
        cause: "Worn/failed breaker or loose panel connection",
        solution: "Replace breaker, torque connections",
        partsEstimate: "$10–$60 (standard breaker), $40–$120 (AFCI/GFCI)",
        laborEstimate: "$150–$300",
      },
      {
        cause: "Ground fault from damaged wiring or a failing appliance",
        solution: "Isolate circuit, test devices, repair wiring",
        partsEstimate: "Varies — wiring repair materials usually < $100",
        laborEstimate: "$200–$600",
      },
    ],
    typicalTotal: "$150–$400 for most calls; panel work quoted separately",
  },
  {
    id: "outlet-dead",
    trade: "electrician",
    title: "Dead outlet / GFCI issues",
    keywords: ["gfci", "outlet not working", "dead outlet", "plug", "receptacle", "reset button"],
    safety: [
      "Have the tenant press RESET on bathroom/kitchen/garage GFCIs first — fixes it ~half the time.",
      "Anything plugged in that got wet should stay unplugged.",
      "Scorch marks on the outlet mean stop using it and kill the breaker.",
    ],
    causes: [
      {
        cause: "Tripped upstream GFCI (often in another room or garage)",
        solution: "Locate and reset the controlling GFCI",
        partsEstimate: "$0",
        laborEstimate: "$0 DIY — $120 service call",
      },
      {
        cause: "Worn GFCI receptacle that no longer holds reset",
        solution: "Replace GFCI receptacle",
        partsEstimate: "$15–$30",
        laborEstimate: "$100–$180",
      },
      {
        cause: "Loose back-stab wire connection in the outlet box",
        solution: "Re-terminate wires on screw terminals",
        partsEstimate: "$0–$10",
        laborEstimate: "$120–$250",
      },
    ],
    typicalTotal: "$100–$250 — ask the electrician to check neighboring outlets too",
  },
  {
    id: "roof-leak",
    trade: "roofer",
    title: "Roof leak",
    keywords: ["roof", "ceiling stain", "ceiling leak", "shingle", "attic wet", "drip from ceiling"],
    safety: [
      "Put a bucket under active drips and poke a small relief hole in a bulging ceiling to prevent collapse.",
      "Stay off the roof — especially when wet. Leave inspection to the pro.",
      "Photograph everything for insurance before cleanup.",
    ],
    causes: [
      {
        cause: "Failed flashing at chimney, vent boot, or valley",
        solution: "Replace flashing / vent boot, seal",
        partsEstimate: "$10–$50 (boot, sealant), $100–$300 (flashing kit)",
        laborEstimate: "$200–$600",
      },
      {
        cause: "Wind-damaged or aged shingles in one area",
        solution: "Spot shingle replacement",
        partsEstimate: "$30–$100 (bundle of shingles)",
        laborEstimate: "$250–$750",
      },
      {
        cause: "Roof at end of life (widespread granule loss, multiple leaks)",
        solution: "Full replacement — get 3 quotes",
        partsEstimate: "Materials in quote",
        laborEstimate: "$8,000–$20,000 typical asphalt re-roof",
      },
    ],
    typicalTotal: "$300–$1,000 for most spot repairs",
  },
  {
    id: "garbage-disposal",
    trade: "plumber",
    title: "Garbage disposal jammed / dead",
    keywords: ["disposal", "garbage disposal", "humming", "jammed", "sink grinder"],
    safety: [
      "Never put a hand in the disposal — even when 'off'. Unplug it or kill the breaker first.",
      "A humming-but-not-spinning unit should be switched off immediately to avoid burning the motor.",
    ],
    causes: [
      {
        cause: "Jammed flywheel (bone, pit, utensil)",
        solution: "Unplug, free with 1/4\" hex key in bottom socket, press reset",
        partsEstimate: "$0",
        laborEstimate: "$0 DIY — $100 service call",
      },
      {
        cause: "Tripped internal overload",
        solution: "Press red reset button on bottom of unit",
        partsEstimate: "$0",
        laborEstimate: "$0 DIY",
      },
      {
        cause: "Burned-out motor / leaking body",
        solution: "Replace disposal",
        partsEstimate: "$80–$200 (1/2–3/4 HP unit)",
        laborEstimate: "$100–$200 install",
      },
    ],
    typicalTotal: "$0 (reset/jam) to $350 (full replacement)",
  },
  {
    id: "pest",
    trade: "pest-control",
    title: "Pests (roaches, rodents, ants, wasps)",
    keywords: ["roach", "mice", "mouse", "rat", "ants", "wasp", "bees", "termite", "bugs", "pest"],
    safety: [
      "Wasp/bee nests near entries: keep tenants clear; allergic reactions are an emergency.",
      "Rodent droppings: ventilate and wear a mask when cleaning (hantavirus risk).",
      "Termites: act quickly — get an inspection before structural damage spreads.",
    ],
    causes: [
      {
        cause: "Entry points (gaps at doors, pipes, vents) + food sources",
        solution: "Exclusion sealing + baiting program",
        partsEstimate: "$20–$60 (steel wool, foam, door sweeps)",
        laborEstimate: "$150–$350 initial treatment",
      },
      {
        cause: "Established infestation needing repeat treatment",
        solution: "Quarterly service plan",
        partsEstimate: "Included in service",
        laborEstimate: "$40–$80/visit on a plan",
      },
      {
        cause: "Termites (mud tubes, frass, hollow wood)",
        solution: "Bait stations or liquid barrier treatment",
        partsEstimate: "Included in quote",
        laborEstimate: "$500–$2,000 typical treatment",
      },
    ],
    typicalTotal: "$150–$350 one-time; ask about a multi-unit discount across your properties",
  },
];

export interface CallPrepResult {
  profile: IssueProfile | null;
  script: string[];
}

export function analyzeIssue(
  description: string,
  context: { address?: string; tenantName?: string }
): CallPrepResult {
  const text = description.toLowerCase();
  let best: IssueProfile | null = null;
  let bestScore = 0;
  for (const p of ISSUE_PROFILES) {
    const score = p.keywords.reduce(
      (acc, k) => (text.includes(k) ? acc + (k.length > 5 ? 2 : 1) : acc),
      0
    );
    if (score > bestScore) {
      best = p;
      bestScore = score;
    }
  }

  const where = context.address ? ` at my rental property, ${context.address}` : " at my rental property";
  const script: string[] = [
    `Hi, I'm a landlord calling about ${best ? best.title.toLowerCase() : "an issue"}${where}.`,
    `Here's what's happening: ${description.trim() || "(describe the problem)"}.`,
  ];
  if (best) {
    script.push(
      `From what I've read, it could be ${best.causes[0].cause.toLowerCase()} — but I'd like your diagnosis.`
    );
  }
  script.push(
    "What's your earliest availability, and do you charge a diagnostic or trip fee? Is it credited toward the repair?",
    "Can you give me a rough range for this kind of job before you come out?",
    context.tenantName
      ? `My tenant ${context.tenantName} is home — can you coordinate arrival time directly if I text you their number?`
      : "I can meet you there or coordinate access with my tenant.",
    "Are you licensed and insured, and is your work warrantied?"
  );
  return { profile: best, script };
}
