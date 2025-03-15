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
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Game', GameSchema);
