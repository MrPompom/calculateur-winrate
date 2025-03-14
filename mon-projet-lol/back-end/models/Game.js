import mongoose from 'mongoose';

const GameSchema = new mongoose.Schema({
  players: [{
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    champion: String,
    kills: Number,
    deaths: Number,
    assists: Number,
    side: { type: String, enum: ['Blue', 'Red'], required: true },
    won: Boolean,
    lane: { type: String, enum: ['top', 'mid', 'jungle', 'adc', 'support'], required: true }
  }],
  winningTeam: { type: String, enum: ['Blue', 'Red'], required: true },
  createdAt: { type: Date, default: Date.now }
});


export const Game = mongoose.model('Game', GameSchema);
