import TournamentConfig from "../models/TournamentConfig.js";
import axios from "axios";

// URL de callback pour les résultats de tournoi
const CALLBACK_URL = process.env.RIOT_CALLBACK_URL || "https://calculateur-winrate.vercel.app/api/riot/tournament-results";

// Récupérer toutes les configurations de tournoi
export const getAllTournamentConfigs = async (req, res) => {
  try {
    const configs = await TournamentConfig.find().sort({ isActive: -1, lastUsed: -1 });
    res.status(200).json(configs);
  } catch (error) {
    console.error("Erreur lors de la récupération des configurations de tournoi:", error);
    res.status(500).json({ 
      success: false, 
      error: "Erreur lors de la récupération des configurations de tournoi" 
    });
  }
};

// Récupérer la configuration active
export const getActiveTournamentConfig = async (req, res) => {
  try {
    const config = await TournamentConfig.findOne({ isActive: true }).sort({ lastUsed: -1 });
    
    if (!config) {
      return res.status(404).json({ 
        success: false, 
        message: "Aucune configuration de tournoi active trouvée" 
      });
    }
    
    res.status(200).json(config);
  } catch (error) {
    console.error("Erreur lors de la récupération de la configuration active:", error);
    res.status(500).json({ 
      success: false, 
      error: "Erreur lors de la récupération de la configuration active" 
    });
  }
};

// Créer une nouvelle configuration de tournoi
export const createTournamentConfig = async (req, res) => {
  try {
    const { name, region = "EUW" } = req.body;
    
    if (!name) {
      return res.status(400).json({ 
        success: false, 
        message: "Nom de configuration requis" 
      });
    }
    
    // Étape 1: Créer un fournisseur de tournoi
    const apiKey = process.env.RIOT_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        success: false, 
        message: "Clé API Riot non configurée" 
      });
    }
    
    // Déterminer l'URL de l'API (stub ou production)
    const isTest = process.env.NODE_ENV !== 'production';
    const apiUrl = isTest 
      ? 'https://americas.api.riotgames.com/lol/tournament-stub/v5/providers'
      : 'https://americas.api.riotgames.com/lol/tournament/v5/providers';
    
    // Créer le fournisseur
    const providerResponse = await axios.post(
      apiUrl,
      {
        region: region,
        url: CALLBACK_URL
      },
      {
        headers: {
          'X-Riot-Token': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const providerId = providerResponse.data;
    
    // Étape 2: Créer un tournoi avec ce fournisseur
    const tournamentUrl = isTest
      ? 'https://americas.api.riotgames.com/lol/tournament-stub/v5/tournaments'
      : 'https://americas.api.riotgames.com/lol/tournament/v5/tournaments';
    
    const tournamentResponse = await axios.post(
      tournamentUrl,
      {
        name: name,
        providerId: providerId
      },
      {
        headers: {
          'X-Riot-Token': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const tournamentId = tournamentResponse.data;
    
    // Étape 3: Créer l'entrée dans la base de données
    const newConfig = new TournamentConfig({
      name,
      providerId,
      tournamentId,
      region,
      callbackUrl: CALLBACK_URL,
      isActive: true,
      isTest
    });
    
    // Désactiver les autres configurations
    await TournamentConfig.updateMany(
      { isActive: true },
      { isActive: false }
    );
    
    await newConfig.save();
    
    res.status(201).json({
      success: true,
      message: "Configuration de tournoi créée avec succès",
      config: newConfig
    });
  } catch (error) {
    console.error("Erreur lors de la création de la configuration de tournoi:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la création de la configuration de tournoi",
      details: error.response?.data || error.message
    });
  }
};

// Définir une configuration comme active
export const setActiveTournamentConfig = async (req, res) => {
  try {
    const { configId } = req.params;
    
    // Vérifier si la configuration existe
    const config = await TournamentConfig.findById(configId);
    if (!config) {
      return res.status(404).json({ 
        success: false, 
        message: "Configuration de tournoi non trouvée" 
      });
    }
    
    // Désactiver les autres configurations
    await TournamentConfig.updateMany(
      { _id: { $ne: configId } },
      { isActive: false }
    );
    
    // Activer la configuration sélectionnée
    config.isActive = true;
    config.lastUsed = new Date();
    await config.save();
    
    res.status(200).json({
      success: true,
      message: "Configuration de tournoi définie comme active",
      config
    });
  } catch (error) {
    console.error("Erreur lors de la définition de la configuration active:", error);
    res.status(500).json({ 
      success: false, 
      error: "Erreur lors de la définition de la configuration active" 
    });
  }
};

// Générer un code de tournoi avec la configuration active
export const generateTournamentCodeWithConfig = async (req, res) => {
  try {
    const { teamSize = 5, spectatorType = "ALL", pickType = "TOURNAMENT_DRAFT", mapType = "SUMMONERS_RIFT" } = req.body;
    
    // Récupérer la configuration active
    const config = await TournamentConfig.findOne({ isActive: true });
    if (!config) {
      return res.status(404).json({ 
        success: false, 
        message: "Aucune configuration de tournoi active trouvée" 
      });
    }
    
    // Mettre à jour la date de dernière utilisation
    config.lastUsed = new Date();
    
    // Générer le code
    const apiKey = process.env.RIOT_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        success: false, 
        message: "Clé API Riot non configurée" 
      });
    }
    
    // Déterminer l'URL de l'API
    const codeUrl = config.isTest
      ? `https://americas.api.riotgames.com/lol/tournament-stub/v5/codes?count=1&tournamentId=${config.tournamentId}`
      : `https://americas.api.riotgames.com/lol/tournament/v5/codes?count=1&tournamentId=${config.tournamentId}`;
    
    const codeResponse = await axios.post(
      codeUrl,
      {
        mapType,
        pickType,
        spectatorType,
        teamSize: parseInt(teamSize)
      },
      {
        headers: {
          'X-Riot-Token': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const tournamentCodes = codeResponse.data;
    
    if (tournamentCodes && tournamentCodes.length > 0) {
      // Enregistrer le code généré
      config.generatedCodes.push({
        code: tournamentCodes[0],
        teamSize,
        spectatorType,
        pickType,
        mapType
      });
      
      await config.save();
      
      res.status(200).json({
        success: true,
        tournamentCodes,
        message: "Code de tournoi généré avec succès"
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: "Erreur lors de la génération du code de tournoi" 
      });
    }
  } catch (error) {
    console.error("Erreur lors de la génération du code de tournoi:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la génération du code de tournoi",
      details: error.response?.data || error.message
    });
  }
};

// Supprimer une configuration
export const deleteTournamentConfig = async (req, res) => {
  try {
    const { configId } = req.params;
    
    const result = await TournamentConfig.findByIdAndDelete(configId);
    
    if (!result) {
      return res.status(404).json({ 
        success: false, 
        message: "Configuration de tournoi non trouvée" 
      });
    }
    
    res.status(200).json({
      success: true,
      message: "Configuration de tournoi supprimée avec succès"
    });
  } catch (error) {
    console.error("Erreur lors de la suppression de la configuration de tournoi:", error);
    res.status(500).json({ 
      success: false, 
      error: "Erreur lors de la suppression de la configuration de tournoi" 
    });
  }
};