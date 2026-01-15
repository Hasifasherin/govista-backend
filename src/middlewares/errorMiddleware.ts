import { Request, Response, NextFunction } from "express";

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error("ERROR 💥:", err);

  const statusCode: number = typeof err.statusCode === "number"
    ? err.statusCode
    : 500;

  const message: string = err.message || "Server Error";

  res.status(statusCode).json({
    success: false,
    message
  });
};
