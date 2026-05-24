import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import { upload, uploadToCloudinary, deleteFromCloudinary } from '../middleware/upload';
import UserDocument from '../models/UserDocument';

const router = Router();
router.use(protect);

router.get('/', async (req: AuthRequest, res: Response) => {
  const docs = await UserDocument.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.json(docs);
});

router.post('/', upload.single('file'), async (req: AuthRequest, res: Response) => {
  const { name } = req.body;
  if (!name) { res.status(400).json({ message: 'name required' }); return; }

  let fileUrl = '';
  let publicId = '';
  let resourceType = 'raw';
  let fileType = '';
  let fileSize = 0;

  if (req.file) {
    try {
      const result = await uploadToCloudinary(
        req.file.buffer,
        `cst-docs/${req.user._id}`,
        req.file.mimetype,
      );
      fileUrl = result.url;
      publicId = result.publicId;
      resourceType = result.resourceType;
      fileType = req.file.mimetype;
      fileSize = req.file.size;
    } catch (err: any) {
      res.status(500).json({ message: 'File upload failed: ' + err.message }); return;
    }
  }

  const doc = await UserDocument.create({
    userId: req.user._id,
    name,
    icon: req.body.icon ?? 'document-outline',
    status: 'Active',
    fileUrl,
    publicId,
    resourceType,
    fileType,
    fileSize,
  });
  res.status(201).json(doc);
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const doc = await UserDocument.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!doc) { res.status(404).json({ message: 'Not found' }); return; }
  if (doc.publicId) await deleteFromCloudinary(doc.publicId, doc.resourceType);
  res.json({ message: 'Deleted' });
});

export default router;
