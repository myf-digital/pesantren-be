import { NextFunction, Request, Response } from 'express';
import { checkAccess } from '../../auth/auth.middleware';
import { response } from '../../../helpers/response';

export async function financialAccess(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const prefix = req.path.split('/')[1];
  if (!prefix?.startsWith('keu-')) return next();
  const result = await checkAccess(req, (req.user as any)?.role_name, prefix);
  if (!result.status) return response.failed(result.message, result.code, res);
  next();
}
