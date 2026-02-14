import { Request, Response, NextFunction } from "express";
import multer from "multer";

/* ======================================================
   Custom Error Classes
====================================================== */

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = "Validation Error") {
    super(message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Access denied") {
    super(message, 403);
  }
}

/* ======================================================
   Global Error Handler
====================================================== */

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error("🔴 ERROR:", {
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  let statusCode = 500;
  let message = "Internal Server Error";
  let errors: any[] = [];

  /* ======================================================
     Handle Custom App Errors
  ====================================================== */
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }

  /* ======================================================
     Handle Mongoose Validation Errors
  ====================================================== */
  else if (err?.name === "ValidationError" && err?.errors) {
    statusCode = 400;
    message = "Validation Error";

    errors = Object.values(err.errors).map((error: any) => ({
      field: error.path,
      message: error.message,
    }));
  }

  /* ======================================================
     Handle Multer Errors (File Upload)
  ====================================================== */
  else if (err instanceof multer.MulterError) {
    statusCode = 400;

    if (err.code === "LIMIT_FILE_SIZE") {
      message = "File too large. Maximum allowed size is 5MB.";
    } else {
      message = err.message;
    }
  }

  /* ======================================================
     Handle MongoDB Duplicate Key
  ====================================================== */
  else if (err?.code === 11000) {
    statusCode = 409;
    message = "Duplicate value error";

    const field = Object.keys(err.keyValue || {})[0];
    const value = err.keyValue?.[field];

    if (field) {
      errors.push({
        field,
        message: `${field} '${value}' already exists`,
      });
    }
  }

  /* ======================================================
     Handle JWT Errors
  ====================================================== */
  else if (err?.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  } else if (err?.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }

  /* ======================================================
     Handle Invalid ObjectId (CastError)
  ====================================================== */
  else if (err?.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  /* ======================================================
     Handle Unknown Custom Errors With statusCode
  ====================================================== */
  else if (typeof err?.statusCode === "number") {
    statusCode = err.statusCode;
    message = err.message || message;
  }

  /* ======================================================
     Final Response
  ====================================================== */

  const response: any = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
  };

  if (errors.length > 0) {
    response.errors = errors;
  }

  if (process.env.NODE_ENV === "development") {
    response.stack = err.stack;
    response.error = {
      name: err.name,
      message: err.message,
      code: err.code,
    };
  }

  return res.status(statusCode).json(response);
};

/* ======================================================
   404 Not Found Handler
====================================================== */

export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString(),
  });
};
