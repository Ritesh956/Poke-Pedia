import type { Request, Response, NextFunction } from 'express';
export function handleError(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  console.error(err);
  if (res.headersSent) return next(err);
  res
    .status(500)
    .json({ message: 'The request could not be completed. Please try again.' });
}
