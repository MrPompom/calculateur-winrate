import Player from '../models/Player.js';

// 🔹 Fonction pour équilibrer les équipes sans assignation des lanes
export const balanceTeams = async (req, res) => {
  try {
    const { players } = req.body;

    const playerData = await Player.find({ _id: { $in: players.map(p => p._id) } });

    if (playerData.length !== 10) {
      return res.status(400).json({ error: "Certains joueurs n'ont pas été trouvés." });
    }

    playerData.sort((a, b) => b.winRate - a.winRate);

    let blueTeam = [];
    let redTeam = [];
    let blueTotalWinRate = 0;
    let redTotalWinRate = 0;

    for (const player of playerData) {
      if (blueTotalWinRate <= redTotalWinRate) {
        blueTeam.push(player.toObject());
        blueTotalWinRate += player.winRate;
      } else {
        redTeam.push(player.toObject());
        redTotalWinRate += player.winRate;
      }
    }
    console.log("Équipes équilibrées avec lanes attribuées :", { blueTotalWinRate, redTotalWinRate });
    res.status(200).json({ blueTeam, redTeam });
  } catch (error) {
    console.error("Erreur lors de la création des équipes équilibrées :", error);
    res.status(500).json({ error: "Erreur interne lors de la création des équipes équilibrées." });
  }
};

// 🔹 Fonction pour équilibrer les équipes AVEC assignation des lanes
export const balanceTeamsWithLanes = async (req, res) => {
    try {
        const { players } = req.body;
        console.log("Joueurs reçus :", players);

        if (!Array.isArray(players) || players.length !== 10) {
            return res.status(400).json({ 
                error: `Il doit y avoir exactement 10 joueurs. Reçu : ${players.length}` 
            });
        }

        console.log("Début de la création des équipes équilibrées avec assignation des lanes.");

        let blueTeam = [];
        let redTeam = [];
        let assignedPlayers = new Set();

        // Initialiser les pools de joueurs par rôle
        let lanesPool = { top: [], jungle: [], mid: [], adc: [], support: [] };

        // Remplir les pools avec les joueurs ayant joué sur ces lanes
        players.forEach(player => {
            Object.entries(player.statsByLane || {}).forEach(([lane, stats]) => {
                if (stats.gamesPlayed > 0) {
                    lanesPool[lane].push(player);
                }
            });
        });

        // Trier chaque pool par winrate sur la lane spécifique
        Object.keys(lanesPool).forEach(lane => {
            lanesPool[lane].sort((a, b) => (b.statsByLane?.[lane]?.winRate || 0) - (a.statsByLane?.[lane]?.winRate || 0));
        });

        let blueTotalWinRate = 0;
        let redTotalWinRate = 0;

        // Assigner les meilleurs joueurs de chaque lane en priorité
        Object.keys(lanesPool).forEach(lane => {
            let bestPlayers = lanesPool[lane].filter(p => !assignedPlayers.has(p._id));

            if (bestPlayers.length >= 2) {
                let [p1, p2] = bestPlayers.slice(0, 2);
                if (blueTotalWinRate <= redTotalWinRate) {
                    blueTeam.push({ ...p1, lane });
                    redTeam.push({ ...p2, lane });
                    blueTotalWinRate += p1.statsByLane[lane].winRate;
                    redTotalWinRate += p2.statsByLane[lane].winRate;
                } else {
                    redTeam.push({ ...p1, lane });
                    blueTeam.push({ ...p2, lane });
                    redTotalWinRate += p1.statsByLane[lane].winRate;
                    blueTotalWinRate += p2.statsByLane[lane].winRate;
                }
                assignedPlayers.add(p1._id);
                assignedPlayers.add(p2._id);
            }
        });

        console.log(`Après première attribution - Blue: ${blueTeam.length}, Red: ${redTeam.length}`);

        // Vérifier si certains rôles sont encore vides et assigner des joueurs restants
        let remainingPlayers = players.filter(p => !assignedPlayers.has(p._id));

        Object.keys(lanesPool).forEach(lane => {
            if (blueTeam.filter(p => p.lane === lane).length === 0 && remainingPlayers.length > 0) {
                let fallbackPlayer = remainingPlayers.pop();
                blueTeam.push({ ...fallbackPlayer, lane });
                assignedPlayers.add(fallbackPlayer._id);
            }
            if (redTeam.filter(p => p.lane === lane).length === 0 && remainingPlayers.length > 0) {
                let fallbackPlayer = remainingPlayers.pop();
                redTeam.push({ ...fallbackPlayer, lane });
                assignedPlayers.add(fallbackPlayer._id);
            }
        });

        console.log(`Après ajout des rôles manquants - Blue: ${blueTeam.length}, Red: ${redTeam.length}`);

        // S'il reste encore des joueurs non assignés, les répartir en tant que "fill"
        while (remainingPlayers.length > 0) {
            let player = remainingPlayers.pop();
            if (blueTeam.length < 5) {
                blueTeam.push({ ...player, lane: "fill" });
            } else if (redTeam.length < 5) {
                redTeam.push({ ...player, lane: "fill" });
            }
        }

        console.log("Équipes équilibrées avec lanes attribuées :", { blueTotalWinRate, redTotalWinRate });

        return res.json({ blueTeam, redTeam });

    } catch (error) {
        console.error("Erreur lors de la création des équipes équilibrées avec lanes :", error);
        return res.status(500).json({ error: "Erreur serveur lors de la création des équipes" });
    }
};




