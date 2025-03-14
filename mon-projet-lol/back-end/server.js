import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connecté'))
  .catch(err => console.error('Erreur de connexion à MongoDB:', err));

// Modèle Game
const GameSchema = new mongoose.Schema({
  players: [{
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    champion: String,
    kills: Number,
    deaths: Number,
    assists: Number,
    side: String, // Blue ou Red
    won: Boolean,
    lane: { type: String, enum: ['top', 'mid', 'jungle', 'adc', 'support'], required: true }
  }],
  winningTeam: String,
  createdAt: { type: Date, default: Date.now }
});

const Game = mongoose.model('Game', GameSchema);

// Modèle Player
const PlayerSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  gamesPlayed: { type: Number, default: 0 },
  totalKills: { type: Number, default: 0 },
  totalDeaths: { type: Number, default: 0 },
  totalAssists: { type: Number, default: 0 },
  winRate: { type: Number, default: 0 }
});

const Player = mongoose.model('Player', PlayerSchema);

// Ajouter une game
app.post('/games', async (req, res) => {
  try {
    const { players, winningTeam } = req.body;
    
    const updatedPlayers = await Promise.all(players.map(async (p) => {
      let player = await Player.findOne({ name: p.name });
      
      if (!player) {
        player = new Player({ name: p.name, gamesPlayed: 0, totalKills: 0, totalDeaths: 0, totalAssists: 0, winRate: 0 });
      }
      
      player.gamesPlayed += 1;
      player.totalKills += p.kills;
      player.totalDeaths += p.deaths;
      player.totalAssists += p.assists;
      player.winRate = ((player.winRate * (player.gamesPlayed - 1)) + (p.won ? 1 : 0)) / player.gamesPlayed;
      
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
    res.status(500).json({ error: 'Erreur lors de l\'ajout de la game' });
  }
});

// Récupérer toutes les games
app.get('/games', async (req, res) => {
  try {
    const games = await Game.find().populate('players.playerId', 'name');
    res.json(games);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer les stats d'un joueur
app.get('/players/:name', async (req, res) => {
  try {
    const player = await Player.findOne({ name: req.params.name });
    if (!player) return res.status(404).json({ message: 'Joueur non trouvé' });
    res.json(player);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer tous les joueurs
app.get('/players', async (req, res) => {
  try {
    const players = await Player.find();
    res.json(players);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/recalculate-stats', async (req, res) => {
  try {
    // Récupérer toutes les games enregistrées
    const games = await Game.find().populate('players.playerId', 'name');

    // Réinitialiser les stats de tous les joueurs
    await Player.updateMany({}, {
      gamesPlayed: 0,
      totalKills: 0,
      totalDeaths: 0,
      totalAssists: 0,
      winRate: 0,
    });

    // Stocker les nouvelles stats
    const playerStats = {};

    // Parcourir chaque game et recalculer les stats
    games.forEach(game => {
      game.players.forEach(p => {
        // Vérifier si le joueur a bien un `name`
        if (!p.playerId || !p.playerId.name) return;

        const playerName = p.playerId.name;

        if (!playerStats[playerName]) {
          playerStats[playerName] = {
            gamesPlayed: 0,
            totalKills: 0,
            totalDeaths: 0,
            totalAssists: 0,
            wins: 0,
          };
        }

        // Mettre à jour les statistiques du joueur
        playerStats[playerName].gamesPlayed += 1;
        playerStats[playerName].totalKills += p.kills;
        playerStats[playerName].totalDeaths += p.deaths;
        playerStats[playerName].totalAssists += p.assists;
        if (p.won) playerStats[playerName].wins += 1;
      });
    });

    // Mettre à jour la base de données pour chaque joueur
    for (const [name, stats] of Object.entries(playerStats)) {
      await Player.updateOne(
        { name },
        {
          gamesPlayed: stats.gamesPlayed,
          totalKills: stats.totalKills,
          totalDeaths: stats.totalDeaths,
          totalAssists: stats.totalAssists,
          winRate: stats.gamesPlayed ? stats.wins / stats.gamesPlayed : 0,
        }
      );
    }

    res.json({ message: "Statistiques des joueurs recalculées avec succès." });
  } catch (error) {
    console.error("Erreur lors du recalcul des stats :", error);
    res.status(500).json({ error: "Erreur lors du recalcul des statistiques." });
  }
});


app.post('/players', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Le nom du joueur est requis." });
    }

    // Vérifier si le joueur existe déjà
    let player = await Player.findOne({ name });

    if (!player) {
      player = new Player({
        name,
        gamesPlayed: 0,
        totalKills: 0,
        totalDeaths: 0,
        totalAssists: 0,
        winRate: 0,
      });
      await player.save();
    }

    res.status(201).json({ message: "Joueur ajouté avec succès", player });
  } catch (error) {
    console.error("Erreur lors de l'ajout du joueur:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get('/players/:name/stats', async (req, res) => {
  try {
    const player = await Player.findOne({ name: req.params.name });
    if (!player) return res.status(404).json({ message: 'Joueur non trouvé' });

    // Récupérer toutes les games où ce joueur a joué
    const games = await Game.find({ "players.playerId": player._id });

    const statsByLane = {};
    const statsByChampion = {};

    games.forEach(game => {
      game.players.forEach(p => {
        if (p.playerId.toString() !== player._id.toString()) return;

        // Statistiques par Lane
        if (!statsByLane[p.lane]) {
          statsByLane[p.lane] = { gamesPlayed: 0, kills: 0, deaths: 0, assists: 0, wins: 0 };
        }
        statsByLane[p.lane].gamesPlayed += 1;
        statsByLane[p.lane].kills += p.kills;
        statsByLane[p.lane].deaths += p.deaths;
        statsByLane[p.lane].assists += p.assists;
        if (p.won) statsByLane[p.lane].wins += 1;

        // Statistiques par Champion
        if (!statsByChampion[p.champion]) {
          statsByChampion[p.champion] = { gamesPlayed: 0, kills: 0, deaths: 0, assists: 0, wins: 0 };
        }
        statsByChampion[p.champion].gamesPlayed += 1;
        statsByChampion[p.champion].kills += p.kills;
        statsByChampion[p.champion].deaths += p.deaths;
        statsByChampion[p.champion].assists += p.assists;
        if (p.won) statsByChampion[p.champion].wins += 1;
      });
    });

    res.json({
      name: player.name,
      gamesPlayed: player.gamesPlayed,
      winRate: player.winRate,
      totalKills: player.totalKills,
      totalDeaths: player.totalDeaths,
      totalAssists: player.totalAssists,
      statsByLane,
      statsByChampion
    });

  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques du joueur :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});


// Lancer le serveur
app.listen(PORT, () => console.log(`Serveur démarré sur http://localhost:${PORT}`));
