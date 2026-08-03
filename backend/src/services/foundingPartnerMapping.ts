import mongoose from 'mongoose';

// Placeholder ownerId for website-imported listings that haven't been claimed
// by a paying, logged-in partner yet.
export const SYSTEM_OWNER_ID = new mongoose.Types.ObjectId('000000000000000000000001');

export function parseCityState(address?: string): { city: string; state: string } {
  if (!address) return { city: '', state: '' };
  const parts = address.split(',').map(p => p.trim());
  if (parts.length >= 2) {
    const city     = parts[parts.length - 2];
    const stateZip = parts[parts.length - 1].trim().split(/\s+/);
    return { city, state: stateZip[0] ?? '' };
  }
  return { city: address, state: '' };
}

export function buildHours(fp: any): string {
  if (fp.is24Hours) return '24 Hours';
  return fp.businessHours ?? '';
}

export function buildDescription(fp: any): string {
  const parts: string[] = [];
  if (fp.businessDescription) parts.push(fp.businessDescription);
  if (fp.servicesOffered)     parts.push(`Services: ${fp.servicesOffered}`);
  const flags: string[] = [];
  if (fp.mobileService)      flags.push('Mobile Service');
  if (fp.roadsideAssistance) flags.push('Roadside Assistance');
  if (fp.heavyDutyService)   flags.push('Heavy Duty');
  if (flags.length)          parts.push(flags.join(' · '));
  return parts.join('\n\n');
}

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const key = process.env.TOMTOM_API_KEY;
  if (!key || !address) return null;
  try {
    const query    = encodeURIComponent(address);
    const url      = `https://api.tomtom.com/search/2/geocode/${query}.json?key=${key}&limit=1`;
    const res      = await fetch(url);
    const data: any = await res.json();
    const pos      = data?.results?.[0]?.position;
    if (!pos) return null;
    return { lat: pos.lat, lng: pos.lon };
  } catch {
    return null;
  }
}

// Maps a FoundingPartner document (from the ca_website database) onto the
// BusinessListing fields that mirror it. Does NOT set ownerId or tier —
// callers decide those based on whether the partner has a real paid account.
export function mapFoundingPartnerFields(fp: any): Record<string, any> {
  const parsed = parseCityState(fp.physicalAddress);
  // Seeded partners have no street address to parse a city/state out of, but
  // the seeder does group them by state — use that directly so the listing
  // isn't left with no location at all.
  const city  = parsed.city;
  const state = parsed.state || fp.state || '';
  return {
    businessName:        fp.businessName        ?? '',
    category:            fp.category            ?? '',
    phone:               fp.phone               ?? '',
    city,
    state,
    website:             fp.website             ?? '',
    description:         buildDescription(fp),
    hours:               buildHours(fp),
    logoUrl:             fp.logoUrl             ?? '',
    isActive:            true,
    physicalAddress:     fp.physicalAddress     ?? '',
    ownerName:           fp.ownerName           ?? '',
    ownerEmail:          fp.email               ?? '',
    serviceArea:         fp.serviceArea         ?? '',
    servicesOffered:     fp.servicesOffered     ?? '',
    mobileService:       fp.mobileService       ?? false,
    roadsideAssistance:  fp.roadsideAssistance  ?? false,
    heavyDutyService:    fp.heavyDutyService    ?? false,
    is24Hours:           fp.is24Hours           ?? false,
    photoUrls:           fp.photoUrls           ?? [],
    facebook:            fp.facebook            ?? '',
    instagram:           fp.instagram           ?? '',
    linkedin:            fp.linkedin            ?? '',
    importedFromWebsite: true,
    websiteId:           fp._id?.toString?.() ?? fp.websiteId,
  };
}
