import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err.message || 'Internal server error';

  if (env.nodeEnv !== 'production') {
    console.error(err);
  }

  res.status(statusCode).json({
    message,
    ...(env.nodeEnv !== 'production' && { stack: err.stack }),
  });
}
