import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import { upload, uploadVideo, uploadToCloudinary } from '../middleware/upload';

const router = Router();
router.use(protect);

// Generic receipt / photo upload — returns { url } for storing on any record
router.post('/receipt', upload.single('photo'), async (req: AuthRequest, res: Response) => {
  if (!req.file) { res.status(400).json({ message: 'No photo provided' }); return; }
  try {
    const result = await uploadToCloudinary(req.file.buffer, `cst-receipts/${req.user._id}`, req.file.mimetype);
    res.json({ url: result.url });
  } catch (err: any) {
    res.status(500).json({ message: 'Upload failed: ' + err.message });
  }
});

// Video upload for post clips and stories — returns { url, thumbnailUrl }
router.post('/video', uploadVideo.single('video'), async (req: AuthRequest, res: Response) => {
  if (!req.file) { res.status(400).json({ message: 'No video provided' }); return; }
  try {
    const result = await uploadToCloudinary(req.file.buffer, `cst-videos/${req.user._id}`, req.file.mimetype);
    const thumbnailUrl = result.url.replace(/\.\w+$/, '.jpg');
    res.json({ url: result.url, thumbnailUrl });
  } catch (err: any) {
    res.status(500).json({ message: 'Upload failed: ' + err.message });
  }
});

export default router;
