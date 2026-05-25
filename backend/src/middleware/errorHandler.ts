import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(public message: string, public status = 500) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const status = (err as AppError).status || 500;
  const isProd = process.env.NODE_ENV === 'production';
  
  if (status >= 500) {
    console.error('[ERROR]', err.message, err.stack);
  }

  res.status(status).json({
    success: false,
    message: isProd && status === 500 ? 'Internal Server Error' : err.message,
  });
};
