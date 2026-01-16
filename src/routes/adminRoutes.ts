import express from "express";
import { protectAdmin } from "../middlewares/adminAuthMiddleware";
import {
  getAllUsers,
  toggleUserBlock,
  getAllOperators,
  updateOperatorStatus,getAllTours,updateTourApproval,toggleTourActive,toggleTourFeatured
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

// Tours
router.get("/tours", getAllTours);
router.put("/tours/:id/approval", updateTourApproval);
router.put("/tours/:id/active", toggleTourActive);
router.put("/tours/:id/feature", toggleTourFeatured);


export default router;
