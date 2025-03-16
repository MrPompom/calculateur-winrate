import express from "express";
import { 
    getAllPlayers, 
    getPlayerStats, 
    createPlayer, 
    recalculateStats,
    updatePlayer,          // Nouvelle route
    syncPlayerWithRiot     // Nouvelle route
  } from '../controllers/playerController.js';

const router = express.Router();

router.get("/", getAllPlayers);
router.post("/", createPlayer);
router.get("/:name/stats", getPlayerStats);
router.post("/recalculate", recalculateStats); // 🔄 Route pour recalculer les stats

// Nouvelles routes
router.put('/:id', updatePlayer);
router.post('/:id/sync-riot', syncPlayerWithRiot);

export default router;
