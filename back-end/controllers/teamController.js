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

    // Méthode améliorée avec optimisation d'échange de joueurs
    const balancedTeams = createOptimizedBalancedTeams(playerData);
    
    // Calcul des métriques de l'équilibrage
    const metrics = calculateTeamMetrics(balancedTeams.blueTeam, balancedTeams.redTeam);

    if (DEBUG) {
      console.log("Équipes équilibrées :");
      console.log(`Équipe bleue (${metrics.blueTotalWinRate.toFixed(4)}): ${balancedTeams.blueTeam.map(p => p.name).join(', ')}`);
      console.log(`Équipe rouge (${metrics.redTotalWinRate.toFixed(4)}): ${balancedTeams.redTeam.map(p => p.name).join(', ')}`);
      console.log(`Différence de winRate: ${metrics.winRateDifference.toFixed(4)}`);
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
 * Crée des équipes optimisées avec multiples approches et optimisation par échange
 * @param {Array} players - Tableau de joueurs avec _id, name et winRate
 * @returns {Object} Équipes bleue et rouge
 */
function createOptimizedBalancedTeams(players) {
  // Préparer les joueurs avec le format attendu
  const formattedPlayers = players.map(p => ({
    id: p._id,
    name: p.name,
    winRate: p.winRate
  }));
  
  // Essayer plusieurs méthodes et garder la meilleure
  const teamsByPairs = createBalancedTeamsByPairs(formattedPlayers);
  const teamsGreedy = createBalancedTeamsGreedy(formattedPlayers);
  const teamsRandom = createMultipleRandomTeams(formattedPlayers, 50); // Essayer 50 distributions aléatoires
  
  const allCandidates = [teamsByPairs, teamsGreedy, ...teamsRandom];
  
  // Trouver la configuration initiale avec la plus petite différence
  let bestTeams = allCandidates.reduce((best, current) => {
    const currentDiff = Math.abs(
      calculateTotalWinRate(current.blueTeam) - 
      calculateTotalWinRate(current.redTeam)
    );
    const bestDiff = Math.abs(
      calculateTotalWinRate(best.blueTeam) - 
      calculateTotalWinRate(best.redTeam)
    );
    return currentDiff < bestDiff ? current : best;
  }, allCandidates[0]);
  
  // Effectuer une optimisation par échange de joueurs pour affiner l'équilibre
  return optimizeTeamsBySwapping(bestTeams.blueTeam, bestTeams.redTeam);
}

/**
 * Optimise les équipes en essayant tous les échanges possibles de joueurs entre équipes
 * @param {Array} blueTeam - Équipe bleue initiale
 * @param {Array} redTeam - Équipe rouge initiale 
 * @returns {Object} Équipes bleue et rouge optimisées
 */
function optimizeTeamsBySwapping(blueTeam, redTeam) {
  let bestBlueTeam = [...blueTeam];
  let bestRedTeam = [...redTeam];
  let bestDifference = Math.abs(
    calculateTotalWinRate(bestBlueTeam) - 
    calculateTotalWinRate(bestRedTeam)
  );
  
  // Si la différence est déjà presque nulle, pas besoin d'optimiser davantage
  if (bestDifference < 0.0001) {
    return { blueTeam: bestBlueTeam, redTeam: bestRedTeam };
  }
  
  let improvement = true;
  let iterations = 0;
  const MAX_ITERATIONS = 100; // Éviter les boucles infinies
  
  // Continuer à chercher des améliorations tant qu'on en trouve
  while (improvement && iterations < MAX_ITERATIONS) {
    improvement = false;
    iterations++;
    
    // Essayer tous les échanges possibles de joueurs entre les équipes
    for (let i = 0; i < bestBlueTeam.length; i++) {
      for (let j = 0; j < bestRedTeam.length; j++) {
        // Créer de nouvelles équipes avec l'échange
        const newBlueTeam = [...bestBlueTeam];
        const newRedTeam = [...bestRedTeam];
        
        // Échanger les joueurs
        const temp = newBlueTeam[i];
        newBlueTeam[i] = newRedTeam[j];
        newRedTeam[j] = temp;
        
        // Calculer la nouvelle différence
        const newDifference = Math.abs(
          calculateTotalWinRate(newBlueTeam) - 
          calculateTotalWinRate(newRedTeam)
        );
        
        // Si cet échange améliore l'équilibre, le conserver
        if (newDifference < bestDifference) {
          bestBlueTeam = newBlueTeam;
          bestRedTeam = newRedTeam;
          bestDifference = newDifference;
          improvement = true;
          break; // On a trouvé une amélioration, recommencer avec les nouvelles équipes
        }
      }
      
      if (improvement) break;
    }
    
    // Si la différence est devenue très faible, on peut s'arrêter
    if (bestDifference < 0.0001) break;
  }
  
  return { blueTeam: bestBlueTeam, redTeam: bestRedTeam };
}

/**
 * Crée plusieurs configurations d'équipes aléatoires et renvoie les meilleures
 * @param {Array} players - Tableau des joueurs
 * @param {Number} attempts - Nombre de tentatives à effectuer 
 * @returns {Array} Tableau des meilleures configurations d'équipes
 */
function createMultipleRandomTeams(players, attempts) {
  const teams = [];
  
  for (let i = 0; i < attempts; i++) {
    // Mélanger les joueurs de façon aléatoire
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    
    // Créer les équipes
    const blueTeam = shuffledPlayers.slice(0, 5);
    const redTeam = shuffledPlayers.slice(5, 10);
    
    teams.push({ blueTeam, redTeam });
  }
  
  // Trier les configurations par différence de win rate
  return teams.sort((a, b) => {
    const diffA = Math.abs(
      calculateTotalWinRate(a.blueTeam) - 
      calculateTotalWinRate(a.redTeam)
    );
    const diffB = Math.abs(
      calculateTotalWinRate(b.blueTeam) - 
      calculateTotalWinRate(b.redTeam)
    );
    return diffA - diffB;
  });
}

/**
 * Utilitaire pour calculer le winrate total d'une équipe
 * @param {Array} team - Équipe de joueurs
 * @returns {Number} Winrate total
 */
function calculateTotalWinRate(team) {
  return team.reduce((sum, player) => sum + player.winRate, 0);
}

/**
 * Crée des équipes équilibrées en utilisant une approche par paires améliorée
 * @param {Array} players - Tableau de joueurs avec id, name et winRate
 * @returns {Object} Équipes bleue et rouge
 */
function createBalancedTeamsByPairs(players) {
  // Trier les joueurs du plus fort au plus faible
  const sortedPlayers = [...players].sort((a, b) => b.winRate - a.winRate);
  
  // Créer des paires de joueurs (meilleur + moins bon)
  const pairs = [];
  const n = sortedPlayers.length;
  
  for (let i = 0; i < n / 2; i++) {
    pairs.push([sortedPlayers[i], sortedPlayers[n - 1 - i]]);
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
 * @param {Array} players - Tableau de joueurs avec id, name et winRate
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
    const player = sortedPlayers[i];
    
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
  
  // Calculer la qualité d'équilibrage (100 = parfait)
  // Plus sophistiqué: prendre en compte à la fois la différence de winrate et l'écart-type
  const balanceQuality = 100 - (winRateDifference * 100) - 
    Math.max(0, (Math.abs(blueStdDev - redStdDev) * 10));
  
  return {
    blueTotalWinRate,
    redTotalWinRate,
    blueAverageWinRate,
    redAverageWinRate,
    winRateDifference,
    averageWinRateDifference,
    blueStdDev,
    redStdDev,
    balanceQuality: Math.max(0, balanceQuality) // Éviter les valeurs négatives
  };
}

/**
 * Calcule l'écart-type d'un ensemble de valeurs
 * @param {Array} values - Tableau de valeurs numériques
 * @returns {Number} Écart-type
 */
function calculateStandardDeviation(values) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const squaredDifferences = values.map(value => Math.pow(value - mean, 2));
  const variance = squaredDifferences.reduce((sum, value) => sum + value, 0) / values.length;
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

// 🔹 Fonction pour équilibrer les équipes en utilisant les rangs Solo/Duo de Riot
export const balanceTeamsWithRiotRanks = async (req, res) => {
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
  
      // Récupérer les joueurs en base de données avec leurs informations Riot
      const playerData = await Player.find(
        { _id: { $in: players.map(p => p.id) } }, 
        "_id name winRate riotId riotTag soloRank region summonerLevel"
      );
  
      if (playerData.length !== 10) {
        return res.status(400).json({ 
          error: `Certains joueurs n'ont pas été trouvés. Attendu : 10, Trouvé : ${playerData.length}` 
        });
      }
  
      if (DEBUG) console.log("Création d'équipes équilibrées basées sur les rangs Riot...");
  
      // Filtrer les joueurs qui ont des données de rang Riot
      const playersWithRank = playerData.filter(player => 
        player.soloRank && player.soloRank.tier && player.soloRank.rank
      );
  
      const playersWithoutRank = playerData.filter(player => 
        !player.soloRank || !player.soloRank.tier || !player.soloRank.rank
      );
  
      if (DEBUG) {
        console.log(`Joueurs avec rang Riot: ${playersWithRank.length}`);
        console.log(`Joueurs sans rang Riot: ${playersWithoutRank.length}`);
      }
  
      // Calculer le MMR estimé pour chaque joueur
      const processedPlayers = playerData.map(player => {
        const mmr = calculateMMR(player.soloRank);
        return {
          id: player._id,
          name: player.name,
          winRate: player.winRate || 0,
          riotId: player.riotId,
          riotTag: player.riotTag,
          region: player.region,
          soloRank: player.soloRank,
          hasRank: Boolean(player.soloRank && player.soloRank.tier),
          mmr,
          rankValue: getRankValue(player.soloRank)
        };
      });
  
      // Trier par MMR décroissant
      processedPlayers.sort((a, b) => b.mmr - a.mmr);
  
      if (DEBUG) {
        console.log("Joueurs triés par MMR estimé:");
        processedPlayers.forEach(p => {
          const rankStr = p.soloRank ? `${p.soloRank.tier} ${p.soloRank.rank} (${p.soloRank.leaguePoints} LP)` : "Unranked";
          console.log(`${p.name}: ${rankStr} - MMR: ${p.mmr}`);
        });
      }
  
      // Distribution par la méthode Snake Draft (1->2->2->1) pour un meilleur équilibre
      let blueTeam = [];
      let redTeam = [];
      let blueTotalMMR = 0;
      let redTotalMMR = 0;
      
      // Attribution alternative pour un meilleur équilibre (meilleur joueur dans une équipe, 2ème dans l'autre, etc.)
      processedPlayers.forEach((player, index) => {
        const playerObj = {
          id: player.id,
          name: player.name,
          winRate: player.winRate,
          mmr: player.mmr,
          rankInfo: player.soloRank ? {
            tier: player.soloRank.tier,
            rank: player.soloRank.rank,
            lp: player.soloRank.leaguePoints,
            rankString: `${player.soloRank.tier} ${player.soloRank.rank}`,
            wins: player.soloRank.wins,
            losses: player.soloRank.losses
          } : { rankString: "Unranked" }
        };
  
        // Utiliser l'index pour déterminer l'équipe (0, 3, 4, 7, 8 -> Bleu, 1, 2, 5, 6, 9 -> Rouge)
        if ([0, 3, 4, 7, 8].includes(index)) {
          blueTeam.push(playerObj);
          blueTotalMMR += player.mmr;
        } else {
          redTeam.push(playerObj);
          redTotalMMR += player.mmr;
        }
      });
  
      // Pré-équilibrage - vérifier si l'écart est trop important et échanger des joueurs si nécessaire
      if (Math.abs(blueTotalMMR - redTotalMMR) > 300) {
        const iterations = 10; // Nombre maximal d'essais pour équilibrer
        balanceTeamsByExchange(blueTeam, redTeam, iterations);
      }
  
      // Recalculer les MMR totaux après équilibrage
      blueTotalMMR = blueTeam.reduce((sum, player) => sum + player.mmr, 0);
      redTotalMMR = redTeam.reduce((sum, player) => sum + player.mmr, 0);
  
      // Calculer les métriques de l'équilibrage
      const metrics = calculateRiotRankMetrics(blueTeam, redTeam);
  
      if (DEBUG) {
        console.log("Équipes équilibrées par rang Riot:");
        console.log(`Équipe bleue (MMR: ${metrics.blueMMR}): ${blueTeam.map(p => `${p.name} (${p.rankInfo.rankString || "Unranked"})`).join(', ')}`);
        console.log(`Équipe rouge (MMR: ${metrics.redMMR}): ${redTeam.map(p => `${p.name} (${p.rankInfo.rankString || "Unranked"})`).join(', ')}`);
        console.log(`Différence de MMR: ${metrics.mmrDifference}`);
        console.log(`Qualité d'équilibrage: ${metrics.balanceQuality}/100`);
      }
  
      // Retourner les équipes et les métriques
      res.status(200).json({ 
        blueTeam, 
        redTeam,
        metrics: metrics
      });
    } catch (error) {
      console.error("Erreur lors de la création des équipes équilibrées par rang Riot:", error);
      res.status(500).json({ error: "Erreur interne lors de la création des équipes équilibrées." });
    }
  };
  
  /**
   * Équilibre les équipes en échangeant des joueurs pour minimiser la différence de MMR
   */
  function balanceTeamsByExchange(blueTeam, redTeam, maxIterations = 10) {
    let iterations = 0;
    let blueTotalMMR = blueTeam.reduce((sum, player) => sum + player.mmr, 0);
    let redTotalMMR = redTeam.reduce((sum, player) => sum + player.mmr, 0);
    
    // Continuer tant que l'écart est important et qu'on n'a pas atteint le nombre max d'itérations
    while (Math.abs(blueTotalMMR - redTotalMMR) > 100 && iterations < maxIterations) {
      iterations++;
      
      // Déterminer quelle équipe a le MMR le plus élevé
      const isBlueStronger = blueTotalMMR > redTotalMMR;
      
      // Trouver le meilleur échange pour équilibrer
      let bestExchange = null;
      let bestDifference = Math.abs(blueTotalMMR - redTotalMMR);
      
      // Pour chaque paire possible de joueurs
      for (let i = 0; i < blueTeam.length; i++) {
        for (let j = 0; j < redTeam.length; j++) {
          // Calculer l'impact de l'échange sur le MMR
          const bluePlayerMMR = blueTeam[i].mmr;
          const redPlayerMMR = redTeam[j].mmr;
          
          // Nouveau MMR après échange
          const newBlueTotalMMR = blueTotalMMR - bluePlayerMMR + redPlayerMMR;
          const newRedTotalMMR = redTotalMMR - redPlayerMMR + bluePlayerMMR;
          
          // Calculer la nouvelle différence
          const newDifference = Math.abs(newBlueTotalMMR - newRedTotalMMR);
          
          // Vérifier si cet échange améliore l'équilibre
          if (newDifference < bestDifference) {
            bestDifference = newDifference;
            bestExchange = { blueIndex: i, redIndex: j };
          }
        }
      }
      
      // Si on a trouvé un meilleur échange, l'effectuer
      if (bestExchange) {
        const tempPlayer = blueTeam[bestExchange.blueIndex];
        blueTeam[bestExchange.blueIndex] = redTeam[bestExchange.redIndex];
        redTeam[bestExchange.redIndex] = tempPlayer;
        
        // Mettre à jour les MMR
        blueTotalMMR = blueTeam.reduce((sum, player) => sum + player.mmr, 0);
        redTotalMMR = redTeam.reduce((sum, player) => sum + player.mmr, 0);
      } else {
        // Si aucun échange n'améliore la situation, sortir de la boucle
        break;
      }
    }
    
    return { blueTeam, redTeam };
  }
  
  /**
   * Calcule les métriques basées sur les rangs Riot pour l'équilibrage
   */
  function calculateRiotRankMetrics(blueTeam, redTeam) {
    // Calculer MMR total et moyen
    const blueMMR = blueTeam.reduce((sum, player) => sum + player.mmr, 0);
    const redMMR = redTeam.reduce((sum, player) => sum + player.mmr, 0);
    const blueAverageMMR = blueMMR / blueTeam.length;
    const redAverageMMR = redMMR / redTeam.length;
    const mmrDifference = Math.abs(blueMMR - redMMR);
    const averageMMRDifference = Math.abs(blueAverageMMR - redAverageMMR);
    
    // Compter les joueurs par tier pour chaque équipe
    const tierCounts = {
      blue: countPlayersByTier(blueTeam),
      red: countPlayersByTier(redTeam)
    };
    
    // Identifier le rang le plus élevé dans chaque équipe
    const blueHighestRank = findHighestRank(blueTeam);
    const redHighestRank = findHighestRank(redTeam);
    
    // Calculer le winrate Riot (basé sur les victoires/défaites en ranked)
    const blueRankedWins = blueTeam.reduce((sum, player) => 
      sum + (player.rankInfo.wins || 0), 0);
    const blueRankedLosses = blueTeam.reduce((sum, player) => 
      sum + (player.rankInfo.losses || 0), 0);
    const redRankedWins = redTeam.reduce((sum, player) => 
      sum + (player.rankInfo.wins || 0), 0);
    const redRankedLosses = redTeam.reduce((sum, player) => 
      sum + (player.rankInfo.losses || 0), 0);
    
    // Winrate en pourcentage (éviter division par zéro)
    const blueRankedWinrate = blueRankedWins + blueRankedLosses > 0 ? 
      (blueRankedWins / (blueRankedWins + blueRankedLosses)) : 0;
    const redRankedWinrate = redRankedWins + redRankedLosses > 0 ? 
      (redRankedWins / (redRankedWins + redRankedLosses)) : 0;
    
    // Calculer score de qualité d'équilibrage (100 = parfait)
    // Plus la différence de MMR est faible, meilleur est le score
    const mmrBalanceQuality = Math.max(0, 100 - (mmrDifference / 10));
    
    return {
      blueMMR,
      redMMR,
      blueAverageMMR,
      redAverageMMR,
      mmrDifference,
      averageMMRDifference,
      tierDistribution: tierCounts,
      blueHighestRank,
      redHighestRank,
      blueRankedStats: {
        wins: blueRankedWins,
        losses: blueRankedLosses,
        winrate: blueRankedWinrate
      },
      redRankedStats: {
        wins: redRankedWins,
        losses: redRankedLosses,
        winrate: redRankedWinrate
      },
      balanceQuality: mmrBalanceQuality
    };
  }
  
  /**
   * Compte les joueurs par tier (IRON, BRONZE, etc.) dans une équipe
   */
  function countPlayersByTier(team) {
    const tiers = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"];
    const counts = {};
    
    tiers.forEach(tier => counts[tier] = 0);
    counts["UNRANKED"] = 0;
    
    team.forEach(player => {
      if (player.rankInfo && player.rankInfo.tier) {
        counts[player.rankInfo.tier]++;
      } else {
        counts["UNRANKED"]++;
      }
    });
    
    return counts;
  }
  
  /**
   * Trouve le rang le plus élevé dans une équipe
   */
  function findHighestRank(team) {
    let highestRank = null;
    let highestRankValue = -1;
    
    team.forEach(player => {
      if (player.rankInfo && player.rankInfo.tier) {
        const rankValue = getRankValue({
          tier: player.rankInfo.tier,
          rank: player.rankInfo.rank
        });
        
        if (rankValue > highestRankValue) {
          highestRankValue = rankValue;
          highestRank = {
            tier: player.rankInfo.tier,
            rank: player.rankInfo.rank,
            player: player.name
          };
        }
      }
    });
    
    return highestRank || { tier: "UNRANKED", rank: "", player: "" };
  }
  
  /**
   * Convertit un rang League of Legends en valeur MMR estimée
   */
  function calculateMMR(soloRank) {
    if (!soloRank || !soloRank.tier || !soloRank.rank) {
      return 800; // Valeur par défaut (environ Silver IV)
    }
  
    const baseMMR = getRankBaseMMR(soloRank.tier);
    const divisionModifier = getDivisionModifier(soloRank.rank);
    const lpModifier = soloRank.leaguePoints || 0; // Correction: utiliser LP directement
    
    return baseMMR + divisionModifier + lpModifier;
  }
  
  /**
   * Obtient la valeur de base du MMR pour un tier
   */
  function getRankBaseMMR(tier) {
    const tierValues = {
      "IRON": 0,
      "BRONZE": 400,
      "SILVER": 800,
      "GOLD": 1200,
      "PLATINUM": 1600,
      "EMERALD": 2000,
      "DIAMOND": 2400,
      "MASTER": 2800,
      "GRANDMASTER": 3100,
      "CHALLENGER": 3400
    };
    
    // Vérification stricte
    return tierValues[tier] !== undefined ? tierValues[tier] : 800;
  }
  
  /**
   * Obtient le modificateur de MMR basé sur la division
   */
  function getDivisionModifier(division) {
    const divisionValues = {
      "IV": 0,
      "III": 75,
      "II": 150,
      "I": 225
    };
    
    return divisionValues[division] !== undefined ? divisionValues[division] : 0;
  }
  
  /**
   * Obtient une valeur numérique pour un rang (pour comparaison)
   */
  function getRankValue(rankObj) {
    if (!rankObj || !rankObj.tier || !rankObj.rank) {
      return 0; // Valeur pour non classé
    }
    
    const tierValues = {
      "IRON": 0,
      "BRONZE": 4,
      "SILVER": 8,
      "GOLD": 12,
      "PLATINUM": 16,
      "EMERALD": 20,
      "DIAMOND": 24,
      "MASTER": 28,
      "GRANDMASTER": 29,
      "CHALLENGER": 30
    };
    
    const divisionValues = {
      "IV": 0,
      "III": 1,
      "II": 2,
      "I": 3
    };
    
    const tierValue = tierValues[rankObj.tier] || 0;
    const divisionValue = divisionValues[rankObj.rank] || 0;
    
    return tierValue + divisionValue;
  }














