import { Request, Response } from "express";
import jwt from "jsonwebtoken";

export const adminLogin = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (
    email === process.env.ADMIN_EMAIL &&
    password === process.env.ADMIN_PASSWORD
  ) {
    // Generate token
    const token = jwt.sign(
      { role: "admin", email },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" }
    );

    return res.json({ success: true, token });
  }

  res.status(401).json({ success: false, message: "Invalid credentials" });
};
