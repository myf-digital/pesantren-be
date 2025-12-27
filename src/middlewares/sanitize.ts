import { Request, Response, NextFunction } from 'express';

// remove HTML tags
const stripHtml = (value: string) => value.replace(/<[^>]*>/g, '');

export const sanitizeBody = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      const val = req.body[key];

      if (typeof val === 'string') {
        req.body[key] = stripHtml(val) // hilangkan HTML
          .trim() // hapus spasi kiri kanan
          .replace(/\s+/g, ' '); // normalisasi banyak spasi
      }
    }
  }

  next();
};
