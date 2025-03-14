import express from 'express';
import { Game } from '../models/Game.js';
import { Player } from '../models/Player.js';

const router = express.Router();

router.post('/games', async (req, res) => {
  try {
    const { players, winningTeam } = req.body;
    
    // Vérifier et associer chaque joueur existant
    const updatedPlayers = await Promise.all(players.map(async (p) => {
      let player = await Player.findOne({ name: p.name });

      if (!player) {
        player = new Player({ name: p.name, games: [] });
        await player.save();
      }

      return {
        playerId: player._id,
        champion: p.champion,
        kills: p.kills,
        deaths: p.deaths,
        assists: p.assists,
        side: p.side,
        won: p.won
      };
    }));

    // Créer la game
    const newGame = new Game({
      players: updatedPlayers,
      winningTeam
    });

    await newGame.save();

    // Ajouter la game à chaque joueur
    for (const p of updatedPlayers) {
      await Player.findByIdAndUpdate(p.playerId, { $push: { games: newGame._id } });
    }

    res.status(201).json({ message: 'Game enregistrée avec succès', gameId: newGame._id });

  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de l\'ajout de la game' });
  }
});

export default router;
