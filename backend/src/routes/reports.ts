import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { protect, AuthRequest } from '../middleware/auth';
import Report, { ReportTargetType } from '../models/Report';
import NetworkPost from '../models/NetworkPost';
import User from '../models/User';

const router = Router();
router.use(protect);

const adminOnly = (req: AuthRequest, res: Response, next: Function) => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ message: 'Admin access required.' });
    return;
  }
  next();
};

// File a report against a post or a user
router.post('/', async (req: AuthRequest, res: Response) => {
  const { targetType, targetId, reason } = req.body as { targetType: ReportTargetType; targetId: string; reason: string };

  if (!['post', 'user'].includes(targetType)) { res.status(400).json({ message: 'Invalid targetType' }); return; }
  if (!mongoose.isValidObjectId(targetId)) { res.status(400).json({ message: 'Invalid targetId' }); return; }
  if (!reason?.trim()) { res.status(400).json({ message: 'A reason is required' }); return; }

  let targetLabel: string;
  let targetDetail: string | undefined;

  if (targetType === 'post') {
    const post = await NetworkPost.findById(targetId);
    if (!post) { res.status(404).json({ message: 'Post not found' }); return; }
    targetLabel = post.authorName;
    targetDetail = post.body.slice(0, 200);
  } else {
    const target = await User.findById(targetId);
    if (!target) { res.status(404).json({ message: 'User not found' }); return; }
    targetLabel = target.name;
  }

  const report = await Report.create({
    reporterId: req.user._id,
    reporterName: req.user.name,
    targetType,
    targetId,
    targetLabel,
    targetDetail,
    reason: reason.trim(),
  });

  res.status(201).json({ report });
});

// Admin queue
router.get('/', adminOnly, async (req: AuthRequest, res: Response) => {
  const { status } = req.query;
  const query: Record<string, unknown> = {};
  if (status) query.status = status;
  const reports = await Report.find(query).sort({ createdAt: -1 }).limit(200);
  res.json({ reports });
});

// Resolve/dismiss a report, optionally removing the reported post
router.put('/:id', adminOnly, async (req: AuthRequest, res: Response) => {
  const { status, deleteTarget } = req.body as { status: 'reviewed' | 'dismissed'; deleteTarget?: boolean };
  if (!['reviewed', 'dismissed'].includes(status)) { res.status(400).json({ message: 'Invalid status' }); return; }

  const report = await Report.findById(req.params.id);
  if (!report) { res.status(404).json({ message: 'Not found' }); return; }

  if (deleteTarget && report.targetType === 'post') {
    await NetworkPost.findByIdAndDelete(report.targetId);
  }

  report.status = status;
  report.resolvedBy = req.user._id;
  report.resolvedAt = new Date();
  await report.save();
  res.json({ report });
});

export default router;
