import Player from "../models/Player.js";
import Game from "../models/Game.js";
import axios from 'axios';

export const getAllPlayers = async (req, res) => {
    try {
      // Exclure les champs statsByLane et statsByChampion en utilisant `select`
      const players = await Player.find().select('-statsByLane -statsByChampion');
  
      res.status(200).json(players);
    } catch (error) {
      console.error("❌ Erreur lors de la récupération des joueurs :", error);
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

// Mettre à jour un joueur existant
export const updatePlayer = async (req, res) => {
    try {
      const playerId = req.params.id;
      const { name, riotId, riotTag, region } = req.body;
      console.log(`🔄 Mise à jour du joueur ${playerId} avec les données:`, { name, riotId, riotTag, region });
  
      // Vérifier si le joueur existe
      const player = await Player.findById(playerId);
      if (!player) {
        console.warn(`⚠ Joueur avec ID ${playerId} introuvable.`);
        return res.status(404).json({ error: "Joueur non trouvé" });
      }
  
      // Vérifier si le nouveau nom est unique (sauf s'il n'a pas changé)
      if (name && name !== player.name) {
        const existingPlayer = await Player.findOne({ name });
        if (existingPlayer) {
          console.warn(`⚠ Tentative de renommer un joueur avec un nom existant: ${name}`);
          return res.status(400).json({ error: "Un joueur avec ce nom existe déjà" });
        }
      }
  
      // Mise à jour des données du joueur
      const updatedPlayer = await Player.findByIdAndUpdate(
        playerId,
        {
          name: name || player.name,
          riotId: riotId !== undefined ? riotId : player.riotId,
          riotTag: riotTag !== undefined ? riotTag : player.riotTag,
          region: region || player.region
        },
        { new: true, select: '-statsByLane -statsByChampion' } // Retourne le document mis à jour sans les stats détaillées
      );
  
      console.log(`✅ Joueur ${updatedPlayer.name} mis à jour avec succès.`);
      res.status(200).json(updatedPlayer);
    } catch (error) {
      console.error("❌ Erreur lors de la mise à jour du joueur:", error);
      res.status(500).json({ error: "Erreur lors de la mise à jour du joueur" });
    }
  };

// Synchroniser un joueur avec l'API Riot Games
export const syncPlayerWithRiot = async (req, res) => {
  try {
    const playerId = req.params.id;
    const { riotId, riotTag, region = 'EUW' } = req.body;
    console.log(`🔄 Synchronisation du joueur ${playerId} avec Riot API:`, { riotId, riotTag, region });

    // Récupérer la clé API Riot depuis les variables d'environnement
    const RIOT_API_KEY = process.env.RIOT_API_KEY;
    
    if (!RIOT_API_KEY) {
      console.error("❌ Clé API Riot non définie dans les variables d'environnement");
      return res.status(500).json({ 
        success: false, 
        message: "Configuration du serveur incomplète pour l'API Riot" 
      });
    }

    // Vérifier si le joueur existe
    const player = await Player.findById(playerId);
    if (!player) {
      console.warn(`⚠ Joueur avec ID ${playerId} introuvable.`);
      return res.status(404).json({ error: "Joueur non trouvé" });
    }

    // Vérifier si les identifiants Riot sont fournis
    if (!riotId) {
      console.warn(`⚠ Identifiant Riot manquant pour la synchronisation.`);
      return res.status(400).json({ 
        success: false, 
        message: "L'identifiant Riot est requis pour la synchronisation" 
      });
    }

    // Appel à l'API Riot Games pour obtenir les données du joueur
    try {
      // Formatter l'identifiant Riot pour l'URL
      const gameName = encodeURIComponent(riotId);
      const tagLine = encodeURIComponent(riotTag || '');
      
      // 1. Récupérer les données du compte avec l'API Riot Identity
      const accountApiUrl = `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}?api_key=${RIOT_API_KEY}`;
      
      console.log(`📡 Appel API Riot: ${accountApiUrl.replace(RIOT_API_KEY, 'HIDDEN')}`);
      const accountResponse = await axios.get(accountApiUrl);
      
      if (!accountResponse.data || !accountResponse.data.puuid) {
        throw new Error("Compte Riot introuvable avec cet identifiant");
      }
      
      const puuid = accountResponse.data.puuid;
      console.log(`✅ PUUID récupéré: ${puuid}`);
      
      // 2. Obtenir les informations d'invocateur avec le PUUID
      const regionDomain = getRegionDomain(region);
      const regionRouting = getRegionRouting(region); // Pour l'API Match v5
      const summonerApiUrl = `https://${regionDomain}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}?api_key=${RIOT_API_KEY}`;
      
      console.log(`📡 Appel API Summoner: ${summonerApiUrl.replace(RIOT_API_KEY, 'HIDDEN')}`);
      const summonerResponse = await axios.get(summonerApiUrl);
      
      if (!summonerResponse.data) {
        throw new Error("Données d'invocateur introuvables");
      }
      
      const summonerId = summonerResponse.data.id;
      console.log(`✅ SummonerID récupéré: ${summonerId}`);
      
      // 3. Obtenir le rang en classé solo/duo
      const rankedApiUrl = `https://${regionDomain}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}?api_key=${RIOT_API_KEY}`;
      console.log(`📡 Appel API Ranked: ${rankedApiUrl.replace(RIOT_API_KEY, 'HIDDEN')}`);
      const rankedResponse = await axios.get(rankedApiUrl);
      
      // Filtrer pour obtenir uniquement le rang en solo/duo (RANKED_SOLO_5x5)
      let soloRank = null;
      if (rankedResponse.data && rankedResponse.data.length > 0) {
        const soloQueueData = rankedResponse.data.find(queue => queue.queueType === 'RANKED_SOLO_5x5');
        if (soloQueueData) {
          soloRank = {
            tier: soloQueueData.tier,
            rank: soloQueueData.rank,
            leaguePoints: soloQueueData.leaguePoints,
            wins: soloQueueData.wins,
            losses: soloQueueData.losses
          };
        }
      }
      
      // 4. Obtenir les champions avec le plus de points de maîtrise
      const masteryApiUrl = `https://${regionDomain}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=5&api_key=${RIOT_API_KEY}`;
      console.log(`📡 Appel API Mastery: ${masteryApiUrl.replace(RIOT_API_KEY, 'HIDDEN')}`);
      const masteryResponse = await axios.get(masteryApiUrl);
      
      let topChampions = [];
      if (masteryResponse.data && masteryResponse.data.length > 0) {
        // Récupérer les informations des champions (noms, etc.)
        const championData = await getChampionData();
        
        topChampions = masteryResponse.data.map(mastery => {
          const championInfo = getChampionById(championData, mastery.championId);
          return {
            championId: mastery.championId,
            championName: championInfo?.name || `Champion ${mastery.championId}`,
            championLevel: mastery.championLevel,
            championPoints: mastery.championPoints,
            lastPlayTime: new Date(mastery.lastPlayTime)
          };
        });
      }
      
      // 5. Récupérer les matchs récents en ranked solo/duo (Queue ID 420)
      const matchListUrl = `https://${regionRouting}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?queue=420&start=0&count=50&api_key=${RIOT_API_KEY}`;
      console.log(`📡 Appel API Match List: ${matchListUrl.replace(RIOT_API_KEY, 'HIDDEN')}`);
      const matchListResponse = await axios.get(matchListUrl);
      
      // 6. Analyser les matchs pour trouver les champions les plus joués en ranked
      let rankedChampionsStats = {};
      
      if (matchListResponse.data && matchListResponse.data.length > 0) {
        // Limiter à 20 matchs maximum pour éviter de surcharger l'API
        const matchesToAnalyze = matchListResponse.data.slice(0, 20);
        console.log(`🔍 Analyse de ${matchesToAnalyze.length} matchs récents en ranked solo/duo`);
        
        // Récupérer les données de champions pour les noms
        const championData = await getChampionData();
        
        // Analyser chaque match
        for (const matchId of matchesToAnalyze) {
          const matchUrl = `https://${regionRouting}.api.riotgames.com/lol/match/v5/matches/${matchId}?api_key=${RIOT_API_KEY}`;
          console.log(`📡 Récupération des données du match: ${matchId}`);
          
          try {
            const matchResponse = await axios.get(matchUrl);
            const match = matchResponse.data;
            
            // Trouver le participant (le joueur que nous analysons)
            const participant = match.info.participants.find(p => p.puuid === puuid);
            
            if (participant) {
              const championId = participant.championId;
              const championInfo = getChampionById(championData, championId);
              const championName = championInfo?.name || `Champion ${championId}`;
              
              // Initialiser ou mettre à jour les statistiques du champion
              if (!rankedChampionsStats[championId]) {
                rankedChampionsStats[championId] = {
                  championId,
                  championName,
                  games: 0,
                  wins: 0,
                  kills: 0,
                  deaths: 0,
                  assists: 0
                };
              }
              
              // Mettre à jour les statistiques
              rankedChampionsStats[championId].games += 1;
              rankedChampionsStats[championId].wins += participant.win ? 1 : 0;
              rankedChampionsStats[championId].kills += participant.kills;
              rankedChampionsStats[championId].deaths += participant.deaths;
              rankedChampionsStats[championId].assists += participant.assists;
            }
          } catch (matchError) {
            console.warn(`⚠ Erreur lors de la récupération du match ${matchId}:`, matchError.message);
            // Continuer avec le match suivant
            continue;
          }
        }
      }
      
      // Convertir l'objet en tableau et calculer les statistiques additionnelles
      let rankedChampions = Object.values(rankedChampionsStats)
        .map(stats => ({
          ...stats,
          winRate: stats.games > 0 ? stats.wins / stats.games : 0,
          kda: stats.deaths > 0 ? (stats.kills + stats.assists) / stats.deaths : (stats.kills + stats.assists)
        }))
        .filter(stats => stats.games >= 3) // Filtrer pour avoir au moins 3 parties par champion
        .sort((a, b) => b.games - a.games); // Trier par nombre de parties
      
      // Limite aux 5 champions les plus joués
      rankedChampions = rankedChampions.slice(0, 5);
      
      // Mise à jour des informations du joueur avec les données récupérées
      player.riotId = riotId;
      player.riotTag = riotTag;
      player.region = region;
      player.riotPuuid = puuid;
      player.riotAccountId = summonerResponse.data.accountId;
      player.summonerLevel = summonerResponse.data.summonerLevel;
      player.lastSyncDate = new Date();
      
      // Ajouter les nouvelles informations
      player.soloRank = soloRank;
      player.topChampions = topChampions;
      player.rankedChampions = rankedChampions;
      
      // Enregistrer les modifications
      await player.save();

      console.log(`✅ Joueur ${player.name} synchronisé avec succès avec les données Riot.`);
      res.status(200).json({ 
        success: true, 
        message: "Synchronisation réussie avec l'API Riot",
        player: {
          id: player._id,
          name: player.name,
          riotId: player.riotId,
          riotTag: player.riotTag,
          region: player.region,
          summonerLevel: player.summonerLevel,
          soloRank: player.soloRank,
          topChampions: player.topChampions,
          rankedChampions: player.rankedChampions,
          lastSyncDate: player.lastSyncDate
        }
      });
    } catch (riotError) {
      console.error("❌ Erreur lors de l'appel à l'API Riot:", riotError.message);
      console.error(riotError.response?.data || 'Pas de données de réponse');
      return res.status(400).json({ 
        success: false, 
        message: "Impossible de trouver ce compte Riot ou erreur lors de la récupération des données."
      });
    }
  } catch (error) {
    console.error("❌ Erreur lors de la synchronisation avec Riot:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur lors de la synchronisation avec l'API Riot" 
    });
  }
};

// Fonction pour obtenir le bon domaine d'API en fonction de la région
function getRegionDomain(region) {
  // Conversion des codes de région en domaines d'API
  const regionMap = {
    'BR': 'br1',
    'EUNE': 'eun1',
    'EUW': 'euw1',
    'JP': 'jp1',
    'KR': 'kr',
    'LAN': 'la1',
    'LAS': 'la2',
    'NA': 'na1',
    'OCE': 'oc1',
    'TR': 'tr1',
    'RU': 'ru'
  };
  
  return regionMap[region.toUpperCase()] || 'euw1'; // Défaut à EUW si région non reconnue
}

// Fonction pour obtenir le domaine de routage régional pour l'API Match v5
function getRegionRouting(region) {
  // L'API Match v5 utilise des domaines de routage continental
  const routingMap = {
    // Amériques
    'NA': 'americas',
    'BR': 'americas',
    'LAN': 'americas',
    'LAS': 'americas',
    // Asie
    'KR': 'asia',
    'JP': 'asia',
    // Europe et autres
    'EUW': 'europe',
    'EUNE': 'europe',
    'TR': 'europe',
    'RU': 'europe',
    // Océanie
    'OCE': 'sea'
  };
  
  return routingMap[region.toUpperCase()] || 'europe';
}

// Fonction pour récupérer les données de tous les champions (version et noms)
async function getChampionData() {
  try {
    // 1. Obtenir la dernière version des données
    const versionUrl = 'https://ddragon.leagueoflegends.com/api/versions.json';
    const versionResponse = await axios.get(versionUrl);
    const latestVersion = versionResponse.data[0];
    
    // 2. Récupérer les données des champions pour cette version
    const championsUrl = `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/fr_FR/champion.json`;
    const championsResponse = await axios.get(championsUrl);
    
    return {
      version: latestVersion,
      champions: championsResponse.data.data
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des données de champions:", error);
    return { version: '15.5.1', champions: {} };
  }
}

// Fonction pour obtenir les informations d'un champion à partir de son ID
function getChampionById(championData, championId) {
  if (!championData || !championData.champions) return null;
  
  // Parcourir les champions pour trouver celui qui correspond à l'ID
  for (const champKey in championData.champions) {
    const champion = championData.champions[champKey];
    if (champion.key === championId.toString()) {
      return {
        id: champKey,
        name: champion.name,
        title: champion.title,
        image: champion.image.full
      };
    }
  }
  
  return null;
}



