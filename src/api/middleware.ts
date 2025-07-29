import type { NextFunction, Request, Response } from 'express';
import { BusinessError, NotFoundError } from '../domain/shared-kernel/errors.ts';

export function logger(req: Request, _: Response, next: NextFunction): void {
  console.log(`➡️ [${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
}

export function errorLogger(err: unknown, req: Request, _: Response, next: NextFunction): void {
  console.error(
    `❌ [${new Date().toISOString()}] Error in ${req.method} ${req.url}:`,
    err instanceof Error ? err.message : err,
  );
  next(err);
}

/**
 * Middleware to ensure POST requests are JSON
 */
export function requireJsonPost(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'POST' && !req.is('json')) {
    const error = 'Content-Type must be application/json for POST requests';
    res.setHeader('Accept-Post', 'application/json');
    if (!req.headers['content-type']) {
      res.status(415).json({ error });
    } else {
      res.status(415).send(error);
    }
    return;
  }
  next();
}

/**
 * Middleware to handle errors
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _: NextFunction): void {
  const { status, message } = generateErrorResponse(err);

  if (req.accepts('json') || req.is('json')) {
    res.status(status).json({ error: message });
  } else {
    res.status(status).type('text/plain').send(message);
  }
}

function generateErrorResponse(err: unknown) {
  if (err instanceof BusinessError) {
    return { status: 409, message: err.message };
  }

  if (err instanceof NotFoundError) {
    return { status: 404, message: err.message };
  }

  return { status: 500, message: 'Internal Server Error' };
}
