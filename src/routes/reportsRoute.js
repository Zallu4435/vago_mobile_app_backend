import express from "express";
import { getCategoryReport, getMonthlyReport, exportCsv } from "../controllers/reportsController.js";

const router = express.Router();

router.get("/category/:userId", getCategoryReport);
router.get("/monthly/:userId", getMonthlyReport);
router.get("/export/:userId", exportCsv);

export default router;


