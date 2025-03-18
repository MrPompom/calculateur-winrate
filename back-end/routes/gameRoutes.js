import express from "express";
import { createGame, getAllGames, handleTournamentResults, createTournamentProvider, createTournament, generateTournamentCode, getTournamentTestGames } from "../controllers/gameController.js";

const router = express.Router();

router.post("/", createGame);
router.get("/", getAllGames);
router.post('/tournament/provider', createTournamentProvider);
router.post('/tournament/create', createTournament);
router.post('/tournament/code', generateTournamentCode);
router.get('/tournament/games', getTournamentTestGames);

// Route webhook pour les résultats de tournoi
router.post('/riot/tournament-results', handleTournamentResults);

export default router;
