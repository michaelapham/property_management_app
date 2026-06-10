/**
 * Free-tier address autocomplete backed by OpenStreetMap Nominatim.
 * Falls back silently (empty suggestions) when offline or rate-limited.
 * Swap `searchAddresses` for a Google Places / Mapbox implementation
 * later without touching the UI.
 */
export interface AddressSuggestion {
  label: string;
  street: string;
  city: string;
  state: string;
  zip: string;
}

interface NominatimResult {
  display_name: string;
  address?: {
    house_number?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    state?: string;
    postcode?: string;
  };
}

const STATE_ABBR: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR",
  california: "CA", colorado: "CO", connecticut: "CT", delaware: "DE",
  "district of columbia": "DC", florida: "FL", georgia: "GA", hawaii: "HI",
  idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA", kansas: "KS",
  kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS",
  missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM",
  "new york": "NY", "north carolina": "NC", "north dakota": "ND",
  ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA",
  "rhode island": "RI", "south carolina": "SC", "south dakota": "SD",
  tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT", virginia: "VA",
  washington: "WA", "west virginia": "WV", wisconsin: "WI", wyoming: "WY",
};

const STREET_SUFFIX_ABBR: Record<string, string> = {
  street: "St", avenue: "Ave", boulevard: "Blvd", drive: "Dr",
  lane: "Ln", road: "Rd", court: "Ct", circle: "Cir", place: "Pl",
  terrace: "Ter", parkway: "Pkwy", highway: "Hwy", trail: "Trl",
  square: "Sq", expressway: "Expy", freeway: "Fwy",
};

/** Capitalize all-lowercase words; leave mixed-case (McKinney, O'Brien) alone. */
function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => (/[A-Z]/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

/** "Water Street" → "Water St" (only the trailing suffix word). */
function abbreviateStreetSuffix(street: string): string {
  return street.replace(
    /\b([A-Za-z]+)$/,
    (word) => STREET_SUFFIX_ABBR[word.toLowerCase()] ?? word
  );
}

function abbreviateState(state: string): string {
  return STATE_ABBR[state.trim().toLowerCase()] ?? state;
}

let lastController: AbortController | null = null;

export async function searchAddresses(
  query: string
): Promise<AddressSuggestion[]> {
  if (query.trim().length < 4) return [];
  lastController?.abort();
  const controller = new AbortController();
  lastController = controller;
  try {
    const url =
      "https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=us&limit=5&q=" +
      encodeURIComponent(query);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const results = (await res.json()) as NominatimResult[];
    return results
      .filter((r) => r.address)
      .map((r) => {
        const a = r.address!;
        const street = abbreviateStreetSuffix(
          titleCase([a.house_number, a.road].filter(Boolean).join(" "))
        );
        const city = titleCase(a.city || a.town || a.village || a.hamlet || "");
        const state = abbreviateState(a.state || "");
        const zip = a.postcode || "";
        // Standard US format: "2931 Water St, Austin, TX 78702"
        const label = [street, city, [state, zip].filter(Boolean).join(" ")]
          .filter(Boolean)
          .join(", ");
        return { label, street, city, state, zip };
      })
      .filter((s) => s.street.length > 0);
  } catch {
    return [];
  }
}
