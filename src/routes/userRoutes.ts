import express from "express";
import { protect, roleAccess } from "../middlewares/authMiddleware";

const router = express.Router();

 //Any logged-in user
 

router.get("/profile", protect, (req, res) => {
  res.json({
    message: "User profile accessed successfully"
  });
});


 // Operator only
 
router.get(
  "/operator",
  protect,
  roleAccess("operator"),
  (req, res) => {
    res.json({
      message: "Operator route accessed successfully"
    });
  }
);

export default router;
