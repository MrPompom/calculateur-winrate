import mongoose from "mongoose";

const PlayerSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  gamesPlayed: { type: Number, default: 0 },
  totalKills: { type: Number, default: 0 },
  totalDeaths: { type: Number, default: 0 },
  totalAssists: { type: Number, default: 0 },
  winRate: { type: Number, default: 0 },

  // Champs pour l'intégration Riot Games
  riotId: { type: String, default: null },
  riotTag: { type: String, default: null },
  region: { type: String, default: 'EUW' },
  riotAccountId: { type: String, default: null },
  riotPuuid: { type: String, default: null },
  summonerLevel: { type: Number, default: null },
  lastSyncDate: { type: Date, default: null },
  
  // Nouvelles données: Rang en solo/duo
  soloRank: {
    tier: { type: String, default: null }, // IRON, BRONZE, SILVER, GOLD, etc.
    rank: { type: String, default: null }, // I, II, III, IV
    leaguePoints: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 }
  },
  
  // Nouvelles données: Champions les plus joués
  topChampions: [{
    championId: { type: Number },
    championName: { type: String },
    championLevel: { type: Number },
    championPoints: { type: Number },
    lastPlayTime: { type: Date }
  }],

  rankedChampions: [{
    championId: { type: Number },
    championName: { type: String },
    games: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    kills: { type: Number, default: 0 },
    deaths: { type: Number, default: 0 },
    assists: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 },
    kda: { type: Number, default: 0 }
  }],


  // 📌 Stockage dynamique des stats par lane
  statsByLane: {
    type: Map,
    of: {
      gamesPlayed: { type: Number, default: 0 },
      kills: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 },
      assists: { type: Number, default: 0 },
      wins: { type: Number, default: 0 },
      winRate: { type: Number, default: 0 }
    },
    default: {}
  },

  // 📌 Stockage dynamique des stats par champion (ajouté uniquement si joué)
  statsByChampion: {
    type: Map,
    of: {
      gamesPlayed: { type: Number, default: 0 },
      kills: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 },
      assists: { type: Number, default: 0 },
      wins: { type: Number, default: 0 },
      winRate: { type: Number, default: 0 }
    },
    default: {}
  }

}, { timestamps: true });

// Index pour améliorer les recherches par riotId et riotTag
PlayerSchema.index({ riotId: 1, riotTag: 1 });
PlayerSchema.index({ riotPuuid: 1 });

export default mongoose.model('Player', PlayerSchema);