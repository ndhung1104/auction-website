import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import sharp from 'sharp';
import { ApiError } from '../utils/response.js';

const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');
const PRODUCT_UPLOAD_DIR = path.join(UPLOAD_ROOT, 'products');
const FILE_BASE_URL = (process.env.FILE_BASE_URL || '').replace(/\/$/, '');
const RESIZE_WIDTH = 1200;
const RESIZE_HEIGHT = 800;

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

ensureDir(PRODUCT_UPLOAD_DIR);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, PRODUCT_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase().replace(/[^.\w]/g, '');
    const safeName = (file.originalname || 'file')
      .toLowerCase()
      .replace(/[^\w.-]+/g, '')
      .slice(0, 50);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${safeName || 'image'}-${uniqueSuffix}${ext}`);
  }
});

const imageFileFilter = (_req, file, cb) => {
  if (/^image\/(jpe?g|png|gif|webp)$/i.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'UPLOAD.INVALID_TYPE', 'Only image uploads are allowed'));
  }
};

const MAX_FILE_SIZE = Number(process.env.UPLOAD_MAX_FILE_SIZE_BYTES || 5 * 1024 * 1024); // 5MB

const productImagesUpload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 8
  },
  fileFilter: imageFileFilter
});

const resizeUploadedImages = async (req, _res, next) => {
  const files = req.files || [];
  if (!files.length) return next();
  try {
    await Promise.all(
      files.map(async (file) => {
        const buffer = await sharp(file.path)
          .rotate()
          .resize(RESIZE_WIDTH, RESIZE_HEIGHT, { fit: 'cover' })
          .toBuffer();
        await fs.promises.writeFile(file.path, buffer);
      })
    );
    next();
  } catch (error) {
    cleanupUploadedFiles(files);
    next(error);
  }
};

export const uploadProductImages = [
  productImagesUpload.array('images', 8),
  resizeUploadedImages
];

export const buildPublicUrl = (filePath) => {
  const relative = path.relative(UPLOAD_ROOT, filePath);
  return `/uploads/${relative.replace(/\\/g, '/')}`;
};

export const cleanupUploadedFiles = (files = []) => {
  files.forEach((file) => {
    if (file?.path && fs.existsSync(file.path)) {
      fs.unlink(file.path, () => {});
    }
  });
};
