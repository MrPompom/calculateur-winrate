import express from "express";
import {
  getAllTournamentConfigs,
  getActiveTournamentConfig,
  createTournamentConfig,
  setActiveTournamentConfig,
  generateTournamentCodeWithConfig,
  deleteTournamentConfig
} from "../controllers/tournamentController.js";

const router = express.Router();

// Routes pour les configurations de tournoi
router.get("/", getAllTournamentConfigs);
router.get("/active", getActiveTournamentConfig);
router.post("/", createTournamentConfig);
router.put("/:configId/activate", setActiveTournamentConfig);
router.post("/code", generateTournamentCodeWithConfig);
router.delete("/:configId", deleteTournamentConfig);

export default router;