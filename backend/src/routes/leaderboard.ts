import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import RoadReadyScore from '../models/RoadReadyScore';

const router = Router();
router.use(protect);

type Category = 'national' | 'safety' | 'skill' | 'business' | 'fleet' | 'rising';

const VALID: Category[] = ['national', 'safety', 'skill', 'business', 'fleet', 'rising'];

function categoryScore(s: any, cat: Category): number {
  switch (cat) {
    case 'national':  return s.totalScore ?? 0;
    case 'safety':    return s.safetyScore ?? 0;
    case 'skill':     return s.skillScore ?? 0;
    case 'business':  return s.businessScore ?? 0;
    // Fleet: weighted combo of business (60%) + safety (40%), normalised to 250
    case 'fleet':     return Math.round(
      ((s.businessScore ?? 0) / 150) * 150 + ((s.safetyScore ?? 0) / 300) * 100
    );
    // Rising star: education + reputation
    case 'rising':    return (s.educationScore ?? 0) + (s.reputationScore ?? 0);
    default:          return s.totalScore ?? 0;
  }
}

function privatizeName(full: string): string {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

// GET /api/leaderboard?category=national|safety|skill|business|fleet|rising
router.get('/', async (req: AuthRequest, res: Response) => {
  const cat = ((req.query.category as string) ?? 'national') as Category;
  if (!VALID.includes(cat)) { res.status(400).json({ message: 'Invalid category' }); return; }

  try {
    const all = await RoadReadyScore.find({})
      .select('userId safetyScore skillScore complianceScore businessScore reputationScore educationScore totalScore badges')
      .populate<{ userId: { _id: any; name: string } }>('userId', 'name')
      .lean();

    const myId = req.user._id.toString();

    // Score and sort
    const ranked = all
      .map(s => ({ ...s, _score: categoryScore(s, cat) }))
      .sort((a, b) => b._score - a._score);

    const myIdx = ranked.findIndex(s => {
      const uid = (s.userId as any)?._id ?? s.userId;
      return uid?.toString() === myId;
    });

    const top = ranked.slice(0, 10).map((s, i) => {
      const uid = (s.userId as any)?._id ?? s.userId;
      const name = (s.userId as any)?.name ? privatizeName((s.userId as any).name) : 'Driver';
      return {
        rank:       i + 1,
        name,
        score:      s._score,
        totalScore: s.totalScore ?? 0,
        badges:     (s.badges ?? []).slice(0, 2),
        isMe:       uid?.toString() === myId,
      };
    });

    const myEntry = myIdx >= 0 ? ranked[myIdx] : null;

    res.json({
      category:     cat,
      top,
      myRank:       myIdx >= 0 ? myIdx + 1 : null,
      myScore:      myEntry?._score ?? 0,
      myTotalScore: myEntry?.totalScore ?? 0,
      totalDrivers: ranked.length,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message ?? 'Failed to load leaderboard' });
  }
});

// POST /api/leaderboard/challenge
// Body: { score, total, weekKey }  — awards skill+education pts for new weekly bests
router.post('/challenge', async (req: AuthRequest, res: Response) => {
  const { score, total, weekKey } = req.body as { score: number; total: number; weekKey: string };
  if (typeof score !== 'number' || typeof total !== 'number' || !weekKey) {
    res.status(400).json({ message: 'Invalid payload.' }); return;
  }

  try {
    let record = await RoadReadyScore.findOne({ userId: req.user._id });
    if (!record) record = new RoadReadyScore({ userId: req.user._id });

    const storeKey = `weekly_${weekKey}`;
    const prevBest = ((record.challengesBestScores as Record<string, number>)[storeKey] ?? -1);

    const newPts  = Math.floor((score / total) * 25);
    const prevPts = prevBest >= 0 ? Math.floor((prevBest / total) * 25) : 0;
    const delta   = Math.max(0, newPts - prevPts);

    let pointsEarned = 0;
    let needsSave    = false;

    if (score > prevBest) {
      (record.challengesBestScores as Record<string, number>)[storeKey] = score;
      record.markModified('challengesBestScores');
      needsSave = true;
    }

    if (delta > 0) {
      const skillGain = Math.round(delta * 0.8);
      const eduGain   = delta - skillGain;
      record.skillScore     = Math.min(200, (record.skillScore     ?? 0) + skillGain);
      record.educationScore = Math.min(50,  (record.educationScore ?? 0) + eduGain);
      record.totalScore     = (record.safetyScore ?? 0) + (record.skillScore ?? 0) +
                              (record.complianceScore ?? 0) + (record.businessScore ?? 0) +
                              (record.reputationScore ?? 0) + (record.educationScore ?? 0);
      pointsEarned = delta;
      needsSave    = true;
    }

    if (needsSave) await record.save();

    res.json({ pointsEarned, newSkillScore: record.skillScore, newTotalScore: record.totalScore });
  } catch (err: any) {
    res.status(500).json({ message: err.message ?? 'Server error.' });
  }
});

export default router;
