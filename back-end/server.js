import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

app.use(cors({
  origin: ['https://calculateur-winrate.vercel.app'], // Autoriser uniquement ton frontend
  methods: 'GET,POST,PUT,DELETE',
  allowedHeaders: 'Content-Type,Authorization'
}));


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
  winRate: { type: Number, default: 0 },
  statsByLane: {
    top: { gamesPlayed: { type: Number, default: 0 }, winRate: { type: Number, default: 0 } },
    jungle: { gamesPlayed: { type: Number, default: 0 }, winRate: { type: Number, default: 0 } },
    mid: { gamesPlayed: { type: Number, default: 0 }, winRate: { type: Number, default: 0 } },
    adc: { gamesPlayed: { type: Number, default: 0 }, winRate: { type: Number, default: 0 } },
    support: { gamesPlayed: { type: Number, default: 0 }, winRate: { type: Number, default: 0 } }
  }
});

const Player = mongoose.model('Player', PlayerSchema);

// Ajouter une game
app.post('/games', async (req, res) => {
  try {
    const { players, winningTeam } = req.body;
    
    const updatedPlayers = await Promise.all(players.map(async (p) => {
      let player = await Player.findOne({ name: p.name });

      if (!player) {
        player = new Player({ 
          name: p.name, 
          gamesPlayed: 0, 
          totalKills: 0, 
          totalDeaths: 0, 
          totalAssists: 0, 
          winRate: 0,
          statsByLane: {
            top: { gamesPlayed: 0, winRate: 0 },
            jungle: { gamesPlayed: 0, winRate: 0 },
            mid: { gamesPlayed: 0, winRate: 0 },
            adc: { gamesPlayed: 0, winRate: 0 },
            support: { gamesPlayed: 0, winRate: 0 }
          }
        });
      }

      // Mise à jour des stats générales
      player.gamesPlayed += 1;
      player.totalKills += p.kills;
      player.totalDeaths += p.deaths;
      player.totalAssists += p.assists;
      player.winRate = ((player.winRate * (player.gamesPlayed - 1)) + (p.won ? 1 : 0)) / player.gamesPlayed;

      // Mise à jour des stats par lane
      if (p.lane && player.statsByLane[p.lane]) {
        let laneStats = player.statsByLane[p.lane];

        laneStats.gamesPlayed += 1;
        laneStats.winRate = ((laneStats.winRate * (laneStats.gamesPlayed - 1)) + (p.won ? 1 : 0)) / laneStats.gamesPlayed;
      }

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

    // Enregistrement de la game
    const newGame = new Game({ players: updatedPlayers, winningTeam });
    await newGame.save();
    
    res.status(201).json({ message: 'Game enregistrée avec succès', gameId: newGame._id });
  } catch (error) {
    console.error("Erreur lors de l'ajout de la game :", error);
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
        const players = await Player.find();

        for (const player of players) {
            // Récupérer toutes les games où ce joueur a participé
            const games = await Game.find({ "players.playerId": player._id });

            let statsByLane = {};

            games.forEach(game => {
                const playerGame = game.players.find(p => p.playerId.equals(player._id));

                if (!playerGame) return;

                const lane = playerGame.lane;
                if (!statsByLane[lane]) {
                    statsByLane[lane] = { gamesPlayed: 0, wins: 0 };
                }

                statsByLane[lane].gamesPlayed += 1;
                if (playerGame.won) statsByLane[lane].wins += 1;
            });

            // Calculer le winrate par lane
            Object.keys(statsByLane).forEach(lane => {
                statsByLane[lane].winRate = statsByLane[lane].gamesPlayed > 0
                    ? statsByLane[lane].wins / statsByLane[lane].gamesPlayed
                    : 0;
            });

            // Mettre à jour le joueur
            await Player.updateOne({ _id: player._id }, { statsByLane });
        }

        res.json({ message: "Stats mises à jour !" });
    } catch (error) {
        console.error("Erreur lors du recalcul des stats :", error);
        res.status(500).json({ message: "Erreur serveur." });
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

const lanes = ['top', 'jungle', 'mid', 'adc', 'support'];

// Fonction pour récupérer les joueurs depuis MongoDB
const fetchPlayersWithStats = async (playerIds) => {
    try {
        const players = await Player.find({ _id: { $in: playerIds } });

        return players.map(player => ({
            id: player._id.toString(), // Convertit en string pour éviter les problèmes de comparaison
            name: player.name,
            winRate: player.gamesPlayed > 0 ? player.winRate : 0,
            statsByLane: player.statsByLane || {}
        }));
    } catch (error) {
        console.error("Erreur lors de la récupération des joueurs:", error);
        return [];
    }
};

// Fonction pour créer des équipes équilibrées
const createTeams = (players, assignLanes, balanceTeams) => {
  if (players.length !== 10) {
      throw new Error("Il doit y avoir exactement 10 joueurs.");
  }

  let blueTeam = [];
  let redTeam = [];
  let assignedPlayers = new Set(); // ✅ Pour éviter qu'un joueur soit assigné plusieurs fois

  if (balanceTeams && assignLanes) {
      console.log("Mode équilibré avec assignation des lanes");

      // Trier les joueurs du plus fort au plus faible selon leur winrate global
      players.sort((a, b) => b.winRate - a.winRate);

      let blueTotalWinRate = 0;
      let redTotalWinRate = 0;

      // Initialiser les pools de joueurs par rôle
      let lanesPool = {
          top: [],
          jungle: [],
          mid: [],
          adc: [],
          support: []
      };

      // Remplir les pools avec les joueurs ayant joué ces lanes
      players.forEach(player => {
          Object.entries(player.statsByLane).forEach(([lane, stats]) => {
              if (stats.gamesPlayed > 0) {
                  lanesPool[lane].push(player);
              }
          });
      });

      // Trier chaque pool par winrate sur la lane spécifique
      Object.keys(lanesPool).forEach(lane => {
          lanesPool[lane].sort((a, b) => b.statsByLane[lane].winRate - a.statsByLane[lane].winRate);
      });

      // Assigner les joueurs aux lanes et équilibrer les équipes
      Object.keys(lanesPool).forEach(lane => {
          if (lanesPool[lane].length >= 2) {
              // Prendre les 2 meilleurs joueurs pour cette lane et les répartir
              let bestPlayers = lanesPool[lane].filter(p => !assignedPlayers.has(p.id)).slice(0, 2);
              
              if (bestPlayers.length === 2) {
                  if (blueTotalWinRate <= redTotalWinRate) {
                      blueTeam.push({ ...bestPlayers[0], lane });
                      redTeam.push({ ...bestPlayers[1], lane });
                      blueTotalWinRate += bestPlayers[0].statsByLane[lane].winRate;
                      redTotalWinRate += bestPlayers[1].statsByLane[lane].winRate;
                  } else {
                      redTeam.push({ ...bestPlayers[0], lane });
                      blueTeam.push({ ...bestPlayers[1], lane });
                      redTotalWinRate += bestPlayers[0].statsByLane[lane].winRate;
                      blueTotalWinRate += bestPlayers[1].statsByLane[lane].winRate;
                  }

                  assignedPlayers.add(bestPlayers[0].id);
                  assignedPlayers.add(bestPlayers[1].id);
              }
          }
      });

      // ✅ Vérifier les rôles manquants et assigner les joueurs restants
      const remainingPlayers = players.filter(p => !assignedPlayers.has(p.id));
      Object.keys(lanesPool).forEach(lane => {
          if (blueTeam.filter(p => p.lane === lane).length === 0 && remainingPlayers.length > 0) {
              let fallbackPlayer = remainingPlayers.pop();
              blueTeam.push({ ...fallbackPlayer, lane });
              assignedPlayers.add(fallbackPlayer.id);
          }
          if (redTeam.filter(p => p.lane === lane).length === 0 && remainingPlayers.length > 0) {
              let fallbackPlayer = remainingPlayers.pop();
              redTeam.push({ ...fallbackPlayer, lane });
              assignedPlayers.add(fallbackPlayer.id);
          }
      });

      console.log("Équipes équilibrées avec lanes attribuées :", { blueTotalWinRate, redTotalWinRate });

  } else if (balanceTeams) {
      console.log("Mode équilibré sans assignation de lanes");

      players.sort((a, b) => b.winRate - a.winRate);

      let blueTotalWinRate = 0;
      let redTotalWinRate = 0;

      for (const player of players) {
          if (!assignedPlayers.has(player.id)) {
              if (blueTotalWinRate <= redTotalWinRate) {
                  blueTeam.push(player);
                  blueTotalWinRate += player.winRate;
              } else {
                  redTeam.push(player);
                  redTotalWinRate += player.winRate;
              }
              assignedPlayers.add(player.id);
          }
      }

  } else {
      console.log("Mode totalement aléatoire");
      players = players.sort(() => Math.random() - 0.5);
      blueTeam = players.slice(0, 5);
      redTeam = players.slice(5, 10);
  }

  return { blueTeam, redTeam };
};



// Fonction pour récupérer la lane avec le meilleur winrate d’un joueur
const getBestLane = (player) => {
    if (!player.statsByLane || Object.keys(player.statsByLane).length === 0) return 'fill';
    return Object.keys(player.statsByLane).reduce((best, lane) =>
        player.statsByLane[lane]?.winRate > (player.statsByLane[best]?.winRate || 0) ? lane : best, 'fill');
};

// Fonction pour récupérer le meilleur winrate par lane
const getBestLaneWinRate = (player) => {
    if (!player.statsByLane || Object.keys(player.statsByLane).length === 0) return 0;
    return Math.max(...Object.values(player.statsByLane).map(lane => lane.winRate || 0));
};

// Route API pour créer des équipes
app.post('/create-teams', async (req, res) => {
    try {
        const { players, assignLanes, balanceTeams } = req.body;
        const playerIds = players.map(player => player._id);

        // Récupération des statistiques des joueurs depuis MongoDB
        const playersWithStats = await fetchPlayersWithStats(playerIds);

        if (playersWithStats.length !== 10) {
            return res.status(404).json({ message: "Certains joueurs n'ont pas été trouvés en base." });
        }

        const teams = createTeams(playersWithStats, assignLanes, balanceTeams);
        res.json(teams);
    } catch (error) {
        console.error("Erreur lors de la création des équipes :", error);
        res.status(500).json({ message: "Erreur serveur." });
    }
});


// Lancer le serveur
app.listen(PORT, () => console.log(`Serveur démarré sur http://localhost:${PORT}`));
