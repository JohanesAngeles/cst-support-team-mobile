import mongoose from 'mongoose';
import BusinessListing from '../models/BusinessListing';
import { mapFoundingPartnerFields, geocodeAddress, SYSTEM_OWNER_ID } from '../services/foundingPartnerMapping';
import { provisionFeaturedPartner } from '../services/partnerProvisioning';

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
  source:              String,
  claimStatus:         String,
  subscriptionStatus:  String,
}, { timestamps: true });

// ── Core sync function ────────────────────────────────────────────────────────

export async function syncApprovedPartners(): Promise<void> {
  try {
    const conn = await getWebsiteConnection();

    // Use existing model if already registered on this connection
    const FoundingPartner = conn.models['FoundingPartner']
      ?? conn.model('FoundingPartner', FoundingPartnerSchema);

    // Visible in the app as (at minimum) a free Basic Listing:
    //  - every imported ("seeded") business, the moment it's imported — these
    //    were already vetted by the admin who built the lead spreadsheet, so
    //    they don't need a separate approval step before showing up
    //  - organic applications (submitted via the public apply form) only
    //    after an admin has explicitly approved them
    // Either way, a business that was rejected or that declined its claimed
    // listing is excluded.
    const partners = await FoundingPartner.find({
      status:      { $ne: 'rejected' },
      claimStatus: { $ne: 'declined' },
      $or: [
        { source: 'seeded' },
        { status: 'approved' },
      ],
    }).lean() as any[];

    if (!partners.length) {
      console.log('[partnerSync] No partners to sync yet.');
      return;
    }

    let upserted = 0;
    let unchanged = 0;
    let provisioned = 0;

    for (const fp of partners) {
      const websiteId = fp._id.toString();
      const fields = mapFoundingPartnerFields(fp);

      // A partner already provisioned with a real paid account owns their
      // listing — don't stomp that back to the system placeholder owner.
      const existing = await BusinessListing.findOne({ websiteId }).lean() as any;
      const hasRealOwner = existing?.ownerId && existing.ownerId.toString() !== SYSTEM_OWNER_ID.toString();

      let lat = existing?.latitude;
      let lng = existing?.longitude;
      if (!lat && fp.physicalAddress) {
        const coords = await geocodeAddress(fp.physicalAddress);
        if (coords) { lat = coords.lat; lng = coords.lng; }
      }

      const update: any = { ...fields };
      if (!hasRealOwner) update.ownerId = SYSTEM_OWNER_ID;
      if (lat) update.latitude  = lat;
      if (lng) update.longitude = lng;

      const result = await BusinessListing.updateOne(
        { websiteId },          // match by the website record's _id
        { $set: update },
        { upsert: true }
      );

      if (result.upsertedCount > 0) {
        upserted++;
        console.log(`[partnerSync] ✅ Added: ${fp.businessName} (${fields.city}, ${fields.state})`);
      } else {
        unchanged++;
      }

      // Safety net: a partner whose payment went through but who somehow
      // never got a login (e.g. the real-time provisioning call from
      // ca_website failed) gets caught and provisioned here instead.
      if (fp.subscriptionStatus === 'active' && !hasRealOwner) {
        try {
          const { created } = await provisionFeaturedPartner(fp);
          if (created) {
            provisioned++;
            console.log(`[partnerSync] 🌟 Provisioned featured account: ${fp.businessName}`);
          }
        } catch (err: any) {
          console.error(`[partnerSync] Failed to provision ${fp.businessName}:`, err.message);
        }
      }
    }

    // Deactivate any previously synced listings that dropped out of the
    // visible set above (rejected, declined, or an un-approved application).
    const visibleIds = partners.map((fp: any) => fp._id.toString());
    const deactivated = await BusinessListing.updateMany(
      { importedFromWebsite: true, websiteId: { $nin: visibleIds }, isActive: true },
      { $set: { isActive: false } }
    );
    if (deactivated.modifiedCount > 0) {
      console.log(`[partnerSync] ⚠️  Deactivated ${deactivated.modifiedCount} listing(s) no longer visible on website.`);
    }

    console.log(`[partnerSync] Sync complete — ${upserted} new, ${unchanged} unchanged, ${provisioned} newly provisioned, ${partners.length} total on website.`);
  } catch (err: any) {
    console.error('[partnerSync] Error during sync:', err.message);
  }
}
