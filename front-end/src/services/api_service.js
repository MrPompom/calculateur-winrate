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

/**
 * Met à jour un joueur existant
 * @param {Object} playerData - Données du joueur à mettre à jour
 * @returns {Promise<Object>} - Joueur mis à jour
 */
export const updatePlayer = async (playerData) => {
  try {
    const response = await axios.put(`${API_URL}/players/${playerData.id}`, {
      name: playerData.name,
      riotId: playerData.riotId || null,
      riotTag: playerData.riotTag || null,
      region: playerData.region || 'EUW'
    });
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la mise à jour du joueur:', error);
    throw error;
  }
};

/**
 * Synchronise les données d'un joueur avec l'API Riot
 * @param {Object} playerData - Données du joueur avec identifiants Riot
 * @returns {Promise<Object>} - Résultat de la synchronisation
 */
export const syncPlayerWithRiot = async (playerData) => {
  try {
    // Vérifier que les données Riot sont présentes
    if (!playerData.riotId) {
      return { success: false, message: "Identifiant Riot manquant" };
    }
    
    const response = await axios.post(`${API_URL}/players/${playerData.id}/sync-riot`, {
      riotId: playerData.riotId,
      riotTag: playerData.riotTag || null,
      region: playerData.region || 'EUW'
    });
    
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la synchronisation avec Riot:', error);
    if (error.response && error.response.data && error.response.data.message) {
      return { success: false, message: error.response.data.message };
    }
    throw error;
  }
};

