import express from "express";
import { createGame, getAllGames, handleTournamentResults } from "../controllers/gameController.js";

const router = express.Router();

router.post("/", createGame);
router.get("/", getAllGames);
router.post("/tournament-results", handleTournamentResults)

export default router;
