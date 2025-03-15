import mongoose from "mongoose";

const PlayerSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  gamesPlayed: { type: Number, default: 0 },
  totalKills: { type: Number, default: 0 },
  totalDeaths: { type: Number, default: 0 },
  totalAssists: { type: Number, default: 0 },
  winRate: { type: Number, default: 0 },

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

export default mongoose.model('Player', PlayerSchema);
