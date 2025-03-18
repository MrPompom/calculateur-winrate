import Game from "../models/Game.js";
import Player from "../models/Player.js";
import axios from "axios"; // Assurez-vous d'installer axios: npm install axios

// Configuration pour l'API Riot
// Idéalement, ces valeurs devraient être dans des variables d'environnement
const RIOT_API_KEY = process.env.RIOT_API_KEY; // À définir dans .env
const CALLBACK_URL = "https://calculateur-winrate.vercel.app/riot/tournament-results";

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

    const newGame = new Game({ 
      players: updatedPlayers, 
      winningTeam,
      isTournamentMatch: false, // Indiquer qu'il ne s'agit pas d'un match de tournoi
    });
    await newGame.save();

    res.status(201).json({ message: 'Game enregistrée avec succès', gameId: newGame._id });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de l'ajout de la game" });
  }
};

export const getAllGames = async (req, res) => {
  try {
    // Exclure les matchs de tournoi test par défaut
    const games = await Game.find({ isTestTournament: { $ne: true } }).populate("players.playerId");
    res.status(200).json(games);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la récupération des games" });
  }
};

// Nouvelle fonction pour créer un fournisseur de tournoi en mode test
export const createTournamentProvider = async (req, res) => {
  try {
    console.log("Riot API Key disponible:", !!process.env.RIOT_API_KEY);
    const apiKey = process.env.RIOT_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        success: false, 
        error: "Clé API Riot non configurée"
      });
    }
    const response = await axios.post(
      'https://americas.api.riotgames.com/lol/tournament-stub/v5/providers',
      {
        region: "EUW",
        url: CALLBACK_URL
      },
      {
        headers: {
          'X-Riot-Token': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );

    // Le providerId est directement retourné comme un entier
    const providerId = response.data;
    
    res.status(201).json({
      success: true,
      providerId: providerId,
      message: 'Fournisseur de tournoi créé avec succès'
    });
  } catch (error) {
    console.error("Erreur lors de la création du fournisseur de tournoi:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la création du fournisseur de tournoi",
      details: error.response?.data || error.message
    });
  }
};

// Nouvelle fonction pour créer un tournoi en mode test
export const createTournament = async (req, res) => {
  try {
    const { providerId, name } = req.body;

    console.log("Riot API Key disponible:", !!process.env.RIOT_API_KEY);
    const apiKey = process.env.RIOT_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        success: false, 
        error: "Clé API Riot non configurée"
      });
    }
    
    if (!providerId) {
      return res.status(400).json({ success: false, error: "ProviderId requis" });
    }

    const response = await axios.post(
      'https://americas.api.riotgames.com/lol/tournament-stub/v5/tournaments',
      {
        name: name || "Tournoi Custom",
        providerId: parseInt(providerId)
      },
      {
        headers: {
          'X-Riot-Token': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );

    // Le tournamentId est directement retourné comme un entier
    const tournamentId = response.data;
    
    res.status(201).json({
      success: true,
      tournamentId: tournamentId,
      message: 'Tournoi créé avec succès'
    });
  } catch (error) {
    console.error("Erreur lors de la création du tournoi:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la création du tournoi",
      details: error.response?.data || error.message
    });
  }
};

// Nouvelle fonction pour générer un code de tournoi
export const generateTournamentCode = async (req, res) => {
  try {
    const { tournamentId, teamSize, spectatorType, pickType, mapType, metadata } = req.body;
    const apiKey = process.env.RIOT_API_KEY;
    if (!tournamentId) {
      return res.status(400).json({ success: false, error: "TournamentId requis" });
    }

    const response = await axios.post(
      `https://americas.api.riotgames.com/lol/tournament-stub/v5/codes?count=1&tournamentId=${tournamentId}`,
      {
        mapType: mapType || "SUMMONERS_RIFT",
        pickType: pickType || "TOURNAMENT_DRAFT",
        spectatorType: spectatorType || "ALL",
        teamSize: teamSize || 5,
        metadata: metadata || "" // Informations supplémentaires (optionnel)
      },
      {
        headers: {
          'X-Riot-Token': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );

    // Les codes sont retournés dans un tableau
    const tournamentCodes = response.data;
    
    res.status(201).json({
      success: true,
      tournamentCodes: tournamentCodes,
      message: 'Code de tournoi généré avec succès'
    });
  } catch (error) {
    console.error("Erreur lors de la génération du code de tournoi:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la génération du code de tournoi",
      details: error.response?.data || error.message
    });
  }
};

// Fonction pour récupérer uniquement les matchs de tournoi test
export const getTournamentTestGames = async (req, res) => {
  try {
    const games = await Game.find({ isTestTournament: true }).populate("players.playerId");
    res.status(200).json(games);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la récupération des matchs de tournoi test" });
  }
};

// Fonction de webhook pour traiter les résultats des matchs de tournoi
export const handleTournamentResults = async (req, res) => {
  try {
    console.log("Données de tournoi reçues:", JSON.stringify(req.body));
    
    // Extraire les données du match depuis la réponse de Riot
    const riotData = req.body;
    
    // Vérifier si ce match existe déjà
    const existingGame = await Game.findOne({
      gameId: riotData.gameId,
      tournamentId: riotData.tournamentId
    });
    
    if (existingGame) {
      return res.status(200).json({ message: 'Match déjà enregistré' });
    }
    
    // Transformer les données au format attendu par votre application
    const players = extractPlayersFromRiotData(riotData);
    const winningTeam = determineWinningTeam(riotData);
    
    // Mettre à jour les joueurs et récupérer les données pour le modèle Game
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

    // Créer le nouvel objet Game avec toutes les données
    const newGame = new Game({
      // Données spécifiques à notre application
      players: updatedPlayers,
      winningTeam: winningTeam,
      
      // Indiquer qu'il s'agit d'un match de tournoi
      isTournamentMatch: true,
      
      // Indiquer s'il s'agit d'un tournoi de test (stub)
      isTestTournament: true, // Mettre à false pour les tournois de production
      
      // Métadonnées du match
      gameId: riotData.gameId,
      tournamentId: riotData.tournamentId,
      tournamentCode: riotData.tournamentCode,
      platformId: riotData.platformId,
      gameMode: riotData.gameMode,
      gameType: riotData.gameType,
      gameVersion: riotData.gameVersion,
      mapId: riotData.mapId,
      gameDuration: riotData.gameDuration,
      gameCreation: riotData.gameCreation ? new Date(riotData.gameCreation) : new Date(),
      
      // Données complètes des équipes
      teams: riotData.teams,
      
      // Données complètes des participants
      participants: riotData.participants,
      
      // Identités des participants
      participantIdentities: riotData.participantIdentities,
      
      // Sauvegarder les données brutes pour une utilisation future
      rawData: riotData
    });
    
    await newGame.save();

    // Retourner un code 200 pour confirmer la réception
    res.status(200).json({ message: 'Résultat du tournoi traité avec succès' });
  } catch (error) {
    console.error("Erreur lors du traitement des résultats du tournoi:", error);
    // Retourner quand même un 200 pour éviter que Riot ne réessaie
    res.status(200).json({ message: "Erreur traitée, résultat reçu" });
  }
};

// Fonction utilitaire pour extraire les données des joueurs
function extractPlayersFromRiotData(riotData) {
  const players = [];
  
  try {
    if (riotData.participants && riotData.participantIdentities) {
      // Créer un mapping entre participantId et summonerName
      const playerMapping = {};
      riotData.participantIdentities.forEach(identity => {
        playerMapping[identity.participantId] = identity.player.summonerName;
      });
      
      // Extraire les données de chaque participant
      riotData.participants.forEach(participant => {
        const team = participant.teamId === 100 ? 'BLUE' : 'RED';
        const won = riotData.teams.find(t => t.teamId === participant.teamId)?.win === 'Win';
        const summonerName = playerMapping[participant.participantId];
        
        // Déterminer la lane - utiliser la lane/role de timeline s'ils existent
        let lane = 'FILL';
        if (participant.timeline) {
          lane = mapPositionToLane(participant.timeline.lane, participant.timeline.role);
        }
        
        players.push({
          name: summonerName,
          champion: participant.championId.toString(),
          kills: participant.stats.kills || 0,
          deaths: participant.stats.deaths || 0,
          assists: participant.stats.assists || 0,
          side: team,
          lane: lane.toLowerCase(), // Assurer la cohérence avec votre enum
          won: won
        });
      });
    }
  } catch (error) {
    console.error("Erreur lors de l'extraction des données des joueurs:", error);
  }
  
  return players;
}

// Fonction utilitaire pour déterminer l'équipe gagnante
function determineWinningTeam(riotData) {
  try {
    if (riotData.teams && riotData.teams.length >= 2) {
      const winningTeam = riotData.teams.find(team => team.win === 'Win');
      return winningTeam.teamId === 100 ? 'BLUE' : 'RED';
    }
  } catch (error) {
    console.error("Erreur lors de la détermination de l'équipe gagnante:", error);
  }
  return null;
}

// Fonction utilitaire pour convertir les positions Riot en vos rôles
function mapPositionToLane(lane, role) {
  if (!lane || !role) return 'FILL';
  
  if (lane === 'TOP') return 'top';
  if (lane === 'JUNGLE') return 'jungle';
  if (lane === 'MIDDLE' || lane === 'MID') return 'mid';
  if (lane === 'BOTTOM') {
    if (role === 'DUO_CARRY') return 'adc';
    if (role === 'DUO_SUPPORT') return 'support';
  }
  return 'fill'; // Valeur par défaut
}