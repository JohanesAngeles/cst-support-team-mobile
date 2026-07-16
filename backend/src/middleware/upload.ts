import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/jpg', 'image/webp',
      'application/pdf',
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF and image files are allowed'));
  },
});

export const uploadVideo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['video/mp4', 'video/quicktime', 'video/webm'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only MP4, MOV, and WebM video files are allowed'));
  },
});

export interface CloudinaryResult {
  url: string;
  publicId: string;
  resourceType: string;
}

export const uploadToCloudinary = (
  buffer: Buffer,
  folder: string,
  mimeType: string,
): Promise<CloudinaryResult> => {
  const resourceType = mimeType.startsWith('image/') ? 'image' : 'raw';
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (error, result) => {
        if (error || !result) { reject(error ?? new Error('Upload failed')); return; }
        resolve({ url: result.secure_url, publicId: result.public_id, resourceType });
      },
    );
    Readable.from(buffer).pipe(stream);
  });
};

export const deleteFromCloudinary = async (publicId: string, resourceType: string) => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType as any });
  } catch {
    // non-fatal — document still removed from DB
  }
};
