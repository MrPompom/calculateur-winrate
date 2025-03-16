import Player from "../models/Player.js";
import Game from "../models/Game.js";

export const getAllPlayers = async (req, res) => {
  try {
    const players = await Player.find();
    res.status(200).json(players);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la récupération des joueurs" });
  }
};

export const getPlayerStats = async (req, res) => {
    try {
        const playerName = req.params.name;
        console.log(`🔍 Récupération des stats pour le joueur: ${playerName}`);

        const player = await Player.findOne({ name: playerName }).lean(); // Assure une meilleure conversion en JSON

        if (!player) {
            console.warn(`⚠ Joueur ${playerName} introuvable.`);
            return res.status(404).json({ error: "Joueur non trouvé" });
        }

        console.log(`📊 Stats du joueur récupérées :`, player);
        res.json(player);
    } catch (error) {
        console.error("❌ Erreur lors de la récupération des stats du joueur :", error);
        res.status(500).json({ error: "Erreur serveur" });
    }
};


export const createPlayer = async (req, res) => {
  try {
    const { name } = req.body;
    const existingPlayer = await Player.findOne({ name });

    if (existingPlayer) {
      return res.status(400).json({ error: "Ce joueur existe déjà." });
    }

    const newPlayer = new Player({ name });
    await newPlayer.save();
    res.status(201).json({ message: "Joueur ajouté avec succès" });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la création du joueur" });
  }
};

const sanitizeKey = (key) => key.replace(/\s+/g, "_").replace(/\./g, "_");

export const recalculateStats = async (req, res) => {
    try {
        console.log("🔄 Début du recalcul des statistiques...");

        const players = await Player.find();
        const games = await Game.find().populate("players.playerId");

        if (!games.length) {
            console.log("⚠ Aucune game trouvée. Impossible de recalculer.");
            return res.status(400).json({ error: "Aucune partie enregistrée." });
        }

        console.log(`📊 Nombre de games trouvées : ${games.length}`);

        const playerStatsMap = new Map();

        // 📌 Initialisation des stats pour chaque joueur
        players.forEach(player => {
            playerStatsMap.set(player._id.toString(), {
                gamesPlayed: 0,
                totalKills: 0,
                totalDeaths: 0,
                totalAssists: 0,
                wins: 0,
                statsByLane: new Map(),
                statsByChampion: new Map()
            });
        });

        // 📌 Parcourir toutes les games pour recalculer les stats
        games.forEach((game, index) => {
            console.log(`🔍 Analyse de la game ${index + 1}/${games.length} - ID: ${game._id}`);

            game.players.forEach(p => {
                const playerId = p.playerId?._id?.toString();
                if (!playerId || !playerStatsMap.has(playerId)) {
                    console.warn(`⚠ Joueur introuvable dans cette game : ${p.playerId?.name}`);
                    return;
                }

                const playerStats = playerStatsMap.get(playerId);

                // 🎯 Mettre à jour les stats globales
                playerStats.gamesPlayed++;
                playerStats.totalKills += p.kills;
                playerStats.totalDeaths += p.deaths;
                playerStats.totalAssists += p.assists;
                if (p.won) playerStats.wins++;

                // 🎯 Mettre à jour les stats par lane
                if (p.lane) {
                    if (!playerStats.statsByLane.has(p.lane)) {
                        playerStats.statsByLane.set(p.lane, {
                            gamesPlayed: 0,
                            kills: 0,
                            deaths: 0,
                            assists: 0,
                            wins: 0
                        });
                    }
                    const laneStats = playerStats.statsByLane.get(p.lane);
                    laneStats.gamesPlayed++;
                    laneStats.kills += p.kills;
                    laneStats.deaths += p.deaths;
                    laneStats.assists += p.assists;
                    if (p.won) laneStats.wins++;
                }

                // 🎯 Mettre à jour les stats par champion
                if (p.champion) {
                    const sanitizedChampion = sanitizeKey(p.champion);
                    if (!playerStats.statsByChampion.has(sanitizedChampion)) {
                        playerStats.statsByChampion.set(sanitizedChampion, {
                            gamesPlayed: 0,
                            kills: 0,
                            deaths: 0,
                            assists: 0,
                            wins: 0
                        });
                    }
                    const champStats = playerStats.statsByChampion.get(sanitizedChampion);
                    champStats.gamesPlayed++;
                    champStats.kills += p.kills;
                    champStats.deaths += p.deaths;
                    champStats.assists += p.assists;
                    if (p.won) champStats.wins++;
                }
            });
        });

        // 📌 Mettre à jour chaque joueur en base de données
        for (const [playerId, stats] of playerStatsMap.entries()) {
            console.log(`📡 Mise à jour des stats du joueur ${playerId}`);

            await Player.findByIdAndUpdate(playerId, {
                gamesPlayed: stats.gamesPlayed,
                totalKills: stats.totalKills,
                totalDeaths: stats.totalDeaths,
                totalAssists: stats.totalAssists,
                winRate: stats.gamesPlayed > 0 ? stats.wins / stats.gamesPlayed : 0,
                statsByLane: Object.fromEntries([...stats.statsByLane].map(([lane, data]) => [
                    lane,
                    {
                        ...data,
                        winRate: data.gamesPlayed > 0 ? data.wins / data.gamesPlayed : 0
                    }
                ])),
                statsByChampion: Object.fromEntries([...stats.statsByChampion].map(([champ, data]) => [
                    champ,
                    {
                        ...data,
                        winRate: data.gamesPlayed > 0 ? data.wins / data.gamesPlayed : 0
                    }
                ]))
            });
        }

        console.log("✅ Recalcul des stats terminé !");
        return res.status(200).json({ message: "Statistiques recalculées avec succès." });
    } catch (error) {
        console.error("❌ Erreur lors du recalcul des statistiques :", error);
        return res.status(500).json({ error: "Erreur serveur lors du recalcul des stats." });
    }
};




