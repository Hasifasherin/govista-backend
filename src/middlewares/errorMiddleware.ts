import { Request, Response, NextFunction } from "express";

// Custom Error Classes (optional but useful)
export class AppError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
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

// Main Error Handler
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error("🔴 ERROR:", {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Default values
  let statusCode = 500;
  let message = "Internal Server Error";
  let errors: any[] = [];

  // Handle custom AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }
  
  // Handle validation errors (Mongoose or custom)
  else if (err.name === "ValidationError" || err.name === "ValidatorError") {
    statusCode = 400;
    message = "Validation Error";
    
    // Extract validation errors
    if (err.errors) {
      errors = Object.values(err.errors).map((error: any) => ({
        field: error.path,
        message: error.message
      }));
    }
  }
  
  // Handle MongoDB duplicate key error
  else if (err.code === 11000) {
    statusCode = 409; // Conflict
    message = "Duplicate value error";
    
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    errors = [{
      field,
      message: `${field} '${value}' already exists`
    }];
  }
  
  // Handle JWT errors
  else if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }
  
  else if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }
  
  // Handle CastError (invalid ObjectId)
  else if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }
  
  // Handle custom error with statusCode
  else if (typeof err.statusCode === "number") {
    statusCode = err.statusCode;
    message = err.message || message;
  }

  // Construct response
  const response: any = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  };

  // Add errors array if we have validation errors
  if (errors.length > 0) {
    response.errors = errors;
  }

  // Add stack trace in development only
  if (process.env.NODE_ENV === "development") {
    response.stack = err.stack;
    response.error = {
      name: err.name,
      message: err.message,
      code: err.code
    };
  }

  // Log the error (already done above)
  
  // Send response
  res.status(statusCode).json(response);
};

// 404 Not Found Middleware (optional, can be added in app.ts)
export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString()
  });
};