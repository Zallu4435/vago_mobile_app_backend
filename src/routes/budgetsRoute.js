import express from "express";
import { getBudget, upsertBudget } from "../controllers/budgetsController.js";

const router = express.Router();

router.get("/:userId/:month", getBudget);
router.put("/:userId", upsertBudget);

export default router;


