import express from "express";
import {
  createTransaction,
  deleteTransaction,
  getSummaryByUserId,
  getTransactionsByUserId,
  updateTransaction,
} from "../controllers/transactionsController.js";

const router = express.Router();

router.get("/:userId", getTransactionsByUserId);
router.post("/", createTransaction);
router.delete("/:id", deleteTransaction);
router.get("/summary/:userId", getSummaryByUserId);
router.put("/:id", updateTransaction);

export default router;
