import Game from "../models/Game.js";
import Player from "../models/Player.js";

export const createGame = async (req, res) => {
  try {
    const { players, winningTeam } = req.body;

    const updatedPlayers = await Promise.all(players.map(async (p) => {
      let player = await Player.findOne({ name: p.name });

      if (!player) {
        player = new Player({ name: p.name, gamesPlayed: 0, totalKills: 0, totalDeaths: 0, totalAssists: 0, winRate: 0, statsByLane: {} });
      }

      player.gamesPlayed += 1;
      player.totalKills += p.kills;
      player.totalDeaths += p.deaths;
      player.totalAssists += p.assists;
      player.winRate = ((player.winRate * (player.gamesPlayed - 1)) + (p.won ? 1 : 0)) / player.gamesPlayed;

      if (!player.statsByLane[p.lane]) {
        player.statsByLane[p.lane] = { gamesPlayed: 0, winRate: 0 };
      }

      player.statsByLane[p.lane].gamesPlayed += 1;
      player.statsByLane[p.lane].winRate = ((player.statsByLane[p.lane].winRate * (player.statsByLane[p.lane].gamesPlayed - 1)) + (p.won ? 1 : 0)) / player.statsByLane[p.lane].gamesPlayed;

      await player.save();
      return {
        playerId: player._id,
        champion: p.champion,
        kills: p.kills,
        deaths: p.deaths,
        assists: p.assists,
        side: p.side,
        lane: p.lane,
        won: p.won
      };
    }));

    const newGame = new Game({ players: updatedPlayers, winningTeam });
    await newGame.save();

    res.status(201).json({ message: 'Game enregistrée avec succès', gameId: newGame._id });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de l'ajout de la game" });
  }
};

export const getAllGames = async (req, res) => {
  try {
    const games = await Game.find().populate("players.playerId");
    res.status(200).json(games);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la récupération des games" });
  }
};
