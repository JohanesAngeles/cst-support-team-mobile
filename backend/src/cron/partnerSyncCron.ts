import mongoose from 'mongoose';
import BusinessListing from '../models/BusinessListing';

const WEBSITE_URI = 'mongodb+srv://cst-admin:rAXIov7yplFQKJVv@cst-database.upppc4y.mongodb.net/test?appName=cst-database';

// Reuse a single connection across all cron runs — don't reconnect every hour
let websiteConn: mongoose.Connection | null = null;

async function getWebsiteConnection(): Promise<mongoose.Connection> {
  if (websiteConn && websiteConn.readyState === 1) return websiteConn;
  websiteConn = await mongoose.createConnection(WEBSITE_URI).asPromise();
  return websiteConn;
}

// Minimal schema — we only need to read from this collection
const FoundingPartnerSchema = new mongoose.Schema({
  businessName:        String,
  ownerName:           String,
  phone:               String,
  email:               String,
  website:             String,
  physicalAddress:     String,
  serviceArea:         String,
  businessHours:       String,
  is24Hours:           Boolean,
  category:            String,
  servicesOffered:     String,
  mobileService:       Boolean,
  roadsideAssistance:  Boolean,
  heavyDutyService:    Boolean,
  logoUrl:             String,
  photoUrls:           [String],
  businessDescription: String,
  facebook:            String,
  instagram:           String,
  linkedin:            String,
  otherSocial:         String,
  status:              String,
}, { timestamps: true });

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseCityState(address?: string): { city: string; state: string } {
  if (!address) return { city: '', state: '' };
  const parts = address.split(',').map(p => p.trim());
  if (parts.length >= 2) {
    const city     = parts[parts.length - 2];
    const stateZip = parts[parts.length - 1].trim().split(/\s+/);
    return { city, state: stateZip[0] ?? '' };
  }
  return { city: address, state: '' };
}

function buildHours(fp: any): string {
  if (fp.is24Hours) return '24 Hours';
  return fp.businessHours ?? '';
}

function buildDescription(fp: any): string {
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

// Placeholder ownerId for website-imported listings
const SYSTEM_OWNER_ID = new mongoose.Types.ObjectId('000000000000000000000001');

// ── Geocoding ─────────────────────────────────────────────────────────────────

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
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

// ── Core sync function ────────────────────────────────────────────────────────

export async function syncApprovedPartners(): Promise<void> {
  try {
    const conn = await getWebsiteConnection();

    // Use existing model if already registered on this connection
    const FoundingPartner = conn.models['FoundingPartner']
      ?? conn.model('FoundingPartner', FoundingPartnerSchema);

    const approved = await FoundingPartner.find({ status: 'approved' }).lean() as any[];

    if (!approved.length) {
      console.log('[partnerSync] No approved partners on website yet — nothing to sync.');
      return;
    }

    let upserted = 0;
    let unchanged = 0;

    for (const fp of approved) {
      const { city, state } = parseCityState(fp.physicalAddress);
      const websiteId = fp._id.toString();

      // Only geocode if we don't already have coordinates stored
      const existing = await BusinessListing.findOne({ websiteId }).lean();
      let lat = (existing as any)?.latitude;
      let lng = (existing as any)?.longitude;
      if (!lat && fp.physicalAddress) {
        const coords = await geocodeAddress(fp.physicalAddress);
        if (coords) { lat = coords.lat; lng = coords.lng; }
      }

      const update: any = {
        ownerId:             SYSTEM_OWNER_ID,
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
        servicesOffered:     fp.servicesOffered      ?? '',
        mobileService:       fp.mobileService       ?? false,
        roadsideAssistance:  fp.roadsideAssistance  ?? false,
        heavyDutyService:    fp.heavyDutyService    ?? false,
        is24Hours:           fp.is24Hours           ?? false,
        photoUrls:           fp.photoUrls           ?? [],
        facebook:            fp.facebook            ?? '',
        instagram:           fp.instagram           ?? '',
        linkedin:            fp.linkedin            ?? '',
        importedFromWebsite: true,
        websiteId,
      };
      if (lat) update.latitude  = lat;
      if (lng) update.longitude = lng;

      const result = await BusinessListing.updateOne(
        { websiteId },          // match by the website record's _id
        { $set: update },
        { upsert: true }
      );

      if (result.upsertedCount > 0) {
        upserted++;
        console.log(`[partnerSync] ✅ Added: ${fp.businessName} (${city}, ${state})`);
      } else {
        unchanged++;
      }
    }

    // Deactivate any previously synced listings whose website record was un-approved
    const approvedIds = approved.map((fp: any) => fp._id.toString());
    const deactivated = await BusinessListing.updateMany(
      { importedFromWebsite: true, websiteId: { $nin: approvedIds }, isActive: true },
      { $set: { isActive: false } }
    );
    if (deactivated.modifiedCount > 0) {
      console.log(`[partnerSync] ⚠️  Deactivated ${deactivated.modifiedCount} listing(s) no longer approved on website.`);
    }

    console.log(`[partnerSync] Sync complete — ${upserted} new, ${unchanged} unchanged, ${approved.length} approved total on website.`);
  } catch (err: any) {
    console.error('[partnerSync] Error during sync:', err.message);
  }
}
