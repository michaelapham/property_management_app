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
        const street = [a.house_number, a.road].filter(Boolean).join(" ");
        const city = a.city || a.town || a.village || a.hamlet || "";
        return {
          label: r.display_name,
          street,
          city,
          state: a.state || "",
          zip: a.postcode || "",
        };
      })
      .filter((s) => s.street.length > 0);
  } catch {
    return [];
  }
}
