import express from "express";
import { protectAdmin } from "../middlewares/adminAuthMiddleware";
import {
  getAllUsers,
  toggleUserBlock,
  getAllOperators,
  updateOperatorStatus
} from "../controllers/adminController";

const router = express.Router();

// Protect all routes with admin JWT
router.use(protectAdmin);

// Users
router.get("/users", getAllUsers);
router.put("/users/:id/block", toggleUserBlock);

// Operators
router.get("/operators", getAllOperators);
router.put("/operators/:id/status", updateOperatorStatus);

export default router;
