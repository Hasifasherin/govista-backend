import { Request } from "express";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
  admin?: {
    id: string;
    role: string;
  };
}
