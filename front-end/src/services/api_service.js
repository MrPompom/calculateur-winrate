import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

export const addPlayer = async (name) => {
  try {
    const response = await axios.post(`${API_URL}/players`, { name });
    return response.data;
  } catch (error) {
    console.error("Erreur lors de l'ajout du joueur:", error);
    throw error;
  }
};

export const addGame = async ({ players, winningTeam }) => {
  try {
    const response = await axios.post(`${API_URL}/games`, { players, winningTeam });
    return response.data;
  } catch (error) {
    console.error("Erreur lors de l'ajout de la game:", error);
    throw error;
  }
};

export const getPlayerStats = async (playerName) => {
  try {
    const response = await axios.get(`${API_URL}/players/${playerName}/stats`);
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des stats du joueur:", error);
    throw error;
  }
};


export const getAllPlayers = async () => {
  try {
    const response = await axios.get(`${API_URL}/players`);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération de la liste des joueurs:', error);
    throw error;
  }
};

export const getAllGames = async () => {
  try {
    const response = await axios.get(`${API_URL}/games`);
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des games:", error);
    throw error;
  }
};
