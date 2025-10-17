import express from "express";
import { getProfile, upsertProfile } from "../controllers/profileController.js";

const router = express.Router();

router.get("/:userId", getProfile);
router.put("/:userId", upsertProfile);

export default router;


