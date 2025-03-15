import express from "express";
import { getAllPlayers, createPlayer, recalculateStats, getPlayerStats } from "../controllers/playerController.js";

const router = express.Router();

router.get("/", getAllPlayers);
router.post("/", createPlayer);
router.get("/:name/stats", getPlayerStats);
router.post("/recalculate", recalculateStats); // 🔄 Route pour recalculer les stats

export default router;
