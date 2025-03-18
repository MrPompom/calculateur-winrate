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

// Nouvelle fonction pour gérer les callbacks de l'API Riot Tournament
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