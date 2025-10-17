import express from "express";
import { listRecurring, createRecurring, updateRecurring, deleteRecurring, materializeCurrentMonth } from "../controllers/recurringController.js";

const router = express.Router();

router.get("/:userId", listRecurring);
router.post("/:userId", createRecurring);
router.put("/:id", updateRecurring);
router.delete("/:id", deleteRecurring);
router.post("/materialize/:userId", materializeCurrentMonth);

export default router;


