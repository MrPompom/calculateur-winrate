import mongoose from "mongoose";

const GameSchema = new mongoose.Schema({
  players: [{
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    champion: String,
    kills: Number,
    deaths: Number,
    assists: Number,
    side: String,
    won: Boolean,
    lane: { type: String, enum: ['top', 'mid', 'jungle', 'adc', 'support'], required: true }
  }],
  winningTeam: String,
  createdAt: { type: Date, default: Date.now },
  
  // Nouveaux champs pour les tournois
  isTournamentMatch: { type: Boolean, default: false },
  isTestTournament: { type: Boolean, default: false },
  
  // Métadonnées du match
  gameId: { type: String, index: true },
  tournamentId: String,
  tournamentCode: String,
  platformId: String,
  gameMode: String,
  gameType: String,
  gameVersion: String,
  mapId: Number,
  gameDuration: Number,
  gameCreation: Date,
  
  // Données complètes des équipes
  teams: [{
    teamId: Number,
    win: String,
    firstBlood: Boolean,
    firstTower: Boolean,
    firstInhibitor: Boolean,
    firstBaron: Boolean,
    firstDragon: Boolean,
    firstRiftHerald: Boolean,
    towerKills: Number,
    inhibitorKills: Number,
    baronKills: Number,
    dragonKills: Number,
    riftHeraldKills: Number,
    dominionVictoryScore: Number,
    bans: [{
      championId: Number,
      pickTurn: Number
    }]
  }],
  
  // Données complètes des participants
  participants: [mongoose.Schema.Types.Mixed],
  
  // Identités des participants
  participantIdentities: [mongoose.Schema.Types.Mixed],
  
  // Données brutes
  rawData: { type: mongoose.Schema.Types.Mixed }
});

// Ajout d'index pour améliorer les requêtes
GameSchema.index({ 'isTournamentMatch': 1 });
GameSchema.index({ 'isTestTournament': 1 });
GameSchema.index({ 'tournamentId': 1, 'gameId': 1 }, { unique: true, sparse: true });

export default mongoose.model('Game', GameSchema);