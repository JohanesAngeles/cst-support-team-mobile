const TOMTOM_KEY = process.env.TOMTOM_API_KEY ?? '';

export async function geocodeAddress(
  address: string,
): Promise<{ latitude: number; longitude: number } | null> {
  if (!address || !TOMTOM_KEY) return null;
  try {
    const url = `https://api.tomtom.com/search/2/search/${encodeURIComponent(address)}.json?key=${TOMTOM_KEY}&limit=1&countrySet=US`;
    const res  = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    const pos  = data?.results?.[0]?.position;
    return pos ? { latitude: pos.lat, longitude: pos.lon } : null;
  } catch {
    return null;
  }
}

export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
