import express from "express";
import { createGame, getAllGames } from "../controllers/gameController.js";

const router = express.Router();

router.post("/", createGame);
router.get("/", getAllGames);

export default router;
