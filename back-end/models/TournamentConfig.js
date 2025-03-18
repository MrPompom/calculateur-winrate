import mongoose from "mongoose";

const TournamentConfigSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  providerId: {
    type: Number,
    required: true
  },
  tournamentId: {
    type: Number,
    required: true
  },
  region: {
    type: String,
    default: "EUW",
    enum: ["BR", "EUNE", "EUW", "JP", "LAN", "LAS", "NA", "OCE", "PBE", "RU", "TR", "KR"]
  },
  callbackUrl: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isTest: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUsed: {
    type: Date,
    default: Date.now
  },
  generatedCodes: [{
    code: String,
    teamSize: Number,
    spectatorType: String,
    pickType: String,
    mapType: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    used: {
      type: Boolean,
      default: false
    }
  }]
});

// Index pour des requêtes plus rapides
TournamentConfigSchema.index({ isActive: 1 });
TournamentConfigSchema.index({ providerId: 1 });
TournamentConfigSchema.index({ tournamentId: 1 });

export default mongoose.model('TournamentConfig', TournamentConfigSchema);