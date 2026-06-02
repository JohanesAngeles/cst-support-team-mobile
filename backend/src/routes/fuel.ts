import { Router, Request, Response } from 'express';

const router = Router();

// Simple in-process cache: EIA updates weekly, so 6 hours is fine
let eiaCache: { data: EIAPrice[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

interface EIAPrice {
  period: string;
  region: string;
  regionLabel: string;
  price: number | null;
}

const EIA_REGIONS = [
  { id: 'NUS',  label: 'U.S. Average' },
  { id: 'R10',  label: 'East Coast' },
  { id: 'R20',  label: 'Midwest' },
  { id: 'R30',  label: 'Gulf Coast' },
  { id: 'R40',  label: 'Rocky Mountain' },
  { id: 'R50',  label: 'West Coast' },
];

async function fetchEIAPrices(): Promise<EIAPrice[]> {
  const apiKey = process.env.EIA_API_KEY;
  if (!apiKey) return [];

  const facets = EIA_REGIONS.map(r => `facets[duoarea][]=${r.id}`).join('&');
  const url = `https://api.eia.gov/v2/petroleum/pri/gnd/data/?frequency=weekly&data[0]=value&facets[product][]=EPD2D&${facets}&sort[0][column]=period&sort[0][direction]=desc&length=6&api_key=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) return [];

  const json = await res.json() as any;
  const rows: any[] = json?.response?.data ?? [];

  // Keep only the most-recent period per region
  const seen = new Set<string>();
  const prices: EIAPrice[] = [];

  for (const row of rows) {
    if (seen.has(row.duoarea)) continue;
    seen.add(row.duoarea);
    const region = EIA_REGIONS.find(r => r.id === row.duoarea);
    prices.push({
      period:      row.period,
      region:      row.duoarea,
      regionLabel: region?.label ?? row.duoarea,
      price:       row.value != null ? parseFloat(row.value) : null,
    });
  }

  return prices;
}

// GET /api/fuel/eia-prices — no auth required (public reference data)
router.get('/eia-prices', async (_req: Request, res: Response) => {
  try {
    const now = Date.now();
    if (eiaCache && now - eiaCache.fetchedAt < CACHE_TTL_MS) {
      res.json({ prices: eiaCache.data, source: 'cache', fetchedAt: new Date(eiaCache.fetchedAt).toISOString() });
      return;
    }

    const prices = await fetchEIAPrices();
    if (prices.length > 0) {
      eiaCache = { data: prices, fetchedAt: now };
    }

    res.json({ prices, source: 'eia', fetchedAt: new Date(now).toISOString() });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to fetch EIA prices', prices: [] });
  }
});

export default router;
