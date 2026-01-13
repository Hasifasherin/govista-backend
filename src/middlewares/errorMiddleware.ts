import { Request, Response, NextFunction } from "express";

// Custom error handler
export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Server Error";

  res.status(statusCode).json({
    success: false,
    message
  });
};
