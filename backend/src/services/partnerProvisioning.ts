import crypto from 'crypto';
import User from '../models/User';
import BusinessListing from '../models/BusinessListing';
import { sendFeaturedPartnerWelcomeEmail } from '../utils/email';
import { mapFoundingPartnerFields, geocodeAddress } from './foundingPartnerMapping';

// Called once a Founding Partner's payment is confirmed on the website (either
// in real time via the internal API, or by the hourly sync cron as a fallback
// if that call didn't land). Idempotent — a partner who already has a User
// account just gets their listing re-synced to 'featured', no new account or
// email.
export async function provisionFeaturedPartner(fp: any): Promise<{ created: boolean }> {
  const email = (fp.email || fp.ownerEmail || '').trim().toLowerCase();
  if (!email) throw new Error('provisionFeaturedPartner: partner has no email');

  let user = await User.findOne({ email });
  let created = false;
  let tempPassword = '';

  if (!user) {
    tempPassword = 'Road' + crypto.randomBytes(4).toString('hex').toUpperCase();
    user = await User.create({
      name:                fp.ownerName || fp.businessName,
      email,
      password:            tempPassword,
      role:                'partner',
      isVerified:          true,
      subscriptionStatus:  'active',
    });
    created = true;
  }

  const websiteId = fp._id?.toString?.() ?? fp.websiteId;
  const fields = mapFoundingPartnerFields(fp);

  const existing = await BusinessListing.findOne({ websiteId }).lean();
  let lat = (existing as any)?.latitude;
  let lng = (existing as any)?.longitude;
  if (!lat && fp.physicalAddress) {
    const coords = await geocodeAddress(fp.physicalAddress);
    if (coords) { lat = coords.lat; lng = coords.lng; }
  }

  await BusinessListing.updateOne(
    { websiteId },
    { $set: { ...fields, ownerId: user._id, tier: 'featured', ...(lat ? { latitude: lat } : {}), ...(lng ? { longitude: lng } : {}) } },
    { upsert: true }
  );

  if (created) {
    await sendFeaturedPartnerWelcomeEmail(email, fp.ownerName || fp.businessName, fp.businessName, tempPassword)
      .catch(err => console.error('[featured-partner-welcome-email]', err));
  }

  return { created };
}
