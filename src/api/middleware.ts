import type { NextFunction, Request, Response } from 'express';

export function logger(req: Request, _: Response, next: NextFunction): void {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
}
