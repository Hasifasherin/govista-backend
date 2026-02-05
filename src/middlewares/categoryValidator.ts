import { Request, Response, NextFunction } from "express";

// Use require to avoid TS errors with express-validator
const { body, validationResult } = require("express-validator");

// Validation middleware for create/update category
export const validateCategory = [
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required")
    .isLength({ max: 50 }).withMessage("Name must be at most 50 characters"),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((err: { param: string; msg: string }) => ({
          field: err.param,
          message: err.msg,
        })),
      });
    }
    next();
  },
];
