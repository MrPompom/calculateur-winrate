import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

// 🏆 Ajouter un joueur
export const addPlayer = async (name) => {
  try {
    const response = await axios.post(`${API_URL}/players`, { name });
    return response.data;
  } catch (error) {
    console.error("❌ Erreur lors de l'ajout du joueur:", error);
    throw error;
  }
};

// 🎮 Ajouter une game
export const addGame = async ({ players, winningTeam }) => {
  try {
    const response = await axios.post(`${API_URL}/games`, { players, winningTeam });
    return response.data;
  } catch (error) {
    console.error("❌ Erreur lors de l'ajout de la game:", error);
    throw error;
  }
};

// 📊 Récupérer les stats d'un joueur spécifique
export const getPlayerStats = async (playerName) => {
  try {
    const response = await axios.get(`${API_URL}/players/${playerName}/stats`);
    return response.data;
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des stats du joueur:", error);
    throw error;
  }
};

// 📋 Récupérer tous les joueurs
export const getAllPlayers = async () => {
  try {
    const response = await axios.get(`${API_URL}/players`);
    return response.data;
  } catch (error) {
    console.error("❌ Erreur lors de la récupération de la liste des joueurs:", error);
    throw error;
  }
};

// 🎮 Récupérer toutes les games
export const getAllGames = async () => {
  try {
    const response = await axios.get(`${API_URL}/games`);
    return response.data;
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des games:", error);
    throw error;
  }
};

// 🔄 Recalculer les statistiques des joueurs
export const recalculateStats = async () => {
  try {
    const response = await axios.post(`${API_URL}/players/recalculate`);
    return response.data;
  } catch (error) {
    console.error("❌ Erreur lors du recalcul des stats:", error);
    throw error;
  }
};

export const balanceTeams = async (players) => {
  try {
    const response = await axios.post(`${API_URL}/teams/balance`, { players });
    return response.data;
  } catch (error) {
    console.error("Erreur lors de l'équilibrage des équipes :", error);
    return null;
  }
};

export const balanceTeamsWithLanes = async (players) => {
  try {
    console.log(players);
    const response = await axios.post(`${API_URL}/teams/balancelanes`, { players });
    return response.data;
  } catch (error) {
    console.error("Erreur lors de l'équilibrage des équipes avec lanes :", error);
    return null;
  }
};

