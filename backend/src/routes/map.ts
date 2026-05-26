import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import MapReport, { ReportType } from '../models/MapReport';

const router = Router();
router.use(protect);

const VALID_TYPES: ReportType[] = ['truck_stop', 'hazard', 'weigh_station', 'parking', 'fuel'];

// Haversine distance in miles
function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// GET /api/map/reports?lat=&lng=&radius=50&type=
router.get('/reports', async (req: AuthRequest, res: Response) => {
  const lat = parseFloat(String(req.query.lat));
  const lng = parseFloat(String(req.query.lng));
  const radius = Math.min(parseFloat(String(req.query.radius)) || 50, 200); // max 200 miles
  const typeFilter = req.query.type as string | undefined;

  if (isNaN(lat) || isNaN(lng)) {
    res.status(400).json({ message: 'lat and lng are required' });
    return;
  }

  // Bounding box for initial filter (approx 1 degree lat ≈ 69 miles)
  const latDelta = radius / 69;
  const lngDelta = radius / (69 * Math.cos((lat * Math.PI) / 180));

  const query: Record<string, unknown> = {
    lat: { $gte: lat - latDelta, $lte: lat + latDelta },
    lng: { $gte: lng - lngDelta, $lte: lng + lngDelta },
  };

  if (typeFilter && VALID_TYPES.includes(typeFilter as ReportType)) {
    query.type = typeFilter;
  }

  const reports = await MapReport.find(query).sort({ createdAt: -1 }).limit(200);

  // Precise distance filter + annotate distance
  const filtered = reports
    .map((r) => ({ ...r.toObject(), distanceMiles: Math.round(distanceMiles(lat, lng, r.lat, r.lng) * 10) / 10 }))
    .filter((r) => r.distanceMiles <= radius)
    .sort((a, b) => a.distanceMiles - b.distanceMiles);

  res.json(filtered);
});

// GET /api/map/reports/recent — last 50 reports globally (for feed view)
router.get('/reports/recent', async (_req: AuthRequest, res: Response) => {
  const reports = await MapReport.find().sort({ createdAt: -1 }).limit(50);
  res.json(reports);
});

// POST /api/map/reports — create a report
router.post('/reports', async (req: AuthRequest, res: Response) => {
  const {
    type, lat, lng, title, description,
    fuelPrice, fuelStation, isOpen, waitMinutes,
    rating, amenities, hazardType, parkingSpots,
  } = req.body;

  if (!VALID_TYPES.includes(type)) {
    res.status(400).json({ message: `type must be one of: ${VALID_TYPES.join(', ')}` });
    return;
  }
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    res.status(400).json({ message: 'lat and lng must be numbers' });
    return;
  }
  if (!title || String(title).trim().length === 0) {
    res.status(400).json({ message: 'title is required' });
    return;
  }

  // Hazards auto-expire after 24 hours
  const expiresAt = type === 'hazard' ? new Date(Date.now() + 24 * 60 * 60 * 1000) : undefined;

  const report = await MapReport.create({
    userId: req.user._id,
    userName: req.user.name,
    type,
    lat,
    lng,
    title: String(title).trim(),
    description: description ? String(description).trim() : undefined,
    fuelPrice,
    fuelStation,
    isOpen,
    waitMinutes,
    rating,
    amenities: Array.isArray(amenities) ? amenities : undefined,
    hazardType,
    parkingSpots,
    expiresAt,
  });

  res.status(201).json(report);
});

// POST /api/map/reports/:id/upvote
router.post('/reports/:id/upvote', async (req: AuthRequest, res: Response) => {
  const uid = req.user._id;
  const report = await MapReport.findById(req.params.id);
  if (!report) { res.status(404).json({ message: 'Report not found' }); return; }

  const alreadyVoted = report.upvotedBy.some((id) => id.toString() === uid.toString());
  if (alreadyVoted) {
    // Toggle off
    report.upvotedBy = report.upvotedBy.filter((id) => id.toString() !== uid.toString());
    report.upvotes = Math.max(0, report.upvotes - 1);
  } else {
    report.upvotedBy.push(uid);
    report.upvotes += 1;
  }

  await report.save();
  res.json({ upvotes: report.upvotes, upvoted: !alreadyVoted });
});

// DELETE /api/map/reports/:id — own reports only
router.delete('/reports/:id', async (req: AuthRequest, res: Response) => {
  const report = await MapReport.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!report) { res.status(404).json({ message: 'Not found or not your report' }); return; }
  res.json({ message: 'Deleted' });
});

export default router;
