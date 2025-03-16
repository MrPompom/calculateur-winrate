import Player from '../models/Player.js';

// 🔹 Fonction pour équilibrer les équipes sans assignation des lanes
export const balanceTeams = async (req, res) => {
    try {
      const { players } = req.body;
      const DEBUG = process.env.DEBUG_TEAM_BALANCE === 'true';
  
      // Validation de l'entrée
      if (!Array.isArray(players)) {
        return res.status(400).json({ error: "Format de données invalide. Un tableau de joueurs est attendu." });
      }
  
      if (players.length !== 10) {
        return res.status(400).json({ 
          error: `Il doit y avoir exactement 10 joueurs. Reçu : ${players.length}` 
        });
      }
  
      // Récupérer les joueurs en base de données avec uniquement _id, name et winRate
      const playerData = await Player.find(
        { _id: { $in: players.map(p => p.id) } }, 
        "_id name winRate"
      );
  
      if (playerData.length !== 10) {
        return res.status(400).json({ 
          error: `Certains joueurs n'ont pas été trouvés. Attendu : 10, Trouvé : ${playerData.length}` 
        });
      }
  
      if (DEBUG) console.log("Création d'équipes équilibrées pour 10 joueurs...");
  
      // Méthode 1: Algorithme amélioré de distribution par paires
      // Cette méthode donne généralement un meilleur équilibre que la méthode greedy
      const balancedTeams = createBalancedTeamsByPairs(playerData);
      
      // Méthode 2: Algorithme greedy (commenté, mais disponible comme alternative)
      // const balancedTeams = createBalancedTeamsGreedy(playerData);
  
      // Calcul des métriques de l'équilibrage
      const metrics = calculateTeamMetrics(balancedTeams.blueTeam, balancedTeams.redTeam);
  
      if (DEBUG) {
        console.log("Équipes équilibrées :");
        console.log(`Équipe bleue (${metrics.blueTotalWinRate.toFixed(2)}): ${balancedTeams.blueTeam.map(p => p.name).join(', ')}`);
        console.log(`Équipe rouge (${metrics.redTotalWinRate.toFixed(2)}): ${balancedTeams.redTeam.map(p => p.name).join(', ')}`);
        console.log(`Différence de winRate: ${metrics.winRateDifference.toFixed(2)}`);
      }
  
      // Retourner les équipes et les métriques
      res.status(200).json({ 
        blueTeam: balancedTeams.blueTeam, 
        redTeam: balancedTeams.redTeam,
        metrics: metrics
      });
    } catch (error) {
      console.error("Erreur lors de la création des équipes équilibrées :", error);
      res.status(500).json({ error: "Erreur interne lors de la création des équipes équilibrées." });
    }
  };
  
  /**
   * Crée des équipes équilibrées en utilisant une approche par paires
   * Cette approche groupe les joueurs par paires (meilleur + moins bon) et distribue ces paires
   * @param {Array} players - Tableau de joueurs avec _id, name et winRate
   * @returns {Object} Équipes bleue et rouge
   */
  function createBalancedTeamsByPairs(players) {
    // Trier les joueurs du plus fort au plus faible
    const sortedPlayers = [...players].sort((a, b) => b.winRate - a.winRate);
    
    // Créer des paires de joueurs (meilleur + moins bon)
    const pairs = [];
    const n = sortedPlayers.length;
    
    for (let i = 0; i < n / 2; i++) {
      pairs.push([
        { id: sortedPlayers[i]._id, name: sortedPlayers[i].name, winRate: sortedPlayers[i].winRate },
        { id: sortedPlayers[n - 1 - i]._id, name: sortedPlayers[n - 1 - i].name, winRate: sortedPlayers[n - 1 - i].winRate }
      ]);
    }
    
    // Distribuer les paires entre les équipes
    let blueTeam = [];
    let redTeam = [];
    let blueTotalWinRate = 0;
    let redTotalWinRate = 0;
    
    for (const [p1, p2] of pairs) {
      // Calculer quelle distribution donne le meilleur équilibre
      const blueWithP1 = blueTotalWinRate + p1.winRate;
      const redWithP2 = redTotalWinRate + p2.winRate;
      const diff1 = Math.abs(blueWithP1 - redWithP2);
      
      const blueWithP2 = blueTotalWinRate + p2.winRate;
      const redWithP1 = redTotalWinRate + p1.winRate;
      const diff2 = Math.abs(blueWithP2 - redWithP1);
      
      if (diff1 <= diff2) {
        blueTeam.push(p1);
        redTeam.push(p2);
        blueTotalWinRate += p1.winRate;
        redTotalWinRate += p2.winRate;
      } else {
        blueTeam.push(p2);
        redTeam.push(p1);
        blueTotalWinRate += p2.winRate;
        redTotalWinRate += p1.winRate;
      }
    }
    
    return { blueTeam, redTeam };
  }
  
  /**
   * Crée des équipes équilibrées en utilisant un algorithme greedy simple
   * @param {Array} players - Tableau de joueurs avec _id, name et winRate
   * @returns {Object} Équipes bleue et rouge
   */
  function createBalancedTeamsGreedy(players) {
    // Trier les joueurs du plus fort au plus faible
    const sortedPlayers = [...players].sort((a, b) => b.winRate - a.winRate);
    
    let blueTeam = [];
    let redTeam = [];
    let blueTotalWinRate = 0;
    let redTotalWinRate = 0;
    
    // Distribution alternée des joueurs pour un meilleur équilibre
    for (let i = 0; i < sortedPlayers.length; i++) {
      const player = {
        id: sortedPlayers[i]._id,
        name: sortedPlayers[i].name,
        winRate: sortedPlayers[i].winRate
      };
      
      if (blueTotalWinRate <= redTotalWinRate) {
        blueTeam.push(player);
        blueTotalWinRate += player.winRate;
      } else {
        redTeam.push(player);
        redTotalWinRate += player.winRate;
      }
    }
    
    return { blueTeam, redTeam };
  }
  
  /**
   * Calcule les métriques d'équilibrage des équipes
   * @param {Array} blueTeam - Équipe bleue
   * @param {Array} redTeam - Équipe rouge
   * @returns {Object} Métriques d'équilibrage
   */
  function calculateTeamMetrics(blueTeam, redTeam) {
    const blueTotalWinRate = blueTeam.reduce((sum, player) => sum + player.winRate, 0);
    const redTotalWinRate = redTeam.reduce((sum, player) => sum + player.winRate, 0);
    
    const blueAverageWinRate = blueTotalWinRate / blueTeam.length;
    const redAverageWinRate = redTotalWinRate / redTeam.length;
    
    const winRateDifference = Math.abs(blueTotalWinRate - redTotalWinRate);
    const averageWinRateDifference = Math.abs(blueAverageWinRate - redAverageWinRate);
    
    // Calculer l'écart-type pour voir l'homogénéité des équipes
    const blueStdDev = calculateStandardDeviation(blueTeam.map(p => p.winRate));
    const redStdDev = calculateStandardDeviation(redTeam.map(p => p.winRate));
    
    return {
      blueTotalWinRate,
      redTotalWinRate,
      blueAverageWinRate,
      redAverageWinRate,
      winRateDifference,
      averageWinRateDifference,
      blueStdDev,
      redStdDev,
      balanceQuality: 100 - (winRateDifference * 100) // Score de qualité de l'équilibrage (100 = parfait)
    };
  }
  
  /**
   * Calcule l'écart-type d'un ensemble de valeurs
   * @param {Array} values - Tableau de valeurs numériques
   * @returns {Number} Écart-type
   */
  function calculateStandardDeviation(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(variance);
  }
  

// 🔹 Fonction pour équilibrer les équipes AVEC assignation des lanes
export const balanceTeamsWithLanes = async (req, res) => {
    try {
        const { players } = req.body;
        const DEBUG = process.env.DEBUG_TEAM_BALANCE === 'true'; // Activation des logs via variable d'environnement

        if (!Array.isArray(players) || players.length !== 10) {
            return res.status(400).json({ 
                error: `Il doit y avoir exactement 10 joueurs. Reçu : ${players.length}` 
            });
        }

        if (DEBUG) console.log("Début de la création des équipes équilibrées avec assignation des lanes.");

        let blueTeam = [];
        let redTeam = [];
        let assignedPlayers = new Set();

        const lanes = ['top', 'jungle', 'mid', 'adc', 'support'];

        // Récupération des joueurs depuis la base de données avec leurs stats complètes
        const playerData = await Player.find(
            { _id: { $in: players.map(p => p.id) } }, 
            "_id name winRate statsByLane"
        );

        if (playerData.length !== players.length) {
            return res.status(400).json({
                error: `Certains joueurs n'ont pas été trouvés dans la base de données.`
            });
        }

        // Créer un map des préférences de rôles à partir des données du front-end
        const playerPreferences = {};
        players.forEach(player => {
            playerPreferences[player.id] = {
                primaryRole: player.primaryRole,
                secondaryRole: player.secondaryRole
            };
        });

        // Fonction helper pour accéder aux statistiques de lane
        const getLaneStats = (player, lane) => {
            if (player.statsByLane instanceof Map) {
                return player.statsByLane.get(lane) || { winRate: 0, gamesPlayed: 0 };
            } else {
                return player.statsByLane?.[lane] || { winRate: 0, gamesPlayed: 0 };
            }
        };

        // Initialisation des pools de joueurs par rôle
        let lanesPool = { top: [], jungle: [], mid: [], adc: [], support: [] };

        // Distribution des joueurs dans les pools de lanes basée sur leurs statistiques
        playerData.forEach(player => {
            // Récupérer les préférences de rôles du front-end
            const preferences = playerPreferences[player._id.toString()] || {};
            
            for (const lane of lanes) {
                const stats = getLaneStats(player, lane);
                if (stats.gamesPlayed > 0) {
                    // Calcul du score de lane basé sur winRate et expérience
                    const laneScore = (((stats.winRate || 0) * 100) * (1 + (stats.gamesPlayed / 20))) + 1;
                    
                    lanesPool[lane].push({
                        id: player._id.toString(), // Assurer que l'ID est une string pour les comparaisons
                        name: player.name,
                        lane,
                        winRate: player.winRate,
                        laneWinRate: stats.winRate || 0,
                        gamesPlayed: stats.gamesPlayed || 0,
                        laneScore,
                        // Ajouter les préférences de rôles qui viennent du front-end
                        primaryRole: preferences.primaryRole,
                        secondaryRole: preferences.secondaryRole
                    });
                }
            }
        });

        if (DEBUG) console.log("Pools des lanes avant tri :", JSON.stringify(lanesPool, null, 2));

        // Trier chaque pool par score de lane
        for (const lane of lanes) {
            lanesPool[lane].sort((a, b) => b.laneScore - a.laneScore);
        }

        if (DEBUG) console.log("Pools des lanes après tri :", JSON.stringify(lanesPool, null, 2));

        let blueTotalScore = 0;
        let redTotalScore = 0;
        
        // Créer une liste complète des joueurs pour l'attribution
        let availablePlayers = playerData.map(p => {
            // Récupérer les préférences de rôles du front-end
            const preferences = playerPreferences[p._id.toString()] || {};
            
            return {
                id: p._id.toString(),
                name: p.name,
                winRate: p.winRate,
                primaryRole: preferences.primaryRole,
                secondaryRole: preferences.secondaryRole,
                statsByLane: p.statsByLane
            };
        });
        
        let blueAssignedLanes = new Set();
        let redAssignedLanes = new Set();

        // Phase 0: Pré-attribution basée sur les rôles primaires
        // On crée deux listes: joueurs avec préférences et sans préférences
        const playersWithPrimaryRole = availablePlayers.filter(p => p.primaryRole && lanes.includes(p.primaryRole));
        
        if (DEBUG) {
            console.log("Joueurs avec rôle primaire:", playersWithPrimaryRole.map(p => 
                `${p.name} => ${p.primaryRole}`
            ));
        }
        
        // Pour chaque lane, on vérifie s'il y a des joueurs qui ont cette lane comme rôle primaire
        for (const lane of lanes) {
            const playersForLane = playersWithPrimaryRole.filter(p => p.primaryRole === lane);
            if (playersForLane.length > 0) {
                if (DEBUG) console.log(`${playersForLane.length} joueurs ont ${lane} comme rôle primaire:`, playersForLane.map(p => p.name));
                
                // Si assez de joueurs pour les deux équipes, on assigne les deux meilleurs
                if (playersForLane.length >= 2) {
                    // Trier par winRate de lane si disponible, sinon par winRate global
                    playersForLane.sort((a, b) => {
                        const statsA = getLaneStats(a, lane);
                        const statsB = getLaneStats(b, lane);
                        const scoreA = statsA.gamesPlayed > 0 ? 
                            (statsA.winRate || 0) * (1 + (statsA.gamesPlayed / 20)) : a.winRate;
                        const scoreB = statsB.gamesPlayed > 0 ? 
                            (statsB.winRate || 0) * (1 + (statsB.gamesPlayed / 20)) : b.winRate;
                        return scoreB - scoreA;
                    });
                    
                    const [p1, p2] = playersForLane.slice(0, 2);
                    const statsP1 = getLaneStats(p1, lane);
                    const statsP2 = getLaneStats(p2, lane);
                    
                    const scoreP1 = (((statsP1.winRate || 0) * 100) * (1 + (statsP1.gamesPlayed / 20))) + 1;
                    const scoreP2 = (((statsP2.winRate || 0) * 100) * (1 + (statsP2.gamesPlayed / 20))) + 1;
                    
                    if (DEBUG) console.log(`Assignation des joueurs ${p1.name} et ${p2.name} pour la lane ${lane} (rôle primaire)`);
                    
                    // Attribuer les joueurs aux équipes en équilibrant les scores
                    if (!blueAssignedLanes.has(lane) && !redAssignedLanes.has(lane)) {
                        if (blueTotalScore <= redTotalScore) {
                            // Meilleur joueur dans l'équipe bleue
                            blueTeam.push({
                                id: p1.id,
                                name: p1.name,
                                lane,
                                winRate: p1.winRate,
                                laneWinRate: statsP1.winRate || 0,
                                gamesPlayed: statsP1.gamesPlayed || 0,
                                laneScore: scoreP1,
                                roleMatch: 'primary'
                            });
                            blueTotalScore += scoreP1;
                            assignedPlayers.add(p1.id);
                            blueAssignedLanes.add(lane);
                            
                            // Second meilleur joueur dans l'équipe rouge
                            redTeam.push({
                                id: p2.id,
                                name: p2.name,
                                lane,
                                winRate: p2.winRate,
                                laneWinRate: statsP2.winRate || 0,
                                gamesPlayed: statsP2.gamesPlayed || 0,
                                laneScore: scoreP2,
                                roleMatch: 'primary'
                            });
                            redTotalScore += scoreP2;
                            assignedPlayers.add(p2.id);
                            redAssignedLanes.add(lane);
                        } else {
                            // Meilleur joueur dans l'équipe rouge
                            redTeam.push({
                                id: p1.id,
                                name: p1.name,
                                lane,
                                winRate: p1.winRate,
                                laneWinRate: statsP1.winRate || 0,
                                gamesPlayed: statsP1.gamesPlayed || 0,
                                laneScore: scoreP1,
                                roleMatch: 'primary'
                            });
                            redTotalScore += scoreP1;
                            assignedPlayers.add(p1.id);
                            redAssignedLanes.add(lane);
                            
                            // Second meilleur joueur dans l'équipe bleue
                            blueTeam.push({
                                id: p2.id,
                                name: p2.name,
                                lane,
                                winRate: p2.winRate,
                                laneWinRate: statsP2.winRate || 0,
                                gamesPlayed: statsP2.gamesPlayed || 0,
                                laneScore: scoreP2,
                                roleMatch: 'primary'
                            });
                            blueTotalScore += scoreP2;
                            assignedPlayers.add(p2.id);
                            blueAssignedLanes.add(lane);
                        }
                    } else if (!blueAssignedLanes.has(lane)) {
                        // Si seulement l'équipe bleue a besoin de ce rôle
                        blueTeam.push({
                            id: p1.id,
                            name: p1.name,
                            lane,
                            winRate: p1.winRate,
                            laneWinRate: statsP1.winRate || 0,
                            gamesPlayed: statsP1.gamesPlayed || 0,
                            laneScore: scoreP1,
                            roleMatch: 'primary'
                        });
                        blueTotalScore += scoreP1;
                        assignedPlayers.add(p1.id);
                        blueAssignedLanes.add(lane);
                    } else if (!redAssignedLanes.has(lane)) {
                        // Si seulement l'équipe rouge a besoin de ce rôle
                        redTeam.push({
                            id: p1.id,
                            name: p1.name,
                            lane,
                            winRate: p1.winRate,
                            laneWinRate: statsP1.winRate || 0,
                            gamesPlayed: statsP1.gamesPlayed || 0,
                            laneScore: scoreP1,
                            roleMatch: 'primary'
                        });
                        redTotalScore += scoreP1;
                        assignedPlayers.add(p1.id);
                        redAssignedLanes.add(lane);
                    }
                } else if (playersForLane.length === 1) {
                    // Si un seul joueur disponible pour ce rôle primaire
                    const player = playersForLane[0];
                    const stats = getLaneStats(player, lane);
                    const score = (((stats.winRate || 0) * 100) * (1 + (stats.gamesPlayed / 20))) + 1;
                    
                    if (DEBUG) console.log(`Assignation du joueur ${player.name} pour la lane ${lane} (rôle primaire)`);
                    
                    // Assigner à l'équipe avec le score le plus bas qui a besoin de ce rôle
                    if (!blueAssignedLanes.has(lane) && (!redAssignedLanes.has(lane) ? blueTotalScore <= redTotalScore : true)) {
                        blueTeam.push({
                            id: player.id,
                            name: player.name,
                            lane,
                            winRate: player.winRate,
                            laneWinRate: stats.winRate || 0,
                            gamesPlayed: stats.gamesPlayed || 0,
                            laneScore: score,
                            roleMatch: 'primary'
                        });
                        blueTotalScore += score;
                        assignedPlayers.add(player.id);
                        blueAssignedLanes.add(lane);
                    } else if (!redAssignedLanes.has(lane)) {
                        redTeam.push({
                            id: player.id,
                            name: player.name,
                            lane,
                            winRate: player.winRate,
                            laneWinRate: stats.winRate || 0,
                            gamesPlayed: stats.gamesPlayed || 0,
                            laneScore: score,
                            roleMatch: 'primary'
                        });
                        redTotalScore += score;
                        assignedPlayers.add(player.id);
                        redAssignedLanes.add(lane);
                    }
                }
            }
        }
        
        if (DEBUG) console.log(`Après attribution rôles primaires - Blue: ${blueTeam.length}, Red: ${redTeam.length}`);
        
        // Mise à jour de la liste des joueurs disponibles
        availablePlayers = availablePlayers.filter(p => !assignedPlayers.has(p.id));
        
        // Phase 1: Attribution basée sur les rôles secondaires pour les joueurs non encore assignés
        const playersWithSecondaryRole = availablePlayers.filter(p => p.secondaryRole && lanes.includes(p.secondaryRole));
        
        if (DEBUG) {
            console.log("Joueurs avec rôle secondaire:", playersWithSecondaryRole.map(p => 
                `${p.name} => ${p.secondaryRole}`
            ));
        }
        
        for (const lane of lanes) {
            // Ignorer les lanes déjà assignées dans les deux équipes
            if (blueAssignedLanes.has(lane) && redAssignedLanes.has(lane)) continue;
            
            // Filtrer les joueurs qui ont ce rôle comme secondaire
            const playersForLane = playersWithSecondaryRole.filter(p => p.secondaryRole === lane);
            
            if (playersForLane.length > 0) {
                if (DEBUG) console.log(`${playersForLane.length} joueurs ont ${lane} comme rôle secondaire:`, playersForLane.map(p => p.name));
                
                // Trier par score sur cette lane
                playersForLane.sort((a, b) => {
                    const statsA = getLaneStats(a, lane);
                    const statsB = getLaneStats(b, lane);
                    const scoreA = statsA.gamesPlayed > 0 ? 
                        (statsA.winRate || 0) * (1 + (statsA.gamesPlayed / 20)) : a.winRate;
                    const scoreB = statsB.gamesPlayed > 0 ? 
                        (statsB.winRate || 0) * (1 + (statsB.gamesPlayed / 20)) : b.winRate;
                    return scoreB - scoreA;
                });
                
                // Attribuer aux équipes qui ont besoin de ce rôle
                for (const player of playersForLane) {
                    if (assignedPlayers.has(player.id)) continue;
                    
                    const stats = getLaneStats(player, lane);
                    const score = (((stats.winRate || 0) * 100) * (1 + (stats.gamesPlayed / 20))) + 1;
                    
                    if (DEBUG) console.log(`Assignation du joueur ${player.name} pour la lane ${lane} (rôle secondaire)`);
                    
                    if (!blueAssignedLanes.has(lane) && (!redAssignedLanes.has(lane) ? blueTotalScore <= redTotalScore : true)) {
                        blueTeam.push({
                            id: player.id,
                            name: player.name,
                            lane,
                            winRate: player.winRate,
                            laneWinRate: stats.winRate || 0,
                            gamesPlayed: stats.gamesPlayed || 0,
                            laneScore: score,
                            roleMatch: 'secondary'
                        });
                        blueTotalScore += score;
                        assignedPlayers.add(player.id);
                        blueAssignedLanes.add(lane);
                        break;  // Sortir après avoir assigné un joueur à l'équipe bleue
                    } else if (!redAssignedLanes.has(lane)) {
                        redTeam.push({
                            id: player.id,
                            name: player.name,
                            lane,
                            winRate: player.winRate,
                            laneWinRate: stats.winRate || 0,
                            gamesPlayed: stats.gamesPlayed || 0,
                            laneScore: score,
                            roleMatch: 'secondary'
                        });
                        redTotalScore += score;
                        assignedPlayers.add(player.id);
                        redAssignedLanes.add(lane);
                        break;  // Sortir après avoir assigné un joueur à l'équipe rouge
                    }
                }
            }
        }
        
        if (DEBUG) console.log(`Après attribution rôles secondaires - Blue: ${blueTeam.length}, Red: ${redTeam.length}`);
        
        // Mise à jour de la liste des joueurs disponibles
        availablePlayers = availablePlayers.filter(p => !assignedPlayers.has(p.id));
        
        // Phase 2: Attribution optimisée pour les joueurs restants basée sur les statistiques
        for (const lane of lanes) {
            // Ignorer les lanes déjà assignées dans les deux équipes
            if (blueAssignedLanes.has(lane) && redAssignedLanes.has(lane)) continue;
            
            // Filtrer les candidats ayant au moins 2 parties sur ce rôle et non assignés
            let candidates = lanesPool[lane]
                .filter(p => !assignedPlayers.has(p.id) && p.gamesPlayed >= 2)
                .sort((a, b) => b.laneScore - a.laneScore);
            
            if (candidates.length >= 2) {
                const [p1, p2] = candidates.slice(0, 2);
                
                if (DEBUG) console.log(`Candidats sélectionnés pour la lane ${lane} par stats:`, p1.name, p2.name);
                
                // Équilibrer les équipes en fonction de quel côté a besoin de joueurs
                if (!blueAssignedLanes.has(lane) && !redAssignedLanes.has(lane)) {
                    if (blueTotalScore <= redTotalScore) {
                        // Meilleur joueur dans l'équipe bleue
                        blueTeam.push({ 
                            id: p1.id, 
                            name: p1.name, 
                            lane, 
                            winRate: p1.winRate, 
                            laneWinRate: p1.laneWinRate,
                            gamesPlayed: p1.gamesPlayed,
                            laneScore: p1.laneScore,
                            roleMatch: 'stats'
                        });
                        blueTotalScore += p1.laneScore;
                        assignedPlayers.add(p1.id);
                        blueAssignedLanes.add(lane);
                        
                        // Second meilleur joueur dans l'équipe rouge
                        redTeam.push({ 
                            id: p2.id, 
                            name: p2.name, 
                            lane, 
                            winRate: p2.winRate, 
                            laneWinRate: p2.laneWinRate,
                            gamesPlayed: p2.gamesPlayed,
                            laneScore: p2.laneScore,
                            roleMatch: 'stats'
                        });
                        redTotalScore += p2.laneScore;
                        assignedPlayers.add(p2.id);
                        redAssignedLanes.add(lane);
                    } else {
                        // Meilleur joueur dans l'équipe rouge
                        redTeam.push({ 
                            id: p1.id, 
                            name: p1.name, 
                            lane, 
                            winRate: p1.winRate, 
                            laneWinRate: p1.laneWinRate,
                            gamesPlayed: p1.gamesPlayed,
                            laneScore: p1.laneScore,
                            roleMatch: 'stats'
                        });
                        redTotalScore += p1.laneScore;
                        assignedPlayers.add(p1.id);
                        redAssignedLanes.add(lane);
                        
                        // Second meilleur joueur dans l'équipe bleue
                        blueTeam.push({ 
                            id: p2.id, 
                            name: p2.name, 
                            lane, 
                            winRate: p2.winRate, 
                            laneWinRate: p2.laneWinRate,
                            gamesPlayed: p2.gamesPlayed,
                            laneScore: p2.laneScore,
                            roleMatch: 'stats'
                        });
                        blueTotalScore += p2.laneScore;
                        assignedPlayers.add(p2.id);
                        blueAssignedLanes.add(lane);
                    }
                } else if (!blueAssignedLanes.has(lane)) {
                    // Si seulement l'équipe bleue a besoin de ce rôle
                    blueTeam.push({ 
                        id: p1.id, 
                        name: p1.name, 
                        lane, 
                        winRate: p1.winRate, 
                        laneWinRate: p1.laneWinRate,
                        gamesPlayed: p1.gamesPlayed,
                        laneScore: p1.laneScore,
                        roleMatch: 'stats'
                    });
                    blueTotalScore += p1.laneScore;
                    assignedPlayers.add(p1.id);
                    blueAssignedLanes.add(lane);
                } else if (!redAssignedLanes.has(lane)) {
                    // Si seulement l'équipe rouge a besoin de ce rôle
                    redTeam.push({ 
                        id: p1.id, 
                        name: p1.name, 
                        lane, 
                        winRate: p1.winRate, 
                        laneWinRate: p1.laneWinRate,
                        gamesPlayed: p1.gamesPlayed,
                        laneScore: p1.laneScore,
                        roleMatch: 'stats'
                    });
                    redTotalScore += p1.laneScore;
                    assignedPlayers.add(p1.id);
                    redAssignedLanes.add(lane);
                }
            } else if (candidates.length === 1) {
                // S'il n'y a qu'un seul candidat avec expérience sur ce rôle
                const player = candidates[0];
                
                if (DEBUG) console.log(`Candidat unique sélectionné pour la lane ${lane} par stats:`, player.name);
                
                // Assigner à l'équipe qui a besoin de ce rôle
                if (!blueAssignedLanes.has(lane) && (!redAssignedLanes.has(lane) ? blueTotalScore <= redTotalScore : true)) {
                    blueTeam.push({ 
                        id: player.id, 
                        name: player.name, 
                        lane, 
                        winRate: player.winRate, 
                        laneWinRate: player.laneWinRate,
                        gamesPlayed: player.gamesPlayed,
                        laneScore: player.laneScore,
                        roleMatch: 'stats'
                    });
                    blueTotalScore += player.laneScore;
                    assignedPlayers.add(player.id);
                    blueAssignedLanes.add(lane);
                } else if (!redAssignedLanes.has(lane)) {
                    redTeam.push({ 
                        id: player.id, 
                        name: player.name, 
                        lane, 
                        winRate: player.winRate, 
                        laneWinRate: player.laneWinRate,
                        gamesPlayed: player.gamesPlayed,
                        laneScore: player.laneScore,
                        roleMatch: 'stats'
                    });
                    redTotalScore += player.laneScore;
                    assignedPlayers.add(player.id);
                    redAssignedLanes.add(lane);
                }
            }
        }

        if (DEBUG) console.log(`Après attribution par statistiques - Blue: ${blueTeam.length}, Red: ${redTeam.length}`);

        // Mise à jour de la liste des joueurs disponibles
        availablePlayers = availablePlayers.filter(p => !assignedPlayers.has(p.id));
        
        // Phase 3: Attribution de secours pour les joueurs restants
        // Fonction pour trouver le meilleur joueur disponible pour un rôle
        const findBestPlayerForLane = (lane, availablePlayers) => {
            // D'abord essayer de trouver un joueur ayant de l'expérience sur ce rôle
            const playersWithLaneExp = availablePlayers.filter(p => {
                const stats = getLaneStats(p, lane);
                return stats.gamesPlayed > 0;
            }).sort((a, b) => {
                const statsA = getLaneStats(a, lane);
                const statsB = getLaneStats(b, lane);
                const scoreA = (statsA.winRate || 0) * (1 + (statsA.gamesPlayed / 20)) + 1;
                const scoreB = (statsB.winRate || 0) * (1 + (statsB.gamesPlayed / 20)) + 1;
                return scoreB - scoreA;
            });
            
            // Si aucun joueur avec expérience, prendre le meilleur joueur disponible
            return playersWithLaneExp.length > 0 ? playersWithLaneExp[0] : (availablePlayers.length > 0 ? availablePlayers[0] : null);
        };
        
        // Remplir les rôles manquants dans l'équipe bleue
        const missingLanesBlue = lanes.filter(lane => !blueAssignedLanes.has(lane));
        for (const lane of missingLanesBlue) {
            if (availablePlayers.length === 0) break;
            
            const player = findBestPlayerForLane(lane, availablePlayers);
            if (!player) continue;
            
            const stats = getLaneStats(player, lane);
            const laneScore = (((stats.winRate || 0) * 100) * (1 + (stats.gamesPlayed / 20))) + 1;
            
            if (DEBUG) console.log(`Assignation de secours du joueur ${player.name} pour la lane ${lane} (équipe bleue)`);
            
            blueTeam.push({
                id: player.id,
                name: player.name,
                lane,
                winRate: player.winRate,
                laneWinRate: stats.winRate || 0,
                gamesPlayed: stats.gamesPlayed || 0,
                laneScore,
                roleMatch: stats.gamesPlayed > 0 ? 'fallback' : 'random'
            });
            
            blueTotalScore += laneScore;
            assignedPlayers.add(player.id);
            availablePlayers = availablePlayers.filter(p => p.id !== player.id);
        }
        
        // Remplir les rôles manquants dans l'équipe rouge
        const missingLanesRed = lanes.filter(lane => !redAssignedLanes.has(lane));
        for (const lane of missingLanesRed) {
            if (availablePlayers.length === 0) break;
            
            const player = findBestPlayerForLane(lane, availablePlayers);
            if (!player) continue;
            
            const stats = getLaneStats(player, lane);
            const laneScore = (((stats.winRate || 0) * 100) * (1 + (stats.gamesPlayed / 20))) + 1;
            
            if (DEBUG) console.log(`Assignation de secours du joueur ${player.name} pour la lane ${lane} (équipe rouge)`);
            
            redTeam.push({
                id: player.id,
                name: player.name,
                lane,
                winRate: player.winRate,
                laneWinRate: stats.winRate || 0,
                gamesPlayed: stats.gamesPlayed || 0,
                laneScore,
                roleMatch: stats.gamesPlayed > 0 ? 'fallback' : 'random'
            });
            
            redTotalScore += laneScore;
            assignedPlayers.add(player.id);
            availablePlayers = availablePlayers.filter(p => p.id !== player.id);
        }

        if (DEBUG) console.log(`Après attribution de secours - Blue: ${blueTeam.length}, Red: ${redTeam.length}`);
        
        // Phase 4: Attribution finale aléatoire pour les joueurs restants si nécessaire
        // Vérification que chaque équipe a exactement 5 joueurs
        while (availablePlayers.length > 0 && (blueTeam.length < 5 || redTeam.length < 5)) {
            const player = availablePlayers.shift();
            const randomLane = lanes[Math.floor(Math.random() * lanes.length)];
            
            if (DEBUG) console.log(`Assignation aléatoire du joueur ${player.name} à la lane ${randomLane}`);
            
            if (blueTeam.length < 5) {
                blueTeam.push({
                    id: player.id,
                    name: player.name,
                    lane: randomLane,
                    winRate: player.winRate,
                    laneWinRate: 0,
                    gamesPlayed: 0,
                    laneScore: 1,
                    roleMatch: 'random'
                });
                blueTotalScore += 1;
            } else if (redTeam.length < 5) {
                redTeam.push({
                    id: player.id,
                    name: player.name,
                    lane: randomLane,
                    winRate: player.winRate,
                    laneWinRate: 0,
                    gamesPlayed: 0,
                    laneScore: 1,
                    roleMatch: 'random'
                });
                redTotalScore += 1;
            }
        }

        // Calculer les métriques finales des équipes
        const blueAverageScore = blueTotalScore / blueTeam.length;
        const redAverageScore = redTotalScore / redTeam.length;
        const scoreBalance = Math.abs(blueAverageScore - redAverageScore);

        // Calcul des statistiques d'attribution de rôles
        const blueRoleStats = {
            primary: blueTeam.filter(p => p.roleMatch === 'primary').length,
            secondary: blueTeam.filter(p => p.roleMatch === 'secondary').length,
            stats: blueTeam.filter(p => p.roleMatch === 'stats').length,
            fallback: blueTeam.filter(p => p.roleMatch === 'fallback').length,
            random: blueTeam.filter(p => p.roleMatch === 'random').length
        };
        
        const redRoleStats = {
            primary: redTeam.filter(p => p.roleMatch === 'primary').length,
            secondary: redTeam.filter(p => p.roleMatch === 'secondary').length,
            stats: redTeam.filter(p => p.roleMatch === 'stats').length,
            fallback: redTeam.filter(p => p.roleMatch === 'fallback').length,
            random: redTeam.filter(p => p.roleMatch === 'random').length
        };

        // Calculer les métriques de winrate global
        const blueTotalWinRate = blueTeam.reduce((sum, player) => sum + player.winRate, 0);
        const redTotalWinRate = redTeam.reduce((sum, player) => sum + player.winRate, 0);
        const blueAverageWinRate = blueTotalWinRate / blueTeam.length;
        const redAverageWinRate = redTotalWinRate / redTeam.length;
        const winRateDifference = Math.abs(blueTotalWinRate - redTotalWinRate);
        const averageWinRateDifference = Math.abs(blueAverageWinRate - redAverageWinRate);

        // Calcul d'un score de qualité d'équilibrage (100 = parfaitement équilibré)
        const balanceQuality = Math.max(0, 100 - (winRateDifference * 100));

        if (DEBUG) {
            console.log("Équipes équilibrées avec lanes attribuées :");
            console.log(`Équipe bleue (${blueTotalScore.toFixed(2)}): ${blueTeam.map(p => `${p.name} -> ${p.lane} (${p.roleMatch})`).join(', ')}`);
            console.log(`Équipe rouge (${redTotalScore.toFixed(2)}): ${redTeam.map(p => `${p.name} -> ${p.lane} (${p.roleMatch})`).join(', ')}`);
            console.log(`Équilibre des scores: ${scoreBalance.toFixed(2)}`);
            console.log(`Équilibre des winrates: ${winRateDifference.toFixed(2)}`);
            console.log(`Qualité d'équilibrage: ${balanceQuality.toFixed(0)}/100`);
            console.log("Stats d'attribution bleu:", blueRoleStats);
            console.log("Stats d'attribution rouge:", redRoleStats);
        }

        return res.json({ 
            blueTeam, 
            redTeam,
            metrics: {
                // Métriques de score
                blueScore: blueTotalScore,
                redScore: redTotalScore,
                scoreBalance,
                blueAverageScore,
                redAverageScore,
                
                // Métriques de winrate
                blueTotalWinRate,
                redTotalWinRate,
                blueAverageWinRate,
                redAverageWinRate,
                winRateDifference,
                averageWinRateDifference,
                balanceQuality,
                
                // Statistiques d'attribution des rôles
                blueRoleStats,
                redRoleStats
            }
        });

    } catch (error) {
        console.error("Erreur lors de la création des équipes équilibrées avec lanes :", error);
        return res.status(500).json({ error: "Erreur serveur lors de la création des équipes" });
    }
};















